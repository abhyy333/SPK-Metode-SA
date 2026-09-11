import {
  Student,
  Course,
  ElectiveCreditEvaluation,
  CurriculumPackage,
  CoursePackageItem,
  ElectiveSlot,
} from '../types';
import { MASTER_CURRICULUM_PACKAGES } from '../data/masterPackages';
import { INITIAL_ELECTIVE_SLOTS, STL_2026_ELECTIVE_POOL } from '../data/curriculumDataset';

export interface GradeItem {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  grade: 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'E';
  gradePoint: number;
  semesterTaken?: number;
}

export const GRADE_POINT_MAP: Record<string, number> = {
  A: 4.0,
  'B+': 3.5,
  B: 3.0,
  'C+': 2.5,
  C: 2.0,
  'D+': 1.5,
  D: 1.0,
  E: 0.0,
};

/**
 * ATURAN EVALUASI MK PILIHAN:
 * Mahasiswa dapat mengambil hingga 10 SKS mata kuliah pilihan,
 * namun hanya 8 SKS dengan nilai tertinggi yang dihitung ke dalam total SKS kelulusan dan IPK kelulusan.
 */
export function evaluateStudentElectiveCredits(
  studentId: string,
  takenElectives: GradeItem[]
): ElectiveCreditEvaluation {
  const totalAttempted = takenElectives.reduce((sum, item) => sum + item.credits, 0);

  // Sort descending by gradePoint, then by credits
  const sorted = [...takenElectives].sort((a, b) => {
    if (b.gradePoint !== a.gradePoint) {
      return b.gradePoint - a.gradePoint;
    }
    return b.credits - a.credits;
  });

  const countedCourses: { courseId: string; credits: number; gradePoint: number }[] = [];
  const excessCourses: { courseId: string; credits: number; reason: string }[] = [];
  let countedCredits = 0;

  for (const item of sorted) {
    if (countedCredits + item.credits <= 8) {
      countedCredits += item.credits;
      countedCourses.push({
        courseId: item.courseId,
        credits: item.credits,
        gradePoint: item.gradePoint,
      });
    } else {
      excessCourses.push({
        courseId: item.courseId,
        credits: item.credits,
        reason: 'Kelebihan SKS pilihan (Maksimal 8 SKS terbaik yang dihitung untuk kelulusan)',
      });
    }
  }

  const isSatisfied = countedCredits >= 8;
  const statusMessage = isSatisfied
    ? `Syarat 8 SKS MK Pilihan terpenuhi (${countedCredits} SKS dihitung dari ${totalAttempted} SKS yang diambil).`
    : `Belum memenuhi syarat kelulusan MK Pilihan (baru ${countedCredits}/8 SKS).`;

  return {
    studentId,
    totalAttemptedCredits: totalAttempted,
    totalCountedCredits: countedCredits,
    countedCourses,
    excessCourses,
    isSatisfied,
    statusMessage,
  };
}

/**
 * Filter Packages by Curriculum Year and KBK
 */
export function getPackagesForCurriculum(
  curriculumYear: 2022 | 2026,
  kbkId?: string | null
): CurriculumPackage[] {
  return MASTER_CURRICULUM_PACKAGES.filter((pkg) => {
    if (pkg.curriculumYear !== curriculumYear) return false;
    if (pkg.isCommonPackage) return true;
    if (!kbkId) return true; // return all if no specific KBK filtered
    return pkg.kbkId === kbkId;
  });
}

/**
 * Calculate full degree credit projection for a KBK track
 */
export function calculateDegreeCreditTrack(
  curriculumYear: 2022 | 2026,
  kbkId: string
): {
  semesterBreakdown: { semester: number; packageName: string; sks: number; isCommon: boolean }[];
  totalTrackSks: number;
  targetGraduationSks: number;
  difference: number;
  notes: string[];
} {
  const packages = MASTER_CURRICULUM_PACKAGES.filter(
    (p) => p.curriculumYear === curriculumYear && (p.isCommonPackage || p.kbkId === kbkId)
  ).sort((a, b) => a.semester - b.semester);

  const semesterBreakdown = packages.map((p) => ({
    semester: p.semester,
    packageName: p.name,
    sks: p.totalSks,
    isCommon: p.isCommonPackage,
  }));

  const totalTrackSks = semesterBreakdown.reduce((sum, item) => sum + item.sks, 0);
  const targetGraduationSks = curriculumYear === 2026 ? 144 : 146;

  const notes: string[] = [];
  if (curriculumYear === 2026) {
    notes.push('Target kelulusan Kurikulum 2026 adalah 144 SKS.');
    notes.push('Mata kuliah pilihan dari 10 SKS ambil nilai tertinggi dari 8 SKS.');
    notes.push('Komunikasi Data & Jarkom mengintegrasikan praktikum jarkom.');
  } else {
    notes.push('Target kelulusan Kurikulum 2022 adalah 146 SKS.');
    notes.push('Mata kuliah pilihan dari 10 SKS ambil nilai tertinggi dari 8 SKS.');
  }

  return {
    semesterBreakdown,
    totalTrackSks,
    targetGraduationSks,
    difference: totalTrackSks - targetGraduationSks,
    notes,
  };
}

/**
 * Get Elective Slots for a specific package
 */
export function getElectiveSlotsForPackage(
  curriculumYear: number,
  kbkId: string | null,
  semester: number
): ElectiveSlot[] {
  return INITIAL_ELECTIVE_SLOTS.filter(
    (slot) =>
      slot.curriculumYear === curriculumYear &&
      (slot.kbkId === kbkId || !slot.kbkId) &&
      slot.packageSemester === semester
  );
}
