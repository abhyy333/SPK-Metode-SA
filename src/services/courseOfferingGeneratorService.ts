import {
  Course,
  CurriculumPackage,
  CourseOffering,
  Lecturer,
  CoursePackageItem,
  ScheduleGroup,
} from '../types';
import { StorageService } from './storageService';
import { createBalancedSections, MIN_STUDENTS_PER_CLASS, MAX_STUDENTS_PER_CLASS } from '../utils/sectionSplitting';

export interface CoursePlanningItem {
  courseId: string;
  courseCode?: string;
  courseName?: string;
  sks?: number;
  semester: number;
  curriculumYear: number;
  kbkId?: string | null;
  totalStudents: number;
  assignedLecturerId?: string | null;
  assignedLecturerIds?: string[];
  isPracticum?: boolean;
  allowBelowMinimum?: boolean;
  customSections?: {
    section: string;
    studentCount: number;
    lecturerId?: string | null;
    lecturerIds?: string[];
  }[];
}

export interface GenerationOptions {
  academicTerm?: 'ganjil' | 'genap';
  curriculumYear?: 2026 | 2022 | 'all';
  maxClassSize?: number; // default 40
  minElectiveStudents?: number;
  autoEnrollPackageStudents?: boolean;
  targetSemester?: number | 'all';
}

export interface GenerationReport {
  generatedOfferings: CourseOffering[];
  excludedPracticums: {
    courseId: string;
    courseCode: string;
    courseName: string;
    sks: number;
    semester: number;
    curriculumYear: number;
    reason: string;
  }[];
  closedElectives?: {
    courseId: string;
    courseCode: string;
    courseName: string;
    sks: number;
    semester: number;
    curriculumYear: number;
    studentCount: number;
    reason: string;
  }[];
  summary: {
    academicTerm: 'ganjil' | 'genap';
    activeSemesters: number[];
    totalTheoryOfferings: number;
    totalUniqueCourses: number;
    totalSections: number;
    totalPracticumExcluded: number;
    totalClosedElectives?: number;
    assignedLecturerOfferings: number;
    unassignedLecturerOfferings: number;
    semesterBreakdown: Record<
      number,
      {
        semester: number;
        expectedTheoryCourses: number;
        generatedUniqueCourses: number;
        totalSections: number;
        projectedStudents?: number;
        totalStudents?: number;
        status: 'VALID' | 'WARNING';
      }
    >;
  };
}

/**
 * Standard aggregate projections per semester cohort & KBK in Teknik Elektro Universitas Mataram
 */
export const COHORT_PROJECTIONS: Record<number, number> = {
  1: 76, // Sem 1 (Angkatan 2026): ~76 mahasiswa -> Sec A: 38, Sec B: 38
  2: 76, // Sem 2 (Angkatan 2026): ~76 mahasiswa -> Sec A: 38, Sec B: 38
  3: 72, // Sem 3 (Angkatan 2025): ~72 mahasiswa -> Sec A: 36, Sec B: 36
  4: 72, // Sem 4 (Angkatan 2025): ~72 mahasiswa -> Sec A: 36, Sec B: 36
  5: 75, // Sem 5 (Angkatan 2024 total across 3 KBK)
  6: 75, // Sem 6 (Angkatan 2024 total across 3 KBK)
  7: 68, // Sem 7 (Angkatan 2023 total across 3 KBK)
  8: 68, // Sem 8 (Angkatan 2023 total across 3 KBK)
};

export const KBK_PROJECTIONS: Record<string, number> = {
  'kbk-komputer': 28,
  'kbk-stl': 26,
  'kbk-elektronika-komunikasi': 22,
  'kbk-tel': 22,
  'kbk-el': 22,
};

export class CourseOfferingGeneratorService {
  /**
   * Identifies whether a course is non-schedulable by Jurusan (e.g., KKN managed by LPPM)
   */
  public static isNonSchedulableCourse(course: Course | { name?: string; code?: string; type?: string; isSchedulable?: boolean; is_schedulable?: boolean; isLppmManaged?: boolean; dijadwalkanJurusan?: boolean }): boolean {
    if (course.isSchedulable === false || (course as any).is_schedulable === false || (course as any).dijadwalkanJurusan === false || (course as any).isLppmManaged === true) {
      return true;
    }
    const name = (course.name || '').trim().toUpperCase();
    const code = (course.code || '').trim().toUpperCase();
    return name === 'KKN' || code === 'MPK1077101' || code === 'FBS4142';
  }

  /**
   * Identifies whether a course is a practicum / laboratory subject
   */
  public static isPracticumCourse(course: Course | { name?: string; code?: string; type?: string }): boolean {
    const name = (course.name || '').toLowerCase();
    const code = (course.code || '').toLowerCase();
    const type = (course.type || '').toLowerCase();

    return (
      type === 'praktikum' ||
      name.includes('praktikum') ||
      name.includes('lab') ||
      code.includes('prk') ||
      code.includes('lab')
    );
  }

