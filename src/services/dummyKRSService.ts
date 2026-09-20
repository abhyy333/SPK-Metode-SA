import {
  Student,
  StudentKRS,
  KRSItem,
  CourseGrade,
  Course,
  CurriculumPackage,
  GradeWeightConfig,
  GradeScaleConfig,
  AcademicTerm,
  RetakeDetectionResult,
} from '../types';

// Seeded deterministic pseudo-random generator
function createDeterministicRNG(seedStr: string): () => number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = Math.imul(31, hash) + seedStr.charCodeAt(i) | 0;
  }
  let a = hash | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULT_GRADE_WEIGHT_CONFIG: GradeWeightConfig = {
  id: 'grade-weight-default',
  name: 'Bobot Penilaian Akademik TE-UNRAM',
  attendanceWeight: 0.10, // 10%
  assignmentWeight: 0.20, // 20%
  quizWeight: 0.15,       // 15%
  midtermWeight: 0.25,    // 25%
  finalExamWeight: 0.30,  // 30%
  isConfigured: true,
  updatedAt: '2026-09-12T00:00:00.000Z',
  updatedBy: 'Admin Jurusan',
};

export const DEFAULT_GRADE_SCALE_CONFIG: GradeScaleConfig = {
  id: 'grade-scale-default',
  name: 'Skala Nilai Huruf Universitas Mataram',
  isConfigured: true,
  updatedAt: '2026-09-12T00:00:00.000Z',
  updatedBy: 'Admin Jurusan',
  ranges: [
    { letterGrade: 'A', minScore: 85, maxScore: 100, gpaPoint: 4.0, description: 'Sangat Baik' },
    { letterGrade: 'B+', minScore: 78, maxScore: 84.99, gpaPoint: 3.5, description: 'Lebih Dari Baik' },
    { letterGrade: 'B', minScore: 68, maxScore: 77.99, gpaPoint: 3.0, description: 'Baik' },
    { letterGrade: 'C+', minScore: 62, maxScore: 67.99, gpaPoint: 2.5, description: 'Lebih Dari Cukup' },
    { letterGrade: 'C', minScore: 56, maxScore: 61.99, gpaPoint: 2.0, description: 'Cukup' },
    { letterGrade: 'D', minScore: 45, maxScore: 55.99, gpaPoint: 1.0, description: 'Kurang (Disarankan Mengulang)' },
    { letterGrade: 'E', minScore: 0, maxScore: 44.99, gpaPoint: 0.0, description: 'Gagal (Wajib Mengulang)' },
    { letterGrade: 'K', minScore: 0, maxScore: 0, gpaPoint: 0.0, description: 'Kosong/Tidak Selesai (Wajib Mengulang)' },
  ],
};

/**
 * Menghitung periode akademik (tahun akademik dan semester ganjil/genap)
 * berdasarkan tahun cohort masuk dan semester studi ke-N.
 * Contoh: cohort 2023 semester 1 -> "2023/2024", "ganjil"
 *         cohort 2023 semester 2 -> "2023/2024", "genap"
 *         cohort 2023 semester 3 -> "2024/2025", "ganjil"
 */
export function getAcademicPeriodForSemester(
  cohortYear: number,
  semester: number
): { academicYear: string; academicTerm: AcademicTerm } {
  const yearsPassed = Math.floor((semester - 1) / 2);
  const startYear = cohortYear + yearsPassed;
  const endYear = startYear + 1;
  const isGanjil = semester % 2 !== 0;

  return {
    academicYear: `${startYear}/${endYear}`,
    academicTerm: isGanjil ? 'ganjil' : 'genap',
  };
}

/**
 * Menghasilkan synthetic scores untuk letter grade tertentu
 */
