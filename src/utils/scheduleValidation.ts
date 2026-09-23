import {
  ScheduleAssignment,
  Course,
  Lecturer,
  Room,
  Timeslot,
  ConstraintWeights,
  CurriculumPackage,
  CourseOffering,
  ConflictItem,
  ClassGroup,
} from '../types';
import { detectConflicts } from '../algorithms/conflictDetection';
import { StorageService } from '../services/storageService';

export interface ScheduleValidationResult {
  hardConflicts: ConflictItem[];
  warnings: ConflictItem[];
  softPenalties: ConflictItem[];
  hardConflictCount: number;
  warningCount: number;
  softPenaltyCount: number;
  missingLecturerCount: number;
  totalOfferings: number;
  scheduledOfferings: number;
  evaluatedAt: number;
  isValid: boolean;
  isComplete: boolean;
  isPublishReady: boolean;
  statusLabel: 'Siap Terbit' | 'Belum Siap Terbit';
  totalConflictsCount: number;
  lecturerConflictCount: number;
  roomConflictCount: number;
  roomCapacityConflictCount: number;
  packageConflictCount: number;
  otherHardCount: number;
  summaryCategories: Array<{ label: string; count: number; isHard: boolean; type: string }>;
  details: ConflictItem[];
  reasons: string[];
}

export function computeScheduleValidation(
  schedule: ScheduleAssignment[] | null | undefined,
  courses: Course[] = [],
  lecturers: Lecturer[] = [],
  rooms: Room[] = [],
  timeslots: Timeslot[] = [],
  weights: ConstraintWeights,
  curriculumPackages: CurriculumPackage[] = [],
  offerings: CourseOffering[] = [],
  classes: ClassGroup[] = []
): ScheduleValidationResult {
  const activeAssignments = schedule || [];
  const activeOfferings = offerings.length > 0 ? offerings : StorageService.getCourseOfferings() || [];

  if (activeAssignments.length === 0) {
    return {
      hardConflicts: [],
      warnings: [],
      softPenalties: [],
      hardConflictCount: 0,
      warningCount: 0,
      softPenaltyCount: 0,
      missingLecturerCount: 0,
      totalOfferings: activeOfferings.length,
      scheduledOfferings: 0,
      evaluatedAt: Date.now(),
      isValid: false,
      isComplete: false,
      isPublishReady: false,
      statusLabel: 'Belum Siap Terbit',
      totalConflictsCount: 0,
      lecturerConflictCount: 0,
      roomConflictCount: 0,
      roomCapacityConflictCount: 0,
      packageConflictCount: 0,
      otherHardCount: 0,
      summaryCategories: [],
      details: [],
      reasons: ['Belum ada alokasi jadwal aktif.'],
    };
  }

  const detection = detectConflicts(
    activeAssignments,
    courses,
    lecturers,
    classes,
    rooms,
    timeslots,
    weights,
    [],
    [],
    curriculumPackages,
    activeOfferings
  );

  const hardConflicts: ConflictItem[] = [];
  const warnings: ConflictItem[] = [];
  const softPenalties: ConflictItem[] = [];

  detection.items.forEach((item) => {
    const isHard = item.isHardConstraint || item.severity === 'high';
    const typeLower = (item.category || item.categoryName || item.title || '').toLowerCase();
    
    // Missing lecturer / unassigned warnings should NOT be hard conflicts
    const isMissingLecturer = typeLower.includes('dosen') && (typeLower.includes('kosong') || typeLower.includes('belum') || typeLower.includes('missing') || typeLower.includes('unavailable'));

    if (isHard && !isMissingLecturer) {
      hardConflicts.push({ ...item, isHardConstraint: true, severity: 'high' });
    } else {
      warnings.push({ ...item, isHardConstraint: false, severity: item.severity || 'low' });
    }
  });

  // Track missing lecturer count across offerings
  let missingLecturerCount = 0;
  activeOfferings.forEach((off) => {
    const assignedLecturers = off.lecturerIds || (off.lecturerId ? [off.lecturerId] : []);
    if (assignedLecturers.length === 0 || !assignedLecturers[0]) {
      missingLecturerCount++;
      warnings.push({
        id: `warn-lec-${off.id}`,
        category: 'LECTURER_UNAVAILABLE',
        categoryName: 'Dosen Belum Ditentukan',
        isHardConstraint: false,
        severity: 'medium',
        title: `Dosen Kosong: ${off.courseName} (${off.section})`,
        description: `Mata kuliah ${off.courseName} kelas ${off.section} belum memiliki dosen pengampu dari master.`,
        assignment1Id: off.id,
        penalty: 0,
        involvedEntities: {},
      });
    }
  });

  let lecturerConflictCount = 0;
  let roomConflictCount = 0;
  let roomCapacityConflictCount = 0;
  let packageConflictCount = 0;
  let otherHardCount = 0;

  hardConflicts.forEach((item) => {
    const cat = (item.category || item.categoryName || item.title || '').toLowerCase();
    if (cat.includes('lecturer') || cat.includes('dosen')) {
      lecturerConflictCount++;
    } else if (cat.includes('capacity') || cat.includes('kapasitas')) {
      roomCapacityConflictCount++;
    } else if (cat.includes('room') || cat.includes('ruang')) {
      roomConflictCount++;
    } else if (cat.includes('package') || cat.includes('paket') || cat.includes('kurikulum')) {
      packageConflictCount++;
    } else {
      otherHardCount++;
    }
  });

  const summaryCategories: Array<{ label: string; count: number; isHard: boolean; type: string }> = [];
  if (lecturerConflictCount > 0) summaryCategories.push({ label: `${lecturerConflictCount} Bentrok Dosen Ganda`, count: lecturerConflictCount, isHard: true, type: 'lecturer' });
  if (roomConflictCount > 0) summaryCategories.push({ label: `${roomConflictCount} Bentrok Ruangan Ganda`, count: roomConflictCount, isHard: true, type: 'room' });
  if (roomCapacityConflictCount > 0) summaryCategories.push({ label: `${roomCapacityConflictCount} Bentrok Kapasitas Ruangan`, count: roomCapacityConflictCount, isHard: true, type: 'capacity' });
  if (packageConflictCount > 0) summaryCategories.push({ label: `${packageConflictCount} Bentrok Paket Kurikulum`, count: packageConflictCount, isHard: true, type: 'package' });
  if (otherHardCount > 0) summaryCategories.push({ label: `${otherHardCount} Hard Conflict Lainnya`, count: otherHardCount, isHard: true, type: 'other' });

  const reasons: string[] = [];
  if (hardConflicts.length > 0) {
    reasons.push(`Terdapat ${hardConflicts.length} Hard Conflict pada jadwal.`);
  }

  const hardConflictCount = hardConflicts.length;
  const isPublishReady = activeAssignments.length > 0 && hardConflictCount === 0;

  return {
    hardConflicts,
    warnings,
    softPenalties,
    hardConflictCount,
    warningCount: warnings.length,
    softPenaltyCount: detection.softConflictsCount,
    missingLecturerCount,
    totalOfferings: activeOfferings.length,
    scheduledOfferings: activeAssignments.length,
    evaluatedAt: Date.now(),
    isValid: isPublishReady,
    isComplete: activeAssignments.length > 0,
    isPublishReady,
    statusLabel: isPublishReady ? 'Siap Terbit' : 'Belum Siap Terbit',
    totalConflictsCount: hardConflictCount + warnings.length,
    lecturerConflictCount,
    roomConflictCount,
    roomCapacityConflictCount,
    packageConflictCount,
    otherHardCount,
    summaryCategories,
    details: hardConflicts,
    reasons,
  };
}
