export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type TimePreference = 'Pagi' | 'Siang' | 'Sore' | 'Fleksibel';

export type CourseCategory = 'Wajib' | 'Pilihan';
export type CourseType = 'Wajib' | 'Pilihan' | 'Praktikum';

export type RoomType = 'Kelas' | 'Laboratorium' | 'Ruang Seminar';

export type ConflictSeverity = 'high' | 'medium' | 'low';

export type ConflictCategory =
  | 'LECTURER_OVERLAP'
  | 'ROOM_OVERLAP'
  | 'PACKAGE_OVERLAP'
  | 'CLASS_OVERLAP'
  | 'STUDENT_OVERLAP'
  | 'CURRICULUM_CONFLICT'
  | 'ROOM_CAPACITY'
  | 'LECTURER_UNAVAILABLE'
  | 'ROOM_TYPE_MISMATCH'
  | 'LOCKED_VIOLATION'
  | 'LECTURER_DENSITY'
  | 'PACKAGE_DENSITY'
  | 'TIME_UNFAVORABLE'
  | 'LECTURER_PREFERENCE'
  | 'LECTURER_PREFERENCE_DAY'
  | 'LECTURER_PREFERENCE_TIME'
  | 'LECTURER_ROOM_HOPPING'
  | 'SCHEDULE_DENSITY'
  | 'MISSING_ASSIGNMENT';

// Kelompok Bidang Keahlian / Konsentrasi
export interface KBK {
  id: string;
  code: string; // 'KOM', 'STL', 'ELKOM', 'TEL', 'EL'
  name: string; // 'Komputer', 'Sistem Tenaga Listrik', 'Elektronika Komunikasi', etc.
  curriculumYear?: 2022 | 2026 | 'all';
  isHistorical?: boolean;
  description?: string;
  color?: string;
  isActive: boolean;
}

export type PackageType = 'common' | 'kbk' | 'elective' | 'cross-kbk';
export type ClassificationStatus = 'verified' | 'needs-review' | 'admin-corrected';

export interface Curriculum {
  id: string;
  year: 2022 | 2026;
  name: string;
  description: string;
  requiredGraduationCredits: number; // 144 for 2026, 146 for 2022
  notes?: string[];
  isActive: boolean;
}

export interface CurriculumAvailability {
  curriculumYear: 2022 | 2026;
  isSchedulingActive: boolean;
}

export interface StudentCurriculumDeterminationResult {
  curriculumYear: 2022 | 2026;
  curriculumId: string;
  reason: string;
  ruleCode: string;
  isOverride: boolean;
  status: 'Calculated' | 'Manual Override' | 'Needs Credit Verification';
}

// Master Mata Kuliah & Curriculum Course
export interface Course {
  id: string;
  curriculumId?: string;
  curriculumYear?: 2022 | 2026 | number;
  code: string;
  courseCode?: string; // alias
  name: string;
  courseName?: string; // alias
  sks: number;
  credits?: number; // alias
  semester: number;
  recommendedSemester?: number; // alias
  category?: CourseCategory; // 'Wajib' if code starts with FBS/MPS/MWU, else 'Pilihan'
  subCategory?: string; // 'Wajib Universitas' | 'Wajib Fakultas' | 'Wajib Prodi' | 'Wajib KBK' | 'Pilihan KBK' | 'Pilihan Bebas'
  type?: CourseType; // backwards compatibility
  kbkIds?: string[]; // IDs of KBK: ['kbk-komputer'], ['kbk-stl'], ['kbk-elektronika-komunikasi']
  packageType?: PackageType; // 'common' | 'kbk' | 'elective' | 'cross-kbk'
  classificationStatus?: ClassificationStatus; // 'verified' | 'needs-review'
  confidenceScore?: number; // 0..100
  classificationReason?: string;
  adminNotes?: string;
  isPackageCourse?: boolean; // True for semester 1-4 common package
  prerequisites?: string[]; // Course codes or IDs required
  durationMinutes?: number; // e.g. 100 min (2 SKS) or 150 min (3 SKS)
  classId?: string; // Target default class group if legacy
  lecturerId?: string; // Default lecturer if legacy
  studentCount?: number;
  preferredDay?: DayOfWeek | 'Bebas';
  preferredTime?: TimePreference;
  priority?: 'Tinggi' | 'Normal';
  isActive?: boolean;
}

