export type DayOfWeek = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type TimePreference = 'Pagi' | 'Siang' | 'Sore' | 'Fleksibel';

export type CourseCategory = 'Wajib' | 'Pilihan';
export type CourseType = 'Wajib' | 'Pilihan' | 'Praktikum';

export type RoomType = 'Kelas' | 'Laboratorium' | 'Ruang Seminar';

export type ConflictSeverity = 'high' | 'medium' | 'low';

export type ConflictCategory =
  | 'LECTURER_OVERLAP'
  | 'ROOM_OVERLAP'
  | 'CLASS_OVERLAP'
  | 'STUDENT_OVERLAP'
  | 'CURRICULUM_CONFLICT'
  | 'ROOM_CAPACITY'
  | 'LECTURER_UNAVAILABLE'
  | 'ROOM_TYPE_MISMATCH'
  | 'LECTURER_PREFERENCE_DAY'
  | 'LECTURER_PREFERENCE_TIME'
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

export interface Student {
  id: string;
  nim: string;
  name: string;
  cohortYear: number;
  currentSemester: number;
  semester?: number;
  totalEarnedCredits?: number | null; // e.g. 108, 126, or null
  curriculumYear?: 2022 | 2026 | null;
  curriculumId?: string;
  curriculumDeterminationReason?: string;
  curriculumDeterminationStatus?: 'Calculated' | 'Needs Credit Verification' | 'Manual Override';
  isManualCurriculumOverride?: boolean;
  curriculumOverrideReason?: string;
  kbkId?: string | null; // null = "KBK belum ditentukan"
  classId?: string | null;
  enrolledCourseIds?: string[];
  status: 'active' | 'historical';
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
  courseOfferingId?: string;
  academicYear: string;
  semesterTaken: number;
  kbkId?: string | null;
  status: 'planned' | 'enrolled' | 'completed' | 'failed' | 'retake';
  isRetake?: boolean; // true if retaking a course from a previous semester
  enrolledAt?: string;
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

// Mata Kuliah yang Dibuka pada Semester Aktif (Course Offering)
export interface CourseOffering {
  id: string;
  code?: string; // e.g. 'MPS1071107-1A'
  courseId: string;
  courseCode?: string;
  courseName?: string;
  sks?: number;
  credits?: number;
  category?: CourseCategory;
  curriculumYear?: number;
  academicYear?: string;
  academicTerm?: string;
  term?: string;
  semester?: number;
  kbkId?: string | null;
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
  status: 'draft' | 'ready' | 'scheduled' | 'published';
  priority?: 'Tinggi' | 'Normal';
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

export interface Timeslot {
  id: string;
  day: DayOfWeek;
  startTime: string; // "07:30"
  endTime: string;   // "09:10"
  slotIndex: number; // 1..5
  durationMinutes: number;
  isActive: boolean;
  label: string;     // "07:30 - 09:10"
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
  hardConflictWeight: number;    // C1, C2, C3 (Default 100)
  studentConflictWeight: number; // Student clash in 2 courses (Default 100)
  curriculumConflictWeight: number; // Same package clash (Default 70)
  roomCapacityWeight: number;    // C4 (Default 80)
  availabilityWeight: number;    // C5 (Default 70)
  roomTypeMismatchWeight: number;// Soft/Medium (Default 40)
  preferenceWeight: number;      // Soft Preference (Default 15)
  densityWeight: number;         // Soft Distribution (Default 10)
}

export interface SAParameters {
  initialTemperature: number; // T0, e.g. 1000
  minimumTemperature: number; // Tmin, e.g. 0.1
  coolingRate: number;        // alpha, e.g. 0.995 or 0.98
  maxIterations: number;      // max iterations, e.g. 3000 - 5000
  mutationRate: number;       // neighbor mutation rate, e.g. 0.2
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

