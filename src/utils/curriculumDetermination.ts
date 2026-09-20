import { Student, StudentCurriculumDeterminationResult, Course, CurriculumPackage } from '../types';

/**
 * ATURAN PENENTUAN KURIKULUM MAHASISWA TEKNIK ELEKTRO UNIVERSITAS MATARAM:
 * PRIORITAS 1: Angkatan 2024 ke atas (2024, 2025, 2026, dst.) -> Kurikulum 2026
 * PRIORITAS 2: Angkatan 2023 ke bawah:
 *    - Jika currentSemester >= 7 ATAU totalEarnedCredits >= 120 -> Kurikulum 2022 (OBE)
 *    (Pada TA 2026/2027 Ganjil, Angkatan 2023 berada pada Semester 7 -> Kurikulum 2022)
 * PRIORITAS 3: Angkatan 2023 ke bawah yang currentSemester < 7 DAN totalEarnedCredits < 120 -> Kurikulum 2026 (Transisi)
 * OVERRIDE: Manual override oleh Admin dengan catatan alasan.
 */
export function determineStudentCurriculum(
  cohortYear: number,
  totalEarnedCredits: number,
  isManualOverride: boolean = false,
  manualCurriculumYear?: number,
  manualReason?: string,
  currentSemester?: number
): StudentCurriculumDeterminationResult {
  if (isManualOverride && manualCurriculumYear) {
    const year: 2022 | 2026 = manualCurriculumYear === 2022 ? 2022 : 2026;
    return {
      curriculumYear: year,
      curriculumId: year === 2026 ? 'curr-2026' : 'curr-2022',
      reason: manualReason || 'Disetel manual oleh Admin Akademik',
      ruleCode: 'MANUAL_OVERRIDE',
      isOverride: true,
      status: 'Manual Override',
    };
  }

  // Prioritas 1: Angkatan 2024 ke atas
  if (cohortYear >= 2024) {
    return {
      curriculumYear: 2026,
      curriculumId: 'curr-2026',
      reason: `Angkatan ${cohortYear} (>= 2024) secara otomatis mengikuti Kurikulum 2026`,
      ruleCode: 'RULE_COHORT_2024_PLUS',
      isOverride: false,
      status: 'Calculated',
    };
  }

  // Prioritas 2 & 3: Angkatan 2023 ke bawah
  const sem = currentSemester !== undefined ? currentSemester : ((2026 - cohortYear) * 2) + 1;
  if (sem >= 7 || totalEarnedCredits >= 120) {
    const reasonDetail = sem >= 7
      ? `Angkatan ${cohortYear} berada pada Semester ${sem} (>= 7)`
      : `Perolehan SKS ${totalEarnedCredits} (>= 120 SKS)`;
    return {
      curriculumYear: 2022,
      curriculumId: 'curr-2022',
      reason: `${reasonDetail} -> Mengikuti Kurikulum 2022 (OBE)`,
      ruleCode: 'RULE_SENIOR_2022',
      isOverride: false,
      status: 'Calculated',
    };
  } else {
    return {
      curriculumYear: 2026,
      curriculumId: 'curr-2026',
      reason: `Angkatan ${cohortYear} (Semester ${sem} < 7 & ${totalEarnedCredits} SKS < 120 SKS) -> Aturan transisi Kurikulum 2026`,
      ruleCode: 'RULE_SENIOR_UNDER_120_SKS',
      isOverride: false,
      status: 'Calculated',
    };
  }
}

/**
 * Filter mata kuliah yang relevan untuk seorang mahasiswa berdasarkan:
 * - Kurikulum Mahasiswa (2022 vs 2026)
 * - Semester Mahasiswa (1-4: Paket Bersama; 5-8: Tergantung KBK)
 * - KBK Mahasiswa
 */