export interface CurriculumCourse extends Course {
  curriculumId: string;
  curriculumYear: 2022 | 2026;
  courseCode: string;
  courseName: string;
  credits: number;
  recommendedSemester: number;
  category: CourseCategory;
  kbkIds: string[];
  packageType: PackageType;
  classificationStatus: ClassificationStatus;
}

// Placeholder / Slot Pilihan pada Paket Kurikulum
export interface ElectiveSlot {
  id: string; // e.g. '2026-stl-s6-elective-1'
  curriculumYear: 2022 | 2026;
  kbkId: string;
  packageSemester: number;
  name?: string; // alias
  slotName: string; // e.g. 'MK Pilihan I'
  sks?: number; // alias
  credits: number; // e.g. 2 SKS
  allowedCourseIds?: string[]; // e.g. 15 elective courses pool for STL 2026
  availableCourseIds?: string[]; // alias
  code?: string; // alias
  courseCode?: string | null; // e.g. 'MKL10762XX', 'FBA0001', or null
  academicYear?: string;
  dataWarning?: boolean;
  warningMessage?: string;
}

export interface CoursePackageItem {
  type: 'course' | 'elective-slot';
  courseId?: string;
  slotId?: string; // alias for electiveSlotId
  courseCode?: string | null;
  courseName?: string;
  electiveSlotId?: string;
  slotName?: string;
  credits: number;
  isElective?: boolean;
  kbkId?: string;
  dataWarning?: boolean;
  warningMessage?: string;
}

// Paket Semester Kurikulum (Paket Umum Smtr 1-4, Paket KBK Smtr 5-8)
export interface CurriculumPackage {
  id: string;
  code?: string;
  name: string;
  curriculumYear?: 2022 | 2026;
  curriculumId?: string;
  semester: number;
  academicYear?: string; // e.g., '2026/2027 Ganjil'
  kbkId?: string | null; // null for Common Package (Smtr 1-4), KBK ID for Smtr 5+
  type?: PackageType; // 'common' | 'kbk' | 'elective' | 'cross-kbk'
  packageType?: PackageType;
  courseIds: string[]; // for backwards compatibility
  courseItems?: CoursePackageItem[]; // structured items (normal courses + elective slots)
  totalSks: number;
  totalCredits?: number;
  description?: string;
  targetSks?: number; // configurable target SKS per package
  isLocked?: boolean; // true for official master packages
  isCommonPackage?: boolean; // true for sem 1-4
  dataWarning?: boolean;
  warningMessage?: string;
  adminNotes?: string;
  isActive: boolean;
}

// Evaluasi 10 SKS Pilihan -> Ambil 8 SKS Nilai Tertinggi
export interface ElectiveCreditEvaluation {
  studentId: string;
  attemptedElectiveCredits?: number;
  totalAttemptedCredits?: number;
  requiredCountedCredits?: number; // 8 SKS
  totalCountedCredits?: number;
  countedCourseIds?: string[];
  excludedCourseIds?: string[];
  countedCourses?: { courseId: string; credits: number; gradePoint: number }[];
  excessCourses?: { courseId: string; credits: number; reason: string }[];
  isSatisfied?: boolean;
  statusMessage?: string;
  status?: 'Waiting for Grade Data' | 'Evaluated';
  evaluatedAt?: string;
  notes?: string;
}

// Migrasi Kurikulum / Konversi SKS
export interface CurriculumMigration {
  id: string;
  studentId: string;
  studentNim: string;
  studentName: string;
  fromCurriculum: 2022 | 2026;
  toCurriculum: 2022 | 2026;
  fromKbk?: string | null;
  toKbk?: string | null;
  conversionDate: string;
  conversionRules: string;
  approvedBy: string;
  notes?: string;
}