function generateScoresForGrade(
  letterGrade: string,
  rng: () => number
): {
  attendanceScore: number;
  assignmentScore: number;
  quizScore: number;
  midtermScore: number;
  finalExamScore: number;
  numericFinalScore: number;
} {
  let baseScore = 80;
  switch (letterGrade) {
    case 'A':
      baseScore = 86 + rng() * 10;
      break;
    case 'B+':
      baseScore = 79 + rng() * 5;
      break;
    case 'B':
      baseScore = 70 + rng() * 7;
      break;
    case 'C+':
      baseScore = 63 + rng() * 4;
      break;
    case 'C':
      baseScore = 57 + rng() * 4;
      break;
    case 'D':
      baseScore = 47 + rng() * 7;
      break;
    case 'E':
      baseScore = 25 + rng() * 18;
      break;
    case 'K':
      return {
        attendanceScore: Math.round(15 + rng() * 15),
        assignmentScore: 0,
        quizScore: 0,
        midtermScore: 0,
        finalExamScore: 0,
        numericFinalScore: 5,
      };
    default:
      baseScore = 75;
  }

  const attendanceScore = Math.min(100, Math.max(50, Math.round(baseScore + (rng() * 12 - 4))));
  const assignmentScore = Math.min(100, Math.max(30, Math.round(baseScore + (rng() * 10 - 5))));
  const quizScore = Math.min(100, Math.max(20, Math.round(baseScore + (rng() * 14 - 7))));
  const midtermScore = Math.min(100, Math.max(20, Math.round(baseScore + (rng() * 12 - 6))));
  const finalExamScore = Math.min(100, Math.max(20, Math.round(baseScore + (rng() * 12 - 6))));

  const numericFinalScore = Math.round(
    (attendanceScore * 0.1 +
      assignmentScore * 0.2 +
      quizScore * 0.15 +
      midtermScore * 0.25 +
      finalExamScore * 0.3) * 100
  ) / 100;

  return {
    attendanceScore,
    assignmentScore,
    quizScore,
    midtermScore,
    finalExamScore,
    numericFinalScore,
  };
}

/**
 * Helper untuk mendapatkan paket kurikulum yang tepat berdasarkan kurikulum, semester, dan KBK.
 * JANGAN PERNAH fallback ke Semester 1 jika mencari semester > 1!
 */
export function getCurriculumPackageForStudent(
  packages: CurriculumPackage[],
  curriculumYear: 2022 | 2026,
  semester: number,
  kbkId?: string | null,
  studentIdx: number = 0
): CurriculumPackage | null {
  const semPackages = packages.filter(
    (p) => p.curriculumYear === curriculumYear && p.semester === semester
  );
  if (semPackages.length === 0) return null;

  // Semester 1 - 4: Paket Bersama (Common)
  if (semester <= 4) {
    return (
      semPackages.find((p) => p.isCommonPackage || !p.kbkId || (p.type || p.packageType) === 'common') ||
      semPackages[0]
    );
  }

  // Semester 5+: Mengikuti KBK
  if (kbkId) {
    const directMatch = semPackages.find((p) => p.kbkId === kbkId);
    if (directMatch) return directMatch;

    const normalizedKbkId = kbkId.toLowerCase();
    const fuzzyMatch = semPackages.find((p) => {
      if (!p.kbkId) return false;
      const target = p.kbkId.toLowerCase();
      if (normalizedKbkId.includes('stl') && target.includes('stl')) return true;
      if (normalizedKbkId.includes('komputer') && target.includes('komputer')) return true;
      if (normalizedKbkId.includes('kom') && target.includes('kom')) return true;
      if (normalizedKbkId.includes('tel') && target.includes('tel')) return true;
      if (normalizedKbkId.includes('el') && target.includes('el')) return true;
      return false;
    });
    if (fuzzyMatch) return fuzzyMatch;
  }

  // Jika mahasiswa belum memiliki KBK:
  // JANGAN fallback ke Semester 1! Pilih salah satu paket semester tersebut secara deterministic.
  const deterministicIndex = studentIdx % semPackages.length;
  return semPackages[deterministicIndex] || semPackages[0];
}

/**
 * Helper untuk mengekstrak daftar mata kuliah dari paket kurikulum
 */
