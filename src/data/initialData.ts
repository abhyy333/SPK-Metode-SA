import { Course, Lecturer, Student, ClassGroup, Room, Timeslot, SAParameters, ConstraintWeights, KBK, CurriculumPackage, CourseOffering, StudentEnrollment, AcademicSession } from '../types';
import { INITIAL_LECTURERS, INITIAL_STUDENTS as RAW_INITIAL_STUDENTS } from './realDataset';
import {
  MASTER_COURSES,
  INITIAL_KBKS,
  INITIAL_CURRICULUM_PACKAGES,
  INITIAL_COURSE_OFFERINGS,
  classifyCourseCategory,
} from './curriculumDataset';
import { DEFAULT_STANDARD_PERIODS, generateDefaultStandardTimeslots } from '../utils/sessionUtils';

export {
  INITIAL_LECTURERS,
  MASTER_COURSES,
  INITIAL_KBKS,
  INITIAL_CURRICULUM_PACKAGES,
  INITIAL_COURSE_OFFERINGS,
  classifyCourseCategory,
};

// Initial classes enriched with KBK and cohort metadata
export const INITIAL_CLASSES: ClassGroup[] = [
  { id: 'cls-1a', code: 'ELK-1A', name: 'Teknik Elektro 1A (Smtr 1)', semester: 1, cohortYear: 2026, studentCount: 38, program: 'S1 Teknik Elektro', isActive: true },
  { id: 'cls-1b', code: 'ELK-1B', name: 'Teknik Elektro 1B (Smtr 1)', semester: 1, cohortYear: 2026, studentCount: 36, program: 'S1 Teknik Elektro', isActive: true },
  { id: 'cls-3a', code: 'ELK-3A', name: 'Teknik Elektro 3A (Smtr 3)', semester: 3, cohortYear: 2025, studentCount: 40, program: 'S1 Teknik Elektro', isActive: true },
  { id: 'cls-3b', code: 'ELK-3B', name: 'Teknik Elektro 3B (Smtr 3)', semester: 3, cohortYear: 2025, studentCount: 35, program: 'S1 Teknik Elektro', isActive: true },
  { id: 'cls-5a', code: 'ELK-5A', name: 'Teknik Elektro 5A (Smtr 5)', semester: 5, cohortYear: 2024, studentCount: 34, program: 'S1 Teknik Elektro', isActive: true },
  { id: 'cls-5b', code: 'ELK-5B', name: 'Teknik Elektro 5B (Smtr 5)', semester: 5, cohortYear: 2024, studentCount: 32, program: 'S1 Teknik Elektro', isActive: true },
  { id: 'cls-7a', code: 'ELK-7A', name: 'Teknik Elektro 7A (Smtr 7)', semester: 7, cohortYear: 2023, studentCount: 38, program: 'S1 Teknik Elektro', isActive: true },
];

export const INITIAL_STUDENTS: Student[] = RAW_INITIAL_STUDENTS.map((std, idx) => {
  // First 40 students of 2023 cohort have verified KBK distribution for rich demonstration, remaining null
  let kbkId: string | null = null;
  let kbkDataSource: 'synthetic' | 'real' | undefined = undefined;
  let enrolledCourseIds: string[] = [];

  const is096 = std.nim.toUpperCase().includes('F1B02310096') || std.nim.toUpperCase().includes('10096') || idx === 0;

  if (std.cohortYear === 2023 || is096) {
    if (is096 || idx < 14) {
      kbkId = 'kbk-stl';
      kbkDataSource = 'synthetic';
      enrolledCourseIds = ['crs-fbs4142', 'crs-fbs4143', 'crs-fba4114', 'crs-fba4115'];
    } else if (idx < 28) {
      kbkId = 'kbk-telekomunikasi-2022';
      kbkDataSource = 'synthetic';
      enrolledCourseIds = ['crs-fbs4142', 'crs-fbs4143', 'crs-fbc4113', 'crs-fbc4114'];
    } else if (idx < 42) {
      kbkId = 'kbk-komputer';
      kbkDataSource = 'synthetic';
      enrolledCourseIds = ['crs-fbs4142', 'crs-fbs4143', 'crs-fbd4115', 'crs-fbd4116'];
    } else {
      // Remaining students intentionally null ("KBK belum ditentukan")
      kbkId = null;
      enrolledCourseIds = [];
    }
  }

  // Assign Academic Advisor (Dosen PA) deterministically
  const advisorLecturer = INITIAL_LECTURERS[idx % INITIAL_LECTURERS.length];

  const currentSemester = std.currentSemester || std.semester || (std.cohortYear === 2023 ? 7 : std.cohortYear === 2024 ? 5 : std.cohortYear === 2025 ? 3 : 1);

  return {
    ...std,
    currentSemester,
    semester: currentSemester,
    kbkId,
    kbkDataSource,
    academicAdvisorLecturerId: advisorLecturer?.id || null,
    academicAdvisorLecturerName: advisorLecturer?.name || null,
    curriculumYear: std.cohortYear >= 2024 ? 2026 : 2022,
    curriculumId: std.cohortYear >= 2024 ? 'curr-2026' : 'curr-2022',
    curriculumDeterminationReason: std.cohortYear >= 2024 
      ? `Angkatan ${std.cohortYear} (>= 2024) -> Kurikulum 2026` 
      : `Angkatan ${std.cohortYear} (Semester ${currentSemester} >= 7) -> Kurikulum 2022`,
    enrolledCourseIds,
    status: currentSemester <= 8 ? 'active' : 'historical',
    isActive: true,
  };
});