  /**
   * Main Generator: Generates CourseOfferings based on active CurriculumPackages
   * Rules:
   * - Semester 1, 3, 5, 7 for Ganjil; 2, 4, 6, 8 for Genap
   * - Exclude practicum from main lecture timetable
   * - Auto split section A / B if expectedEnrollment > maxClassSize (40)
   * - Preserves manual edits & assigned lecturers
   */
  public static generateOfferings(options: GenerationOptions = {}): GenerationReport {
    const academicTerm = options.academicTerm || 'ganjil';
    const curriculumYear = options.curriculumYear || 'all';
    const maxClassSize = options.maxClassSize || 40;
    const targetSemester = options.targetSemester || 'all';

    // 1. Determine active semesters
    const activeSemesters =
      targetSemester !== 'all'
        ? [Number(targetSemester)]
        : academicTerm === 'ganjil'
        ? [1, 3, 5, 7]
        : [2, 4, 6, 8];

    // 2. Load dataset from StorageService
    const allPackages = StorageService.getCurriculumPackages();
    const allCourses = StorageService.getCourses();
    const allLecturers = StorageService.getLecturers();
    const existingOfferings = StorageService.getCourseOfferings();

    const existingOfferingMap = new Map<string, CourseOffering>();
    existingOfferings.forEach((o) => {
      const sec = o.section || o.sectionName || (o.courseName?.endsWith('-B') ? 'B' : 'A');
      existingOfferingMap.set(`${o.courseId}__${sec}`, o);
      if (o.code) existingOfferingMap.set(`${o.code}__${sec}`, o);
    });

    const courseMap = new Map<string, Course>(allCourses.map((c) => [c.id, c]));
    allCourses.forEach((c) => {
      if (c.code) courseMap.set(c.code, c);
    });

    // 3. Filter packages for active semesters & curriculum
    const relevantPackages = allPackages.filter((pkg) => {
      if (!activeSemesters.includes(pkg.semester)) return false;
      if (curriculumYear !== 'all' && pkg.curriculumYear !== curriculumYear) return false;
      return true;
    });

    const generatedOfferings: CourseOffering[] = [];
    const excludedPracticums: GenerationReport['excludedPracticums'] = [];
    const seenCourseIdsInPackage = new Set<string>();
    const seenOfferingIds = new Set<string>();
    const expectedTheoryBySemester: Record<number, Set<string>> = {};
    const generatedUniqueBySemester: Record<number, Set<string>> = {};

    activeSemesters.forEach((sem) => {
      expectedTheoryBySemester[sem] = new Set<string>();
      generatedUniqueBySemester[sem] = new Set<string>();
    });

    // 4. Iterate over relevant packages
    for (const pkg of relevantPackages) {
      const sem = pkg.semester;
      const cYear = pkg.curriculumYear || 2026;
      const isCommon = sem <= 4;
      const scheduleGroupId = isCommon
        ? `pkg-${cYear}-sem-${sem}`
        : `pkg-${cYear}-sem-${sem}-${pkg.kbkId || 'common'}`;

      // Extract course items from package
      const items: CoursePackageItem[] =
        pkg.courseItems && pkg.courseItems.length > 0
          ? pkg.courseItems
          : pkg.courseIds.map((cId) => {
              const found = courseMap.get(cId);
              return {
                type: 'course',
                courseId: found?.id || cId,
                courseCode: found?.code || cId,
                courseName: found?.name || cId,
                credits: found?.sks || 0,
                isElective: found?.category === 'Pilihan',
                kbkId: found?.kbkIds?.[0] || pkg.kbkId || undefined,
              };
            });

      for (const item of items) {
        if (item.type === 'elective-slot' && !item.courseId) {
          continue;
        }

        const courseId = item.courseId || item.courseCode || '';
        const course = courseMap.get(courseId);

        if (!course) {
          continue;
        }

        // Deduplicate common courses across multiple KBK packages in the same semester & curriculum year
        const coursePackageUniqueKey = `${cYear}-${course.id}-${sem}`;
        if (seenCourseIdsInPackage.has(coursePackageUniqueKey)) {
          continue;
        }
        seenCourseIdsInPackage.add(coursePackageUniqueKey);

        // Check if Non-Schedulable (KKN / LPPM managed) -> Exclude from lecture schedule
        if (this.isNonSchedulableCourse(course)) {
          if (!excludedPracticums.some((p) => p.courseId === course.id && p.semester === sem && p.curriculumYear === cYear)) {
            excludedPracticums.push({
              courseId: course.id,
              courseCode: course.code,
              courseName: course.name,
              sks: course.sks,
              semester: sem,
              curriculumYear: cYear,
              reason: 'Dikelola LPPM (Tidak Dijadwalkan Jurusan — Berlaku Semua KBK)',
            });
          }
          continue;
        }

        // Check if Practicum -> Exclude from lecture schedule
        if (this.isPracticumCourse(course)) {
          if (!excludedPracticums.some((p) => p.courseId === course.id && p.semester === sem && p.curriculumYear === cYear)) {
            excludedPracticums.push({
              courseId: course.id,
              courseCode: course.code,
              courseName: course.name,
              sks: course.sks,
              semester: sem,
              curriculumYear: cYear,
              reason: 'Praktikum tidak masuk jadwal kuliah utama (jadwal terpisah laboratorium)',
            });
          }
          continue;
        }

        if (expectedTheoryBySemester[sem]) {
          expectedTheoryBySemester[sem].add(course.id);
        }

        // Determine projected student count
        let totalProjected = COHORT_PROJECTIONS[sem] || 40;
        if (!isCommon && pkg.kbkId && course.category === 'Pilihan') {
          totalProjected = KBK_PROJECTIONS[pkg.kbkId] || 25;
        } else if (course.category === 'Pilihan') {
          totalProjected = Math.min(30, totalProjected);
        }

        // Determine number of sections (e.g. 76 students -> Section A: 38, Section B: 38)
        const numSections = totalProjected > maxClassSize ? Math.ceil(totalProjected / maxClassSize) : 1;
        const sectionLabels = numSections === 1 ? ['A'] : numSections === 2 ? ['A', 'B'] : ['A', 'B', 'C'];
        const studentsPerSection = Math.round(totalProjected / numSections);

        // Eligible lecturers: Lecturers whose expertise or course assignment matches
        const eligibleLecturers = allLecturers.filter((lec) => {
          if (course.lecturerId && lec.id === course.lecturerId) return true;
          const expertise = (lec.expertise || '').toLowerCase();
          const cName = (course.name || '').toLowerCase();
          const cCode = (course.code || '').toLowerCase();
          return (
            expertise.includes(cName.split(' ')[0]) ||
            expertise.includes(cCode.substring(0, 3).toLowerCase()) ||
            (course.kbkIds && course.kbkIds.some((k) => expertise.includes(k.replace('kbk-', ''))))
          );
        });
        const eligibleLecturerIds = eligibleLecturers.map((l) => l.id);
        if (course.lecturerId && !eligibleLecturerIds.includes(course.lecturerId)) {
          eligibleLecturerIds.unshift(course.lecturerId);
        }

        sectionLabels.forEach((secLetter, secIndex) => {
          const sanitizedCode = course.code.toLowerCase().replace(/[^a-z0-9]/g, '');
          const baseOfferingId = `off-${cYear !== 2026 ? `${cYear}-` : ''}${sanitizedCode}-${sem}${secLetter.toLowerCase()}`;
          let offeringId = baseOfferingId;
          let counter = 2;
          while (seenOfferingIds.has(offeringId)) {
            offeringId = `${baseOfferingId}-${counter++}`;
          }
          seenOfferingIds.add(offeringId);

          const existingOffering = existingOfferingMap.get(`${course.id}__${secLetter}`) || existingOfferingMap.get(`${offeringId}__${secLetter}`);

          // Determine assigned lecturer
          let assignedLecId: string | null = null;
          let assignedLecIds: string[] = [];

          if (existingOffering && existingOffering.assignedLecturerId) {
            assignedLecId = existingOffering.assignedLecturerId;
            assignedLecIds = existingOffering.assignedLecturerIds || [existingOffering.assignedLecturerId];
          } else if (existingOffering && existingOffering.lecturerId) {
            assignedLecId = existingOffering.lecturerId;
            assignedLecIds = existingOffering.lecturerIds || [existingOffering.lecturerId];
          } else if (course.lecturerId) {
            assignedLecId = course.lecturerId;
            assignedLecIds = [course.lecturerId];
          } else if (eligibleLecturerIds.length > 0) {
            assignedLecId = eligibleLecturerIds[secIndex % eligibleLecturerIds.length];
            assignedLecIds = [assignedLecId];
          }

          const lecNames = assignedLecIds.map((id) => allLecturers.find((l) => l.id === id)?.name || id);
          const lecCodes = assignedLecIds.map((id) => allLecturers.find((l) => l.id === id)?.code || id);

          const requiredRoomType = (course.type === 'Praktikum' || this.isPracticumCourse(course))
            ? 'Laboratorium'
            : 'Kelas';

          const offering: CourseOffering = {
            id: offeringId,
            code: `${course.code}-${secLetter}`,
            courseId: course.id,
            courseCode: course.code,
            courseName: numSections > 1 ? `${course.name} - Kelas ${secLetter}` : course.name,
            sks: course.sks,
            credits: course.sks,
            sourceType: 'package',
            offeringType: course.category === 'Pilihan' ? 'elective' : 'regular',
            section: secLetter,
            sectionName: secLetter,
            targetScheduleGroup: isCommon ? `${scheduleGroupId}-sec-${secLetter}` : scheduleGroupId,
            semester: sem,
            kbkId: pkg.kbkId || course.kbkIds?.[0] || null,
            curriculumYear: cYear,
            academicYear: `${cYear}/${cYear + 1} ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'}`,
            academicTerm,
            assignedLecturerId: assignedLecId,
            assignedLecturerIds: assignedLecIds,
            eligibleLecturerIds,
            expectedEnrollment: studentsPerSection,
            capacity: studentsPerSection,
            studentCount: studentsPerSection,
            isDataProjection: true,
            requiredRoomType,
            requiredEquipment: requiredRoomType === 'Laboratorium' ? ['Komputer Lab / Alat Ukur'] : ['Proyektor LCD', 'Whiteboard'],
            preferredTimeslots: course.preferredTime === 'Pagi' ? ['ts-1', 'ts-2'] : undefined,
            category: course.category,
            lecturerIds: assignedLecIds,
            lecturerId: assignedLecId,
            lecturerNames: lecNames,
            lecturerName: lecNames[0] || null,
            lecturerCodes: lecCodes,
            lecturerCode: lecCodes[0] || null,
            status: existingOffering?.status || 'ready',
            isLocked: existingOffering?.isLocked || false,
            lockedSchedule: existingOffering?.lockedSchedule || false,
            lockConfig: existingOffering?.lockConfig,
            isPracticum: false,
          };

          generatedOfferings.push(offering);

          if (generatedUniqueBySemester[sem]) {
            generatedUniqueBySemester[sem].add(course.id);
          }
        });
      }
    }

    // 5. Build Summary
    const semesterBreakdown: GenerationReport['summary']['semesterBreakdown'] = {};
    activeSemesters.forEach((sem) => {
      const expCount = expectedTheoryBySemester[sem]?.size || 0;
      const genCount = generatedUniqueBySemester[sem]?.size || 0;
      const semOfferings = generatedOfferings.filter((o) => o.semester === sem);
      const totalStudents = semOfferings.reduce((sum, o) => sum + (o.expectedEnrollment || 0), 0);

      semesterBreakdown[sem] = {
        semester: sem,
        expectedTheoryCourses: expCount,
        generatedUniqueCourses: genCount,
        totalSections: semOfferings.length,
        projectedStudents: totalStudents,
        status: genCount >= expCount ? 'VALID' : 'WARNING',
      };
    });

    const assignedCount = generatedOfferings.filter((o) => o.assignedLecturerId || (o.lecturerIds && o.lecturerIds.length > 0)).length;

    const report: GenerationReport = {
      generatedOfferings,
      excludedPracticums,
      summary: {
        academicTerm,
        activeSemesters,
        totalTheoryOfferings: generatedOfferings.length,
        totalUniqueCourses: new Set(generatedOfferings.map((o) => o.courseId)).size,
        totalSections: generatedOfferings.length,
        totalPracticumExcluded: excludedPracticums.length,
        assignedLecturerOfferings: assignedCount,
        unassignedLecturerOfferings: generatedOfferings.length - assignedCount,
        semesterBreakdown,
      },
    };

    return report;
  }

