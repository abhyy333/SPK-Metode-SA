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
} from '../types';
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

const STORAGE_KEYS = {
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
  ACADEMIC_YEAR: 'elektro_sched_academic_year',
};

// In-memory runtime cache to eliminate repeated JSON.parse calls on every render
const memoryCache: Record<string, any> = {};

// Debounce timer map for background writes
const writeTimers: Record<string, any> = {};

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
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.error(`StorageService: Error saving ${key}`, err);
      }
    }, debounceMs);
  } else {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`StorageService: Error saving ${key}`, err);
    }
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
      this.saveCourseOfferings(INITIAL_COURSE_OFFERINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STUDENT_ENROLLMENTS)) {
      this.saveStudentEnrollments(INITIAL_ENROLLMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARAMETERS)) {
      this.saveParameters(DEFAULT_PARAMETERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.WEIGHTS)) {
      this.saveWeights(DEFAULT_WEIGHTS);
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

  // KBK
  public static getKbks(): KBK[] {
    return getCached(STORAGE_KEYS.KBKS, INITIAL_KBKS);
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
    return getCached(STORAGE_KEYS.COURSE_OFFERINGS, INITIAL_COURSE_OFFERINGS);
  }
  public static saveCourseOfferings(offerings: CourseOffering[]): void {
    setCached(STORAGE_KEYS.COURSE_OFFERINGS, offerings, 200);
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
    return getCached(STORAGE_KEYS.ROOMS, INITIAL_ROOMS);
  }
  public static saveRooms(rooms: Room[]): void {
    setCached(STORAGE_KEYS.ROOMS, rooms, 200);
  }

  // Timeslots
  public static getTimeslots(): Timeslot[] {
    return getCached(STORAGE_KEYS.TIMESLOTS, INITIAL_TIMESLOTS);
  }
  public static saveTimeslots(timeslots: Timeslot[]): void {
    setCached(STORAGE_KEYS.TIMESLOTS, timeslots, 200);
  }
  public static resetTimeslotsToDefault(): Timeslot[] {
    this.saveTimeslots(INITIAL_TIMESLOTS);
    return INITIAL_TIMESLOTS;
  }

  // Schedules
  public static getCurrentSchedule(): ScheduleAssignment[] | null {
    return getCached(STORAGE_KEYS.CURRENT_SCHEDULE, null);
  }
  public static saveCurrentSchedule(schedule: ScheduleAssignment[]): void {
    setCached(STORAGE_KEYS.CURRENT_SCHEDULE, schedule, 100);
  }

  public static getInitialSchedule(): ScheduleAssignment[] | null {
    return getCached(STORAGE_KEYS.INITIAL_SCHEDULE, null);
  }
  public static saveInitialSchedule(schedule: ScheduleAssignment[]): void {
    setCached(STORAGE_KEYS.INITIAL_SCHEDULE, schedule, 100);
  }

  // Optimization Results & History
  public static getActiveOptimizationResult(): OptimizationResult | null {
    return getCached(STORAGE_KEYS.OPTIMIZATION_RESULT, null);
  }
  public static saveActiveOptimizationResult(result: OptimizationResult): void {
    setCached(STORAGE_KEYS.OPTIMIZATION_RESULT, result);
    this.addHistory(result);
  }

  public static getHistory(): OptimizationResult[] {
    return getCached(STORAGE_KEYS.HISTORY, []);
  }
  public static addHistory(result: OptimizationResult): void {
    const history = this.getHistory();
    const updated = [result, ...history.filter(h => h.id !== result.id)].slice(0, 20);
    setCached(STORAGE_KEYS.HISTORY, updated);
  }
  public static clearHistory(): void {
    removeCached(STORAGE_KEYS.HISTORY);
  }

  // Schedule Change Logs
  public static getScheduleChangeLogs(): ScheduleChangeRecord[] {
    return getCached(STORAGE_KEYS.CHANGE_LOG, []);
  }
  public static addScheduleChangeLog(record: ScheduleChangeRecord): void {
    const logs = this.getScheduleChangeLogs();
    const updated = [record, ...logs].slice(0, 50);
    setCached(STORAGE_KEYS.CHANGE_LOG, updated);
  }
  public static clearScheduleChangeLogs(): void {
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
}
