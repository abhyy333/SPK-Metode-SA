import { Course, Lecturer, Student, ClassGroup, Room, Timeslot, SAParameters, ConstraintWeights, KBK, CurriculumPackage, CourseOffering, StudentEnrollment, AcademicSession } from '../types';
import { INITIAL_LECTURERS, INITIAL_STUDENTS as RAW_INITIAL_STUDENTS } from './realDataset';
import {
  MASTER_COURSES,
  INITIAL_KBKS,
  INITIAL_CURRICULUM_PACKAGES,
  INITIAL_COURSE_OFFERINGS,
  classifyCourseCategory,
} from './curriculumDataset';

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
    id: 'rm-101',
    code: 'TE-101',
    name: 'Ruang Kuliah TE-101',
    building: 'Gedung Kuliah Elektro Lt. 1',
    capacity: 45,
    type: 'Kelas',
    facilities: ['Proyektor HD', 'AC', 'Whiteboard', 'Sound System', 'Wi-Fi Eduroam'],
    isActive: true,
  },
  {
    id: 'rm-102',
    code: 'TE-102',
    name: 'Ruang Kuliah TE-102',
    building: 'Gedung Kuliah Elektro Lt. 1',
    capacity: 45,
    type: 'Kelas',
    facilities: ['Proyektor HD', 'AC', 'Whiteboard', 'Sound System', 'Wi-Fi Eduroam'],
    isActive: true,
  },
  {
    id: 'rm-201',
    code: 'TE-201',
    name: 'Ruang Kuliah TE-201',
    building: 'Gedung Kuliah Elektro Lt. 2',
    capacity: 50,
    type: 'Kelas',
    facilities: ['Smart TV 75"', 'AC', 'Whiteboard', 'Sound System'],
    isActive: true,
  },
  {
    id: 'rm-202',
    code: 'TE-202',
    name: 'Ruang Kuliah TE-202',
    building: 'Gedung Kuliah Elektro Lt. 2',
    capacity: 35,
    type: 'Kelas',
    facilities: ['Proyektor', 'AC', 'Whiteboard'],
    isActive: true,
  },
  {
    id: 'rm-lab-dig',
    code: 'LAB-DIGITAL',
    name: 'Laboratorium Sistem Digital & Mikroprosesor',
    building: 'Gedung Lab Terpadu Lt. 2',
    capacity: 36,
    type: 'Laboratorium',
    facilities: ['35 PC Workstation', 'FPGA Kits', 'Logic Analyzer', 'AC', 'Proyektor'],
    isActive: true,
  },
  {
    id: 'rm-lab-tel',
    code: 'LAB-TELEKOMUNIKASI',
    name: 'Laboratorium Telekomunikasi & Sinyal',
    building: 'Gedung Lab Terpadu Lt. 2',
    capacity: 32,
    type: 'Laboratorium',
    facilities: ['Spectrum Analyzer', 'SDR Kits', 'Antenna Trainer', 'AC', 'Proyektor'],
    isActive: true,
  },
  {
    id: 'rm-seminar',
    code: 'R-SEMINAR-TE',
    name: 'Ruang Seminar & Sidang Elektro',
    building: 'Gedung Utama Lt. 3',
    capacity: 60,
    type: 'Ruang Seminar',
    facilities: ['Dual Screen Proyektor', 'AC Central', 'Wireless Mic', 'Conference Setup'],
    isActive: true,
  },
];