  /**
   * Generate Offerings from specific selected packages
   */
  public static generateFromSelectedPackages(
    packageIds: string[],
    options: {
      academicTerm?: 'ganjil' | 'genap';
      maxClassSize?: number;
      curriculumYear?: 2026 | 2022 | 'all';
    } = {}
  ): GenerationReport {
    const allPackages = StorageService.getCurriculumPackages();
    const selectedPackages = allPackages.filter((p) => packageIds.includes(p.id));
    const allCourses = StorageService.getCourses();
    const allLecturers = StorageService.getLecturers();
    const existingOfferings = StorageService.getCourseOfferings();

    const maxClassSize = options.maxClassSize || 40;
    const academicTerm = options.academicTerm || 'ganjil';

    const existingOfferingMap = new Map<string, CourseOffering>();
    existingOfferings.forEach((o) => {
      const sec = o.section || o.sectionName || (o.courseName?.endsWith('-B') ? 'B' : 'A');
      existingOfferingMap.set(`${o.courseId}__${sec}`, o);
    });

    const courseMap = new Map<string, Course>(allCourses.map((c) => [c.id, c]));
    allCourses.forEach((c) => {
      if (c.code) courseMap.set(c.code, c);
    });

    const generatedOfferings: CourseOffering[] = [];
    const excludedPracticums: GenerationReport['excludedPracticums'] = [];
    const seenCourseIds = new Set<string>();
    const seenOfferingIds = new Set<string>();

    for (const pkg of selectedPackages) {
      const sem = pkg.semester;
      const cYear = pkg.curriculumYear || 2026;
      const isCommon = sem <= 4;
      const scheduleGroupId = isCommon
        ? `pkg-${cYear}-sem-${sem}`
        : `pkg-${cYear}-sem-${sem}-${pkg.kbkId || 'common'}`;

      const items: CoursePackageItem[] =
        pkg.courseItems && pkg.courseItems.length > 0
          ? pkg.courseItems
          : pkg.courseIds.map((cId) => {
              const found = courseMap.get(cId);
              return {
                type: 'course',
                courseId: found?.id || cId,
                courseCode: found?.code || cId,
                courseName: found?.name || cId,
                credits: found?.sks || 0,
                isElective: found?.category === 'Pilihan',
                kbkId: found?.kbkIds?.[0] || pkg.kbkId || undefined,
              };
            });

      for (const item of items) {
        if (item.type === 'elective-slot' && !item.courseId) continue;
        const courseId = item.courseId || item.courseCode || '';
        const course = courseMap.get(courseId);
        if (!course) continue;

        const uniqueKey = `${cYear}-${course.id}-${sem}`;
        if (seenCourseIds.has(uniqueKey)) continue;
        seenCourseIds.add(uniqueKey);

        if (this.isNonSchedulableCourse(course)) {
          excludedPracticums.push({
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            sks: course.sks,
            semester: sem,
            curriculumYear: cYear,
            reason: 'Dikelola LPPM (Tidak Dijadwalkan Jurusan — Berlaku Semua KBK)',
          });
          continue;
        }

        if (this.isPracticumCourse(course)) {
          excludedPracticums.push({
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            sks: course.sks,
            semester: sem,
            curriculumYear: cYear,
            reason: 'Praktikum tidak masuk jadwal kuliah utama (jadwal terpisah laboratorium)',
          });
          continue;
        }

        let totalProjected = COHORT_PROJECTIONS[sem] || 40;
        if (!isCommon && pkg.kbkId && course.category === 'Pilihan') {
          totalProjected = KBK_PROJECTIONS[pkg.kbkId] || 25;
        } else if (course.category === 'Pilihan') {
          totalProjected = Math.min(30, totalProjected);
        }

        const numSections = totalProjected > maxClassSize ? Math.ceil(totalProjected / maxClassSize) : 1;
        const sectionLabels = numSections === 1 ? ['A'] : numSections === 2 ? ['A', 'B'] : ['A', 'B', 'C'];
        const studentsPerSection = Math.round(totalProjected / numSections);

        const eligibleLecturers = allLecturers.filter((lec) => {
          if (course.lecturerId && lec.id === course.lecturerId) return true;
          const expertise = (lec.expertise || '').toLowerCase();
          const cName = (course.name || '').toLowerCase();
          return expertise.includes(cName.split(' ')[0]);
        });
        const eligibleLecturerIds = eligibleLecturers.map((l) => l.id);

        sectionLabels.forEach((secLetter, secIndex) => {
          const sanitizedCode = course.code.toLowerCase().replace(/[^a-z0-9]/g, '');
          const baseOfferingId = `off-${cYear !== 2026 ? `${cYear}-` : ''}${sanitizedCode}-${sem}${secLetter.toLowerCase()}`;
          let offeringId = baseOfferingId;
          let counter = 2;
          while (seenOfferingIds.has(offeringId)) {
            offeringId = `${baseOfferingId}-${counter++}`;
          }
          seenOfferingIds.add(offeringId);

          const existingOffering = existingOfferingMap.get(`${course.id}__${secLetter}`);
          let assignedLecId: string | null = null;
          let assignedLecIds: string[] = [];

          if (existingOffering && existingOffering.lecturerId) {
            assignedLecId = existingOffering.lecturerId;
            assignedLecIds = existingOffering.lecturerIds || [existingOffering.lecturerId];
          } else if (course.lecturerId) {
            assignedLecId = course.lecturerId;
            assignedLecIds = [course.lecturerId];
          } else if (eligibleLecturerIds.length > 0) {
            assignedLecId = eligibleLecturerIds[secIndex % eligibleLecturerIds.length];
            assignedLecIds = [assignedLecId];
          }

          const lecNames = assignedLecIds.map((id) => allLecturers.find((l) => l.id === id)?.name || id);
          const lecCodes = assignedLecIds.map((id) => allLecturers.find((l) => l.id === id)?.code || id);

          const offering: CourseOffering = {
            id: offeringId,
            code: `${course.code}-${secLetter}`,
            courseId: course.id,
            courseCode: course.code,
            courseName: numSections > 1 ? `${course.name} - Kelas ${secLetter}` : course.name,
            sks: course.sks,
            credits: course.sks,
            sourceType: 'package',
            offeringType: course.category === 'Pilihan' ? 'elective' : 'regular',
            section: secLetter,
            sectionName: secLetter,
            targetScheduleGroup: isCommon ? `${scheduleGroupId}-sec-${secLetter}` : scheduleGroupId,
            semester: sem,
            kbkId: pkg.kbkId || course.kbkIds?.[0] || null,
            curriculumYear: cYear,
            academicYear: `${cYear}/${cYear + 1} ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'}`,
            academicTerm,
            assignedLecturerId: assignedLecId,
            assignedLecturerIds: assignedLecIds,
            eligibleLecturerIds,
            expectedEnrollment: studentsPerSection,
            capacity: studentsPerSection,
            studentCount: studentsPerSection,
            isDataProjection: true,
            requiredRoomType: 'Kelas',
            requiredEquipment: ['Proyektor LCD', 'Whiteboard'],
            category: course.category,
            lecturerIds: assignedLecIds,
            lecturerId: assignedLecId,
            lecturerNames: lecNames,
            lecturerName: lecNames[0] || null,
            lecturerCodes: lecCodes,
            lecturerCode: lecCodes[0] || null,
            status: existingOffering?.status || 'ready',
            isLocked: existingOffering?.isLocked || false,
            isPracticum: false,
          };

          generatedOfferings.push(offering);
        });
      }
    }

    const assignedCount = generatedOfferings.filter((o) => o.assignedLecturerId || (o.lecturerIds && o.lecturerIds.length > 0)).length;

    return {
      generatedOfferings,
      excludedPracticums,
      summary: {
        academicTerm,
        activeSemesters: Array.from(new Set(selectedPackages.map((p) => p.semester))),
        totalTheoryOfferings: generatedOfferings.length,
        totalUniqueCourses: new Set(generatedOfferings.map((o) => o.courseId)).size,
        totalSections: generatedOfferings.length,
        totalPracticumExcluded: excludedPracticums.length,
        assignedLecturerOfferings: assignedCount,
        unassignedLecturerOfferings: generatedOfferings.length - assignedCount,
        semesterBreakdown: {},
      },
    };
  }

