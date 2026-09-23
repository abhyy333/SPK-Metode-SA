import { DayOfWeek, TimePreference } from './index';

export type AcademicPeriod = 'GANJIL' | 'GENAP';

export type MasterLecturerMappingStatus = 'mapped' | 'lecturer_unlinked' | 'course_unlinked' | 'unlinked';

export interface MasterLecturerAssignment {
  source_row_id: string; // Unique immutable ID e.g. "src-ganjil-1", "src-genap-1"
  academic_period: AcademicPeriod;
  raw_no: number;
  raw_course_name: string; // Exact verbatim string from source
  raw_sks: string; // Exact verbatim string e.g. "2", "3", "01.05", "0", "4"
  effective_sks: number; // 2, 3, 1.5, 0, 4, etc.
  raw_w_code: string; // Exact verbatim string e.g. "WS", "WST", "WK", "PST", "WE,WT", etc.
  source_semester: string; // Exact verbatim string e.g. "I", "II", "III", "IV", "V", "VI", "VII", "VIII"
  raw_lecturer_name: string; // Exact verbatim string e.g. "Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng."
  rawLecturerName?: string; // Verbatim alias
  
  // Normalized & Parsed Helper Properties (Raw Source remains 100% immutable)
  id?: string;
  academicPeriod?: AcademicPeriod;
  rawCourseName?: string;
  normalizedCourseName?: string;
  rawSks?: string;
  codeW?: string;
  semester?: string;
  lecturerId?: string | null;
  sourceType?: string;
  manualOverride?: boolean;
  is_coordinator: boolean;
  section: string | null; // e.g. 'A', 'B', 'C', 'D', 'INTER', 'INTER (1)', 'INTER (2)', or null
  base_course_name: string; // Course name stripped of section suffix
  normalized_course_name: string; // Standardized string for search
  normalized_lecturer_name: string; // Lecturer name for matching/search only (titles/degrees stripped)
  normalizedLecturerName?: string; // Search alias
  semester_num: number; // 1..8
  is_practicum: boolean;
  is_kkn: boolean;
  lecturer_code?: string | null;
  lecturer_id?: string | null;
  course_id?: string | null;
  import_batch_id?: string;
  status_mapping?: MasterLecturerMappingStatus;

  // Audit & Persistence Metadata
  dataSource?: 'official_dataset' | 'imported' | 'manual';
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface MasterLecturerValidationReport {
  totalSourceRows: number;
  ganjilRows: number;
  genapRows: number;
  expectedTotal: number;
  expectedGanjil: number;
  expectedGenap: number;
  skippedCount: number;
  missingCount: number;
  modifiedCount: number;
  isValid: boolean;
  uniqueCoursesCount: number;
  uniqueLecturersCount: number;
  multipleLecturerRowsCount: number;
  practicumRowsCount: number;
  kknRowsCount: number;
}

export interface MasterLecturerImportBatch {
  id: string; // e.g. "batch-1727000000000"
  fileName: string;
  fileType: 'xlsx' | 'xls' | 'csv';
  importedAt: string;
  importedBy: string;
  mode: 'append' | 'upsert';
  status?: 'IMPORTED' | 'ROLLED BACK' | 'FAILED';
  rolledBackAt?: string;
  rolledBackBy?: string;
  totalRows: number;
  successRows: number;
  warningRows: number;
  errorRows: number;
  duplicateCount: number;
  multipleLecturerCount: number;
  unlinkedLecturerCount: number;
  unlinkedCourseCount: number;
  rows: MasterLecturerAssignment[];
  previousSnapshot?: MasterLecturerAssignment[];
}

export interface MasterLecturerColumnMapping {
  academicPeriodCol: string;
  courseNameCol: string;
  sksCol: string;
  wCodeCol: string;
  semesterCol: string;
  lecturerCol: string;
  noCol?: string;
}

export interface ParsedImportRowItem {
  rowIndex: number;
  raw: {
    academic_period: string;
    raw_no: string | number;
    raw_course_name: string;
    raw_sks: string;
    raw_w_code: string;
    source_semester: string;
    raw_lecturer_name: string;
  };
  assignment: MasterLecturerAssignment;
  status: 'valid' | 'warning' | 'error';
  issues: string[];
  isDuplicateLooking: boolean;
  isMultipleLecturer: boolean;
  matchedLecturerName?: string | null;
  matchedCourseName?: string | null;
  selected: boolean;
}

