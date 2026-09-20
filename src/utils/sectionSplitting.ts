export const MIN_STUDENTS_PER_CLASS = 10;
export const MAX_STUDENTS_PER_CLASS = 40;

export interface BalancedSectionItem {
  section: string;
  studentCount: number;
  lecturerId?: string | null;
  lecturerIds?: string[];
}

/**
 * Creates balanced sections based on total student count.
 * Constraints:
 * - 10..40 students => 1 section ('A')
 * - >40 students => Balanced splitting (e.g. 41 => A:21, B:20; 80 => A:40, B:40; 81 => A:27, B:27, C:27; 127 => A:32, B:32, C:32, D:31)
 * - Sum of studentCount across all sections strictly equals totalStudents.
 */
export function createBalancedSections(
  totalStudents: number,
  maxPerClass: number = MAX_STUDENTS_PER_CLASS
): BalancedSectionItem[] {
  if (totalStudents <= 0) return [];

  if (totalStudents <= maxPerClass) {
    return [{ section: 'A', studentCount: totalStudents }];
  }

  const numSections = Math.ceil(totalStudents / maxPerClass);
  const baseCount = Math.floor(totalStudents / numSections);
  const remainder = totalStudents % numSections;

  const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const sections: BalancedSectionItem[] = [];

  for (let i = 0; i < numSections; i++) {
    const count = i < remainder ? baseCount + 1 : baseCount;
    sections.push({
      section: SECTION_LETTERS[i] || `Sec-${i + 1}`,
      studentCount: count,
    });
  }

  return sections;
}

export interface StudentCountValidation {
  isValid: boolean;
  status: 'below_minimum' | 'single_section' | 'multiple_sections';
  warningMessage?: string;
  sectionCount: number;
  sections: BalancedSectionItem[];
}

export function validateStudentCount(
  totalStudents: number,
  minPerClass: number = MIN_STUDENTS_PER_CLASS,
  maxPerClass: number = MAX_STUDENTS_PER_CLASS
): StudentCountValidation {
  if (totalStudents < minPerClass) {
    return {
      isValid: false,
      status: 'below_minimum',
      warningMessage: `Jumlah mahasiswa (${totalStudents}) belum memenuhi minimum ${minPerClass}. Kelas tidak boleh dibuka secara normal tanpa persetujuan khusus Admin.`,
      sectionCount: 1,
      sections: [{ section: 'A', studentCount: totalStudents }],
    };
  }

  const sections = createBalancedSections(totalStudents, maxPerClass);
  return {
    isValid: true,
    status: sections.length > 1 ? 'multiple_sections' : 'single_section',
    sectionCount: sections.length,
    sections,
  };
}
