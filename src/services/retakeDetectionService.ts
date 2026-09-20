import {
  StudentKRS,
  KRSItem,
  CourseGrade,
  CourseEquivalence,
  RetakeStatus,
  CourseAttempt,
  StudentRetakeEvaluation,
  RetakeDetectionResult,
  AcademicTerm,
} from '../types';

/**
 * Mendapatkan status retake berdasarkan nilai huruf terakhir.
 * Aturan resmi:
 * - 'E' -> 'required' (WAJIB MENGULANG)
 * - 'K' -> 'required' (WAJIB MENGULANG)
 * - 'D' -> 'recommended' (DISARANKAN MENGULANG)
 * - Lainnya ('A', 'B+', 'B', 'C+', 'C') -> 'not_required'
 */
export function getRetakeStatus(letterGrade?: string | null): RetakeStatus {
  if (!letterGrade) return 'not_required';
  const cleanGrade = letterGrade.trim().toUpperCase();
  if (cleanGrade === 'E' || cleanGrade === 'K') {
    return 'required';
  }
  if (cleanGrade === 'D') {
    return 'recommended';
  }
  return 'not_required';
}

/**
 * Mendapatkan label human-readable untuk status retake
 */
export function getRetakeLabel(status: RetakeStatus): string {
  switch (status) {
    case 'required':
      return 'WAJIB MENGULANG';
    case 'recommended':
      return 'DISARANKAN MENGULANG';
    case 'cleared':
      return 'SUDAH LULUS / TIDAK PERLU MENGULANG';
    default:
      return 'LULUS';
  }
}

/**
 * Mendapatkan deskripsi alasan retake
 */
export function getRetakeReason(letterGrade?: string | null): string {
  if (!letterGrade) return 'Belum ada nilai';
  const cleanGrade = letterGrade.trim().toUpperCase();
  if (cleanGrade === 'E') {
    return 'Nilai terakhir E (Wajib Mengulang)';
  }
  if (cleanGrade === 'K') {
    return 'Nilai terakhir K (Wajib Mengulang - Kosong/Tidak Selesai)';
  }
  if (cleanGrade === 'D') {
    return 'Nilai terakhir D — disarankan mengulang untuk perbaikan IPK';
  }
  return `Nilai terakhir ${cleanGrade} (Lulus)`;
}

/**
 * Menghitung urutan kronologis periode akademik
 * Contoh: "2023/2024" term "ganjil" -> 2023.1
 *         "2023/2024" term "genap"  -> 2023.2
 */
function getPeriodRank(academicYear: string, academicTerm: AcademicTerm): number {
  const startYear = parseInt(academicYear.split('/')[0], 10) || 2020;
  return startYear * 10 + (academicTerm === 'genap' ? 2 : 1);
}

/**
 * Engine Deteksi Otomatis Mata Kuliah Mengulang (Retake Detection Engine)
 * Alur:
 * 1. Ambil seluruh riwayat KRS & KRS aktif mahasiswa
 * 2. Ambil seluruh item KRS mahasiswa
 * 3. Ambil grade setiap attempt
 * 4. Kelompokkan per mata kuliah (memperhatikan CourseEquivalence bila ada)
 * 5. Urutkan attempts secara kronologis
 * 6. Evaluasi status attempt terbaru
 * 7. Hasilkan requiredRetakes, recommendedRetakes, dan clearedCourses
 */