export const DEFAULT_ACADEMIC_SESSIONS: AcademicSession[] = [
  // Senin - Kamis
  { id: 'sess-sk-1', group: 'SENIN_KAMIS', sessionNumber: 1, label: 'Sesi 1', startTime: '07:30', endTime: '09:10', isActive: true },
  { id: 'sess-sk-2', group: 'SENIN_KAMIS', sessionNumber: 2, label: 'Sesi 2', startTime: '09:20', endTime: '11:00', isActive: true },
  { id: 'sess-sk-3', group: 'SENIN_KAMIS', sessionNumber: 3, label: 'Sesi 3', startTime: '11:10', endTime: '12:50', isActive: true },
  { id: 'sess-sk-4', group: 'SENIN_KAMIS', sessionNumber: 4, label: 'Sesi 4', startTime: '13:30', endTime: '15:10', isActive: true },
  { id: 'sess-sk-5', group: 'SENIN_KAMIS', sessionNumber: 5, label: 'Sesi 5', startTime: '15:20', endTime: '17:00', isActive: true },

  // Jumat
  { id: 'sess-fri-1', group: 'JUMAT', sessionNumber: 1, label: 'Sesi 1', startTime: '07:30', endTime: '09:10', isActive: true },
  { id: 'sess-fri-2', group: 'JUMAT', sessionNumber: 2, label: 'Sesi 2', startTime: '09:20', endTime: '11:00', isActive: true },
  { id: 'sess-fri-3', group: 'JUMAT', sessionNumber: 3, label: 'Sesi 3', startTime: '13:30', endTime: '15:10', isActive: true },
  { id: 'sess-fri-4', group: 'JUMAT', sessionNumber: 4, label: 'Sesi 4', startTime: '15:20', endTime: '17:00', isActive: true },
];