export interface LecturerPreference {
  dayPreferences: Record<DayOfWeek, 'preferred' | 'neutral' | 'avoid'>;
  timePreferences: Record<'Pagi' | 'Siang' | 'Sore', 'preferred' | 'neutral' | 'avoid'>;
}

export interface Lecturer {
  id: string;
  code: string; // Unique identifier e.g. "SNR", "YUKI", "MSA", "SUM"
  nip: string;
  name: string;
  expertise: string;
  availableDays: DayOfWeek[];
  availableTimeslots?: string[]; // timeslot IDs
  unavailableSlotIds?: string[]; // Timeslot IDs explicitly marked as unavailable
  timePreference: TimePreference;
  preferences?: LecturerPreference;
  isActive: boolean;
  maxCoursesPerDay?: number;
  dataWarning?: boolean;
  warningReason?: string;
}

export interface StudentSchedulePreference {
  studentId: string;
  offeringId?: string;
  courseId: string;
  sectionName: string; // e.g. 'A', 'B', 'C'
  semester?: number;
  curriculumYear?: number;
  updatedAt?: string;
}

export interface Student {
  id: string;
  nim: string;
  name: string;
  cohortYear: number;
  currentSemester: number;
  semester?: number;
  totalEarnedCredits?: number | null; // e.g. 108, 126, or null
  passedCreditsOverride?: number | null;
  calculatedPassedCredits?: number | null;
  gpa?: number | null;
  lastSemesterGpa?: number | null;
  curriculumYear?: 2022 | 2026 | null;
  curriculumId?: string;
  curriculumDeterminationReason?: string;
  curriculumDeterminationStatus?: 'Calculated' | 'Needs Credit Verification' | 'Manual Override';
  isManualCurriculumOverride?: boolean;
  curriculumOverrideReason?: string;
  kbkId?: string | null; // null = "KBK belum ditentukan"
  kbkDataSource?: 'synthetic' | 'real';
  academicAdvisorLecturerId?: string | null; // Dosen Pembimbing Akademik
  academicAdvisorLecturerName?: string | null;
  classId?: string | null; // legacy optional
  enrolledCourseIds?: string[];
  status: 'active' | 'historical';
  hasRetake?: boolean;
  requiredRetakeCount?: number;
  recommendedRetakeCount?: number;
  isActive?: boolean;
  dataWarning?: boolean;
  warningReason?: string;
  adminNotes?: string;
}

// Relasi Mahasiswa -> Mata Kuliah yang Diambil (KRS / Enrollment)
export interface StudentEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  curriculumYear?: 2022 | 2026;
  packageSemester?: number; // e.g. 3 if retaking a semester 3 course
  academicSemester?: number; // student's current semester e.g. 7
  semester?: number;
  courseOfferingId?: string;
  academicYear: string;
  semesterTaken?: number;
  kbkId?: string | null;
  status: 'planned' | 'enrolled' | 'completed' | 'failed' | 'retake';
  isRetake?: boolean; // true if retaking a course from a previous semester
  enrollmentType?: 'regular' | 'package' | 'retake' | 'elective' | 'additional';
  retakeFromSemester?: number;
  enrolledAt?: string;
  createdAt?: string;
}

export interface ClassGroup {
  id: string;
  code: string;
  name: string;
  semester: number;
  cohortYear?: number;
  kbkId?: string | null;
  studentCount: number;
  studentIds?: string[];
  program: string; // e.g. "S1 Teknik Elektro"
  capacity?: number;
  isActive?: boolean;
}

export interface CourseOfferingLockConfig {
  time?: boolean;
  room?: boolean;
  lecturer?: boolean;
  full?: boolean;
  lockTimeslot?: boolean;
  lockRoom?: boolean;
  lockLecturer?: boolean;
}