  /**
   * Generate Offerings from manually selected courses with customizable parallel sections
   */
  public static generateFromManualCourses(
    courseConfigs: {
      courseId: string;
      sections: string[]; // e.g. ['A', 'B'] or ['A']
      customClassNamePrefix?: string;
      targetCapacity?: number;
      assignedLecturerIds?: string[];
    }[],
    academicTerm: 'ganjil' | 'genap' = 'ganjil'
  ): CourseOffering[] {
    const allCourses = StorageService.getCourses();
    const allLecturers = StorageService.getLecturers();
    const courseMap = new Map<string, Course>(allCourses.map((c) => [c.id, c]));
    allCourses.forEach((c) => {
      if (c.code) courseMap.set(c.code, c);
    });

    const newOfferings: CourseOffering[] = [];
    const timestamp = Date.now().toString(36);

    courseConfigs.forEach((cfg) => {
      const course = courseMap.get(cfg.courseId);
      if (!course) return;

      const sem = course.semester || 1;
      const cYear = course.curriculumYear || 2026;
      const sections = cfg.sections.length > 0 ? cfg.sections : ['A'];
      const cap = cfg.targetCapacity || 40;

      sections.forEach((secLetter, idx) => {
        const sanitizedCode = course.code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const offeringId = `off-manual-${sanitizedCode}-${secLetter.toLowerCase()}-${timestamp}-${idx}`;
        const secName = cfg.customClassNamePrefix
          ? `${cfg.customClassNamePrefix} ${secLetter}`
          : secLetter;

        const assignedIds = cfg.assignedLecturerIds && cfg.assignedLecturerIds.length > 0
          ? cfg.assignedLecturerIds
          : course.lecturerId
          ? [course.lecturerId]
          : [];

        const lecNames = assignedIds.map((id) => allLecturers.find((l) => l.id === id)?.name || id);
        const lecCodes = assignedIds.map((id) => allLecturers.find((l) => l.id === id)?.code || id);

        const offering: CourseOffering = {
          id: offeringId,
          code: `${course.code}-${secLetter}`,
          courseId: course.id,
          courseCode: course.code,
          courseName: sections.length > 1 ? `${course.name} (${secName})` : course.name,
          sks: course.sks,
          credits: course.sks,
          sourceType: 'manual',
          offeringType: course.category === 'Pilihan' ? 'elective' : 'regular',
          section: secLetter,
          sectionName: secName,
          targetScheduleGroup: `manual-group-sem-${sem}-${secLetter}`,
          semester: sem,
          kbkId: course.kbkIds?.[0] || null,
          curriculumYear: cYear,
          academicYear: `${cYear}/${cYear + 1} ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'}`,
          academicTerm,
          assignedLecturerId: assignedIds[0] || null,
          assignedLecturerIds: assignedIds,
          eligibleLecturerIds: assignedIds,
          expectedEnrollment: cap,
          capacity: cap,
          studentCount: cap,
          isDataProjection: false,
          requiredRoomType: course.type === 'Praktikum' ? 'Laboratorium' : 'Kelas',
          requiredEquipment: ['Proyektor LCD', 'Whiteboard'],
          category: course.category,
          lecturerIds: assignedIds,
          lecturerId: assignedIds[0] || null,
          lecturerNames: lecNames,
          lecturerName: lecNames[0] || null,
          lecturerCodes: lecCodes,
          lecturerCode: lecCodes[0] || null,
          status: 'ready',
          isLocked: false,
          isPracticum: course.type === 'Praktikum',
        };

        newOfferings.push(offering);
      });
    });

    return newOfferings;
  }

