import {
  ScheduleAssignment,
  Course,
  Lecturer,
  Room,
  Timeslot,
  ConstraintWeights,
  CurriculumPackage,
  CourseOffering,
  ClassGroup,
} from '../types';
import { computeScheduleValidation } from './scheduleValidation';

export interface PublishConflictDetail {
  id: string;
  type:
    | 'lecturer'
    | 'room'
    | 'capacity'
    | 'invalid_timeslot'
    | 'invalid_room'
    | 'missing_timeslot'
    | 'missing_room'
    | 'missing_lecturer'
    | 'package'
    | 'other';
  title: string;
  description: string;
  isHard: boolean;
  offeringId?: string;
  courseCode?: string;
  courseName?: string;
}

export interface PublishCategorySummary {
  label: string;
  count: number;
  isHard: boolean;
  type: string;
}

export interface PublishValidationReport {
  isComplete: boolean;
  isValid: boolean; // TRUE only if activeAssignments > 0 && hardConflictCount === 0
  isPublishReady: boolean;
  hardConflictCount: number;
  warningCount: number;
  softPenaltyCount: number;
  incompleteAssignments: string[];
  reasons: string[];

  totalOfferings: number;
  scheduledOfferings: number;
  incompleteOfferings: number;

  // Specific counts
  lecturerConflictCount: number;
  roomConflictCount: number;
  roomCapacityConflictCount: number;
  invalidTimeslotCount: number;
  invalidRoomCount: number;
  missingTimeslotCount: number;
  missingRoomCount: number;
  missingLecturerCount: number;
  packageConflictCount: number;

  // Breakdown for modal dialog & preview cards
  summaryCategories: PublishCategorySummary[];
  details: PublishConflictDetail[];
  rejectionMessage: string | null;
  statusLabel: 'Siap Diterbitkan' | 'Belum Siap Diterbitkan';
}

/**
 * Validasi Real-Time Jadwal Perkuliahan Sebelum Penerbitan (Publish)
 * Bekerja langsung dari Single Source of Truth `computeScheduleValidation`
 */
export function validateScheduleForPublish(
  schedule: ScheduleAssignment[] | null | undefined,
  offerings: CourseOffering[] = [],
  courses: Course[] = [],
  lecturers: Lecturer[] = [],
  rooms: Room[] = [],
  timeslots: Timeslot[] = [],
  weights: ConstraintWeights,
  curriculumPackages: CurriculumPackage[] = [],
  classes: ClassGroup[] = []
): PublishValidationReport {
  const baseValidation = computeScheduleValidation(
    schedule,
    courses,
    lecturers,
    rooms,
    timeslots,
    weights,
    curriculumPackages,
    offerings,
    classes
  );

  const mappedDetails: PublishConflictDetail[] = baseValidation.hardConflicts.map((item, index) => {
    const typeLower = (item.category || item.categoryName || item.title || '').toLowerCase();
    let cat: PublishConflictDetail['type'] = 'other';
    if (typeLower.includes('lecturer') || typeLower.includes('dosen')) cat = 'lecturer';
    else if (typeLower.includes('capacity') || typeLower.includes('kapasitas')) cat = 'capacity';
    else if (typeLower.includes('room') || typeLower.includes('ruang')) cat = 'room';
    else if (typeLower.includes('timeslot') || typeLower.includes('waktu') || typeLower.includes('sesi')) cat = 'invalid_timeslot';
    else if (typeLower.includes('package') || typeLower.includes('paket') || typeLower.includes('kurikulum')) cat = 'package';

    return {
      id: item.id || `conflict-${index}`,
      type: cat,
      title: item.title || item.categoryName || 'Bentrokan Kendala Utama',
      description: item.description,
      isHard: true,
      offeringId: item.assignment1Id,
    };
  });

  const isPublishReady = baseValidation.isPublishReady;

  return {
    isComplete: baseValidation.isComplete,
    isValid: isPublishReady,
    isPublishReady,
    hardConflictCount: baseValidation.hardConflictCount,
    warningCount: baseValidation.warningCount,
    softPenaltyCount: baseValidation.softPenaltyCount,
    incompleteAssignments: [],
    reasons: baseValidation.reasons,
    totalOfferings: baseValidation.totalOfferings,
    scheduledOfferings: baseValidation.scheduledOfferings,
    incompleteOfferings: Math.max(0, baseValidation.totalOfferings - baseValidation.scheduledOfferings),
    lecturerConflictCount: baseValidation.lecturerConflictCount,
    roomConflictCount: baseValidation.roomConflictCount,
    roomCapacityConflictCount: baseValidation.roomCapacityConflictCount,
    invalidTimeslotCount: 0,
    invalidRoomCount: 0,
    missingTimeslotCount: 0,
    missingRoomCount: 0,
    missingLecturerCount: baseValidation.missingLecturerCount,
    packageConflictCount: baseValidation.packageConflictCount,
    summaryCategories: baseValidation.summaryCategories,
    details: mappedDetails,
    rejectionMessage: isPublishReady ? null : (baseValidation.reasons.join(' ') || 'Masih terdapat konflik bentrok wajib yang belum diselesaikan.'),
    statusLabel: isPublishReady ? 'Siap Diterbitkan' : 'Belum Siap Diterbitkan',
  };
}