// Kelompok Jadwal Abstrak Berdasarkan Kurikulum/Semester/KBK
export interface ScheduleGroup {
  id: string; // e.g. "pkg-2026-sem-1", "pkg-2026-sem-5-komputer"
  name: string; // e.g. "Semester 1 (Paket Umum)", "Semester 5 (KBK Komputer)"
  curriculumYear: 2022 | 2026 | number;
  academicTerm: 'ganjil' | 'genap';
  semester: number;
  kbkId?: string | null;
  projectedStudentCount?: number;
}

export type OfferingSourceType = 'package' | 'manual';
export type CourseOfferingType = 'regular' | 'elective' | 'additional' | 'retake-open' | 'theory' | 'practicum';

// Mata Kuliah yang Dibuka pada Semester Aktif (Course Offering)
export interface CourseOffering {
  id: string;
  code?: string; // e.g. 'MPS1071107-A'
  courseId: string;
  courseCode?: string;
  courseName?: string;
  sks?: number;
  credits?: number;
  sourceType?: OfferingSourceType; // 'package' | 'manual'
  offeringType?: CourseOfferingType; // 'regular' | 'elective' | 'additional' | 'retake-open'
  section?: string; // 'A', 'B', 'C' (per offering)
  sectionName?: string; // alias
  targetScheduleGroup?: string; // ID of ScheduleGroup to prevent package clashing
  category?: CourseCategory;
  curriculumYear?: number;
  academicYear?: string;
  academicTerm?: string;
  term?: string;
  semester?: number;
  kbkId?: string | null;
  assignedLecturerId?: string | null; // Primary assigned lecturer
  assignedLecturerIds?: string[];
  eligibleLecturerIds?: string[]; // Candidate lecturers qualified for this subject
  expectedEnrollment?: number; // Estimated/projected participants (e.g. 45, 78)
  isDataProjection?: boolean; // Flag to show "PROYEKSI DATA — perlu validasi jurusan"
  requiredRoomType?: RoomType; // 'Kelas' | 'Laboratorium' | 'Ruang Seminar'
  requiredEquipment?: string[];
  preferredTimeslots?: string[];
  classId?: string | null;
  className?: string;
  classCode?: string;
  lecturerIds: string[]; // Satu kelas dapat diampu oleh lebih dari satu dosen
  lecturerId?: string | null; // Primary lecturer untuk kompatibilitas
  lecturerNames?: string[];
  lecturerName?: string | null;
  lecturerCodes?: string[];
  lecturerCode?: string | null;
  roomId?: string | null;
  roomCode?: string;
  timeslotId?: string | null;
  timeslotLabel?: string;
  capacity?: number;
  enrolledCount?: number;
  studentCount?: number;
  studentIds?: string[];
  isPracticum?: boolean;
  generationSource?: 'package' | 'repeat' | 'elective' | 'manual';
  generatedAt?: string;
  status: 'draft' | 'ready' | 'scheduled' | 'published' | 'closed_low_enrollment';
  priority?: 'Tinggi' | 'Normal';
  isLocked?: boolean;
  lockedSchedule?: boolean;
  lockConfig?: CourseOfferingLockConfig;
  scheduleAssignment?: ScheduleAssignment;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  building: string;
  capacity: number;
  type: RoomType;
  facilities: string[];
  isActive: boolean;
}

export type SessionGroup = 'SENIN_KAMIS' | 'JUMAT';

export interface AcademicSession {
  id: string;
  group: SessionGroup;
  sessionNumber: number;
  label: string; // "Sesi 1", "Sesi 2", etc.
  startTime: string; // "07:30"
  endTime: string;   // "09:10"
  isActive: boolean;
}

export interface Timeslot {
  id: string;
  day: DayOfWeek;
  startTime: string; // "07:30"
  endTime: string;   // "09:10"
  slotIndex: number; // 1..5 (sessionNumber)
  sessionNumber?: number;
  sessionGroup?: SessionGroup;
  sessionLabel?: string; // "Sesi 1", "Sesi 2", etc.
  durationMinutes: number;
  isActive: boolean;
  label: string;     // "Sesi 1 (07:30 - 09:10)" or "07:30 - 09:10"
}