export function detectRetakeCourses(
  studentId: string,
  krsList: StudentKRS[],
  krsItems: KRSItem[],
  grades: CourseGrade[],
  courseEquivalences: CourseEquivalence[] = [],
  currentKRSItems: KRSItem[] = []
): RetakeDetectionResult {
  // 1. Filter item milik mahasiswa
  const studentItems = krsItems.filter(item => item.studentId === studentId);
  const studentKRSMap = new Map<string, StudentKRS>();
  krsList.filter(k => k.studentId === studentId).forEach(k => studentKRSMap.set(k.id, k));

  const gradeByKrsItemId = new Map<string, CourseGrade>();
  grades.filter(g => g.studentId === studentId).forEach(g => gradeByKrsItemId.set(g.krsItemId, g));

  // Current enrolled course IDs in active KRS
  const currentEnrolledCourseIds = new Set<string>(
    currentKRSItems.map(item => item.courseId)
  );

  // 2. Group items by canonical course ID (considering equivalences)
  // Maps target course -> source course or canonical ID
  const courseGroupMap = new Map<string, KRSItem[]>();

  studentItems.forEach(item => {
    // Check if course has equivalence
    let canonicalId = item.courseId;
    const eq = courseEquivalences.find(
      e => (e.sourceCourseId === item.courseId || e.targetCourseId === item.courseId) && e.verified
    );
    if (eq) {
      // Use target course as canonical identifier for cross-curriculum tracking
      canonicalId = eq.targetCourseId || eq.sourceCourseId;
    }

    if (!courseGroupMap.has(canonicalId)) {
      courseGroupMap.set(canonicalId, []);
    }
    courseGroupMap.get(canonicalId)!.push(item);
  });

  const requiredRetakes: StudentRetakeEvaluation[] = [];
  const recommendedRetakes: StudentRetakeEvaluation[] = [];
  const clearedCourses: StudentRetakeEvaluation[] = [];

  // 3. Process each course group
  courseGroupMap.forEach((items, canonicalCourseId) => {
    // Map items to attempts with sorting by period
    const attempts: CourseAttempt[] = items
      .map(item => {
        const krs = studentKRSMap.get(item.krsId);
        const grade = gradeByKrsItemId.get(item.id);
        const academicYear = krs?.academicYear || '2024/2025';
        const academicTerm: AcademicTerm = krs?.academicTerm || 'ganjil';
        const semester = krs?.studentSemester || item.packageSemester || 1;
        const letterGrade = grade?.letterGrade || item.previousGrade || null;
        const numericFinalScore = grade?.numericFinalScore ?? null;
        const retakeStatus = getRetakeStatus(letterGrade);

        return {
          attemptNumber: 1, // will re-index after sort
          academicYear,
          academicTerm,
          semester,
          courseId: item.courseId,
          courseCode: item.courseCode,
          courseName: item.courseName,
          credits: item.credits,
          grade: grade || null,
          letterGrade,
          numericFinalScore,
          krsItemId: item.id,
          retakeStatus,
          dataSource: item.dataSource,
        };
      })
      .sort((a, b) => getPeriodRank(a.academicYear, a.academicTerm) - getPeriodRank(b.academicYear, b.academicTerm));

    // Re-index attempt numbers
    attempts.forEach((att, idx) => {
      att.attemptNumber = idx + 1;
    });

    if (attempts.length === 0) return;

    // Latest attempt is the most recent chronological one
    const latestAttempt = attempts[attempts.length - 1];
    const representativeItem = items[items.length - 1];
    
    // Check if there was an earlier failing attempt that was cleared in a later attempt
    const hasPriorFailingAttempt = attempts.some(
      (att, idx) => idx < attempts.length - 1 && (att.letterGrade === 'E' || att.letterGrade === 'K' || att.letterGrade === 'D')
    );

    const latestStatus = latestAttempt.retakeStatus;
    const isCurrentlyEnrolled = currentEnrolledCourseIds.has(latestAttempt.courseId);

    // Check equivalence info
    const equivalence = courseEquivalences.find(
      e => (e.sourceCourseId === latestAttempt.courseId || e.targetCourseId === latestAttempt.courseId) && e.verified
    );

    const evaluation: StudentRetakeEvaluation = {
      courseId: latestAttempt.courseId,
      courseCode: latestAttempt.courseCode,
      courseName: latestAttempt.courseName,
      credits: latestAttempt.credits,
      packageSemester: representativeItem.packageSemester || latestAttempt.semester,
      latestGrade: latestAttempt.letterGrade,
      latestNumericScore: latestAttempt.numericFinalScore,
      retakeStatus: latestStatus === 'not_required' && hasPriorFailingAttempt ? 'cleared' : latestStatus,
      retakeLabel: getRetakeLabel(latestStatus === 'not_required' && hasPriorFailingAttempt ? 'cleared' : latestStatus),
      retakeReason: getRetakeReason(latestAttempt.letterGrade),
      attempts,
      equivalentCourseId: equivalence?.targetCourseId,
      equivalentCourseCode: equivalence?.targetCourseCode,
      equivalentCourseName: equivalence?.targetCourseName,
      isAlreadyInCurrentKRS: isCurrentlyEnrolled,
    };

    if (latestStatus === 'required') {
      requiredRetakes.push(evaluation);
    } else if (latestStatus === 'recommended') {
      recommendedRetakes.push(evaluation);
    } else if (hasPriorFailingAttempt) {
      clearedCourses.push(evaluation);
    }
  });

  // Calculate totals
  const totalRequiredCredits = requiredRetakes.reduce((sum, r) => sum + r.credits, 0);
  const totalRecommendedCredits = recommendedRetakes.reduce((sum, r) => sum + r.credits, 0);

  return {
    studentId,
    requiredRetakes,
    recommendedRetakes,
    clearedCourses,
    totalRequiredCredits,
    totalRecommendedCredits,
  };
}