export const INITIAL_TIMESLOTS: Timeslot[] = [
  // Senin
  { id: 'ts-mon-1', day: 'Senin', startTime: '07:30', endTime: '09:10', slotIndex: 1, sessionNumber: 1, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 1', durationMinutes: 100, isActive: true, label: 'Sesi 1 (07:30 - 09:10)' },
  { id: 'ts-mon-2', day: 'Senin', startTime: '09:20', endTime: '11:00', slotIndex: 2, sessionNumber: 2, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 2', durationMinutes: 100, isActive: true, label: 'Sesi 2 (09:20 - 11:00)' },
  { id: 'ts-mon-3', day: 'Senin', startTime: '11:10', endTime: '12:50', slotIndex: 3, sessionNumber: 3, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 3', durationMinutes: 100, isActive: true, label: 'Sesi 3 (11:10 - 12:50)' },
  { id: 'ts-mon-4', day: 'Senin', startTime: '13:30', endTime: '15:10', slotIndex: 4, sessionNumber: 4, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 4', durationMinutes: 100, isActive: true, label: 'Sesi 4 (13:30 - 15:10)' },
  { id: 'ts-mon-5', day: 'Senin', startTime: '15:20', endTime: '17:00', slotIndex: 5, sessionNumber: 5, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 5', durationMinutes: 100, isActive: true, label: 'Sesi 5 (15:20 - 17:00)' },

  // Selasa
  { id: 'ts-tue-1', day: 'Selasa', startTime: '07:30', endTime: '09:10', slotIndex: 1, sessionNumber: 1, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 1', durationMinutes: 100, isActive: true, label: 'Sesi 1 (07:30 - 09:10)' },
  { id: 'ts-tue-2', day: 'Selasa', startTime: '09:20', endTime: '11:00', slotIndex: 2, sessionNumber: 2, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 2', durationMinutes: 100, isActive: true, label: 'Sesi 2 (09:20 - 11:00)' },
  { id: 'ts-tue-3', day: 'Selasa', startTime: '11:10', endTime: '12:50', slotIndex: 3, sessionNumber: 3, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 3', durationMinutes: 100, isActive: true, label: 'Sesi 3 (11:10 - 12:50)' },
  { id: 'ts-tue-4', day: 'Selasa', startTime: '13:30', endTime: '15:10', slotIndex: 4, sessionNumber: 4, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 4', durationMinutes: 100, isActive: true, label: 'Sesi 4 (13:30 - 15:10)' },
  { id: 'ts-tue-5', day: 'Selasa', startTime: '15:20', endTime: '17:00', slotIndex: 5, sessionNumber: 5, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 5', durationMinutes: 100, isActive: true, label: 'Sesi 5 (15:20 - 17:00)' },

  // Rabu
  { id: 'ts-wed-1', day: 'Rabu', startTime: '07:30', endTime: '09:10', slotIndex: 1, sessionNumber: 1, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 1', durationMinutes: 100, isActive: true, label: 'Sesi 1 (07:30 - 09:10)' },
  { id: 'ts-wed-2', day: 'Rabu', startTime: '09:20', endTime: '11:00', slotIndex: 2, sessionNumber: 2, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 2', durationMinutes: 100, isActive: true, label: 'Sesi 2 (09:20 - 11:00)' },
  { id: 'ts-wed-3', day: 'Rabu', startTime: '11:10', endTime: '12:50', slotIndex: 3, sessionNumber: 3, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 3', durationMinutes: 100, isActive: true, label: 'Sesi 3 (11:10 - 12:50)' },
  { id: 'ts-wed-4', day: 'Rabu', startTime: '13:30', endTime: '15:10', slotIndex: 4, sessionNumber: 4, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 4', durationMinutes: 100, isActive: true, label: 'Sesi 4 (13:30 - 15:10)' },
  { id: 'ts-wed-5', day: 'Rabu', startTime: '15:20', endTime: '17:00', slotIndex: 5, sessionNumber: 5, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 5', durationMinutes: 100, isActive: true, label: 'Sesi 5 (15:20 - 17:00)' },

  // Kamis
  { id: 'ts-thu-1', day: 'Kamis', startTime: '07:30', endTime: '09:10', slotIndex: 1, sessionNumber: 1, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 1', durationMinutes: 100, isActive: true, label: 'Sesi 1 (07:30 - 09:10)' },
  { id: 'ts-thu-2', day: 'Kamis', startTime: '09:20', endTime: '11:00', slotIndex: 2, sessionNumber: 2, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 2', durationMinutes: 100, isActive: true, label: 'Sesi 2 (09:20 - 11:00)' },
  { id: 'ts-thu-3', day: 'Kamis', startTime: '11:10', endTime: '12:50', slotIndex: 3, sessionNumber: 3, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 3', durationMinutes: 100, isActive: true, label: 'Sesi 3 (11:10 - 12:50)' },
  { id: 'ts-thu-4', day: 'Kamis', startTime: '13:30', endTime: '15:10', slotIndex: 4, sessionNumber: 4, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 4', durationMinutes: 100, isActive: true, label: 'Sesi 4 (13:30 - 15:10)' },
  { id: 'ts-thu-5', day: 'Kamis', startTime: '15:20', endTime: '17:00', slotIndex: 5, sessionNumber: 5, sessionGroup: 'SENIN_KAMIS', sessionLabel: 'Sesi 5', durationMinutes: 100, isActive: true, label: 'Sesi 5 (15:20 - 17:00)' },

  // Jumat
  { id: 'ts-fri-1', day: 'Jumat', startTime: '07:30', endTime: '09:10', slotIndex: 1, sessionNumber: 1, sessionGroup: 'JUMAT', sessionLabel: 'Sesi 1', durationMinutes: 100, isActive: true, label: 'Sesi 1 (07:30 - 09:10)' },
  { id: 'ts-fri-2', day: 'Jumat', startTime: '09:20', endTime: '11:00', slotIndex: 2, sessionNumber: 2, sessionGroup: 'JUMAT', sessionLabel: 'Sesi 2', durationMinutes: 100, isActive: true, label: 'Sesi 2 (09:20 - 11:00)' },
  { id: 'ts-fri-3', day: 'Jumat', startTime: '13:30', endTime: '15:10', slotIndex: 3, sessionNumber: 3, sessionGroup: 'JUMAT', sessionLabel: 'Sesi 3', durationMinutes: 100, isActive: true, label: 'Sesi 3 (13:30 - 15:10)' },
  { id: 'ts-fri-4', day: 'Jumat', startTime: '15:20', endTime: '17:00', slotIndex: 4, sessionNumber: 4, sessionGroup: 'JUMAT', sessionLabel: 'Sesi 4', durationMinutes: 100, isActive: true, label: 'Sesi 4 (15:20 - 17:00)' },
];

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