export interface ScheduleAssignment {
  id: string;
  courseId: string;
  courseOfferingId?: string;
  lecturerId: string | null;
  lecturerIds?: string[]; // All assigned lecturers
  classId: string;
  roomId: string;
  timeslotId: string;
  isFixed?: boolean;
  isLocked?: boolean;
  lockConfig?: CourseOfferingLockConfig;
}

export interface ConflictItem {
  id: string;
  category: ConflictCategory;
  categoryName: string;
  isHardConstraint: boolean;
  severity: ConflictSeverity;
  penalty: number;
  title: string;
  description: string;
  assignment1Id: string;
  assignment2Id?: string;
  course1Name?: string;
  course2Name?: string;
  involvedEntities: {
    lecturerName?: string;
    roomCode?: string;
    className?: string;
    studentName?: string;
    studentNim?: string;
    studentCount?: number;
    packageName?: string;
    timeslotLabel?: string;
    day?: DayOfWeek;
  };
}

export interface ConstraintWeights {
  hardConflictWeight: number;       // Lecturer & Room double booking (Default 100)
  packageConflictWeight?: number;   // Same Schedule Group / Semester Package clash (Default 100)
  studentConflictWeight?: number;   // Compatibility (Default 100)
  curriculumConflictWeight?: number;// Same package clash (Default 100)
  roomCapacityWeight: number;       // Room capacity < expectedEnrollment (Default 80)
  availabilityWeight: number;       // Lecturer unavailable slot (Default 80)
  roomTypeMismatchWeight: number;   // Room type / equipment mismatch (Default 70)
  preferenceWeight: number;         // Lecturer preference & undesirable hours (Default 15)
  densityWeight: number;            // Lecturer daily dispersion & package daily density (Default 10)
}

export interface SAParameters {
  initialTemperature: number; // T0, e.g. 1000
  minimumTemperature: number; // Tmin, e.g. 0.1
  coolingRate: number;        // alpha, e.g. 0.995 or 0.98
  maxIterations: number;      // max iterations, e.g. 3000 - 5000
  mutationRate: number;       // neighbor mutation rate, e.g. 0.2
  randomSeed?: number;        // e.g. 20260911 for reproducible SA runs
}

export interface OptimizationObjectiveBreakdown {
  lecturerConflictCount: number;
  roomConflictCount: number;
  studentConflictCount: number;
  retakeConflictCount: number;
  capacityConflictCount: number;
  availabilityConflictCount: number;
  softConstraintPenalty: number;
}

export interface ScheduleVersion {
  id: string;
  academicYear: string;
  academicTerm: string;
  versionNumber: number;
  name: string;
  status: 'draft' | 'optimized' | 'published' | 'archived';
  createdAt: string;
  createdBy: string;
  optimizationRunId?: string;
  scheduleAssignments: ScheduleAssignment[];
  notes?: string;
}

export interface ScheduleSnapshot {
  id: string;
  name: string;
  academicYear: string;
  academicTerm: 'ganjil' | 'genap' | string;
  curriculumConfig?: {
    curriculumYear?: number;
    activePackagesCount?: number;
    [key: string]: any;
  } | any;
  createdAt: string;
  createdBy: string;
  sourceVersionId?: string;
  notes?: string;
  scheduleData: ScheduleAssignment[];
  courseOfferingData?: CourseOffering[];
  sessionData?: Timeslot[] | AcademicSession[] | any[];
  roomAssignments?: Record<string, string>;
  lecturerAssignments?: Record<string, string[]>;
  metrics?: {
    totalAssignments?: number;
    totalOfferings?: number;
    totalSessions?: number;
    hardConflicts?: number;
    softConflicts?: number;
    cost?: number;
    fitness?: number;
  };
  isAutoBackup?: boolean;
}

export type ScheduleChangeEntityType =
  | 'ScheduleAssignment'
  | 'CourseOffering'
  | 'Course'
  | 'Lecturer'
  | 'Room'
  | 'Timeslot'
  | 'Curriculum'
  | 'SYSTEM'
  | 'ScheduleSnapshot'
  | 'StudentSchedulePreference';