export function resolveCoursesFromPackage(
  targetPackage: CurriculumPackage | null,
  curriculumYear: 2022 | 2026,
  semester: number,
  allCourses: Course[]
): Course[] {
  if (!targetPackage) {
    return allCourses
      .filter(
        (c) =>
          (c.curriculumYear === curriculumYear || !c.curriculumYear) &&
          (c.semester === semester || c.recommendedSemester === semester)
      )
      .slice(0, 7);
  }

  const resultCourses: Course[] = [];

  // 1. Jika paket memiliki courseItems terstruktur
  if (targetPackage.courseItems && targetPackage.courseItems.length > 0) {
    targetPackage.courseItems.forEach((item) => {
      if (item.type === 'course') {
        const found = allCourses.find(
          (c) =>
            (item.courseId && c.id === item.courseId) ||
            (item.courseCode && c.code?.toUpperCase() === item.courseCode.toUpperCase())
        );
        if (found) {
          resultCourses.push(found);
        } else {
          resultCourses.push({
            id: item.courseId || `crs-${(item.courseCode || 'mk').toLowerCase()}`,
            code: item.courseCode || '',
            name: item.courseName || '',
            sks: item.credits || 2,
            credits: item.credits || 2,
            semester,
            curriculumYear,
            category: 'Wajib',
            type: 'theory',
            isActive: true,
          } as unknown as Course);
        }
      } else if (item.type === 'elective-slot') {
        const found = allCourses.find(
          (c) =>
            (item.courseCode && c.code?.toUpperCase() === item.courseCode.toUpperCase()) ||
            (item.courseId && c.id === item.courseId)
        );
        if (found) {
          resultCourses.push(found);
        } else {
          resultCourses.push({
            id: item.courseId || `crs-pilihan-sem${semester}-${(item.courseCode || item.slotName || 'opt').toLowerCase()}`,
            code: item.courseCode || 'PILIHAN',
            name: item.slotName || 'Mata Kuliah Pilihan',
            sks: item.credits || 2,
            credits: item.credits || 2,
            semester,
            curriculumYear,
            category: 'Pilihan',
            type: 'theory',
            isActive: true,
          } as unknown as Course);
        }
      }
    });
  } else if (targetPackage.courseIds && targetPackage.courseIds.length > 0) {
    targetPackage.courseIds.forEach((cid) => {
      const found = allCourses.find(
        (c) => c.id === cid || c.code?.toUpperCase() === cid?.toUpperCase()
      );
      if (found) {
        resultCourses.push(found);
      }
    });
  }

  return resultCourses;
}

/**
 * Generator Deterministic Dummy KRS, Riwayat KRS, dan Nilai Mahasiswa
 */