export function getEligibleCoursesForStudent(
  student: Student,
  allCourses: Course[],
  allPackages: CurriculumPackage[] = []
): Course[] {
  const studentCurrYear = student.curriculumYear || (student.cohortYear >= 2024 ? 2026 : 2022);
  const studentSem = student.currentSemester || student.semester || 1;
  const studentKbk = student.kbkId;

  return allCourses.filter((course) => {
    // 1. Filter by Curriculum Year if course has specific curriculum
    if (course.curriculumYear && course.curriculumYear !== studentCurrYear) {
      return false;
    }

    // 2. Filter by Semester
    if (studentSem <= 4) {
      // Semester 1-4: Paket Bersama Umum Wajib
      return course.semester === studentSem;
    } else {
      // Semester 5-8: Paket KBK & Pilihan Bebas
      if (course.semester !== studentSem) return false;

      // If course is KBK specific
      if (course.kbkIds && course.kbkIds.length > 0) {
        if (!studentKbk) return true; // Show all if student hasn't picked KBK yet
        return course.kbkIds.includes(studentKbk);
      }

      return true;
    }
  });
}

/**
 * Parsing data CSV SKS Mahasiswa
 * Header didukung: nim, total_sks / total_earned_credits / sks_lulus / sks
 */
export interface StudentCreditCsvRow {
  nim: string;
  name?: string;
  totalEarnedCredits: number;
  cohortYear?: number;
  kbkCode?: string;
}

export function parseStudentCreditsCsv(csvContent: string): {
  validRows: StudentCreditCsvRow[];
  errors: string[];
} {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { validRows: [], errors: ['File CSV kosong.'] };
  }

  const validRows: StudentCreditCsvRow[] = [];
  const errors: string[] = [];

  // Identify Header
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const nimIdx = headers.findIndex((h) => h === 'nim' || h.includes('nim'));
  const creditsIdx = headers.findIndex(
    (h) =>
      h.includes('sks') ||
      h.includes('credit') ||
      h.includes('total_sks') ||
      h.includes('total_earned_credits')
  );
  const nameIdx = headers.findIndex((h) => h.includes('nama') || h.includes('name'));
  const cohortIdx = headers.findIndex((h) => h.includes('angkatan') || h.includes('cohort'));
  const kbkIdx = headers.findIndex((h) => h.includes('kbk') || h.includes('konsentrasi'));

  const startIndex = nimIdx !== -1 || creditsIdx !== -1 ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length === 0 || !cols[0]) continue;

    const nim = (nimIdx !== -1 ? cols[nimIdx] : cols[0])?.toUpperCase().replace(/\s+/g, '');
    const rawCredits = creditsIdx !== -1 ? cols[creditsIdx] : cols[1];
    const credits = parseInt(rawCredits, 10);

    if (!nim || nim.length < 5) {
      errors.push(`Baris ${i + 1}: NIM "${cols[0]}" tidak valid.`);
      continue;
    }

    if (isNaN(credits) || credits < 0) {
      errors.push(`Baris ${i + 1}: Nilai SKS "${rawCredits}" untuk NIM ${nim} tidak valid.`);
      continue;
    }

    // Try infer cohort from NIM (e.g. F1B02310096 -> 2023)
    let cohortYear: number | undefined;
    if (cohortIdx !== -1 && cols[cohortIdx]) {
      const parsedCohort = parseInt(cols[cohortIdx], 10);
      if (!isNaN(parsedCohort)) cohortYear = parsedCohort;
    }
    if (!cohortYear) {
      const match = nim.match(/F1B\d(\d{2})/i) || nim.match(/\b(20\d{2})\b/);
      if (match) {
        if (match[1].length === 2) {
          cohortYear = 2000 + parseInt(match[1], 10);
        } else if (match[1].length === 4) {
          cohortYear = parseInt(match[1], 10);
        }
      }
    }

    const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : undefined;
    const kbkCode = kbkIdx !== -1 && cols[kbkIdx] ? cols[kbkIdx].toUpperCase() : undefined;

    validRows.push({
      nim,
      name,
      totalEarnedCredits: credits,
      cohortYear,
      kbkCode,
    });
  }

  return { validRows, errors };
}