export type ScheduleChangeAction =
  | 'ADD_COURSE'
  | 'DELETE_COURSE'
  | 'UPDATE_STUDENT_COUNT'
  | 'DIVIDE_SECTION'
  | 'REGENERATE_SECTION'
  | 'ASSIGN_LECTURER'
  | 'CHANGE_LECTURER'
  | 'REMOVE_LECTURER'
  | 'CHANGE_ROOM'
  | 'MOVE_SESSION'
  | 'SWAP_SCHEDULE'
  | 'APPLY_SPK_RECOMMENDATION'
  | 'LOCK_SCHEDULE'
  | 'UNLOCK_SCHEDULE'
  | 'INITIAL_GENERATE'
  | 'SA_OPTIMIZATION'
  | 'RESTORE_SCHEDULE'
  | 'PUBLISH_SCHEDULE'
  | 'UNPUBLISH_SCHEDULE'
  | 'RESET_SIMULATION'
  | 'CREATE_SNAPSHOT'
  | 'SAVE_SNAPSHOT'
  | 'DELETE_SNAPSHOT'
  | 'DUPLICATE_SNAPSHOT'
  | 'TEMPLATE_APPLIED'
  | 'UNDO_CHANGE'
  | 'SYSTEM_RESET'
  | 'CLEAR_STUDENT_PREFERENCE';

export interface ScheduleChangeLog {
  id: string;
  scheduleVersionId?: string;
  entityType: ScheduleChangeEntityType | string;
  entityId?: string;
  action: ScheduleChangeAction | string;
  before?: any;
  after?: any;
  description: string;
  changedBy: string;
  changedAt: string;
  userRole?: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  offeringId?: string;
  semester?: number;
  isUndoable?: boolean;
  undoneAt?: string;
  undoneBy?: string;
}

export interface OptimizationRun {
  id: string;
  name?: string;
  timestamp?: string;
  academicYear?: string;
  curriculumYear?: number;
  parameters?: SAParameters;
  weights?: ConstraintWeights;
  scheduleVersionId?: string;
  initialTemperature?: number;
  minimumTemperature?: number;
  coolingRate?: number;
  maxIterations?: number;
  mutationRate?: number;
  randomSeed?: number;

  initialCost: number;
  bestCost: number;
  finalCost?: number;

  initialHardConflicts?: number;
  bestHardConflicts?: number;
  finalHardConflicts?: number;

  initialConflicts?: { total: number; hard: number; soft: number; items?: any[] };
  bestConflicts?: { total: number; hard: number; soft: number; items?: any[] };

  initialBreakdown?: OptimizationObjectiveBreakdown;
  bestBreakdown?: OptimizationObjectiveBreakdown;

  totalIterations?: number;
  bestIteration: number;
  acceptedMoves?: number;
  rejectedMoves?: number;
  acceptanceRate?: number;
  runtimeMs?: number;
  executionTimeMs?: number;
  schedule?: ScheduleAssignment[];
  createdAt?: string;
}