export function generateSyntheticKRSAndGrades(
  students: Student[],
  courses: Course[],
  packages: CurriculumPackage[]
): {
  krsList: StudentKRS[];
  krsItems: KRSItem[];
  grades: CourseGrade[];
} {
  const krsList: StudentKRS[] = [];
  const krsItems: KRSItem[] = [];
  const grades: CourseGrade[] = [];

  // Active current academic year
  const activeAcademicYear = '2026/2027';
  const activeAcademicTerm: AcademicTerm = 'ganjil';

  students.forEach((student, studentIdx) => {
    const studentRng = createDeterministicRNG(`STUDENT-KRS-${student.nim || student.id}-${studentIdx}`);
    const cohortYear = student.cohortYear || 2026;
    
    // Explicit current semester from student profile (e.g. 7 for cohort 2023 in 2026/2027 Ganjil)
    const currentSemester =
      student.currentSemester ||
      student.semester ||
      (cohortYear === 2023 ? 7 : cohortYear === 2024 ? 5 : cohortYear === 2025 ? 3 : 1);

    // Curriculum year: cohort 2023/older is 2022, cohort 2024/newer is 2026
    const curriculumYear: 2022 | 2026 =
      student.curriculumYear === 2026 || student.curriculumYear === 2022
        ? student.curriculumYear
        : cohortYear >= 2024
        ? 2026
        : 2022;

    const isTargetStudent096 =
      student.nim?.toUpperCase().includes('F1B02310096') ||
      student.nim?.toUpperCase().includes('10096') ||
      studentIdx === 0;

    // 1. Generate Historical Completed Semesters (semesters 1 to currentSemester - 1)
    // JANGAN generate history sebelum cohortYear, dan JANGAN masukkan currentSemester ke history!
    for (let sem = 1; sem < currentSemester; sem++) {
      const { academicYear, academicTerm } = getAcademicPeriodForSemester(cohortYear, sem);
      const krsId = `krs-${student.id}-sem${sem}`;

      // Ambil paket yang sesuai dengan kurikulum, semester, dan KBK (untuk sem >= 5)
      const targetPackage = getCurriculumPackageForStudent(
        packages,
        curriculumYear,
        sem,
        student.kbkId,
        studentIdx
      );

      const semCourses = resolveCoursesFromPackage(targetPackage, curriculumYear, sem, courses);

      let totalCredits = 0;
      const semKRSItems: KRSItem[] = [];

      semCourses.forEach((course) => {
        const krsItemId = `krs-item-${krsId}-${course.id}`;
        const credits = course.sks || course.credits || 2;
        totalCredits += credits;

        // Determine deterministic letter grade
        let letterGrade = 'A';
        const gradeRand = studentRng();

        if (isTargetStudent096 && course.name.toLowerCase().includes('rangkaian listrik ii')) {
          // Skenario Spesifik F1B02310096 (Semester 3): Rangkaian Listrik II -> E (Wajib Mengulang)
          letterGrade = 'E';
        } else if (studentIdx === 1 && course.name.toLowerCase().includes('mikroprosesor')) {
          // Skenario Mahasiswa 1: Sistem Mikroprosesor -> D (Disarankan Mengulang)
          letterGrade = 'D';
        } else if (studentIdx === 2 && course.name.toLowerCase().includes('dasar elektronika') && sem === 3) {
          // Skenario Mahasiswa 2 Attempt 1: Dasar Elektronika Sem 3 -> E
          letterGrade = 'E';
        } else if (studentIdx === 3 && course.name.toLowerCase().includes('pengolahan sinyal digital')) {
          // Skenario Mahasiswa 3: PSD -> K (Wajib Mengulang)
          letterGrade = 'K';
        } else {
          // Distribusi realistis: 40% A, 30% B+, 15% B, 10% C+, 3% C, 1.5% D, 0.5% E
          if (gradeRand < 0.40) letterGrade = 'A';
          else if (gradeRand < 0.70) letterGrade = 'B+';
          else if (gradeRand < 0.85) letterGrade = 'B';
          else if (gradeRand < 0.94) letterGrade = 'C+';
          else if (gradeRand < 0.97) letterGrade = 'C';
          else if (gradeRand < 0.99) letterGrade = 'D';
          else letterGrade = 'E';
        }

        const scores = generateScoresForGrade(letterGrade, studentRng);

        const item: KRSItem = {
          id: krsItemId,
          krsId,
          studentId: student.id,
          courseId: course.id,
          courseCode: course.code || course.courseCode || '',
          courseName: course.name || course.courseName || '',
          credits,
          packageSemester: sem,
          enrollmentType: 'package',
          previousAttemptId: null,
          previousGrade: letterGrade,
          status: 'completed',
          dataSource: 'synthetic',
        };
        semKRSItems.push(item);
        krsItems.push(item);

        const gradeRecord: CourseGrade = {
          id: `grade-${krsItemId}`,
          studentId: student.id,
          courseId: course.id,
          krsItemId,
          academicYear,
          academicTerm,
          studentSemester: sem,
          attendanceScore: scores.attendanceScore,
          assignmentScore: scores.assignmentScore,
          quizScore: scores.quizScore,
          midtermScore: scores.midtermScore,
          finalExamScore: scores.finalExamScore,
          numericFinalScore: scores.numericFinalScore,
          letterGrade,
          gradeStatus: 'complete',
          gradeCalculationMode: 'synthetic-letter-grade',
          dataSource: 'synthetic',
          createdAt: `${academicYear.split('/')[0]}-12-15T00:00:00.000Z`,
          updatedAt: `${academicYear.split('/')[0]}-12-20T00:00:00.000Z`,
        };
        grades.push(gradeRecord);
      });

      // Handle Skenario Mahasiswa 2 Attempt 2 in Semester 5 (Retake passed with B)
      if (studentIdx === 2 && sem === 5) {
        const dasarElekCourse = courses.find((c) => c.name.toLowerCase().includes('dasar elektronika'));
        if (dasarElekCourse) {
          const retakeKrsItemId = `krs-item-${krsId}-retake-${dasarElekCourse.id}`;
          const retakeCredits = dasarElekCourse.sks || 3;
          const retakeItem: KRSItem = {
            id: retakeKrsItemId,
            krsId,
            studentId: student.id,
            courseId: dasarElekCourse.id,
            courseCode: dasarElekCourse.code || dasarElekCourse.courseCode || '',
            courseName: dasarElekCourse.name || dasarElekCourse.courseName || '',
            credits: retakeCredits,
            packageSemester: 3,
            enrollmentType: 'retake',
            previousAttemptId: `krs-item-krs-${student.id}-sem3-${dasarElekCourse.id}`,
            previousGrade: 'E',
            retakeReason: 'Mengulang Semester 3 (Nilai sebelumnya E)',
            status: 'completed',
            dataSource: 'synthetic',
          };
          krsItems.push(retakeItem);
          totalCredits += retakeCredits;

          const scores = generateScoresForGrade('B', studentRng);
          grades.push({
            id: `grade-${retakeKrsItemId}`,
            studentId: student.id,
            courseId: dasarElekCourse.id,
            krsItemId: retakeKrsItemId,
            academicYear,
            academicTerm,
            studentSemester: sem,
            attendanceScore: scores.attendanceScore,
            assignmentScore: scores.assignmentScore,
            quizScore: scores.quizScore,
            midtermScore: scores.midtermScore,
            finalExamScore: scores.finalExamScore,
            numericFinalScore: scores.numericFinalScore,
            letterGrade: 'B',
            gradeStatus: 'complete',
            gradeCalculationMode: 'synthetic-letter-grade',
            dataSource: 'synthetic',
            createdAt: `${academicYear.split('/')[0]}-12-15T00:00:00.000Z`,
            updatedAt: `${academicYear.split('/')[0]}-12-20T00:00:00.000Z`,
          });
        }
      }

      const krsRecord: StudentKRS = {
        id: krsId,
        studentId: student.id,
        academicYear,
        academicTerm,
        studentSemester: sem,
        curriculumYear,
        status: 'completed',
        totalCredits,
        dataSource: 'synthetic',
        createdAt: `${academicYear.split('/')[0]}-08-20T00:00:00.000Z`,
        updatedAt: `${academicYear.split('/')[0]}-12-20T00:00:00.000Z`,
      };
      krsList.push(krsRecord);
    }

    // 2. Generate Current Active KRS (MENGAMBIL PAKET CURRENT SEMESTER!)
    // BUKAN Semester 1, BUKAN package pertama!
    const currentKrsId = `krs-${student.id}-current-sem${currentSemester}`;

    const currentTargetPackage = getCurriculumPackageForStudent(
      packages,
      curriculumYear,
      currentSemester,
      student.kbkId,
      studentIdx
    );

    const currentCourses = resolveCoursesFromPackage(
      currentTargetPackage,
      curriculumYear,
      currentSemester,
      courses
    );

    let currentTotalCredits = 0;
    currentCourses.forEach((course) => {
      const krsItemId = `krs-item-${currentKrsId}-${course.id}`;
      const credits = course.sks || course.credits || 2;
      currentTotalCredits += credits;

      const item: KRSItem = {
        id: krsItemId,
        krsId: currentKrsId,
        studentId: student.id,
        courseId: course.id,
        courseCode: course.code || course.courseCode || '',
        courseName: course.name || course.courseName || '',
        credits,
        packageSemester: currentSemester,
        enrollmentType: 'package',
        status: 'enrolled',
        dataSource: 'synthetic',
      };
      krsItems.push(item);

      // Current semester has incomplete/null final grade
      grades.push({
        id: `grade-${krsItemId}`,
        studentId: student.id,
        courseId: course.id,
        krsItemId,
        academicYear: activeAcademicYear,
        academicTerm: activeAcademicTerm,
        studentSemester: currentSemester,
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
      });
    });

    // Skenario Spesifik Target: F1B02310096 (Semester 7) menambahkan mata kuliah retake ke Current KRS
    if (isTargetStudent096 && currentSemester === 7) {
      const rl2Course = courses.find((c) => c.name.toLowerCase().includes('rangkaian listrik ii'));
      if (rl2Course) {
        const retakeItemId = `krs-item-${currentKrsId}-retake-${rl2Course.id}`;
        const retakeCredits = rl2Course.sks || 3;
        currentTotalCredits += retakeCredits;
        krsItems.push({
          id: retakeItemId,
          krsId: currentKrsId,
          studentId: student.id,
          courseId: rl2Course.id,
          courseCode: rl2Course.code || rl2Course.courseCode || '',
          courseName: rl2Course.name || rl2Course.courseName || '',
          credits: retakeCredits,
          packageSemester: 3,
          enrollmentType: 'retake',
          previousAttemptId: `krs-item-krs-${student.id}-sem3-${rl2Course.id}`,
          previousGrade: 'E',
          retakeReason: 'Nilai terakhir E (Wajib Mengulang)',
          status: 'enrolled',
          dataSource: 'synthetic',
        });

        grades.push({
          id: `grade-${retakeItemId}`,
          studentId: student.id,
          courseId: rl2Course.id,
          krsItemId: retakeItemId,
          academicYear: activeAcademicYear,
          academicTerm: activeAcademicTerm,
          studentSemester: currentSemester,
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
        });
      }
    }

    const currentKRS: StudentKRS = {
      id: currentKrsId,
      studentId: student.id,
      academicYear: activeAcademicYear,
      academicTerm: activeAcademicTerm,
      studentSemester: currentSemester,
      curriculumYear,
      status: 'approved',
      totalCredits: currentTotalCredits,
      dataSource: 'synthetic',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    krsList.push(currentKRS);
  });

  return { krsList, krsItems, grades };
}

export const GRADE_POINT_LOOKUP: Record<string, number> = {
  A: 4.0,
  'B+': 3.5,
  B: 3.0,
  'C+': 2.5,
  C: 2.0,
  D: 1.0,
  E: 0.0,
  K: 0.0,
};

/**
 * Menghitung ringkasan akademik lengkap untuk seorang mahasiswa
 */
export function calculateStudentAcademicSummary(
  student: Student,
  krsList: StudentKRS[],
  krsItems: KRSItem[],
  grades: CourseGrade[],
  retakeResult?: RetakeDetectionResult
): {
  passedCredits: number;
  totalAttemptedCredits: number;
  gpa: number;
  lastSemesterGpa: number | null;
  currentEnrolledCredits: number;
  currentCourseCount: number;
  requiredRetakeCount: number;
  recommendedRetakeCount: number;
  hasRetake: boolean;
} {
  const studentItems = krsItems.filter((i) => i.studentId === student.id);
  const studentKRSList = krsList.filter((k) => k.studentId === student.id);
  const studentGrades = grades.filter((g) => g.studentId === student.id);

  const gradeMap = new Map<string, CourseGrade>();
  studentGrades.forEach((g) => gradeMap.set(g.krsItemId, g));

  const krsMap = new Map<string, StudentKRS>();
  studentKRSList.forEach((k) => krsMap.set(k.id, k));

  // Current active semester items (incomplete grade or in active term)
  const currentItems = studentItems.filter((i) => i.status === 'enrolled');
  const currentEnrolledCredits = currentItems.reduce((sum, i) => sum + i.credits, 0);

  // Completed items with valid grades
  const completedItems = studentItems.filter((i) => i.status === 'completed');

  // Group completed attempts per course to take highest or latest grade for passed credits & GPA
  const courseAttemptsMap = new Map<string, { credits: number; letterGrade: string; gradePoint: number; semester: number }[]>();

  completedItems.forEach((item) => {
    const gr = gradeMap.get(item.id);
    const letter = gr?.letterGrade || item.previousGrade;
    if (letter && GRADE_POINT_LOOKUP[letter] !== undefined) {
      const gPoint = GRADE_POINT_LOOKUP[letter];
      const krs = krsMap.get(item.krsId);
      const sem = krs?.studentSemester || item.packageSemester || 1;
      if (!courseAttemptsMap.has(item.courseId)) {
        courseAttemptsMap.set(item.courseId, []);
      }
      courseAttemptsMap.get(item.courseId)!.push({
        credits: item.credits,
        letterGrade: letter,
        gradePoint: gPoint,
        semester: sem,
      });
    }
  });

  let totalWeightedScore = 0;
  let totalCreditsForGpa = 0;
  let passedCredits = 0;
  let totalAttemptedCredits = 0;

  courseAttemptsMap.forEach((attempts) => {
    // For GPA & passed credits: take best attempt or latest attempt
    const bestAttempt = attempts.reduce((prev, curr) => (curr.gradePoint > prev.gradePoint ? curr : prev), attempts[0]);
    totalAttemptedCredits += bestAttempt.credits;
    totalWeightedScore += bestAttempt.credits * bestAttempt.gradePoint;
    totalCreditsForGpa += bestAttempt.credits;

    // Passing grades: A, B+, B, C+, C, D (where D has point 1.0; E and K are failed)
    if (bestAttempt.gradePoint > 0 && bestAttempt.letterGrade !== 'E' && bestAttempt.letterGrade !== 'K') {
      passedCredits += (bestAttempt.credits || 0);
    }
  });

  const rawGpa = totalCreditsForGpa > 0 ? (totalWeightedScore / totalCreditsForGpa) : 0.0;
  const gpa = isNaN(rawGpa) ? 0.0 : Math.round(rawGpa * 100) / 100;

  // Last completed semester GPA (e.g. currentSemester - 1)
  const lastSemNum = (student.currentSemester || student.semester || 1) - 1;
  let lastSemesterGpa: number | null = null;
  if (lastSemNum >= 1) {
    let lastSemScore = 0;
    let lastSemCredits = 0;
    completedItems.forEach((item) => {
      const krs = krsMap.get(item.krsId);
      const sem = krs?.studentSemester || item.packageSemester;
      if (sem === lastSemNum) {
        const gr = gradeMap.get(item.id);
        const letter = gr?.letterGrade || item.previousGrade;
        if (letter && GRADE_POINT_LOOKUP[letter] !== undefined) {
          lastSemScore += (item.credits || 0) * GRADE_POINT_LOOKUP[letter];
          lastSemCredits += (item.credits || 0);
        }
      }
    });
    if (lastSemCredits > 0) {
      const rawLastSem = (lastSemScore / lastSemCredits);
      lastSemesterGpa = isNaN(rawLastSem) ? 0.0 : Math.round(rawLastSem * 100) / 100;
    }
  }

  const reqRetakes = retakeResult ? (retakeResult.requiredRetakes?.length || 0) : 0;
  const recRetakes = retakeResult ? (retakeResult.recommendedRetakes?.length || 0) : 0;

  // Check manual passedCreditsOverride if set on student
  const baseEarned = (typeof student.totalEarnedCredits === 'number' && !isNaN(student.totalEarnedCredits)) ? student.totalEarnedCredits : 0;
  const safePassed = isNaN(passedCredits) ? 0 : passedCredits;
  const finalPassedCredits = (typeof student.passedCreditsOverride === 'number' && !isNaN(student.passedCreditsOverride))
    ? student.passedCreditsOverride
    : (baseEarned > 0 ? Math.max(baseEarned, safePassed) : safePassed);

  return {
    passedCredits: isNaN(finalPassedCredits) ? 0 : finalPassedCredits,
    totalAttemptedCredits: isNaN(totalAttemptedCredits) ? 0 : totalAttemptedCredits,
    gpa,
    lastSemesterGpa,
    currentEnrolledCredits: isNaN(currentEnrolledCredits) ? 0 : currentEnrolledCredits,
    currentCourseCount: currentItems.length,
    requiredRetakeCount: reqRetakes,
    recommendedRetakeCount: recRetakes,
    hasRetake: reqRetakes > 0 || recRetakes > 0,
  };
}