  /**
   * Generates balanced course offerings from admin-selected course plan.
   * - Balanced section splitting via createBalancedSections (>40 mhs splits evenly)
   * - Min 10 students check (unless allowBelowMinimum is explicitly set)
   * - Practicums marked and excluded from main schedule
   * - Unassigned lecturers by default (lecturerIds = [], lecturerId = null)
   */
  public static generateOfferingsFromSemesterPlan(
    planItems: CoursePlanningItem[],
    options: {
      academicTerm?: 'ganjil' | 'genap';
      academicYear?: string;
      maxClassSize?: number;
    } = {}
  ): GenerationReport {
    const allCourses = StorageService.getCourses();
    const allLecturers = StorageService.getLecturers();
    const existingOfferings = StorageService.getCourseOfferings();

    const courseMap = new Map<string, Course>(allCourses.map((c) => [c.id, c]));
    allCourses.forEach((c) => {
      if (c.code) courseMap.set(c.code, c);
    });

    const lecturerMap = new Map<string, Lecturer>(allLecturers.map((l) => [l.id, l]));

    const existingMap = new Map<string, CourseOffering>();
    existingOfferings.forEach((o) => {
      existingMap.set(o.id, o);
      const sec = o.section || 'A';
      existingMap.set(`${o.courseId}__${sec}`, o);
    });

    const academicTerm = options.academicTerm || 'ganjil';
    const maxClassSize = options.maxClassSize || MAX_STUDENTS_PER_CLASS;

    const generatedOfferings: CourseOffering[] = [];
    const excludedPracticums: GenerationReport['excludedPracticums'] = [];
    const closedElectives: NonNullable<GenerationReport['closedElectives']> = [];
    const seenOfferingIds = new Set<string>();

    for (const item of planItems) {
      const course = courseMap.get(item.courseId);
      if (!course) continue;

      const cYear = item.curriculumYear || course.curriculumYear || 2026;
      const sem = item.semester || course.semester || 1;
      const isPracticum = item.isPracticum ?? (course.type === 'Praktikum' || this.isPracticumCourse(course));

      const isNonSchedulable = this.isNonSchedulableCourse(course);
      if (isNonSchedulable) {
        excludedPracticums.push({
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          sks: course.sks,
          semester: sem,
          curriculumYear: cYear,
          reason: 'Dikelola LPPM (Tidak Dijadwalkan Jurusan — Berlaku Semua KBK)',
        });
        continue;
      }

      // 1. Practicum Handling
      if (isPracticum) {
        excludedPracticums.push({
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          sks: course.sks,
          semester: sem,
          curriculumYear: cYear,
          reason: 'Praktikum tidak masuk jadwal kuliah utama (jadwal terpisah laboratorium)',
        });
        continue;
      }

      // 2. Minimum Student Count Check
      const totalStudents = Number(item.totalStudents) || 0;
      if (totalStudents < MIN_STUDENTS_PER_CLASS && !item.allowBelowMinimum) {
        closedElectives.push({
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          sks: course.sks,
          semester: sem,
          curriculumYear: cYear,
          studentCount: totalStudents,
          reason: `Jumlah mahasiswa (${totalStudents}) di bawah batas minimum (${MIN_STUDENTS_PER_CLASS}).`,
        });
        continue;
      }

      // 3. Balanced Sections Calculation
      const sectionConfigs = item.customSections && item.customSections.length > 0
        ? item.customSections
        : createBalancedSections(totalStudents, maxClassSize);

      const isCommon = sem <= 4;
      const scheduleGroupId = isCommon
        ? `pkg-${cYear}-sem-${sem}`
        : `pkg-${cYear}-sem-${sem}-${item.kbkId || course.kbkIds?.[0] || 'common'}`;

      sectionConfigs.forEach((secCfg, secIdx) => {
        const secLetter = secCfg.section;
        const studentCount = secCfg.studentCount;
        const sanitizedCode = course.code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const baseOfferingId = `off-${cYear !== 2026 ? `${cYear}-` : ''}${sanitizedCode}-${sem}${secLetter.toLowerCase()}`;
        let offeringId = baseOfferingId;
        let counter = 2;
        while (seenOfferingIds.has(offeringId)) {
          offeringId = `${baseOfferingId}-${counter++}`;
        }
        seenOfferingIds.add(offeringId);

        // Check if lecturer was assigned in item or section or existing offering
        const existingOffering = existingMap.get(`${course.id}__${secLetter}`) || existingMap.get(offeringId);

        let assignedLecIds: string[] = [];
        if (secCfg.lecturerIds && secCfg.lecturerIds.length > 0) {
          assignedLecIds = secCfg.lecturerIds;
        } else if (secCfg.lecturerId) {
          assignedLecIds = [secCfg.lecturerId];
        } else if (item.assignedLecturerIds && item.assignedLecturerIds.length > 0) {
          assignedLecIds = item.assignedLecturerIds;
        } else if (item.assignedLecturerId) {
          assignedLecIds = [item.assignedLecturerId];
        } else if (existingOffering?.lecturerIds && existingOffering.lecturerIds.length > 0) {
          assignedLecIds = existingOffering.lecturerIds;
        } else if (existingOffering?.assignedLecturerId || existingOffering?.lecturerId) {
          const lecId = existingOffering.assignedLecturerId || existingOffering.lecturerId!;
          assignedLecIds = [lecId];
        }

        const assignedLecId = assignedLecIds[0] || null;
        const lecNames = assignedLecIds.map((id) => lecturerMap.get(id)?.name || id);
        const lecCodes = assignedLecIds.map((id) => lecturerMap.get(id)?.code || id);

        const offering: CourseOffering = {
          id: offeringId,
          code: `${course.code}-${secLetter}`,
          courseId: course.id,
          courseCode: course.code,
          courseName: sectionConfigs.length > 1 ? `${course.name} - Kelas ${secLetter}` : course.name,
          sks: course.sks,
          credits: course.sks,
          sourceType: 'manual',
          offeringType: course.category === 'Pilihan' ? 'elective' : 'regular',
          section: secLetter,
          sectionName: secLetter,
          targetScheduleGroup: isCommon ? `${scheduleGroupId}-sec-${secLetter}` : scheduleGroupId,
          semester: sem,
          kbkId: item.kbkId || course.kbkIds?.[0] || null,
          curriculumYear: cYear,
          academicYear: options.academicYear || `${cYear}/${cYear + 1} ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'}`,
          academicTerm,
          assignedLecturerId: assignedLecId,
          assignedLecturerIds: assignedLecIds,
          eligibleLecturerIds: assignedLecIds,
          expectedEnrollment: studentCount,
          capacity: studentCount,
          studentCount: studentCount,
          isDataProjection: false,
          requiredRoomType: 'Kelas',
          requiredEquipment: ['Proyektor LCD', 'Whiteboard'],
          preferredTimeslots: course.preferredTime === 'Pagi' ? ['ts-1', 'ts-2'] : undefined,
          category: course.category,
          lecturerIds: assignedLecIds,
          lecturerId: assignedLecId,
          lecturerNames: lecNames,
          lecturerName: lecNames[0] || null,
          lecturerCodes: lecCodes,
          lecturerCode: lecCodes[0] || null,
          status: 'ready',
          isLocked: existingOffering?.isLocked || false,
          isPracticum: false,
        };

        generatedOfferings.push(offering);
      });
    }

    const assignedCount = generatedOfferings.filter((o) => o.assignedLecturerId || (o.lecturerIds && o.lecturerIds.length > 0)).length;
    const activeSemesters = Array.from(new Set(generatedOfferings.map((o) => o.semester)));

    const semesterBreakdown: GenerationReport['summary']['semesterBreakdown'] = {};
    activeSemesters.forEach((sem) => {
      const semOfferings = generatedOfferings.filter((o) => o.semester === sem);
      const totalStud = semOfferings.reduce((sum, o) => sum + (o.studentCount || 0), 0);
      const uniqueCourses = new Set(semOfferings.map((o) => o.courseId)).size;

      semesterBreakdown[sem] = {
        semester: sem,
        expectedTheoryCourses: uniqueCourses,
        generatedUniqueCourses: uniqueCourses,
        totalSections: semOfferings.length,
        totalStudents: totalStud,
        status: 'VALID',
      };
    });

    return {
      generatedOfferings,
      excludedPracticums,
      closedElectives,
      summary: {
        academicTerm,
        activeSemesters,
        totalTheoryOfferings: generatedOfferings.length,
        totalUniqueCourses: new Set(generatedOfferings.map((o) => o.courseId)).size,
        totalSections: generatedOfferings.length,
        totalPracticumExcluded: excludedPracticums.length,
        totalClosedElectives: closedElectives.length,
        assignedLecturerOfferings: assignedCount,
        unassignedLecturerOfferings: generatedOfferings.length - assignedCount,
        semesterBreakdown,
      },
    };
  }
}