export interface CourseEquivalence {
  id: string;
  sourceCurriculumYear: 2022 | 2026;
  sourceCourseId: string;
  sourceCourseCode?: string;
  sourceCourseName?: string;
  targetCurriculumYear: 2022 | 2026;
  targetCourseId: string;
  targetCourseCode?: string;
  targetCourseName?: string;
  equivalenceType: 'Wajib' | 'Pilihan' | 'Substitusi' | 'Penyetaraan Otomatis';
  notes?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

// ==========================================
// MODUL KRS, RIWAYAT KRS & PENILAIAN
// ==========================================

export type KRSStatus = 'draft' | 'submitted' | 'approved' | 'completed';
export type AcademicTerm = 'ganjil' | 'genap';
export type KRSEnrollmentType = 'package' | 'elective' | 'retake' | 'additional';
export type KRSItemStatus = 'planned' | 'enrolled' | 'completed' | 'cancelled';
export type GradeStatus = 'incomplete' | 'complete';
export type RetakeStatus = 'required' | 'recommended' | 'not_required' | 'cleared';

export interface StudentKRS {
  id: string;
  studentId: string;
  academicYear: string;       // e.g. "2026/2027" or "2024/2025"
  academicTerm: AcademicTerm; // "ganjil" | "genap"
  studentSemester: number;    // Semester studi mahasiswa pada periode ini (1..8)
  curriculumYear: 2022 | 2026;
  status: KRSStatus;
  totalCredits: number;
  dataSource?: 'synthetic' | 'real';
  createdAt: string;
  updatedAt: string;
}

export interface KRSItem {
  id: string;
  krsId: string;
  studentId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  packageSemester: number;
  enrollmentType: KRSEnrollmentType;
  previousAttemptId?: string | null;
  previousGrade?: string | null;
  retakeReason?: string | null;
  status: KRSItemStatus;
  dataSource?: 'synthetic' | 'real';
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseGrade {
  id: string;
  studentId: string;
  courseId: string;
  krsItemId: string;
  academicYear?: string;
  academicTerm?: AcademicTerm;
  studentSemester?: number;

  attendanceScore?: number | null; // 0..100
  assignmentScore?: number | null; // 0..100
  quizScore?: number | null;       // 0..100
  midtermScore?: number | null;    // 0..100
  finalExamScore?: number | null;  // 0..100

  numericFinalScore?: number | null;
  letterGrade?: string | null;     // 'A', 'B+', 'B', 'C+', 'C', 'D', 'E', 'K'
  gradeStatus: GradeStatus;
  gradeCalculationMode?: 'formula-calculated' | 'synthetic-letter-grade' | 'manual-input';
  dataSource?: 'synthetic' | 'real';

  createdAt: string;
  updatedAt: string;
}

export interface GradeWeightConfig {
  id: string;
  name?: string;
  attendanceWeight: number; // e.g. 0.10 (10%)
  assignmentWeight: number; // e.g. 0.20 (20%)
  quizWeight: number;       // e.g. 0.20 (20%)
  midtermWeight: number;    // e.g. 0.25 (25%)
  finalExamWeight: number;  // e.g. 0.25 (25%)
  isConfigured: boolean;    // When false, show "Bobot penilaian belum dikonfigurasi."
  updatedAt: string;
  updatedBy?: string;
}

export interface GradeScaleRange {
  letterGrade: string;
  minScore: number;
  maxScore: number;
  gpaPoint: number;
  description?: string;
}

export interface GradeScaleConfig {
  id: string;
  name?: string;
  ranges: GradeScaleRange[];
  isConfigured: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface CourseAttempt {
  attemptNumber: number;
  academicYear: string;
  academicTerm: AcademicTerm;
  semester: number;
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  grade?: CourseGrade | null;
  letterGrade?: string | null;
  numericFinalScore?: number | null;
  krsItemId: string;
  retakeStatus: RetakeStatus;
  dataSource?: 'synthetic' | 'real';
}

export interface StudentRetakeEvaluation {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  packageSemester: number;
  latestGrade: string | null;
  latestNumericScore: number | null;
  retakeStatus: RetakeStatus; // 'required' | 'recommended' | 'cleared'
  retakeLabel: string;        // "WAJIB MENGULANG" | "DISARANKAN MENGULANG" | "SUDAH LULUS / TIDAK PERLU MENGULANG"
  retakeReason: string;       // e.g. "Nilai terakhir E", "Nilai terakhir K", "Nilai terakhir D — disarankan mengulang"
  attempts: CourseAttempt[];
  equivalentCourseId?: string;
  equivalentCourseCode?: string;
  equivalentCourseName?: string;
  isAlreadyInCurrentKRS?: boolean;
}

export interface RetakeDetectionResult {
  studentId: string;
  studentName?: string;
  studentNim?: string;
  currentSemester?: number;
  cohortYear?: number;
  requiredRetakes: StudentRetakeEvaluation[];
  recommendedRetakes: StudentRetakeEvaluation[];
  clearedCourses: StudentRetakeEvaluation[];
  totalRequiredCredits: number;
  totalRecommendedCredits: number;
}

export interface AuditLog {
  id: string;
  entityType: 'ScheduleAssignment' | 'CourseOffering' | 'Lecturer' | 'Room' | 'ScheduleVersion' | 'SCHEDULE';
  entityId: string;
  action: string;
  before?: any;
  after?: any;
  previousState?: any;
  newState?: any;
  details?: string;
  userName?: string;
  method?: 'manual' | 'recommendation' | 'simulated_annealing' | 'import' | 'system';
  userId: string;
  timestamp: string;
}

export interface ConvergencePoint {
  iteration: number;
  currentCost: number;
  bestCost: number;
  temperature: number;
  currentConflicts: number;
  bestConflicts: number;
  hardConflicts: number;
  softConflicts: number;
}

export interface TraceLogItem {
  iteration: number;
  currentCost: number;
  neighborCost: number;
  deltaCost: number;
  temperature: number;
  acceptanceProbability: number;
  accepted: boolean;
  isNewBest: boolean;
  actionTaken: string;
}

export interface OptimizationResult {
  id: string;
  timestamp: string;
  parameters: SAParameters;
  weights: ConstraintWeights;
  initialSchedule: ScheduleAssignment[];
  initialCost: number;
  initialFitness: number;
  initialConflicts: {
    total: number;
    hard: number;
    soft: number;
    items: ConflictItem[];
  };
  bestSchedule: ScheduleAssignment[];
  bestCost: number;
  bestFitness: number;
  bestConflicts: {
    total: number;
    hard: number;
    soft: number;
    items: ConflictItem[];
  };
  bestIteration: number;
  totalIterationsCompleted: number;
  executionTimeMs: number;
  status: 'COMPLETED' | 'STOPPED' | 'FAILED';
  convergenceHistory: ConvergencePoint[];
  sampleTrace: TraceLogItem[];
}

export interface ScheduleChangeRecord {
  id: string;
  timestamp: string; // ISO string
  courseId: string;
  courseCode: string;
  courseName: string;
  lecturerName: string;
  className: string;
  before: {
    day: DayOfWeek;
    timeslotLabel: string;
    roomCode: string;
  };
  after: {
    day: DayOfWeek;
    timeslotLabel: string;
    roomCode: string;
  };
  method: 'Manual Move' | 'Manual Recommendation' | 'Swap Recommendation' | 'Simulated Annealing';
  reason: string;
  conflictChange: {
    beforeTotal: number;
    afterTotal: number;
  };
}

export interface SystemState {
  courses: Course[];
  lecturers: Lecturer[];
  students?: Student[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  currentSchedule: ScheduleAssignment[] | null;
  initialSchedule: ScheduleAssignment[] | null;
  activeOptimizationResult: OptimizationResult | null;
  history: OptimizationResult[];
  parameters: SAParameters;
  weights: ConstraintWeights;
  activeView: string;
}

export type UserRole = 'admin' | 'lecturer' | 'student';

export type ScheduleStatus = 'draft' | 'optimized' | 'published';

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  lecturerId?: string; // If role === 'lecturer'
  lecturerCode?: string;
  nip?: string;
  studentId?: string;  // If role === 'student'
  classId?: string | null;    // If role === 'student'
  className?: string;
  semester?: number;
  cohortYear?: number;
  nim?: string;
}

export interface RolePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canOptimize: boolean;
  canManageSchedule: boolean;
  canManageAvailability: boolean;
  canPublishSchedule: boolean;
  canAccessResearchMode: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canOptimize: true,
    canManageSchedule: true,
    canManageAvailability: true,
    canPublishSchedule: true,
    canAccessResearchMode: true,
  },
  lecturer: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canOptimize: false,
    canManageSchedule: false,
    canManageAvailability: true,
    canPublishSchedule: false,
    canAccessResearchMode: false,
  },
  student: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canOptimize: false,
    canManageSchedule: false,
    canManageAvailability: false,
    canPublishSchedule: false,
    canAccessResearchMode: false,
  },
};


