import {
  Course,
  Lecturer,
  Student,
  ClassGroup,
  Room,
  Timeslot,
  ScheduleAssignment,
  OptimizationResult,
  SAParameters,
  ConstraintWeights,
  ScheduleChangeRecord,
  CurrentUser,
  ScheduleStatus,
  KBK,
  CurriculumPackage,
  CourseOffering,
  StudentEnrollment,
  Curriculum,
  ScheduleVersion,
  OptimizationRun,
  CourseEquivalence,
  AuditLog,
  StudentKRS,
  KRSItem,
  CourseGrade,
  GradeWeightConfig,
  GradeScaleConfig,
  RetakeDetectionResult,
  StudentSchedulePreference,
  ScheduleSnapshot,
  ScheduleChangeLog,
  ScheduleChangeAction,
  ScheduleChangeEntityType,
  ExamType,
  AcademicTerm,
  ExamSession,
  ExamOffering,
  ExamConflictItem,
  ExamVersion,
  ExamChangeLog,
  ExamConfig,
  ScheduleDraftMetadata,
} from '../types';
import { MasterLecturerAssignment, MasterLecturerValidationReport, MasterLecturerImportBatch } from '../types/masterLecturer';
import { MasterLecturerService } from './masterLecturerService';
import {
  INITIAL_COURSES,
  INITIAL_LECTURERS,
  INITIAL_STUDENTS,
  INITIAL_CLASSES,
  INITIAL_ROOMS,
  INITIAL_TIMESLOTS,
  DEFAULT_PARAMETERS,
  DEFAULT_WEIGHTS,
  INITIAL_KBKS,
  INITIAL_CURRICULUM_PACKAGES,
  INITIAL_COURSE_OFFERINGS,
  INITIAL_ENROLLMENTS,
} from '../data/initialData';
import { INITIAL_CURRICULA } from '../data/curriculumDataset';
import { determineStudentCurriculum, StudentCreditCsvRow } from '../utils/curriculumDetermination';
import {
  DEFAULT_GRADE_WEIGHT_CONFIG,
  DEFAULT_GRADE_SCALE_CONFIG,
  generateSyntheticKRSAndGrades,
  calculateStudentAcademicSummary,
} from './dummyKRSService';
import { detectRetakeCourses } from './retakeDetectionService';
import { sortAndReindexSessions } from '../utils/sessionUtils';

export const INITIAL_COURSE_EQUIVALENCES: CourseEquivalence[] = [
  {
    id: 'eq-1',
    sourceCurriculumYear: 2022,
    sourceCourseId: 'crs-fbs1101',
    sourceCourseCode: 'FBS1101',
    sourceCourseName: 'Agama',
    targetCurriculumYear: 2026,
    targetCourseId: 'crs-mwk1071101',
    targetCourseCode: 'MWK1071101',
    targetCourseName: 'Agama',
    equivalenceType: 'Wajib',
    notes: 'Penyetaraan mata kuliah Wajib Universitas',
    verified: true,
  },
  {
    id: 'eq-2',
    sourceCurriculumYear: 2022,
    sourceCourseId: 'crs-fbs1102',
    sourceCourseCode: 'FBS1102',
    sourceCourseName: 'Fisika Listrik dan Magnet',
    targetCurriculumYear: 2026,
    targetCourseId: 'crs-mps1071101',
    targetCourseCode: 'MPS1071101',
    targetCourseName: 'Fisika Listrik dan Magnet',
    equivalenceType: 'Wajib',
    notes: 'Penyetaraan mata kuliah Dasar Bersama',
    verified: true,
  },
  {
    id: 'eq-3',
    sourceCurriculumYear: 2022,
    sourceCourseId: 'crs-fbs2118',
    sourceCourseCode: 'FBS2118',
    sourceCourseName: 'Rangkaian Logika',
    targetCurriculumYear: 2026,
    targetCourseId: 'crs-mps1071107',
    targetCourseCode: 'MPS1071107',
    targetCourseName: 'Rangkaian Logika',
    equivalenceType: 'Wajib',
    notes: 'Penyetaraan Rangkaian Logika (Kurikulum 2022 Sem 3 -> Kurikulum 2026 Sem 1)',
    verified: true,
  },
  {
    id: 'eq-4',
    sourceCurriculumYear: 2022,
    sourceCourseId: 'crs-fbs2122',
    sourceCourseCode: 'FBS2122',
    sourceCourseName: 'Rangkaian Listrik II',
    targetCurriculumYear: 2026,
    targetCourseId: 'crs-mps1073116',
    targetCourseCode: 'MPS1073116',
    targetCourseName: 'Rangkaian Listrik II',
    equivalenceType: 'Wajib',
    notes: 'Penyetaraan Rangkaian Listrik II',
    verified: true,
  },
  {
    id: 'eq-5',
    sourceCurriculumYear: 2022,
    sourceCourseId: 'crs-fbs2227',
    sourceCourseCode: 'FBS2227',
    sourceCourseName: 'Sistem Mikroprosesor',
    targetCurriculumYear: 2026,
    targetCourseId: 'crs-mps1074121',
    targetCourseCode: 'MPS1074121',
    targetCourseName: 'Mikroprosesor dan Mikrokontroler',
    equivalenceType: 'Wajib',
    notes: 'Penyetaraan Sistem Mikroprosesor ke Mikroprosesor & Mikrokontroler',
    verified: true,
  },
  {
    id: 'eq-6',
    sourceCurriculumYear: 2022,
    sourceCourseId: 'crs-fbs3133',
    sourceCourseCode: 'FBS3133',
    sourceCourseName: 'Pengolahan Sinyal Digital',
    targetCurriculumYear: 2026,
    targetCourseId: 'crs-mps1075126',
    targetCourseCode: 'MPS1075126',
    targetCourseName: 'Pengolahan Sinyal Digital',
    equivalenceType: 'Wajib',
    notes: 'Penyetaraan PSD Paket Bersama',
    verified: true,
  },
];

const GRADE_POINT_LOOKUP: Record<string, number> = {
  'A': 4.0,
  'B+': 3.5,
  'B': 3.0,
  'C+': 2.5,
  'C': 2.0,
  'D+': 1.5,
  'D': 1.0,
  'E': 0.0,
  'K': 0.0,
  '-': 0.0,
};

export interface PersistentScheduleMeta {
  initialized: boolean;
  hasActiveSchedule: boolean;
  activeScheduleId: string | null;
  status: 'draft' | 'optimized' | 'published';
  updatedAt: string;
  deletedAt?: string | null;
}

const STORAGE_KEYS = {
  SCHEDULE_STORAGE_INITIALIZED: 'elektro_sched_storage_initialized',
  SCHEDULE_STATE_META: 'elektro_sched_schedule_state_meta',
  ACTIVE_SCHEDULE_ID: 'elektro_sched_active_schedule_id',
  CURRICULA: 'elektro_sched_curricula',
  COURSES: 'elektro_sched_courses',
  LECTURERS: 'elektro_sched_lecturers',
  STUDENTS: 'elektro_sched_students',
  CLASSES: 'elektro_sched_classes',
  ROOMS: 'elektro_sched_rooms',
  TIMESLOTS: 'elektro_sched_timeslots',
  KBKS: 'elektro_sched_kbks',
  CURRICULUM_PACKAGES: 'elektro_sched_packages',
  COURSE_OFFERINGS: 'elektro_sched_offerings',
  STUDENT_ENROLLMENTS: 'elektro_sched_enrollments',
  CURRENT_SCHEDULE: 'elektro_sched_current_schedule',
  INITIAL_SCHEDULE: 'elektro_sched_initial_schedule',
  OPTIMIZATION_RESULT: 'elektro_sched_active_result',
  HISTORY: 'elektro_sched_history',
  PARAMETERS: 'elektro_sched_parameters',
  WEIGHTS: 'elektro_sched_weights',
  CHANGE_LOG: 'elektro_sched_change_log',
  USER_SESSION: 'elektro_sched_user_session',
  SCHEDULE_STATUS: 'elektro_sched_schedule_status',
  SCHEDULE_VERSION: 'elektro_sched_schedule_version',
  SCHEDULE_VERSIONS: 'elektro_sched_schedule_versions',
  OPTIMIZATION_RUNS: 'elektro_sched_optimization_runs',
  AUDIT_LOGS: 'elektro_sched_audit_logs',
  COURSE_EQUIVALENCES: 'elektro_sched_course_equivalences',
  ACADEMIC_YEAR: 'elektro_sched_academic_year',
  STUDENT_KRS: 'elektro_sched_student_krs',
  KRS_ITEMS: 'elektro_sched_krs_items',
  COURSE_GRADES: 'elektro_sched_course_grades',
  GRADE_WEIGHT_CONFIG: 'elektro_sched_grade_weight_config',
  GRADE_SCALE_CONFIG: 'elektro_sched_grade_scale_config',
  CURRICULUM_AVAILABILITY: 'elektro_sched_curriculum_availability',
  STUDENT_SCHEDULE_PREFERENCES: 'elektro_sched_student_preferences',
  SCHEDULE_SNAPSHOTS: 'elektro_sched_schedule_snapshots',
  SCHEDULE_CHANGE_LOGS: 'elektro_sched_schedule_change_logs',
  EXAM_SESSIONS: 'elektro_sched_exam_sessions',
  EXAM_OFFERINGS: 'elektro_sched_exam_offerings',
  EXAM_VERSIONS: 'elektro_sched_exam_versions',
  EXAM_CHANGE_LOGS: 'elektro_sched_exam_change_logs',
  EXAM_PUBLISH_STATUS: 'elektro_sched_exam_publish_status',
  EXAM_CONFIG: 'elektro_sched_exam_config',
  MASTER_LECTURERS: 'elektro_sched_master_lecturers_v2',
  MASTER_LECTURER_IMPORT_HISTORY: 'elektro_sched_master_lecturer_import_history',
  SCHEDULE_DRAFT_METADATA: 'elektro_sched_draft_metadata',
};

// In-memory runtime cache to eliminate repeated JSON.parse calls on every render
const memoryCache: Record<string, any> = {};

// Debounce timer map for background writes
const writeTimers: Record<string, any> = {};

function sanitizeOptimizationResult(result: OptimizationResult | null): OptimizationResult | null {
  if (!result) return null;

  // Downsample convergence history to at most 50 points
  let convergenceHistory = result.convergenceHistory || [];
  if (convergenceHistory.length > 50) {
    const step = Math.ceil(convergenceHistory.length / 50);
    convergenceHistory = convergenceHistory.filter((_, idx) => idx === 0 || idx === convergenceHistory.length - 1 || idx % step === 0);
  }

  // Limit sample trace to last 20 items
  let sampleTrace = result.sampleTrace || [];
  if (sampleTrace.length > 20) {
    sampleTrace = sampleTrace.slice(-20);
  }

  // Limit conflict items to top 30
  const initialConflicts = result.initialConflicts ? {
    ...result.initialConflicts,
    items: (result.initialConflicts.items || []).slice(0, 30)
  } : result.initialConflicts;

  const bestConflicts = result.bestConflicts ? {
    ...result.bestConflicts,
    items: (result.bestConflicts.items || []).slice(0, 30)
  } : result.bestConflicts;

  return {
    ...result,
    convergenceHistory,
    sampleTrace,
    initialConflicts,
    bestConflicts,
  };
}

function lightenResultForHistory(result: OptimizationResult): OptimizationResult {
  const sanitized = sanitizeOptimizationResult(result) || result;
  return {
    ...sanitized,
    initialSchedule: [],
    bestSchedule: [],
  };
}

function safeLocalStorageSet(key: string, value: any): void {
  const json = JSON.stringify(value);
  try {
    localStorage.setItem(key, json);
  } catch (err: any) {
    if (
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014
    ) {
      console.warn(`StorageService: QuotaExceededError for ${key}. Executing emergency storage pruning...`);
      try {
        // Prune history to top 1 lightened item
        const rawHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
        if (rawHistory && key !== STORAGE_KEYS.HISTORY) {
          try {
            const h = JSON.parse(rawHistory);
            if (Array.isArray(h) && h.length > 0) {
              const pruned = h.slice(0, 1).map(lightenResultForHistory);
              localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(pruned));
            } else {
              localStorage.removeItem(STORAGE_KEYS.HISTORY);
            }
          } catch {
            localStorage.removeItem(STORAGE_KEYS.HISTORY);
          }
        } else if (key === STORAGE_KEYS.HISTORY) {
          localStorage.removeItem(STORAGE_KEYS.HISTORY);
        }

        // Prune or remove large logs
        localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
        localStorage.removeItem(STORAGE_KEYS.CHANGE_LOG);
        localStorage.removeItem(STORAGE_KEYS.SCHEDULE_CHANGE_LOGS);
        localStorage.removeItem(STORAGE_KEYS.MASTER_LECTURER_IMPORT_HISTORY);
        localStorage.removeItem(STORAGE_KEYS.OPTIMIZATION_RUNS);

        // Prune snapshots if needed
        const rawSnapshots = localStorage.getItem(STORAGE_KEYS.SCHEDULE_SNAPSHOTS);
        if (rawSnapshots && key !== STORAGE_KEYS.SCHEDULE_SNAPSHOTS) {
          try {
            const snaps = JSON.parse(rawSnapshots);
            if (Array.isArray(snaps) && snaps.length > 2) {
              localStorage.setItem(STORAGE_KEYS.SCHEDULE_SNAPSHOTS, JSON.stringify(snaps.slice(0, 2)));
            }
          } catch {
            localStorage.removeItem(STORAGE_KEYS.SCHEDULE_SNAPSHOTS);
          }
        }
      } catch (pruneErr) {
        console.error('StorageService: Error during emergency storage pruning', pruneErr);
      }

      // Retry after pruning
      try {
        localStorage.setItem(key, json);
      } catch (finalErr) {
        console.warn(`StorageService: Failed to save ${key} to localStorage after pruning. Value preserved in memory cache.`, finalErr);
      }
    } else {
      console.error(`StorageService: Error saving ${key}`, err);
    }
  }
}

function getCached<T>(key: string, defaultValue: T): T {
  if (memoryCache[key] !== undefined) {
    return memoryCache[key];
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache[key] = parsed;
      return parsed;
    }
  } catch (err) {
    console.error(`StorageService: Error parsing ${key}`, err);
  }
  memoryCache[key] = defaultValue;
  return defaultValue;
}

function setCached<T>(key: string, value: T, debounceMs: number = 0): void {
  memoryCache[key] = value;
  if (debounceMs > 0) {
    if (writeTimers[key]) clearTimeout(writeTimers[key]);
    writeTimers[key] = setTimeout(() => {
      safeLocalStorageSet(key, value);
    }, debounceMs);
  } else {
    safeLocalStorageSet(key, value);
  }
}

function removeCached(key: string): void {
  delete memoryCache[key];
  if (writeTimers[key]) {
    clearTimeout(writeTimers[key]);
    delete writeTimers[key];
  }
  localStorage.removeItem(key);
}