// Generate Student Enrollments
export const INITIAL_ENROLLMENTS: StudentEnrollment[] = [];
INITIAL_STUDENTS.forEach((std) => {
  if (std.enrolledCourseIds && std.enrolledCourseIds.length > 0) {
    std.enrolledCourseIds.forEach((cId) => {
      INITIAL_ENROLLMENTS.push({
        id: `enr-${std.id}-${cId}`,
        studentId: std.id,
        courseId: cId,
        academicYear: '2026/2027 Ganjil',
        semesterTaken: std.currentSemester,
        status: 'enrolled',
        enrolledAt: '2026-08-20',
      });
    });
  }
});

// Master Course catalog for the schedule optimizer
export const INITIAL_COURSES: Course[] = MASTER_COURSES;

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'rm-e',
    code: 'C2-08',
    name: 'Ruang E',
    building: 'Gedung C2 Lt. 2',
    capacity: 60,
    type: 'Ruang Kuliah Teori',
    facilities: [],
    isActive: true,
  },
  {
    id: 'rm-f',
    code: 'C2-09',
    name: 'Ruang F',
    building: 'Gedung C2 Lt. 2',
    capacity: 60,
    type: 'Ruang Kuliah Teori',
    facilities: [],
    isActive: true,
  },
  {
    id: 'rm-i',
    code: 'C2-07',
    name: 'Ruang I',
    building: 'Gedung C2 Lt. 2',
    capacity: 40,
    type: 'Ruang Kuliah Teori',
    facilities: [],
    isActive: true,
  },
  {
    id: 'rm-d2',
    code: 'B2-04',
    name: 'Ruang D2',
    building: 'Gedung B2 Lt. 2',
    capacity: 40,
    type: 'Ruang Kuliah Teori',
    facilities: [],
    isActive: true,
  },
  {
    id: 'rm-studio',
    code: 'B2-02',
    name: 'Ruang STUDIO',
    building: 'Gedung B2 Lt. 2',
    capacity: 60,
    type: 'Ruang Kuliah Teori',
    facilities: [],
    isActive: true,
  },
  {
    id: 'rm-komputer',
    code: 'Laboratorium',
    name: 'Ruang Komputer',
    building: 'Gedung Lab Terpadu',
    capacity: 35,
    type: 'Laboratorium',
    facilities: [],
    isActive: true,
  },
  {
    id: 'rm-inter',
    code: 'Ruang Internasional',
    name: 'Ruang INTER',
    building: 'Gedung Kuliah Utama',
    capacity: 25,
    type: 'Ruang Kuliah Teori',
    facilities: [],
    isActive: true,
  },
];

export const DEFAULT_ACADEMIC_SESSIONS: AcademicSession[] = DEFAULT_STANDARD_PERIODS.map((p, idx) => ({
  id: `sess-std-${idx + 1}`,
  group: 'SENIN_KAMIS',
  sessionNumber: idx + 1,
  label: `Sesi ${idx + 1}`,
  startTime: p.startTime,
  endTime: p.endTime,
  isActive: true,
}));

export const INITIAL_TIMESLOTS: Timeslot[] = generateDefaultStandardTimeslots();

export const DEFAULT_PARAMETERS: SAParameters = {
  initialTemperature: 1000,
  minimumTemperature: 0.1,
  coolingRate: 0.995,
  maxIterations: 5000,
  mutationRate: 0.2,
};

export const DEFAULT_WEIGHTS: ConstraintWeights = {
  hardConflictWeight: 100,
  studentConflictWeight: 100,
  curriculumConflictWeight: 70,
  roomCapacityWeight: 80,
  availabilityWeight: 70,
  roomTypeMismatchWeight: 40,
  preferenceWeight: 15,
  densityWeight: 10,
};