export class StorageService {
  public static init(): void {
    // 1. Mark schedule storage as permanently initialized
    localStorage.setItem(STORAGE_KEYS.SCHEDULE_STORAGE_INITIALIZED, 'true');

    // 2. Ensure explicit persistent schedule state exists
    this.getScheduleStateMeta();

    if (!localStorage.getItem(STORAGE_KEYS.CURRICULA)) {
      this.saveCurricula(INITIAL_CURRICULA);
    }
    const currentCourses = localStorage.getItem(STORAGE_KEYS.COURSES);
    if (!currentCourses || JSON.parse(currentCourses).length !== INITIAL_COURSES.length) {
      this.saveCourses(INITIAL_COURSES);
    }
    const currentLecs = localStorage.getItem(STORAGE_KEYS.LECTURERS);
    if (!currentLecs || JSON.parse(currentLecs).length !== INITIAL_LECTURERS.length) {
      this.saveLecturers(INITIAL_LECTURERS);
    }
    const currentStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!currentStudents || JSON.parse(currentStudents).length !== INITIAL_STUDENTS.length) {
      this.saveStudents(INITIAL_STUDENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
      this.saveClasses(INITIAL_CLASSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ROOMS)) {
      this.saveRooms(INITIAL_ROOMS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TIMESLOTS)) {
      this.saveTimeslots(INITIAL_TIMESLOTS);
    }
    const currentKbks = localStorage.getItem(STORAGE_KEYS.KBKS);
    if (!currentKbks || JSON.parse(currentKbks).length !== INITIAL_KBKS.length) {
      this.saveKbks(INITIAL_KBKS);
    }
    const currentPackages = localStorage.getItem(STORAGE_KEYS.CURRICULUM_PACKAGES);
    if (!currentPackages || JSON.parse(currentPackages).length !== INITIAL_CURRICULUM_PACKAGES.length) {
      this.saveCurriculumPackages(INITIAL_CURRICULUM_PACKAGES);
    } else {
      // Check if courseItems is present in packages
      try {
        const parsed = JSON.parse(currentPackages);
        if (!parsed[0]?.courseItems) {
          this.saveCurriculumPackages(INITIAL_CURRICULUM_PACKAGES);
        }
      } catch {
        this.saveCurriculumPackages(INITIAL_CURRICULUM_PACKAGES);
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.COURSE_OFFERINGS)) {
      this.saveCourseOfferings([]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDENT_ENROLLMENTS)) {
      this.saveStudentEnrollments(INITIAL_ENROLLMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.COURSE_EQUIVALENCES)) {
      this.saveCourseEquivalences(INITIAL_COURSE_EQUIVALENCES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE_VERSIONS)) {
      const initialVer: ScheduleVersion = {
        id: 'ver-v1-default',
        academicYear: '2026/2027 Ganjil',
        academicTerm: 'Ganjil',
        versionNumber: 1,
        name: 'Versi 1.0 (Draft Awal)',
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: 'Administrator',
        scheduleAssignments: [],
        notes: 'Versi dasar sistem',
      };
      this.saveScheduleVersions([initialVer]);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARAMETERS)) {
      this.saveParameters(DEFAULT_PARAMETERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WEIGHTS)) {
      this.saveWeights(DEFAULT_WEIGHTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE_SNAPSHOTS)) {
      const currentAssignments = this.getCurrentSchedule() || [];
      const currentOfferings = this.getCourseOfferings();
      const currentTimeslots = this.getTimeslots();

      const sampleSnapshots: ScheduleSnapshot[] = [
        {
          id: 'snap-final-published',
          name: '2026/2027 Ganjil — Final Published',
          academicYear: '2026/2027',
          academicTerm: 'Ganjil',
          curriculumConfig: { version: '2026', totalCredits: 144 },
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          createdBy: 'Administrator',
          notes: 'Snapshot jadwal resmi yang telah diterbitkan untuk seluruh civitas akademika.',
          scheduleData: currentAssignments,
          courseOfferingData: currentOfferings,
          sessionData: currentTimeslots,
          metrics: {
            totalAssignments: currentAssignments.length || 38,
            totalOfferings: currentOfferings.length || 38,
            hardConflicts: 0,
            softConflicts: 2,
            cost: 14.5,
          },
        },
        {
          id: 'snap-post-sa',
          name: '2026/2027 Ganjil — Setelah Optimasi',
          academicYear: '2026/2027',
          academicTerm: 'Ganjil',
          curriculumConfig: { version: '2026', totalCredits: 144 },
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          createdBy: 'Administrator',
          notes: 'Hasil konvergensi algoritma Simulated Annealing tanpa konflik dosen dan ruang.',
          scheduleData: currentAssignments,
          courseOfferingData: currentOfferings,
          sessionData: currentTimeslots,
          metrics: {
            totalAssignments: currentAssignments.length || 38,
            totalOfferings: currentOfferings.length || 38,
            hardConflicts: 0,
            softConflicts: 4,
            cost: 26.0,
          },
        },
        {
          id: 'snap-final-v1',
          name: '2026/2027 Ganjil — Final v1',
          academicYear: '2026/2027',
          academicTerm: 'Ganjil',
          curriculumConfig: { version: '2026', totalCredits: 144 },
          createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          createdBy: 'Administrator',
          notes: 'Draft versi 1 sebelum penyesuaian ketersediaan dosen pengampu KBK.',
          scheduleData: currentAssignments,
          courseOfferingData: currentOfferings,
          sessionData: currentTimeslots,
          metrics: {
            totalAssignments: currentAssignments.length || 38,
            totalOfferings: currentOfferings.length || 38,
            hardConflicts: 1,
            softConflicts: 8,
            cost: 112.0,
          },
        },
      ];
      this.saveScheduleSnapshots(sampleSnapshots);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE_CHANGE_LOGS)) {
      const sampleLogs: ScheduleChangeLog[] = [
        {
          id: 'log-seed-1',
          entityType: 'SYSTEM',
          entityId: 'sys-init',
          action: 'INITIAL_GENERATE',
          before: null,
          after: { totalOfferings: 38 },
          description: 'Penyusunan jadwal awal berbasis distribusi paket semester dan ketersediaan dosen',
          changedBy: 'Administrator',
          changedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          semester: 1,
        },
        {
          id: 'log-seed-2',
          entityType: 'ScheduleAssignment',
          entityId: 'assign-opt-sa',
          action: 'SA_OPTIMIZATION',
          before: { hardConflicts: 6, cost: 240 },
          after: { hardConflicts: 0, cost: 14.5 },
          description: 'Eksekusi Optimasi Simulated Annealing (T0=1000, alpha=0.995, Iterasi=3000)',
          changedBy: 'Administrator',
          changedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 'log-seed-3',
          entityType: 'ScheduleSnapshot',
          entityId: 'snap-final-published',
          action: 'PUBLISH_SCHEDULE',
          before: { status: 'draft' },
          after: { status: 'published' },
          description: 'Menerbitkan jadwal perkuliahan secara resmi ke portal dosen dan mahasiswa',
          changedBy: 'Administrator',
          changedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ];
      this.saveScheduleChangeLogs(sampleLogs);
    }
    const ACADEMIC_SCHEMA_VERSION = 'v2026_sem7_fix_v2';
    const storedAcademicVer = localStorage.getItem('ACADEMIC_DATA_VERSION');
    if (
      storedAcademicVer !== ACADEMIC_SCHEMA_VERSION ||
      !localStorage.getItem(STORAGE_KEYS.STUDENT_KRS) ||
      !localStorage.getItem(STORAGE_KEYS.KRS_ITEMS)
    ) {
      this.reseedAcademicData();
      localStorage.setItem('ACADEMIC_DATA_VERSION', ACADEMIC_SCHEMA_VERSION);
    }
  }

  public static resetDemoData(): void {
    this.saveCurricula(INITIAL_CURRICULA);
    this.saveCourses(INITIAL_COURSES);
    this.saveLecturers(INITIAL_LECTURERS);
    this.saveStudents(INITIAL_STUDENTS);
    this.saveClasses(INITIAL_CLASSES);
    this.saveRooms(INITIAL_ROOMS);
    this.saveTimeslots(INITIAL_TIMESLOTS);
    this.saveKbks(INITIAL_KBKS);
    this.saveCurriculumPackages(INITIAL_CURRICULUM_PACKAGES);
    this.saveCourseOfferings(INITIAL_COURSE_OFFERINGS);
    this.saveStudentEnrollments(INITIAL_ENROLLMENTS);
    this.saveParameters(DEFAULT_PARAMETERS);
    this.saveWeights(DEFAULT_WEIGHTS);
    this.reseedAcademicData();
    removeCached(STORAGE_KEYS.CURRENT_SCHEDULE);
    removeCached(STORAGE_KEYS.INITIAL_SCHEDULE);
    removeCached(STORAGE_KEYS.OPTIMIZATION_RESULT);
    removeCached(STORAGE_KEYS.CHANGE_LOG);
  }

  // Curricula
  public static getCurricula(): Curriculum[] {
    return getCached(STORAGE_KEYS.CURRICULA, INITIAL_CURRICULA);
  }
  public static saveCurricula(curricula: Curriculum[]): void {
    setCached(STORAGE_KEYS.CURRICULA, curricula);
  }

  // Curriculum Availability per Academic Year
  public static getCurriculumAvailability(academicYear: string = '2026/2027'): Record<number, boolean> {
    const defaultVal: Record<number, boolean> = { 2026: true, 2022: true };
    const all = getCached<Record<string, Record<number, boolean>>>(STORAGE_KEYS.CURRICULUM_AVAILABILITY, {});
    return { ...defaultVal, ...(all[academicYear] || {}) };
  }

  public static setCurriculumAvailability(
    year: 2022 | 2026,
    isActive: boolean,
    academicYear: string = '2026/2027'
  ): Record<number, boolean> {
    const all = getCached<Record<string, Record<number, boolean>>>(STORAGE_KEYS.CURRICULUM_AVAILABILITY, {});
    const current = { ...(all[academicYear] || { 2026: true, 2022: true }) };
    current[year] = isActive;
    all[academicYear] = current;
    setCached(STORAGE_KEYS.CURRICULUM_AVAILABILITY, all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curriculum-availability-changed', { detail: { academicYear, availability: current } }));
    }
    return current;
  }

  public static saveCurriculumAvailability(
    availability: Record<number, boolean>,
    academicYear: string = '2026/2027'
  ): void {
    const all = getCached<Record<string, Record<number, boolean>>>(STORAGE_KEYS.CURRICULUM_AVAILABILITY, {});
    all[academicYear] = availability;
    setCached(STORAGE_KEYS.CURRICULUM_AVAILABILITY, all);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('curriculum-availability-changed', { detail: { academicYear, availability } }));
    }
  }

  // KBK
  public static getKbks(): KBK[] {
    const cached = getCached(STORAGE_KEYS.KBKS, INITIAL_KBKS);
    let modified = false;
    const migrated = cached.map(k => {
      if (
        k.id === 'kbk-elektronika-komunikasi' &&
        (k.name === 'Elektronika Komunikasi' || k.name === 'Elektronika Telekomunikasi')
      ) {
        modified = true;
        return {
          ...k,
          name: 'Elektronika Digital dan Telekomunikasi',
          description: 'Penggabungan Konsentrasi Telekomunikasi dan Elektronika. Fokus pada Sistem Elektronika Digital, Telekomunikasi Nirkabel & Satelit, Gelombang Mikro & Antena, Pengolahan Sinyal Digital, Sistem Tertanam (Embedded/IoT), Sensor & Otomasi Industri.',
        };
      }
      return k;
    });
    if (modified) {
      this.saveKbks(migrated);
    }
    return migrated;
  }
  public static saveKbks(kbks: KBK[]): void {
    setCached(STORAGE_KEYS.KBKS, kbks);
  }

  // Curriculum Packages
  public static getCurriculumPackages(): CurriculumPackage[] {
    return getCached(STORAGE_KEYS.CURRICULUM_PACKAGES, INITIAL_CURRICULUM_PACKAGES);
  }
  public static saveCurriculumPackages(packages: CurriculumPackage[]): void {
    setCached(STORAGE_KEYS.CURRICULUM_PACKAGES, packages);
  }
  public static updateCurriculumPackage(updatedPackage: CurriculumPackage): void {
    const packages = this.getCurriculumPackages();
    const index = packages.findIndex((p) => p.id === updatedPackage.id);
    if (index !== -1) {
      packages[index] = updatedPackage;
    } else {
      packages.push(updatedPackage);
    }
    this.saveCurriculumPackages(packages);
  }

  // Course Offerings
  public static getCourseOfferings(): CourseOffering[] {
    const raw = getCached<CourseOffering[]>(STORAGE_KEYS.COURSE_OFFERINGS, []);
    if (!raw || !Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const deduplicated: CourseOffering[] = [];
    for (const off of raw) {
      if (!off || !off.id) continue;
      if (seen.has(off.id)) {
        let counter = 2;
        let uniqueId = `${off.id}-${counter}`;
        while (seen.has(uniqueId)) {
          counter++;
          uniqueId = `${off.id}-${counter}`;
        }
        seen.add(uniqueId);
        deduplicated.push({ ...off, id: uniqueId });
      } else {
        seen.add(off.id);
        deduplicated.push(off);
      }
    }
    return deduplicated;
  }
  public static saveCourseOfferings(offerings: CourseOffering[]): void {
    const seen = new Set<string>();
    const deduplicated: CourseOffering[] = [];
    for (const off of offerings) {
      if (!off || !off.id) continue;
      if (seen.has(off.id)) {
        let counter = 2;
        let uniqueId = `${off.id}-${counter}`;
        while (seen.has(uniqueId)) {
          counter++;
          uniqueId = `${off.id}-${counter}`;
        }
        seen.add(uniqueId);
        deduplicated.push({ ...off, id: uniqueId });
      } else {
        seen.add(off.id);
        deduplicated.push(off);
      }
    }
    setCached(STORAGE_KEYS.COURSE_OFFERINGS, deduplicated, 200);
  }

  // Schedule Draft Creation Metadata (Mode, Template Type, Selected Courses)
  public static getScheduleDraftMetadata(): ScheduleDraftMetadata | null {
    return getCached(STORAGE_KEYS.SCHEDULE_DRAFT_METADATA, null);
  }
  public static saveScheduleDraftMetadata(metadata: ScheduleDraftMetadata): void {
    setCached(STORAGE_KEYS.SCHEDULE_DRAFT_METADATA, metadata, 200);
  }
  public static clearScheduleDraftMetadata(): void {
    setCached(STORAGE_KEYS.SCHEDULE_DRAFT_METADATA, null, 0);
  }

  // Student Enrollments
  public static getStudentEnrollments(): StudentEnrollment[] {
    return getCached(STORAGE_KEYS.STUDENT_ENROLLMENTS, INITIAL_ENROLLMENTS);
  }
  public static saveStudentEnrollments(enrollments: StudentEnrollment[]): void {
    setCached(STORAGE_KEYS.STUDENT_ENROLLMENTS, enrollments, 200);
  }

  // Students
  public static getStudents(): Student[] {
    return getCached(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  }
  public static saveStudents(students: Student[]): void {
    setCached(STORAGE_KEYS.STUDENTS, students, 200);
  }
  public static updateStudent(updatedStudent: Student): void {
    const students = this.getStudents();
    const index = students.findIndex((s) => s.id === updatedStudent.id);
    if (index !== -1) {
      students[index] = updatedStudent;
      this.saveStudents(students);
    }
  }

  /**
   * Batch update student credits from CSV and recalculate curriculum
   */
  public static batchUpdateStudentCredits(rows: StudentCreditCsvRow[]): {
    updatedCount: number;
    createdCount: number;
    details: { nim: string; oldCurriculum?: number; newCurriculum: number; reason: string }[];
  } {
    const students = [...this.getStudents()];
    const details: { nim: string; oldCurriculum?: number; newCurriculum: number; reason: string }[] = [];
    let updatedCount = 0;
    let createdCount = 0;

    for (const row of rows) {
      const existing = students.find((s) => s.nim.toUpperCase() === row.nim.toUpperCase());
      const cohortYear = row.cohortYear || existing?.cohortYear || 2023;
      const determination = determineStudentCurriculum(
        cohortYear,
        row.totalEarnedCredits,
        existing?.isManualCurriculumOverride,
        existing?.curriculumYear,
        existing?.curriculumOverrideReason
      );

      if (existing) {
        const oldCurr = existing.curriculumYear;
        existing.totalEarnedCredits = row.totalEarnedCredits;
        existing.cohortYear = cohortYear;
        existing.curriculumYear = determination.curriculumYear;
        existing.curriculumId = determination.curriculumId;
        existing.curriculumDeterminationReason = determination.reason;

        if (row.kbkCode) {
          const kbk = this.getKbks().find((k) => k.code.toUpperCase() === row.kbkCode?.toUpperCase() || k.id === row.kbkCode);
          if (kbk) existing.kbkId = kbk.id;
        }

        details.push({
          nim: existing.nim,
          oldCurriculum: oldCurr,
          newCurriculum: determination.curriculumYear,
          reason: determination.reason,
        });
        updatedCount++;
      } else {
        // Create student record
        const newStudent: Student = {
          id: `std-${row.nim.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          nim: row.nim,
          name: row.name || `Mahasiswa ${row.nim}`,
          classId: 'cls-5a',
          semester: 5,
          currentSemester: 5,
          cohortYear,
          status: 'active',
          totalEarnedCredits: row.totalEarnedCredits,
          curriculumYear: determination.curriculumYear,
          curriculumId: determination.curriculumId,
          curriculumDeterminationReason: determination.reason,
          enrolledCourseIds: [],
          isActive: true,
        };
        students.push(newStudent);
        details.push({
          nim: newStudent.nim,
          newCurriculum: determination.curriculumYear,
          reason: determination.reason,
        });
        createdCount++;
      }
    }

    this.saveStudents(students);
    return { updatedCount, createdCount, details };
  }

  // Courses
  public static getCourses(): Course[] {
    const list: Course[] = getCached(STORAGE_KEYS.COURSES, INITIAL_COURSES);
    const seen = new Set<string>();
    const uniqueCourses: Course[] = [];
    let hasDuplicates = false;

    for (const c of list) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        uniqueCourses.push(c);
      } else {
        hasDuplicates = true;
      }
    }

    if (hasDuplicates) {
      this.saveCourses(uniqueCourses);
    }

    return uniqueCourses;
  }
  public static saveCourses(courses: Course[]): void {
    setCached(STORAGE_KEYS.COURSES, courses, 200);
  }
  public static updateCourse(updatedCourse: Course): void {
    const courses = this.getCourses();
    const index = courses.findIndex((c) => c.id === updatedCourse.id);
    if (index !== -1) {
      courses[index] = updatedCourse;
      this.saveCourses(courses);
    }
  }
  public static updateCourseClassification(
    courseId: string,
    updates: Partial<Course> & { adminNotes?: string }
  ): Course | null {
    const courses = this.getCourses();
    const index = courses.findIndex((c) => c.id === courseId);
    if (index === -1) return null;

    const current = courses[index];
    const updated: Course = {
      ...current,
      ...updates,
      classificationStatus: updates.classificationStatus || 'admin-corrected',
      adminNotes: updates.adminNotes ?? current.adminNotes,
    };

    courses[index] = updated;
    this.saveCourses(courses);
    return updated;
  }

  // Lecturers
  public static getLecturers(): Lecturer[] {
    return getCached(STORAGE_KEYS.LECTURERS, INITIAL_LECTURERS);
  }
  public static saveLecturers(lecturers: Lecturer[]): void {
    setCached(STORAGE_KEYS.LECTURERS, lecturers, 200);
  }

  // Classes
  public static getClasses(): ClassGroup[] {
    return getCached(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  }
  public static saveClasses(classes: ClassGroup[]): void {
    setCached(STORAGE_KEYS.CLASSES, classes, 200);
  }

  // Rooms
  public static getRooms(): Room[] {
    const cached = getCached<Room[] | null>(STORAGE_KEYS.ROOMS, null);
    if (!cached || !Array.isArray(cached) || cached.length === 0 || cached.some(r => r.id === 'rm-101' || r.code === 'TE-101')) {
      this.saveRooms(INITIAL_ROOMS);
      return INITIAL_ROOMS;
    }
    return cached;
  }
  public static saveRooms(rooms: Room[]): void {
    setCached(STORAGE_KEYS.ROOMS, rooms, 200);
  }
  public static resetRoomsToDefault(): Room[] {
    this.saveRooms(INITIAL_ROOMS);
    return INITIAL_ROOMS;
  }

  // Timeslots (Sesi Waktu)
  public static getTimeslots(): Timeslot[] {
    const raw = getCached<Timeslot[] | null>(STORAGE_KEYS.TIMESLOTS, null);
    // If null, empty, or outdated legacy format (07:30-09:10 or 100min duration), reset to new 12 standard default sessions
    if (!raw || !Array.isArray(raw) || raw.length === 0 || raw.some(t => (t.startTime === '07:30' && t.endTime === '09:10') || t.durationMinutes === 100)) {
      const reindexed = sortAndReindexSessions(INITIAL_TIMESLOTS);
      this.saveTimeslots(reindexed);
      return reindexed;
    }
    return sortAndReindexSessions(raw);
  }
  public static saveTimeslots(timeslots: Timeslot[]): void {
    const reindexed = sortAndReindexSessions(timeslots);
    setCached(STORAGE_KEYS.TIMESLOTS, reindexed, 200);
  }
  public static resetTimeslotsToDefault(): Timeslot[] {
    const reindexed = sortAndReindexSessions(INITIAL_TIMESLOTS);
    this.saveTimeslots(reindexed);
    return reindexed;
  }

  // Schedules & Persistent State Meta
  public static isScheduleStorageInitialized(): boolean {
    return localStorage.getItem(STORAGE_KEYS.SCHEDULE_STORAGE_INITIALIZED) === 'true';
  }

  public static getScheduleStateMeta(): PersistentScheduleMeta {
    const raw = getCached<PersistentScheduleMeta | null>(STORAGE_KEYS.SCHEDULE_STATE_META, null);
    if (raw && typeof raw === 'object' && typeof raw.hasActiveSchedule === 'boolean') {
      return raw;
    }

    // Inspect current storage to determine initialized state
    const rawCurrent = localStorage.getItem(STORAGE_KEYS.CURRENT_SCHEDULE);
    let hasSchedule = false;
    if (rawCurrent) {
      try {
        const parsed = JSON.parse(rawCurrent);
        hasSchedule = Array.isArray(parsed) && parsed.length > 0;
      } catch {
        hasSchedule = false;
      }
    }

    const currentStatus = this.getScheduleStatus();
    const meta: PersistentScheduleMeta = {
      initialized: true,
      hasActiveSchedule: hasSchedule,
      activeScheduleId: hasSchedule ? this.getActiveScheduleId() : null,
      status: currentStatus,
      updatedAt: new Date().toISOString(),
    };
    setCached(STORAGE_KEYS.SCHEDULE_STATE_META, meta, 100);
    return meta;
  }

  public static updateScheduleStateMeta(partial: Partial<PersistentScheduleMeta>): void {
    const current = this.getScheduleStateMeta();
    const updated: PersistentScheduleMeta = {
      ...current,
      ...partial,
      initialized: true,
      updatedAt: new Date().toISOString(),
    };
    setCached(STORAGE_KEYS.SCHEDULE_STATE_META, updated, 100);
  }

  public static hasActiveSchedule(): boolean {
    const meta = this.getScheduleStateMeta();
    if (!meta.hasActiveSchedule) return false;
    const current = getCached<ScheduleAssignment[] | null>(STORAGE_KEYS.CURRENT_SCHEDULE, null);
    return Array.isArray(current) && current.length > 0;
  }

  public static getActiveScheduleId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ID) || null;
  }

  public static setActiveScheduleId(id: string | null): void {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SCHEDULE_ID);
    }
  }

  public static getCurrentSchedule(): ScheduleAssignment[] | null {
    if (!this.hasActiveSchedule()) {
      return null;
    }
    const current = getCached<ScheduleAssignment[] | null>(STORAGE_KEYS.CURRENT_SCHEDULE, null);
    if (!current || !Array.isArray(current) || current.length === 0) {
      return null;
    }
    return current;
  }

  public static saveCurrentSchedule(schedule: ScheduleAssignment[] | null | undefined): void {
    if (!schedule || schedule.length === 0) {
      setCached(STORAGE_KEYS.CURRENT_SCHEDULE, null);
      this.setActiveScheduleId(null);
      this.updateScheduleStateMeta({
        hasActiveSchedule: false,
        activeScheduleId: null,
      });
    } else {
      setCached(STORAGE_KEYS.CURRENT_SCHEDULE, schedule, 100);
      this.updateScheduleStateMeta({
        hasActiveSchedule: true,
      });
    }
  }

  public static getInitialSchedule(): ScheduleAssignment[] | null {
    if (!this.hasActiveSchedule()) return null;
    return getCached(STORAGE_KEYS.INITIAL_SCHEDULE, null);
  }

  public static saveInitialSchedule(schedule: ScheduleAssignment[] | null | undefined): void {
    if (!schedule || schedule.length === 0) {
      setCached(STORAGE_KEYS.INITIAL_SCHEDULE, null);
    } else {
      setCached(STORAGE_KEYS.INITIAL_SCHEDULE, schedule, 100);
    }
  }

  // Optimization Results & History
  public static getActiveOptimizationResult(): OptimizationResult | null {
    return getCached(STORAGE_KEYS.OPTIMIZATION_RESULT, null);
  }
  public static saveActiveOptimizationResult(result: OptimizationResult): void {
    const sanitized = sanitizeOptimizationResult(result) || result;
    setCached(STORAGE_KEYS.OPTIMIZATION_RESULT, sanitized);
    this.addHistory(sanitized);
  }
  public static addOptimizationResult(result: OptimizationResult): void {
    this.saveActiveOptimizationResult(result);
  }

  public static getHistory(): OptimizationResult[] {
    return getCached(STORAGE_KEYS.HISTORY, []);
  }
  public static getOptimizationHistory(): OptimizationResult[] {
    return this.getHistory();
  }
  public static addHistory(result: OptimizationResult): void {
    const history = this.getHistory();
    const lightened = lightenResultForHistory(result);
    const updated = [lightened, ...history.filter(h => h.id !== result.id)].slice(0, 5);
    setCached(STORAGE_KEYS.HISTORY, updated);
  }
  public static clearHistory(): void {
    removeCached(STORAGE_KEYS.HISTORY);
  }

  // Permission Guard
  public static assertAdmin(user?: CurrentUser): void {
    const activeUser = user || this.getCurrentUser();
    if (activeUser?.role !== 'admin') {
      throw new Error('Akses ditolak. Hanya Administrator yang memiliki hak akses modifikasi data.');
    }
  }

  // ==========================================
  // SCHEDULE SNAPSHOTS (Riwayat & Versi Jadwal)
  // ==========================================
  public static getScheduleSnapshots(): ScheduleSnapshot[] {
    return getCached(STORAGE_KEYS.SCHEDULE_SNAPSHOTS, []);
  }

  public static getScheduleSnapshotById(id: string): ScheduleSnapshot | undefined {
    return this.getScheduleSnapshots().find((s) => s.id === id);
  }

  public static saveScheduleSnapshots(snapshots: ScheduleSnapshot[], user?: CurrentUser): void {
    if (user) this.assertAdmin(user);
    setCached(STORAGE_KEYS.SCHEDULE_SNAPSHOTS, snapshots, 0);
  }

  public static saveScheduleSnapshot(snapshot: ScheduleSnapshot, user?: CurrentUser): ScheduleSnapshot {
    this.assertAdmin(user);
    const snapshots = this.getScheduleSnapshots();
    const index = snapshots.findIndex((s) => s.id === snapshot.id);
    let updated: ScheduleSnapshot[];
    if (index >= 0) {
      updated = [...snapshots];
      updated[index] = snapshot;
    } else {
      updated = [snapshot, ...snapshots];
    }
    this.saveScheduleSnapshots(updated, user);

    this.addScheduleChangeLog({
      entityType: 'ScheduleSnapshot',
      entityId: snapshot.id,
      action: 'SAVE_SNAPSHOT',
      before: null,
      after: { name: snapshot.name, academicYear: snapshot.academicYear },
      description: `Menyimpan snapshot jadwal: "${snapshot.name}"`,
      changedBy: user?.name || this.getCurrentUser().name,
    });

    return snapshot;
  }

  public static createSnapshotFromCurrent(
    name: string,
    notes?: string,
    user?: CurrentUser,
    isAutoBackup: boolean = false
  ): ScheduleSnapshot {
    if (!isAutoBackup) {
      this.assertAdmin(user);
    }
    const currentSchedule = this.getCurrentSchedule() || [];
    const offerings = this.getCourseOfferings();
    const timeslots = this.getTimeslots();
    const academicYear = this.getAcademicYear();

    const snapshot: ScheduleSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      academicYear: academicYear.split(' ')[0] || '2026/2027',
      academicTerm: academicYear.toLowerCase().includes('genap') ? 'Genap' : 'Ganjil',
      curriculumConfig: { version: '2026', timestamp: new Date().toISOString() },
      createdAt: new Date().toISOString(),
      createdBy: user?.name || this.getCurrentUser().name || 'Administrator',
      notes: notes || (isAutoBackup ? 'Cadangan otomatis sistem' : 'Snapshot manual oleh Administrator'),
      scheduleData: JSON.parse(JSON.stringify(currentSchedule)),
      courseOfferingData: JSON.parse(JSON.stringify(offerings)),
      sessionData: JSON.parse(JSON.stringify(timeslots)),
      metrics: {
        totalAssignments: currentSchedule.length,
        totalOfferings: offerings.length,
        hardConflicts: 0,
        softConflicts: 0,
      },
      isAutoBackup,
    };

    const snapshots = this.getScheduleSnapshots();
    this.saveScheduleSnapshots([snapshot, ...snapshots]);

    this.addScheduleChangeLog({
      entityType: 'ScheduleSnapshot',
      entityId: snapshot.id,
      action: isAutoBackup ? 'CREATE_SNAPSHOT' : 'SAVE_SNAPSHOT',
      before: null,
      after: { name: snapshot.name },
      description: isAutoBackup
        ? `Backup otomatis jadwal sebelum tindakan: "${snapshot.name}"`
        : `Membuat snapshot versi jadwal: "${snapshot.name}"`,
      changedBy: user?.name || this.getCurrentUser().name,
    });

    return snapshot;
  }

  public static deleteScheduleSnapshot(id: string, user?: CurrentUser): void {
    this.assertAdmin(user);
    const snapshots = this.getScheduleSnapshots();
    const target = snapshots.find((s) => s.id === id);
    const updated = snapshots.filter((s) => s.id !== id);
    this.saveScheduleSnapshots(updated, user);

    if (target) {
      this.addScheduleChangeLog({
        entityType: 'ScheduleSnapshot',
        entityId: id,
        action: 'DELETE_SNAPSHOT',
        before: { name: target.name },
        after: null,
        description: `Menghapus snapshot jadwal: "${target.name}"`,
        changedBy: user?.name || this.getCurrentUser().name,
      });
    }
  }

  public static duplicateScheduleSnapshot(id: string, newName: string, user?: CurrentUser): ScheduleSnapshot {
    this.assertAdmin(user);
    const target = this.getScheduleSnapshotById(id);
    if (!target) throw new Error('Snapshot jadwal tidak ditemukan.');

    const copy: ScheduleSnapshot = {
      ...JSON.parse(JSON.stringify(target)),
      id: `snap-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newName,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || this.getCurrentUser().name || 'Administrator',
      sourceVersionId: target.id,
      notes: `Duplikat dari "${target.name}". ${target.notes || ''}`.trim(),
      isAutoBackup: false,
    };

    const snapshots = this.getScheduleSnapshots();
    this.saveScheduleSnapshots([copy, ...snapshots], user);

    this.addScheduleChangeLog({
      entityType: 'ScheduleSnapshot',
      entityId: copy.id,
      action: 'DUPLICATE_SNAPSHOT',
      before: { sourceId: target.id, sourceName: target.name },
      after: { newId: copy.id, newName: copy.name },
      description: `Menduplikasi snapshot "${target.name}" menjadi "${copy.name}"`,
      changedBy: user?.name || this.getCurrentUser().name,
    });

    return copy;
  }

  public static restoreScheduleSnapshot(
    id: string,
    user?: CurrentUser
  ): {
    success: boolean;
    message: string;
    autoBackupSnapshotId?: string;
    snapshot: ScheduleSnapshot;
  } {
    this.assertAdmin(user);
    const snapshot = this.getScheduleSnapshotById(id);
    if (!snapshot) {
      return { success: false, message: 'Snapshot jadwal tidak ditemukan.', snapshot: null as any };
    }

    // Step 1: Auto-backup current schedule state before restore
    const backupName = `${this.getAcademicYear()} — Auto Backup Sebelum Restore (${new Date().toLocaleTimeString('id-ID')})`;
    const backupSnapshot = this.createSnapshotFromCurrent(
      backupName,
      `Cadangan otomatis sebelum memulihkan snapshot "${snapshot.name}"`,
      user,
      true
    );

    // Step 2: Apply snapshot data
    this.saveCurrentSchedule(snapshot.scheduleData || []);
    this.saveCourseOfferings(snapshot.courseOfferingData || []);
    this.saveScheduleStatus('draft');

    // Step 3: Record change log
    this.addScheduleChangeLog({
      entityType: 'ScheduleSnapshot',
      entityId: snapshot.id,
      action: 'RESTORE_SCHEDULE',
      before: { backupSnapshotId: backupSnapshot.id },
      after: { restoredSnapshotId: snapshot.id, snapshotName: snapshot.name },
      description: `Memulihkan jadwal aktif dari snapshot "${snapshot.name}" (Auto-backup disimpan: "${backupSnapshot.name}")`,
      changedBy: user?.name || this.getCurrentUser().name,
    });

    return {
      success: true,
      message: `Jadwal berhasil dipulihkan dari "${snapshot.name}". Cadangan jadwal sebelumnya telah disimpan.`,
      autoBackupSnapshotId: backupSnapshot.id,
      snapshot,
    };
  }

  public static createScheduleFromTemplate(
    snapshotId: string,
    newAcademicYear: string,
    newAcademicTerm: string,
    newName: string,
    user?: CurrentUser
  ): {
    success: boolean;
    message: string;
    validationWarnings: string[];
    newOfferings: CourseOffering[];
    newAssignments: ScheduleAssignment[];
  } {
    this.assertAdmin(user);
    const snapshot = this.getScheduleSnapshotById(snapshotId);
    if (!snapshot) {
      return {
        success: false,
        message: 'Snapshot template tidak ditemukan.',
        validationWarnings: [],
        newOfferings: [],
        newAssignments: [],
      };
    }

    const masterCourses = this.getCourses();
    const masterLecturers = this.getLecturers();
    const masterRooms = this.getRooms();
    const masterTimeslots = this.getTimeslots();

    const courseMap = new Map(masterCourses.map((c) => [c.id, c]));
    const lecturerMap = new Map(masterLecturers.map((l) => [l.id, l]));
    const roomMap = new Map(masterRooms.map((r) => [r.id, r]));
    const timeslotMap = new Map(masterTimeslots.map((t) => [t.id, t]));

    const validationWarnings: string[] = [];

    // Map old offering ID -> new offering ID
    const offeringIdMap = new Map<string, string>();

    // 1. Re-validate & clone course offerings
    const newOfferings: CourseOffering[] = (snapshot.courseOfferingData || []).map((oldOff) => {
      const newOffId = `off-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      offeringIdMap.set(oldOff.id, newOffId);

      const courseExists = courseMap.has(oldOff.courseId);
      if (!courseExists) {
        validationWarnings.push(`Mata Kuliah "${oldOff.courseName || oldOff.code}" tidak lagi aktif di master data.`);
      }

      // Check lecturers
      const validLecIds: string[] = [];
      (oldOff.lecturerIds || (oldOff.lecturerId ? [oldOff.lecturerId] : [])).forEach((lecId) => {
        if (lecturerMap.has(lecId)) {
          validLecIds.push(lecId);
        } else {
          validationWarnings.push(`Dosen ID "${lecId}" pada MK ${oldOff.courseName} tidak ditemukan di master dosen.`);
        }
      });

      return {
        ...JSON.parse(JSON.stringify(oldOff)),
        id: newOffId,
        academicYear: newAcademicYear,
        academicTerm: newAcademicTerm as any,
        lecturerIds: validLecIds,
        lecturerId: validLecIds[0] || null,
        status: 'draft',
      };
    });

    // 2. Re-validate & clone assignments
    const newAssignments: ScheduleAssignment[] = (snapshot.scheduleData || []).map((oldAssign) => {
      const newAssignId = `asg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newOffId = oldAssign.courseOfferingId ? offeringIdMap.get(oldAssign.courseOfferingId) || oldAssign.courseOfferingId : undefined;

      if (!timeslotMap.has(oldAssign.timeslotId)) {
        validationWarnings.push(`Sesi waktu "${oldAssign.timeslotId}" tidak ditemukan.`);
      }
      if (!roomMap.has(oldAssign.roomId)) {
        validationWarnings.push(`Ruangan "${oldAssign.roomId}" tidak ditemukan.`);
      }

      return {
        ...JSON.parse(JSON.stringify(oldAssign)),
        id: newAssignId,
        courseOfferingId: newOffId,
        isLocked: false,
      };
    });

    // Apply as current draft schedule
    this.saveCourseOfferings(newOfferings);
    this.saveCurrentSchedule(newAssignments);
    this.saveAcademicYear(`${newAcademicYear} ${newAcademicTerm}`);
    this.saveScheduleStatus('draft');

    this.addScheduleChangeLog({
      entityType: 'ScheduleSnapshot',
      entityId: snapshot.id,
      action: 'TEMPLATE_APPLIED',
      before: { templateId: snapshot.id, templateName: snapshot.name },
      after: { academicYear: newAcademicYear, academicTerm: newAcademicTerm, totalOfferings: newOfferings.length },
      description: `Menerapkan template "${snapshot.name}" untuk semester baru ${newAcademicYear} ${newAcademicTerm} (Draft)`,
      changedBy: user?.name || this.getCurrentUser().name,
    });

    return {
      success: true,
      message: `Jadwal baru berhasil dibuat dari template "${snapshot.name}". Status: Draft.`,
      validationWarnings,
      newOfferings,
      newAssignments,
    };
  }

  // ==========================================
  // SCHEDULE CHANGE LOGS & AUDIT TRAIL
  // ==========================================
  public static getScheduleChangeRecords(): ScheduleChangeRecord[] {
    return getCached<ScheduleChangeRecord[]>(STORAGE_KEYS.CHANGE_LOG, []);
  }

  public static getScheduleChangeLogs(): ScheduleChangeLog[] {
    return getCached(STORAGE_KEYS.SCHEDULE_CHANGE_LOGS, []);
  }

  public static saveScheduleChangeLogs(logs: ScheduleChangeLog[]): void {
    setCached(STORAGE_KEYS.SCHEDULE_CHANGE_LOGS, logs, 0);
  }

  public static addScheduleChangeLog(
    log: (Partial<ScheduleChangeLog> & { description: string }) | ScheduleChangeRecord,
    user?: CurrentUser
  ): ScheduleChangeLog {
    const logs = this.getScheduleChangeLogs();
    const activeUser = user || this.getCurrentUser();

    // Support legacy ScheduleChangeRecord object
    if ('timestamp' in log && 'method' in log) {
      const rec = log as ScheduleChangeRecord;
      const desc = `${rec.courseName} (${rec.courseCode}) dipindahkan ke ${rec.after.day} ${rec.after.timeslotLabel} ruang ${rec.after.roomCode}. Metode: ${rec.method}. ${rec.reason ? 'Alasan: ' + rec.reason : ''}`;
      const record: ScheduleChangeLog = {
        id: rec.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entityType: 'ScheduleAssignment',
        entityId: rec.courseId,
        action: rec.method === 'Swap Recommendation' ? 'SWAP_SCHEDULE' : 'MOVE_SESSION',
        before: rec.before,
        after: rec.after,
        description: desc,
        changedBy: activeUser.name || 'Administrator',
        changedAt: rec.timestamp || new Date().toISOString(),
        courseCode: rec.courseCode,
        courseName: rec.courseName,
        isUndoable: true,
      };

      const updated = [record, ...logs].slice(0, 100);
      this.saveScheduleChangeLogs(updated);

      const legacyLogs = getCached<ScheduleChangeRecord[]>(STORAGE_KEYS.CHANGE_LOG, []);
      setCached(STORAGE_KEYS.CHANGE_LOG, [rec, ...legacyLogs].slice(0, 50), 0);

      return record;
    }

    const recLog = log as Partial<ScheduleChangeLog> & { description: string };
    const record: ScheduleChangeLog = {
      id: recLog.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entityType: recLog.entityType || 'ScheduleAssignment',
      entityId: recLog.entityId || 'general',
      action: recLog.action || 'MOVE_SESSION',
      before: recLog.before !== undefined ? recLog.before : null,
      after: recLog.after !== undefined ? recLog.after : null,
      description: recLog.description,
      changedBy: recLog.changedBy || activeUser.name || 'Administrator',
      changedAt: recLog.changedAt || new Date().toISOString(),
      courseCode: recLog.courseCode,
      courseName: recLog.courseName,
      semester: recLog.semester,
      isUndoable: recLog.isUndoable ?? Boolean(recLog.before && recLog.entityId),
    };

    const updated = [record, ...logs].slice(0, 100);
    this.saveScheduleChangeLogs(updated);

    return record;
  }

  public static undoScheduleChange(
    logId: string,
    user?: CurrentUser
  ): { success: boolean; message: string; undoneLog?: ScheduleChangeLog } {
    this.assertAdmin(user);
    const logs = this.getScheduleChangeLogs();
    const targetLog = logs.find((l) => l.id === logId);

    if (!targetLog) {
      return { success: false, message: 'Catatan log tidak ditemukan.' };
    }

    if (targetLog.undoneAt) {
      return { success: false, message: 'Perubahan ini sudah pernah dibatalkan (Undone).' };
    }

    if (!targetLog.before) {
      return { success: false, message: 'Tidak ada data keadaan awal (before) untuk dibatalkan.' };
    }

    // Handle reverting based on action
    const currentSchedule = this.getCurrentSchedule() || [];
    let revertedSchedule = [...currentSchedule];

    if (
      targetLog.action === 'MOVE_SESSION' ||
      targetLog.action === 'CHANGE_ROOM' ||
      targetLog.action === 'ASSIGN_LECTURER' ||
      targetLog.action === 'CHANGE_LECTURER' ||
      targetLog.action === 'SWAP_SCHEDULE' ||
      targetLog.action === 'APPLY_SPK_RECOMMENDATION'
    ) {
      const assignmentIndex = revertedSchedule.findIndex((a) => a.id === targetLog.entityId);
      if (assignmentIndex >= 0) {
        revertedSchedule[assignmentIndex] = {
          ...revertedSchedule[assignmentIndex],
          timeslotId: targetLog.before.timeslotId || revertedSchedule[assignmentIndex].timeslotId,
          roomId: targetLog.before.roomId || revertedSchedule[assignmentIndex].roomId,
          lecturerId: targetLog.before.lecturerId !== undefined ? targetLog.before.lecturerId : revertedSchedule[assignmentIndex].lecturerId,
          lecturerIds: targetLog.before.lecturerIds || revertedSchedule[assignmentIndex].lecturerIds,
        };
        this.saveCurrentSchedule(revertedSchedule);
      }
    }

    // Mark original log as undone
    const updatedLogs = logs.map((l) => (l.id === logId ? { ...l, undoneAt: new Date().toISOString() } : l));
    this.saveScheduleChangeLogs(updatedLogs);

    // Record new undo log
    const undoRecord = this.addScheduleChangeLog({
      entityType: targetLog.entityType,
      entityId: targetLog.entityId,
      action: 'UNDO_CHANGE',
      before: targetLog.after,
      after: targetLog.before,
      description: `Membatalkan perubahan: "${targetLog.description}"`,
      changedBy: user?.name || this.getCurrentUser().name,
      courseCode: targetLog.courseCode,
      courseName: targetLog.courseName,
      semester: targetLog.semester,
      isUndoable: false,
    });

    return {
      success: true,
      message: `Perubahan berhasil dibatalkan: ${targetLog.description}`,
      undoneLog: undoRecord,
    };
  }

  public static clearScheduleChangeLogs(user?: CurrentUser): void {
    this.assertAdmin(user);
    removeCached(STORAGE_KEYS.SCHEDULE_CHANGE_LOGS);
    removeCached(STORAGE_KEYS.CHANGE_LOG);
  }

  // Parameters
  public static getParameters(): SAParameters {
    return getCached(STORAGE_KEYS.PARAMETERS, DEFAULT_PARAMETERS);
  }
  public static saveParameters(params: SAParameters): void {
    setCached(STORAGE_KEYS.PARAMETERS, params);
  }

  // Weights
  public static getWeights(): ConstraintWeights {
    return getCached(STORAGE_KEYS.WEIGHTS, DEFAULT_WEIGHTS);
  }
  public static saveWeights(weights: ConstraintWeights): void {
    setCached(STORAGE_KEYS.WEIGHTS, weights);
  }

  // User Session & Role
  public static getCurrentUser(): any {
    const data = localStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {}
    }
    return {
      id: 'admin-001',
      name: 'Administrator',
      role: 'admin',
      email: 'admin.elektro@unram.ac.id',
    };
  }
  public static saveCurrentUser(user: any): void {
    localStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(user));
  }

  public static switchRole(role: string, targetId?: string): any {
    let user: any = {
      id: 'admin-001',
      name: 'Administrator',
      role,
      email: 'admin.elektro@unram.ac.id',
    };
    if (role === 'lecturer' && targetId) {
      const lecs = this.getLecturers();
      const found = lecs.find(l => l.id === targetId || l.nip === targetId);
      if (found) {
        user = {
          id: found.id,
          name: found.name,
          role: 'lecturer',
          email: `${found.code.toLowerCase()}@unram.ac.id`,
          lecturerId: found.id,
        };
      }
    } else if (role === 'student') {
      user = {
        id: 'student-demo',
        name: 'Mahasiswa Teknik Elektro',
        role: 'student',
        nim: 'F1D0231001',
        semester: 3,
        email: 'f1d0231001@student.unram.ac.id',
      };
    }
    this.saveCurrentUser(user);
    return user;
  }

  // Schedule Status & Versions
  public static getScheduleStatus(): 'draft' | 'optimized' | 'published' {
    const status = localStorage.getItem(STORAGE_KEYS.SCHEDULE_STATUS);
    if (status === 'draft' || status === 'optimized' || status === 'published') {
      return status;
    }
    return 'draft';
  }
  public static saveScheduleStatus(status: 'draft' | 'optimized' | 'published'): void {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE_STATUS, status);
  }
  public static setScheduleStatus(status: 'draft' | 'optimized' | 'published'): void {
    this.saveScheduleStatus(status);
    this.updateScheduleStateMeta({ status });
  }

  public static resetToDefaults(): void {
    localStorage.clear();
    Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
    this.init();
  }

  /**
   * Reset data simulasi / runtime penjadwalan tanpa menghapus master data
   * (Mata Kuliah, Dosen, Ruangan, Slot Waktu, Kurikulum, Paket tetap utuh)
   */
  public static resetSimulationData(user?: CurrentUser): {
    courses: Course[];
    lecturers: Lecturer[];
    rooms: Room[];
    timeslots: Timeslot[];
    packages: CurriculumPackage[];
  } {
    this.assertAdmin(user);

    // 1. Remove simulation keys from cache and localStorage
    removeCached(STORAGE_KEYS.CURRENT_SCHEDULE);
    removeCached(STORAGE_KEYS.INITIAL_SCHEDULE);
    removeCached(STORAGE_KEYS.OPTIMIZATION_RESULT);
    removeCached(STORAGE_KEYS.HISTORY);
    removeCached(STORAGE_KEYS.OPTIMIZATION_RUNS);
    removeCached(STORAGE_KEYS.CHANGE_LOG);
    removeCached(STORAGE_KEYS.AUDIT_LOGS);
    removeCached('elektro_sched_semester_plan_draft');
    removeCached('elektro_sched_wizard_state');
    removeCached('elektro_unified_scheduling_state');

    // 2. Clear generated course offerings and restore initial empty/draft offerings
    this.saveCourseOfferings([]);
    this.saveScheduleStatus('draft');
    this.setActiveScheduleId(null);
    this.updateScheduleStateMeta({
      hasActiveSchedule: false,
      activeScheduleId: null,
      status: 'draft',
      deletedAt: new Date().toISOString(),
    });

    const versions = this.getScheduleVersions();
    const updatedVersions = versions.map((v) =>
      this.normalizeStatus(v.status) === 'Diterbitkan' ? { ...v, status: 'Digantikan' as const } : v
    );
    this.saveScheduleVersions(updatedVersions);

    this.addScheduleChangeLog({
      entityType: 'SYSTEM',
      entityId: 'reset-sim',
      action: 'RESET_SIMULATION',
      before: null,
      after: null,
      description: 'Reset data simulasi penjadwalan ke status awal draft',
      changedBy: user?.name || this.getCurrentUser().name,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('simulation-reset'));
    }

    return {
      courses: this.getCourses(),
      lecturers: this.getLecturers(),
      rooms: this.getRooms(),
      timeslots: this.getTimeslots(),
      packages: this.getCurriculumPackages(),
    };
  }

  /**
   * Atomically deletes active schedule assignments and runtime optimization state,
   * without affecting Master Data (Dosen, Mata Kuliah, Ruangan, Sesi, Kurikulum).
   * Marks hasActiveSchedule = false, activeScheduleId = null, scheduleStatus = 'draft'.
   * Any previously published version is converted to 'Digantikan' so it cannot auto-restore.
   */
  public static deleteActiveSchedule(user?: CurrentUser, saveSnapshot: boolean = false): void {
    const currentAssignments = getCached<ScheduleAssignment[] | null>(STORAGE_KEYS.CURRENT_SCHEDULE, null);

    // 1. Optionally save backup version before deletion (status 'Digantikan', NOT 'Diterbitkan')
    if (saveSnapshot && currentAssignments && currentAssignments.length > 0) {
      const backupName = `Cadangan Sebelum Hapus (${new Date().toLocaleDateString('id-ID')})`;
      this.createScheduleVersion(
        backupName,
        currentAssignments,
        'Digantikan',
        user?.name || 'Administrator',
        'Cadangan otomatis sebelum penghapusan jadwal aktif'
      );
    }

    // 2. Un-publish all versions: ensure no version holds 'Diterbitkan' status
    const versions = this.getScheduleVersions();
    const updatedVersions = versions.map((v) =>
      this.normalizeStatus(v.status) === 'Diterbitkan' ? { ...v, status: 'Digantikan' as const } : v
    );
    this.saveScheduleVersions(updatedVersions);

    // 3. Atomically clear schedule runtime keys
    setCached(STORAGE_KEYS.CURRENT_SCHEDULE, null);
    setCached(STORAGE_KEYS.INITIAL_SCHEDULE, null);
    setCached(STORAGE_KEYS.OPTIMIZATION_RESULT, null);
    removeCached(STORAGE_KEYS.CURRENT_SCHEDULE);
    removeCached(STORAGE_KEYS.INITIAL_SCHEDULE);
    removeCached(STORAGE_KEYS.OPTIMIZATION_RESULT);

    // 4. Reset schedule status to 'draft'
    this.saveScheduleStatus('draft');

    // 5. Clear draft metadata & working offerings
    this.clearScheduleDraftMetadata();
    this.saveCourseOfferings([]);

    // 6. Update explicit persistent metadata
    this.setActiveScheduleId(null);
    this.updateScheduleStateMeta({
      hasActiveSchedule: false,
      activeScheduleId: null,
      status: 'draft',
      deletedAt: new Date().toISOString(),
    });

    // 7. Audit log entry
    this.addScheduleChangeLog({
      entityType: 'SYSTEM',
      entityId: 'delete-schedule',
      action: 'DELETE_ACTIVE_SCHEDULE',
      before: currentAssignments ? `${currentAssignments.length} alokasi` : null,
      after: null,
      description: 'Penghapusan jadwal aktif oleh Admin (Master Data tetap utuh)',
      changedBy: user?.name || this.getCurrentUser().name,
    });

    // 8. Dispatch notification event for runtime components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('active-schedule-deleted'));
    }
  }

  public static getScheduleVersion(): string {
    return localStorage.getItem(STORAGE_KEYS.SCHEDULE_VERSION) || 'v1';
  }
  public static saveScheduleVersion(version: string): void {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE_VERSION, version);
  }

  public static getAcademicYear(): string {
    return localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEAR) || '2026/2027 Ganjil';
  }
  public static saveAcademicYear(year: string): void {
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEAR, year);
  }

  // Standardize publication status
  public static normalizeStatus(status?: string): 'Draft' | 'Diterbitkan' | 'Digantikan' {
    if (!status) return 'Draft';
    const s = status.toLowerCase();
    if (s === 'published' || s === 'diterbitkan') return 'Diterbitkan';
    if (s === 'archived' || s === 'digantikan' || s === 'optimized') return 'Digantikan';
    return 'Draft';
  }

  // Schedule Versions (Requirement: Multi-version schedule management for Jadwal Perkuliahan)
  public static getScheduleVersions(): ScheduleVersion[] {
    return getCached<ScheduleVersion[]>(STORAGE_KEYS.SCHEDULE_VERSIONS, []);
  }

  public static saveScheduleVersions(versions: ScheduleVersion[]): void {
    setCached(STORAGE_KEYS.SCHEDULE_VERSIONS, versions, 100);
  }

  public static addScheduleVersion(version: ScheduleVersion): void {
    const versions = this.getScheduleVersions();
    const updated = [version, ...versions.filter(v => v.id !== version.id)];
    this.saveScheduleVersions(updated);
  }

  public static getActiveScheduleVersion(): ScheduleVersion | null {
    if (!this.hasActiveSchedule()) return null;
    const currentAssignments = this.getCurrentSchedule();
    if (!currentAssignments || currentAssignments.length === 0) return null;

    const versions = this.getScheduleVersions();
    if (versions.length === 0) return null;

    // Prioritize published status ONLY if current schedule status is published
    if (this.getScheduleStatus() === 'published') {
      const publishedVer = versions.find(v => this.normalizeStatus(v.status) === 'Diterbitkan');
      if (publishedVer) return publishedVer;
    }

    const activeVerId = this.getActiveScheduleId() || this.getScheduleVersion();
    return versions.find(v => v.id === activeVerId || v.name === activeVerId) || null;
  }

  public static publishScheduleVersion(versionId: string, publishedBy: string = 'Administrator'): ScheduleVersion | null {
    const versions = this.getScheduleVersions();
    const targetVer = versions.find(v => v.id === versionId);
    if (!targetVer) return null;

    const updatedVersions = versions.map(v => {
      if (v.id === versionId) {
        return {
          ...v,
          status: 'Diterbitkan' as const,
          publishedAt: new Date().toISOString(),
          publishedBy,
        };
      }
      // If previous status was Diterbitkan, archive it as Digantikan
      if (this.normalizeStatus(v.status) === 'Diterbitkan') {
        return {
          ...v,
          status: 'Digantikan' as const,
        };
      }
      return v;
    });

    this.saveScheduleVersions(updatedVersions);
    this.saveScheduleVersion(targetVer.id);
    this.setActiveScheduleId(targetVer.id);
    this.saveCurrentSchedule(targetVer.scheduleAssignments || []);
    this.setScheduleStatus('published');
    this.updateScheduleStateMeta({
      hasActiveSchedule: true,
      activeScheduleId: targetVer.id,
      status: 'published',
    });

    // Audit log
    this.addAuditLog({
      id: `audit-pub-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'admin',
      userName: publishedBy,
      action: 'PUBLISH_SCHEDULE',
      entityType: 'SCHEDULE',
      entityId: targetVer.id,
      details: `Menerbitkan jadwal perkuliahan ${targetVer.name} sebagai jadwal aktif menggantikan versi sebelumnya.`,
    });

    return updatedVersions.find(v => v.id === versionId) || null;
  }

  public static createScheduleVersion(
    name: string,
    assignments: ScheduleAssignment[],
    status: 'Draft' | 'Diterbitkan' | 'Digantikan' = 'Draft',
    createdBy: string = 'Administrator',
    notes?: string
  ): ScheduleVersion {
    const currentVersions = this.getScheduleVersions();
    const versionNumber = currentVersions.length + 1;
    const newVer: ScheduleVersion = {
      id: `ver-lec-${Date.now()}`,
      scheduleType: 'perkuliahan',
      academicYear: this.getAcademicYear(),
      academicTerm: 'Ganjil',
      versionNumber,
      name: name || `Versi ${versionNumber}`,
      status,
      createdAt: new Date().toISOString(),
      createdBy,
      publishedAt: status === 'Diterbitkan' ? new Date().toISOString() : undefined,
      publishedBy: status === 'Diterbitkan' ? createdBy : undefined,
      scheduleAssignments: assignments,
      notes,
      summary: {
        totalAssignments: assignments.length,
        totalOfferings: assignments.length,
        conflictCount: 0,
      },
    };

    if (status === 'Diterbitkan') {
      const updatedVersions = [
        newVer,
        ...currentVersions.map(v =>
          this.normalizeStatus(v.status) === 'Diterbitkan' ? { ...v, status: 'Digantikan' as const } : v
        ),
      ];
      this.saveScheduleVersions(updatedVersions);
      this.saveScheduleVersion(newVer.id);
      this.setActiveScheduleId(newVer.id);
      this.saveCurrentSchedule(assignments);
      this.setScheduleStatus('published');
      this.updateScheduleStateMeta({
        hasActiveSchedule: true,
        activeScheduleId: newVer.id,
        status: 'published',
      });
    } else {
      this.saveScheduleVersions([newVer, ...currentVersions]);
    }

    return newVer;
  }

  // Optimization Runs (Requirement: Persistent history per run without overwriting)
  public static getOptimizationRuns(): OptimizationRun[] {
    return getCached(STORAGE_KEYS.OPTIMIZATION_RUNS, []);
  }
  public static saveOptimizationRuns(runs: OptimizationRun[]): void {
    setCached(STORAGE_KEYS.OPTIMIZATION_RUNS, runs, 100);
  }
  public static addOptimizationRun(run: OptimizationRun): void {
    const runs = this.getOptimizationRuns();
    const updated = [run, ...runs.filter(r => r.id !== run.id)].slice(0, 30);
    this.saveOptimizationRuns(updated);
  }

  // Audit Logs & Undo (Requirement: Audit Log with Undo capability)
  public static getAuditLogs(): AuditLog[] {
    return getCached(STORAGE_KEYS.AUDIT_LOGS, []);
  }
  public static saveAuditLogs(logs: AuditLog[]): void {
    setCached(STORAGE_KEYS.AUDIT_LOGS, logs, 100);
  }
  public static addAuditLog(log: AuditLog): void {
    const logs = this.getAuditLogs();
    const updated = [log, ...logs].slice(0, 100);
    this.saveAuditLogs(updated);
  }
  public static undoLastAuditLog(): AuditLog | null {
    const logs = this.getAuditLogs();
    if (logs.length === 0) return null;
    const lastLog = logs[0];
    this.saveAuditLogs(logs.slice(1));
    return lastLog;
  }

  // Course Equivalences 2022 <-> 2026
  public static getCourseEquivalences(): CourseEquivalence[] {
    return getCached(STORAGE_KEYS.COURSE_EQUIVALENCES, INITIAL_COURSE_EQUIVALENCES);
  }
  public static saveCourseEquivalences(eqs: CourseEquivalence[]): void {
    setCached(STORAGE_KEYS.COURSE_EQUIVALENCES, eqs, 100);
  }
  public static addCourseEquivalence(eq: CourseEquivalence): void {
    const eqs = this.getCourseEquivalences();
    const updated = [...eqs.filter(e => e.id !== eq.id), eq];
    this.saveCourseEquivalences(updated);
  }

  // ==========================================
  // MODUL KRS, RIWAYAT KRS & NILAI
  // ==========================================

  private static ensureKRSInitialized(): void {
    const existingKRS = getCached<StudentKRS[] | null>(STORAGE_KEYS.STUDENT_KRS, null);
    if (!existingKRS || existingKRS.length === 0) {
      const students = this.getStudents();
      const courses = this.getCourses();
      const packages = this.getCurriculumPackages();
      const synthetic = generateSyntheticKRSAndGrades(students, courses, packages);
      setCached(STORAGE_KEYS.STUDENT_KRS, synthetic.krsList);
      setCached(STORAGE_KEYS.KRS_ITEMS, synthetic.krsItems);
      setCached(STORAGE_KEYS.COURSE_GRADES, synthetic.grades);
    }
  }

  public static getStudentKRSList(): StudentKRS[] {
    this.ensureKRSInitialized();
    return getCached(STORAGE_KEYS.STUDENT_KRS, []);
  }

  public static saveStudentKRSList(list: StudentKRS[]): void {
    setCached(STORAGE_KEYS.STUDENT_KRS, list, 100);
  }

  public static getKRSItems(): KRSItem[] {
    this.ensureKRSInitialized();
    return getCached(STORAGE_KEYS.KRS_ITEMS, []);
  }

  public static saveKRSItems(items: KRSItem[]): void {
    setCached(STORAGE_KEYS.KRS_ITEMS, items, 100);
  }

  public static getCourseGrades(): CourseGrade[] {
    this.ensureKRSInitialized();
    return getCached(STORAGE_KEYS.COURSE_GRADES, []);
  }

  public static saveCourseGrades(grades: CourseGrade[]): void {
    setCached(STORAGE_KEYS.COURSE_GRADES, grades, 100);
  }

  public static getGradeWeightConfig(): GradeWeightConfig {
    return getCached(STORAGE_KEYS.GRADE_WEIGHT_CONFIG, DEFAULT_GRADE_WEIGHT_CONFIG);
  }

  public static saveGradeWeightConfig(config: GradeWeightConfig): void {
    setCached(STORAGE_KEYS.GRADE_WEIGHT_CONFIG, config, 100);
  }

  public static getGradeScaleConfig(): GradeScaleConfig {
    return getCached(STORAGE_KEYS.GRADE_SCALE_CONFIG, DEFAULT_GRADE_SCALE_CONFIG);
  }

  public static saveGradeScaleConfig(config: GradeScaleConfig): void {
    setCached(STORAGE_KEYS.GRADE_SCALE_CONFIG, config, 100);
  }

  /**
   * Reseed synthetic KRS, items, grades, and enrich student summaries (Admin action)
   */
  public static reseedAcademicData(): void {
    const students = this.getStudents();
    const courses = this.getCourses();
    const packages = this.getCurriculumPackages();
    const synthetic = generateSyntheticKRSAndGrades(students, courses, packages);
    
    setCached(STORAGE_KEYS.STUDENT_KRS, synthetic.krsList);
    setCached(STORAGE_KEYS.KRS_ITEMS, synthetic.krsItems);
    setCached(STORAGE_KEYS.COURSE_GRADES, synthetic.grades);

    // Enrich all students with academic summary
    const equivalences = this.getCourseEquivalences();
    const lecturers = this.getLecturers();
    const lecturerMap = new Map(lecturers.map(l => [l.id, l.name]));

    const enrichedStudents = students.map((std) => {
      const currentSemester =
        std.currentSemester ||
        std.semester ||
        (std.cohortYear === 2023 ? 7 : std.cohortYear === 2024 ? 5 : std.cohortYear === 2025 ? 3 : 1);
      const studentWithSem = { ...std, currentSemester, semester: currentSemester };
      const retakeRes = detectRetakeCourses(std.id, synthetic.krsList, synthetic.krsItems, synthetic.grades, equivalences);
      const summary = calculateStudentAcademicSummary(studentWithSem, synthetic.krsList, synthetic.krsItems, synthetic.grades, retakeRes);
      
      const advisorName = std.academicAdvisorLecturerId 
        ? lecturerMap.get(std.academicAdvisorLecturerId) || std.academicAdvisorLecturerName
        : std.academicAdvisorLecturerName;

      return {
        ...std,
        currentSemester,
        semester: currentSemester,
        totalEarnedCredits: summary.passedCredits,
        calculatedPassedCredits: summary.passedCredits,
        gpa: summary.gpa,
        lastSemesterGpa: summary.lastSemesterGpa,
        hasRetake: summary.hasRetake,
        requiredRetakeCount: summary.requiredRetakeCount,
        recommendedRetakeCount: summary.recommendedRetakeCount,
        academicAdvisorLecturerName: advisorName || null,
      };
    });

    this.saveStudents(enrichedStudents);
  }

  public static regenerateDummyKRS(): void {
    this.reseedAcademicData();
  }

  /**
   * Update Dosen Pembimbing Akademik Mahasiswa
   */
  public static updateStudentAdvisor(studentId: string, advisorLecturerId: string | null): boolean {
    const students = this.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return false;

    const lecturers = this.getLecturers();
    const advisor = advisorLecturerId ? lecturers.find(l => l.id === advisorLecturerId) : null;

    student.academicAdvisorLecturerId = advisorLecturerId;
    student.academicAdvisorLecturerName = advisor ? advisor.name : null;
    this.updateStudent(student);
    return true;
  }

  /**
   * Mengambil Profil Akademik Lengkap untuk Halaman Detail Mahasiswa
   */
  public static getStudentAcademicProfile(studentId: string) {
    const students = this.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    const krsList = this.getStudentKRSList();
    const allItems = this.getKRSItems();
    const allGrades = this.getCourseGrades();
    const equivalences = this.getCourseEquivalences();
    const lecturers = this.getLecturers();
    const courses = this.getCourses();
    const courseOfferings = this.getCourseOfferings();
    const currentSchedule = this.getCurrentSchedule();
    const rooms = this.getRooms();
    const timeslots = this.getTimeslots();

    // 1. Current KRS
    const { krs: currentKRS, items: currentKRSItems } = this.getStudentCurrentKRS(studentId);

    // 2. Retake Detection
    const retakeResult = detectRetakeCourses(studentId, krsList, allItems, allGrades, equivalences, currentKRSItems);
    retakeResult.studentName = student.name;
    retakeResult.studentNim = student.nim;
    retakeResult.currentSemester = student.currentSemester || student.semester;
    retakeResult.cohortYear = student.cohortYear;

    // 3. Academic Summary
    const summary = calculateStudentAcademicSummary(student, krsList, allItems, allGrades, retakeResult);

    // 4. Academic History grouped by Semester
    const historySemesters = this.getStudentKRSHistory(studentId).map(hist => {
      const gradeMap = new Map<string, CourseGrade>();
      hist.grades.forEach(g => gradeMap.set(g.krsItemId, g));

      let semTotalCredits = 0;
      let semPassedCredits = 0;
      let semWeightedScore = 0;

      const itemsWithGrades = hist.items.map(item => {
        const gr = gradeMap.get(item.id);
        const letter = gr?.letterGrade || item.previousGrade || '-';
        const gradePoint = (letter && (GRADE_POINT_LOOKUP as Record<string, number>)[letter] !== undefined)
          ? (GRADE_POINT_LOOKUP as Record<string, number>)[letter]
          : 0;

        semTotalCredits += (item.credits || 0);
        if (gradePoint > 0 && letter !== 'E' && letter !== 'K') {
          semPassedCredits += (item.credits || 0);
        }
        semWeightedScore += (item.credits || 0) * gradePoint;

        return {
          ...item,
          grade: gr || null,
          letterGrade: letter,
          gradePoint: isNaN(gradePoint) ? 0 : gradePoint,
          numericFinalScore: gr?.numericFinalScore ?? null,
        };
      });

      const rawSemesterGpa = semTotalCredits > 0 ? (semWeightedScore / semTotalCredits) : 0.0;
      const semesterGpa = isNaN(rawSemesterGpa) ? 0.0 : Math.round(rawSemesterGpa * 100) / 100;

      return {
        krs: hist.krs,
        items: itemsWithGrades,
        totalCredits: isNaN(semTotalCredits) ? 0 : semTotalCredits,
        passedCredits: isNaN(semPassedCredits) ? 0 : semPassedCredits,
        semesterGpa,
      };
    });

    // 5. Advisor Lecturer
    const advisorLecturer = student.academicAdvisorLecturerId 
      ? lecturers.find(l => l.id === student.academicAdvisorLecturerId) || null
      : null;

    // 6. Student's Current Schedule (offerings where student is in studentIds or enrolled)
    const currentCourseIds = new Set(currentKRSItems.map(i => i.courseId));
    const studentOfferings = courseOfferings.filter(off => 
      (off.studentIds && off.studentIds.includes(student.id)) ||
      currentCourseIds.has(off.courseId)
    );

    const roomMap = new Map(rooms.map(r => [r.id, r]));
    const timeslotMap = new Map(timeslots.map(t => [t.id, t]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const timetable = studentOfferings.map(off => {
      const assignment = currentSchedule.find(s => s.courseOfferingId === off.id || s.courseId === off.courseId);
      const room = assignment ? roomMap.get(assignment.roomId) : null;
      const timeslot = assignment ? timeslotMap.get(assignment.timeslotId) : null;
      const course = courseMap.get(off.courseId);
      const isRetake = currentKRSItems.some(i => i.courseId === off.courseId && i.enrollmentType === 'retake');

      return {
        offering: off,
        course,
        room,
        timeslot,
        assignment,
        isRetake,
      };
    });

    return {
      student,
      summary,
      currentKRS,
      currentKRSItems,
      historySemesters,
      retakeResult,
      advisorLecturer,
      timetable,
    };
  }

  /**
   * Mengambil KRS Aktif Mahasiswa (Current KRS)
   */
  public static getStudentCurrentKRS(studentId: string): { krs: StudentKRS | null; items: KRSItem[] } {
    const allKRS = this.getStudentKRSList();
    const allItems = this.getKRSItems();
    // Current KRS is status !== 'completed' or latest active term
    const studentKRSs = allKRS.filter(k => k.studentId === studentId);
    const currentKRS = studentKRSs.find(k => k.status !== 'completed') || studentKRSs[studentKRSs.length - 1] || null;
    const items = currentKRS ? allItems.filter(i => i.krsId === currentKRS.id) : [];
    return { krs: currentKRS, items };
  }

  /**
   * Mengambil Riwayat KRS Mahasiswa per Semester (KRS History)
   */
  public static getStudentKRSHistory(studentId: string): {
    krs: StudentKRS;
    items: KRSItem[];
    grades: CourseGrade[];
  }[] {
    const allKRS = this.getStudentKRSList();
    const allItems = this.getKRSItems();
    const allGrades = this.getCourseGrades();

    const studentKRSs = allKRS.filter(k => k.studentId === studentId && k.status === 'completed');
    const itemsByKrsId = new Map<string, KRSItem[]>();
    allItems.filter(i => i.studentId === studentId).forEach(item => {
      if (!itemsByKrsId.has(item.krsId)) itemsByKrsId.set(item.krsId, []);
      itemsByKrsId.get(item.krsId)!.push(item);
    });

    const gradeByItemId = new Map<string, CourseGrade>();
    allGrades.filter(g => g.studentId === studentId).forEach(g => {
      gradeByItemId.set(g.krsItemId, g);
    });

    return studentKRSs.map(krs => {
      const items = itemsByKrsId.get(krs.id) || [];
      const grades = items.map(item => gradeByItemId.get(item.id)).filter((g): g is CourseGrade => Boolean(g));
      return { krs, items, grades };
    });
  }

  /**
   * Menjalankan Deteksi Retake untuk satu mahasiswa
   */
  public static detectRetakeForStudent(studentId: string): RetakeDetectionResult {
    const krsList = this.getStudentKRSList();
    const krsItems = this.getKRSItems();
    const grades = this.getCourseGrades();
    const equivalences = this.getCourseEquivalences();
    const { items: currentItems } = this.getStudentCurrentKRS(studentId);

    const student = this.getStudents().find(s => s.id === studentId);
    const result = detectRetakeCourses(studentId, krsList, krsItems, grades, equivalences, currentItems);
    result.studentName = student?.name;
    result.studentNim = student?.nim;
    result.currentSemester = student?.semester;
    result.cohortYear = student?.cohortYear;
    return result;
  }

  /**
   * Menambahkan Mata Kuliah Retake ke KRS Aktif Mahasiswa
   */
  public static addRetakeCourseToCurrentKRS(
    studentId: string,
    courseId: string,
    retakeReason: string,
    previousGrade: string
  ): { success: boolean; message: string } {
    const allKRS = this.getStudentKRSList();
    const allItems = this.getKRSItems();
    const courses = this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) return { success: false, message: 'Mata kuliah tidak ditemukan' };

    const { krs: currentKRS, items: currentItems } = this.getStudentCurrentKRS(studentId);
    if (!currentKRS) return { success: false, message: 'KRS semester ini belum dibuat' };

    const alreadyExists = currentItems.some(i => i.courseId === courseId);
    if (alreadyExists) return { success: false, message: 'Mata kuliah sudah ada di KRS semester ini' };

    const credits = course.sks || course.credits || 2;
    const newItem: KRSItem = {
      id: `krs-item-${currentKRS.id}-retake-${courseId}-${Date.now()}`,
      krsId: currentKRS.id,
      studentId,
      courseId,
      courseCode: course.code || course.courseCode || '',
      courseName: course.name || course.courseName || '',
      credits,
      packageSemester: course.semester || course.recommendedSemester || 1,
      enrollmentType: 'retake',
      previousGrade,
      retakeReason,
      status: 'enrolled',
      dataSource: 'synthetic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedItems = [...allItems, newItem];
    this.saveKRSItems(updatedItems);

    // Update total credits on KRS
    const updatedKRSList = allKRS.map(k => {
      if (k.id === currentKRS.id) {
        return {
          ...k,
          totalCredits: k.totalCredits + credits,
          updatedAt: new Date().toISOString(),
        };
      }
      return k;
    });
    this.saveStudentKRSList(updatedKRSList);

    // Add empty CourseGrade record for tracking
    const allGrades = this.getCourseGrades();
    const newGrade: CourseGrade = {
      id: `grade-${newItem.id}`,
      studentId,
      courseId,
      krsItemId: newItem.id,
      academicYear: currentKRS.academicYear,
      academicTerm: currentKRS.academicTerm,
      studentSemester: currentKRS.studentSemester,
      attendanceScore: null,
      assignmentScore: null,
      quizScore: null,
      midtermScore: null,
      finalExamScore: null,
      numericFinalScore: null,
      letterGrade: null,
      gradeStatus: 'incomplete',
      dataSource: 'synthetic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveCourseGrades([...allGrades, newGrade]);

    // Also sync to StudentEnrollments for scheduling & conflict detection
    this.syncKRSItemToEnrollment(newItem);

    return { success: true, message: `Mata kuliah ${course.name} (${course.code}) berhasil ditambahkan ke KRS.` };
  }

  /**
   * Sinkronisasi KRSItem ke StudentEnrollment & CourseOffering
   */
  public static syncKRSItemToEnrollment(item: KRSItem): void {
    const enrollments = this.getStudentEnrollments();
    const existingIndex = enrollments.findIndex(
      e => e.studentId === item.studentId && e.courseId === item.courseId
    );

    if (existingIndex === -1) {
      const newEnrollment: StudentEnrollment = {
        id: `enr-${item.studentId}-${item.courseId}`,
        studentId: item.studentId,
        courseId: item.courseId,
        academicYear: '2026/2027',
        semester: item.packageSemester,
        curriculumYear: 2026,
        enrollmentType: item.enrollmentType,
        retakeFromSemester: item.enrollmentType === 'retake' ? item.packageSemester : undefined,
        status: 'enrolled',
        createdAt: new Date().toISOString(),
      };
      this.saveStudentEnrollments([...enrollments, newEnrollment]);
    }
  }

  // Validation before optimization (Validasi berdasarkan Active Course Offerings, bukan Master Courses)
  public static validatePrerequisites(
    courses: Course[],
    lecturers: Lecturer[],
    classes: ClassGroup[],
    rooms: Room[],
    timeslots: Timeslot[],
    offerings?: CourseOffering[]
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const activeRooms = rooms.filter(r => r.isActive);
    if (activeRooms.length === 0) errors.push('Tidak ada ruangan aktif yang tersedia.');

    const activeTimeslots = timeslots.filter(t => t.isActive);
    if (activeTimeslots.length === 0) errors.push('Tidak ada slot waktu aktif yang tersedia.');

    if (courses.length === 0) {
      errors.push('Belum ada data mata kuliah master dalam kurikulum.');
    }

    const currentOfferings = offerings || this.getCourseOfferings();
    if (!currentOfferings || currentOfferings.length === 0) {
      warnings.push('Belum ada Course Offering untuk periode akademik ini. Silakan generate rombel kelas terlebih dahulu.');
    } else {
      const courseMap = new Map(courses.map(c => [c.id, c]));
      const courseCodeMap = new Map(courses.map(c => [c.code, c]));
      const lecturerIdSet = new Set(lecturers.map(l => l.id));
      const classIdSet = new Set(classes.map(c => c.id));

      let offeringsWithoutLecturer = 0;
      let offeringsWithoutClass = 0;
      const maxCapacity = Math.max(0, ...activeRooms.map(r => r.capacity));

      currentOfferings.forEach(off => {
        const course = courseMap.get(off.courseId) || courseCodeMap.get(off.courseId);
        if (!course && !off.courseName) {
          errors.push(`Course Offering ${off.code || off.id} menunjuk mata kuliah yang tidak valid.`);
        }

        if (!off.classId || (classIdSet.size > 0 && !classIdSet.has(off.classId))) {
          offeringsWithoutClass++;
        }

        const assignedLecs = (off.lecturerIds && off.lecturerIds.length > 0)
          ? off.lecturerIds
          : (off.lecturerId ? [off.lecturerId] : []);

        if (assignedLecs.length === 0) {
          offeringsWithoutLecturer++;
        } else {
          // Check if assigned lecturer IDs exist
          const invalidLec = assignedLecs.find(lid => !lecturerIdSet.has(lid));
          if (invalidLec) {
            errors.push(`Dosen pengampu (${invalidLec}) pada rombel ${off.code || off.courseName} tidak terdaftar.`);
          }
        }

        // Room capacity warning
        const enrolled = off.enrolledCount || off.studentCount || (course?.studentCount || 35);
        if (maxCapacity > 0 && enrolled > maxCapacity) {
          warnings.push(
            `Rombel ${off.code || off.courseName || off.id} (${enrolled} mhs) melebihi kapasitas ruangan terbesar (${maxCapacity} kursi).`
          );
        }
      });

      if (offeringsWithoutLecturer > 0) {
        warnings.push(`${offeringsWithoutLecturer} kelas mata kuliah belum memiliki dosen pengampu.`);
      }

      if (offeringsWithoutClass > 0) {
        warnings.push(`${offeringsWithoutClass} Course Offering belum memiliki rombel.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Student Schedule Preferences (Personalized Student Timetable View Only)
  public static getStudentSchedulePreferences(studentId?: string): StudentSchedulePreference[] {
    const allPreferences = getCached<StudentSchedulePreference[]>(STORAGE_KEYS.STUDENT_SCHEDULE_PREFERENCES, []);
    if (!studentId) return allPreferences;
    return allPreferences.filter((p) => p.studentId === studentId);
  }

  public static saveStudentSchedulePreferences(preferences: StudentSchedulePreference[], studentId?: string): void {
    if (!studentId) {
      setCached(STORAGE_KEYS.STUDENT_SCHEDULE_PREFERENCES, preferences, 0);
      return;
    }
    const allPreferences = getCached<StudentSchedulePreference[]>(STORAGE_KEYS.STUDENT_SCHEDULE_PREFERENCES, []);
    const otherPreferences = allPreferences.filter((p) => p.studentId !== studentId);
    const updated = [...otherPreferences, ...preferences];
    setCached(STORAGE_KEYS.STUDENT_SCHEDULE_PREFERENCES, updated, 0);
  }

  public static setStudentCourseSectionPreference(
    studentId: string,
    courseId: string,
    sectionName: string,
    offeringId?: string,
    semester?: number,
    curriculumYear?: number
  ): void {
    const current = this.getStudentSchedulePreferences(studentId);
    const filtered = current.filter((p) => p.courseId !== courseId);
    if (sectionName && sectionName.trim() !== '') {
      filtered.push({
        studentId,
        courseId,
        sectionName: sectionName.toUpperCase(),
        offeringId,
        semester,
        curriculumYear,
        updatedAt: new Date().toISOString(),
      });
    }
    this.saveStudentSchedulePreferences(filtered, studentId);
  }

  public static removeStudentCourseSectionPreference(studentId: string, courseId: string): void {
    const current = this.getStudentSchedulePreferences(studentId);
    const filtered = current.filter((p) => p.courseId !== courseId);
    this.saveStudentSchedulePreferences(filtered, studentId);
  }

  public static clearStudentSchedulePreferences(studentId?: string): void {
    if (!studentId) {
      setCached(STORAGE_KEYS.STUDENT_SCHEDULE_PREFERENCES, [], 0);
      return;
    }
    const allPreferences = getCached<StudentSchedulePreference[]>(STORAGE_KEYS.STUDENT_SCHEDULE_PREFERENCES, []);
    const remaining = allPreferences.filter((p) => p.studentId !== studentId);
    setCached(STORAGE_KEYS.STUDENT_SCHEDULE_PREFERENCES, remaining, 0);
  }

  // ==========================================
  // EXAM SCHEDULING (UTS / UAS) STORAGE METHODS
  // ==========================================

  public static getExamSessions(): ExamSession[] {
    const defaultSessions: ExamSession[] = [
      { id: 'ex-ses-1', name: 'Sesi 1 (07:50 - 09:30)', startTime: '07:50', endTime: '09:30', durationMinutes: 100, isActive: true, orderIndex: 1 },
      { id: 'ex-ses-2', name: 'Sesi 2 (09:30 - 11:10)', startTime: '09:30', endTime: '11:10', durationMinutes: 100, isActive: true, orderIndex: 2 },
      { id: 'ex-ses-3', name: 'Sesi 3 (12:50 - 14:30)', startTime: '12:50', endTime: '14:30', durationMinutes: 100, isActive: true, orderIndex: 3 },
      { id: 'ex-ses-4', name: 'Sesi 4 (15:20 - 17:00)', startTime: '15:20', endTime: '17:00', durationMinutes: 100, isActive: true, orderIndex: 4 },
    ];
    const sessions = getCached<ExamSession[]>(STORAGE_KEYS.EXAM_SESSIONS, defaultSessions);
    // Sort automatically by startTime
    return [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  public static saveExamSessions(sessions: ExamSession[]): void {
    const sorted = [...sessions].sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((s, idx) => ({ ...s, orderIndex: idx + 1 }));
    setCached(STORAGE_KEYS.EXAM_SESSIONS, sorted, 0);
  }

  public static resetDefaultExamSessions(): ExamSession[] {
    const defaultSessions: ExamSession[] = [
      { id: 'ex-ses-1', name: 'Sesi 1 (07:50 - 09:30)', startTime: '07:50', endTime: '09:30', durationMinutes: 100, isActive: true, orderIndex: 1 },
      { id: 'ex-ses-2', name: 'Sesi 2 (09:30 - 11:10)', startTime: '09:30', endTime: '11:10', durationMinutes: 100, isActive: true, orderIndex: 2 },
      { id: 'ex-ses-3', name: 'Sesi 3 (12:50 - 14:30)', startTime: '12:50', endTime: '14:30', durationMinutes: 100, isActive: true, orderIndex: 3 },
      { id: 'ex-ses-4', name: 'Sesi 4 (15:20 - 17:00)', startTime: '15:20', endTime: '17:00', durationMinutes: 100, isActive: true, orderIndex: 4 },
    ];
    setCached(STORAGE_KEYS.EXAM_SESSIONS, defaultSessions, 0);
    return defaultSessions;
  }

  public static getExamConfig(examType: ExamType): ExamConfig {
    const configs = getCached<Record<ExamType, ExamConfig>>(STORAGE_KEYS.EXAM_CONFIG, {
      UTS: {
        academicYear: '2026/2027',
        academicTerm: 'Ganjil',
        examType: 'UTS',
        defaultDurationMinutes: 90,
        maxStudentsPerSection: 40,
        examStartDate: '2026-10-12',
        examEndDate: '2026-10-23',
        excludeWeekends: true,
      },
      UAS: {
        academicYear: '2026/2027',
        academicTerm: 'Ganjil',
        examType: 'UAS',
        defaultDurationMinutes: 120,
        maxStudentsPerSection: 40,
        examStartDate: '2026-12-14',
        examEndDate: '2026-12-24',
        excludeWeekends: true,
      },
    });
    return configs[examType] || {
      academicYear: '2026/2027',
      academicTerm: 'Ganjil',
      examType,
      defaultDurationMinutes: examType === 'UTS' ? 90 : 120,
      maxStudentsPerSection: 40,
      examStartDate: examType === 'UTS' ? '2026-10-12' : '2026-12-14',
      examEndDate: examType === 'UTS' ? '2026-10-23' : '2026-12-24',
      excludeWeekends: true,
    };
  }

  public static saveExamConfig(config: ExamConfig): void {
    const configs = getCached<Record<ExamType, ExamConfig>>(STORAGE_KEYS.EXAM_CONFIG, {
      UTS: {
        academicYear: '2026/2027',
        academicTerm: 'Ganjil',
        examType: 'UTS',
        defaultDurationMinutes: 90,
        maxStudentsPerSection: 40,
        examStartDate: '2026-10-12',
        examEndDate: '2026-10-23',
        excludeWeekends: true,
      },
      UAS: {
        academicYear: '2026/2027',
        academicTerm: 'Ganjil',
        examType: 'UAS',
        defaultDurationMinutes: 120,
        maxStudentsPerSection: 40,
        examStartDate: '2026-12-14',
        examEndDate: '2026-12-24',
        excludeWeekends: true,
      },
    });
    configs[config.examType] = config;
    setCached(STORAGE_KEYS.EXAM_CONFIG, configs, 0);
  }

  private static getExamKey(prefix: string, examType: ExamType, academicYear: string = '2026/2027', academicTerm: AcademicTerm = 'Ganjil'): string {
    return `${prefix}_${examType}_${academicYear.replace('/', '-')}_${academicTerm}`;
  }

  public static getExamOfferings(
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): ExamOffering[] {
    const key = this.getExamKey(STORAGE_KEYS.EXAM_OFFERINGS, examType, academicYear, academicTerm);
    const rawList = getCached<ExamOffering[]>(key, []);
    const lectureOfferings = this.getCourseOfferings();
    const lecOffMap = new Map<string, CourseOffering>();
    lectureOfferings.forEach(l => {
      lecOffMap.set(l.id, l);
      lecOffMap.set(`${l.courseId}_${l.section || l.sectionName || 'A'}`, l);
    });

    // Auto-align supervisor1Id with Dosen Pengampu
    return rawList.map(off => {
      const source = off.sourceCourseOfferingId ? lecOffMap.get(off.sourceCourseOfferingId) : lecOffMap.get(`${off.courseId}_${off.sectionName || 'A'}`);
      const lecIds = (source?.lecturerIds && source.lecturerIds.length > 0)
        ? source.lecturerIds
        : (source?.lecturerId ? [source.lecturerId] : (off.lecturerIds || []));
      
      const supervisor1Id = lecIds.length > 0 ? lecIds[0] : (off.supervisor1Id || null);
      const supervisor2Id = off.supervisor2Id || (off.supervisorLecturerIds?.[1] && off.supervisorLecturerIds[1] !== supervisor1Id ? off.supervisorLecturerIds[1] : null);
      
      const supervisorLecturerIds: string[] = [];
      if (supervisor1Id) supervisorLecturerIds.push(supervisor1Id);
      if (supervisor2Id && supervisor2Id !== supervisor1Id) supervisorLecturerIds.push(supervisor2Id);

      return {
        ...off,
        lecturerIds: lecIds,
        supervisor1Id,
        supervisor2Id,
        supervisorLecturerIds,
        durationMinutes: off.durationMinutes || 100,
      };
    });
  }

  public static saveExamOfferings(
    offerings: ExamOffering[],
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): void {
    const key = this.getExamKey(STORAGE_KEYS.EXAM_OFFERINGS, examType, academicYear, academicTerm);
    setCached(key, offerings, 0);
  }

  /**
   * Generates or synchronizes Exam Offerings directly from active Lecture Schedule CourseOfferings.
   * Preserves already assigned date, session, room, and supervisors unless forceReset is requested.
   */
  public static generateOrSyncExamOfferingsFromLectures(
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil',
    preserveExistingAssignments: boolean = true
  ): { offerings: ExamOffering[]; addedCount: number; updatedCount: number } {
    const lectureOfferings = this.getCourseOfferings();
    const currentExamOfferings = this.getExamOfferings(examType, academicYear, academicTerm);

    const existingMap = new Map<string, ExamOffering>();
    currentExamOfferings.forEach(e => {
      if (e.sourceCourseOfferingId) {
        existingMap.set(e.sourceCourseOfferingId, e);
      }
      existingMap.set(`${e.courseId}_${e.sectionName || 'A'}`, e);
    });

    let addedCount = 0;
    let updatedCount = 0;

    const result: ExamOffering[] = lectureOfferings.map(lecOff => {
      const matchKey = lecOff.id;
      const fallbackKey = `${lecOff.courseId}_${lecOff.section || lecOff.sectionName || 'A'}`;
      const existing = existingMap.get(matchKey) || existingMap.get(fallbackKey);

      // 1. Pengawas 1 Otomatis dari Dosen Pengampu
      const lecIds = (lecOff.lecturerIds && lecOff.lecturerIds.length > 0)
        ? lecOff.lecturerIds
        : (lecOff.lecturerId ? [lecOff.lecturerId] : (existing?.lecturerIds || []));
      const supervisor1Id = lecIds.length > 0 ? lecIds[0] : null;

      // 2. Pengawas 2 Manual dari Admin
      const supervisor2Id = existing?.supervisor2Id || (existing?.supervisorLecturerIds?.[1] && existing.supervisorLecturerIds[1] !== supervisor1Id ? existing.supervisorLecturerIds[1] : null);

      const supervisorLecturerIds: string[] = [];
      if (supervisor1Id) supervisorLecturerIds.push(supervisor1Id);
      if (supervisor2Id && supervisor2Id !== supervisor1Id) supervisorLecturerIds.push(supervisor2Id);

      if (existing) {
        updatedCount++;
        return {
          ...existing,
          sourceCourseOfferingId: lecOff.id,
          examType,
          academicYear,
          academicTerm,
          courseId: lecOff.courseId,
          courseCode: lecOff.courseCode || existing.courseCode,
          courseName: lecOff.courseName || existing.courseName,
          curriculumYear: lecOff.curriculumYear || existing.curriculumYear || 2026,
          semester: lecOff.semester || existing.semester || 1,
          kbkId: lecOff.kbkId || existing.kbkId,
          sectionName: lecOff.section || lecOff.sectionName || existing.sectionName || 'A',
          studentCount: lecOff.studentCount || lecOff.expectedEnrollment || existing.studentCount || 40,
          lecturerIds: lecIds,
          supervisor1Id,
          supervisor2Id,
          supervisorLecturerIds,
          // Keep assigned exam slot & room if preserveExistingAssignments is true
          examDate: preserveExistingAssignments ? existing.examDate : undefined,
          examSessionId: preserveExistingAssignments ? existing.examSessionId : undefined,
          roomIds: preserveExistingAssignments ? (existing.roomIds || []) : [],
          durationMinutes: 100,
          status: preserveExistingAssignments ? existing.status : 'draft',
        };
      }

      addedCount++;
      return {
        id: `ex-${examType.toLowerCase()}-${lecOff.id}`,
        sourceCourseOfferingId: lecOff.id,
        examType,
        academicYear,
        academicTerm,
        courseId: lecOff.courseId,
        courseCode: lecOff.courseCode || '',
        courseName: lecOff.courseName || '',
        curriculumYear: lecOff.curriculumYear || 2026,
        semester: lecOff.semester || 1,
        kbkId: lecOff.kbkId || undefined,
        sectionName: lecOff.section || lecOff.sectionName || 'A',
        studentCount: lecOff.studentCount || lecOff.expectedEnrollment || 40,
        lecturerIds: lecIds,
        supervisor1Id,
        supervisor2Id: null,
        supervisorLecturerIds,
        roomIds: [],
        durationMinutes: 100,
        status: 'draft',
      };
    });

    this.saveExamOfferings(result, examType, academicYear, academicTerm);
    return { offerings: result, addedCount, updatedCount };
  }

  /**
   * Checks if the source lecture schedule has changed since exam offerings were generated.
   */
  public static checkExamSyncStatus(
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): { hasChanged: boolean; lectureOfferingsCount: number; examOfferingsCount: number; message: string } {
    const lectureOfferings = this.getCourseOfferings();
    const examOfferings = this.getExamOfferings(examType, academicYear, academicTerm);

    if (examOfferings.length === 0) {
      return {
        hasChanged: lectureOfferings.length > 0,
        lectureOfferingsCount: lectureOfferings.length,
        examOfferingsCount: 0,
        message: 'Jadwal ujian belum dibuat dari jadwal perkuliahan.',
      };
    }

    if (lectureOfferings.length !== examOfferings.length) {
      return {
        hasChanged: true,
        lectureOfferingsCount: lectureOfferings.length,
        examOfferingsCount: examOfferings.length,
        message: `Jadwal perkuliahan sumber memiliki ${lectureOfferings.length} kelas mata kuliah, sedangkan draft ujian memiliki ${examOfferings.length} kelas.`,
      };
    }

    const examSourceIds = new Set(examOfferings.map(e => e.sourceCourseOfferingId).filter(Boolean));
    const missingInExam = lectureOfferings.some(l => !examSourceIds.has(l.id));

    if (missingInExam) {
      return {
        hasChanged: true,
        lectureOfferingsCount: lectureOfferings.length,
        examOfferingsCount: examOfferings.length,
        message: 'Terdapat perubahan kelas atau mata kuliah pada jadwal perkuliahan sumber.',
      };
    }

    return {
      hasChanged: false,
      lectureOfferingsCount: lectureOfferings.length,
      examOfferingsCount: examOfferings.length,
      message: 'Draft jadwal ujian sinkron dengan jadwal perkuliahan.',
    };
  }

  public static getExamPublishStatus(
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): { isPublished: boolean; publishedAt?: string; publishedBy?: string } {
    const key = this.getExamKey(STORAGE_KEYS.EXAM_PUBLISH_STATUS, examType, academicYear, academicTerm);
    return getCached<{ isPublished: boolean; publishedAt?: string; publishedBy?: string }>(key, {
      isPublished: false,
    });
  }

  public static setExamPublishStatus(
    examType: ExamType,
    isPublished: boolean,
    publishedBy: string = 'Administrator',
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): void {
    const key = this.getExamKey(STORAGE_KEYS.EXAM_PUBLISH_STATUS, examType, academicYear, academicTerm);
    setCached(
      key,
      {
        isPublished,
        publishedAt: isPublished ? new Date().toISOString() : undefined,
        publishedBy: isPublished ? publishedBy : undefined,
      },
      0
    );

    // Also update offerings status
    const offerings = this.getExamOfferings(examType, academicYear, academicTerm);
    const updatedOfferings = offerings.map((o) => ({
      ...o,
      status: (isPublished ? 'published' : o.examDate && o.examSessionId ? 'scheduled' : 'draft') as any,
    }));
    this.saveExamOfferings(updatedOfferings, examType, academicYear, academicTerm);
  }

  public static getExamVersions(
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): ExamVersion[] {
    const key = this.getExamKey(STORAGE_KEYS.EXAM_VERSIONS, examType, academicYear, academicTerm);
    return getCached<ExamVersion[]>(key, []);
  }

  public static saveExamVersions(
    versions: ExamVersion[],
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): void {
    const key = this.getExamKey(STORAGE_KEYS.EXAM_VERSIONS, examType, academicYear, academicTerm);
    setCached(key, versions, 0);
  }

  public static getActiveExamVersion(
    examType: ExamType,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): ExamVersion | null {
    const versions = this.getExamVersions(examType, academicYear, academicTerm);
    const published = versions.find(v => this.normalizeStatus(v.status) === 'Diterbitkan');
    return published || versions[0] || null;
  }

  public static publishExamVersion(
    examType: ExamType,
    versionId: string,
    publishedBy: string = 'Administrator',
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): ExamVersion | null {
    const versions = this.getExamVersions(examType, academicYear, academicTerm);
    const target = versions.find(v => v.id === versionId);
    if (!target) return null;

    const updated = versions.map(v => {
      if (v.id === versionId) {
        return {
          ...v,
          status: 'Diterbitkan' as const,
          publishedAt: new Date().toISOString(),
          publishedBy,
        };
      }
      if (this.normalizeStatus(v.status) === 'Diterbitkan') {
        return {
          ...v,
          status: 'Digantikan' as const,
        };
      }
      return v;
    });

    this.saveExamVersions(updated, examType, academicYear, academicTerm);
    if (target.offerings && target.offerings.length > 0) {
      this.saveExamOfferings(target.offerings, examType, academicYear, academicTerm);
    }
    this.setExamPublishStatus(examType, true, publishedBy, academicYear, academicTerm);

    this.logExamChange({
      examType,
      academicYear,
      academicTerm,
      action: 'PUBLISH_VERSION',
      description: `Menerbitkan jadwal ${examType} ${target.versionName} menggantikan versi sebelumnya.`,
      changedBy: publishedBy,
    });

    return updated.find(v => v.id === versionId) || null;
  }

  public static createExamVersion(
    examType: ExamType,
    versionName: string,
    offerings: ExamOffering[],
    status: 'draft' | 'published',
    createdBy: string,
    notes?: string,
    academicYear: string = '2026/2027',
    academicTerm: AcademicTerm = 'Ganjil'
  ): ExamVersion {
    const currentVersions = this.getExamVersions(examType, academicYear, academicTerm);
    const versionNumber = currentVersions.length + 1;
    const scheduledCount = offerings.filter((o) => o.examDate && o.examSessionId && o.roomIds.length > 0).length;
    const totalStudents = offerings.reduce((sum, o) => sum + (o.studentCount || 0), 0);

    const newVersion: ExamVersion = {
      id: `ex-ver-${Date.now()}`,
      examType,
      academicYear,
      academicTerm,
      versionName: versionName || `${academicYear} ${academicTerm} — ${examType} — ${status === 'published' ? 'Published' : 'Draft'} v${versionNumber}`,
      versionNumber,
      status,
      createdAt: new Date().toISOString(),
      createdBy,
      offerings: JSON.parse(JSON.stringify(offerings)),
      summary: {
        totalExams: offerings.length,
        scheduledExams: scheduledCount,
        totalStudents,
        conflictCount: 0,
      },
      notes,
    };

    const updatedVersions = [newVersion, ...currentVersions];
    this.saveExamVersions(updatedVersions, examType, academicYear, academicTerm);
    return newVersion;
  }

  public static getExamChangeLogs(examType?: ExamType): ExamChangeLog[] {
    const allLogs = getCached<ExamChangeLog[]>(STORAGE_KEYS.EXAM_CHANGE_LOGS, []);
    if (!examType) return allLogs;
    return allLogs.filter((log) => log.examType === examType);
  }

  public static logExamChange(entry: Omit<ExamChangeLog, 'id' | 'changedAt'>): void {
    const newLog: ExamChangeLog = {
      ...entry,
      id: `ex-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      changedAt: new Date().toISOString(),
    };
    const current = getCached<ExamChangeLog[]>(STORAGE_KEYS.EXAM_CHANGE_LOGS, []);
    const updated = [newLog, ...current].slice(0, 300); // Keep last 300 logs
    setCached(STORAGE_KEYS.EXAM_CHANGE_LOGS, updated, 0);
  }

  // ==========================================
  // MASTER DOSEN PENGAMPU DATA LAYER
  // ==========================================
  public static getMasterLecturerAssignments(): MasterLecturerAssignment[] {
    const raw = getCached<MasterLecturerAssignment[] | null>(STORAGE_KEYS.MASTER_LECTURERS, null);
    if (raw !== null && Array.isArray(raw) && raw.length === 392 && raw[0]?.raw_course_name === 'Agama Islam - A') {
      return raw;
    }
    const defaults = MasterLecturerService.getAll();
    setCached(STORAGE_KEYS.MASTER_LECTURERS, defaults, 0);
    return defaults;
  }

  public static saveMasterLecturerAssignments(data: MasterLecturerAssignment[], user?: CurrentUser): void {
    if (user) this.assertAdmin(user);
    setCached(STORAGE_KEYS.MASTER_LECTURERS, data, 0);
    MasterLecturerService.save(data);
  }

  public static clearMasterLecturerAssignments(user?: CurrentUser): void {
    this.assertAdmin(user);
    const empty: MasterLecturerAssignment[] = [];
    setCached(STORAGE_KEYS.MASTER_LECTURERS, empty, 0);
    MasterLecturerService.clearAll();
  }

  public static deleteMasterLecturerAssignment(sourceRowId: string, user?: CurrentUser): void {
    this.assertAdmin(user);
    const current = this.getMasterLecturerAssignments();
    const filtered = current.filter((item) => item.source_row_id !== sourceRowId);
    this.saveMasterLecturerAssignments(filtered, user);
  }

  public static saveManualMasterLecturerAssignments(
    newRows: MasterLecturerAssignment[],
    replacedSourceRowIds: string[] = [],
    user?: CurrentUser
  ): void {
    this.assertAdmin(user);
    const current = this.getMasterLecturerAssignments();
    const replacedSet = new Set(replacedSourceRowIds);
    const filtered = current.filter((item) => !replacedSet.has(item.source_row_id));
    const combined = [...filtered, ...newRows];
    this.saveMasterLecturerAssignments(combined, user);
  }

  public static resetMasterLecturerAssignments(user?: CurrentUser): MasterLecturerAssignment[] {
    this.assertAdmin(user);
    const defaults = MasterLecturerService.resetToDefault();
    setCached(STORAGE_KEYS.MASTER_LECTURERS, defaults, 0);
    return defaults;
  }

  public static getMasterLecturerValidationReport(): MasterLecturerValidationReport {
    const data = this.getMasterLecturerAssignments();
    return MasterLecturerService.getValidationReport(data);
  }

  public static getMasterLecturerImportBatches(): MasterLecturerImportBatch[] {
    const raw = getCached<MasterLecturerImportBatch[] | null>(STORAGE_KEYS.MASTER_LECTURER_IMPORT_HISTORY, null);
    if (raw && Array.isArray(raw)) {
      return raw;
    }
    return [];
  }

  public static saveMasterLecturerImportBatches(batches: MasterLecturerImportBatch[]): void {
    setCached(STORAGE_KEYS.MASTER_LECTURER_IMPORT_HISTORY, batches, 0);
  }
}
