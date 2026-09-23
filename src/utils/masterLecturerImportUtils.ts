import * as XLSX from 'xlsx';
import {
  MasterLecturerAssignment,
  AcademicPeriod,
  MasterLecturerColumnMapping,
  ParsedImportRowItem,
} from '../types/masterLecturer';
import { Course, Lecturer } from '../types';

/**
 * Standard column synonyms for auto-mapping
 */
export const KNOWN_COLUMN_SYNONYMS = {
  courseName: ['matakuliah', 'mata kuliah', 'nama mata kuliah', 'nama matakuliah', 'mk', 'nama mk', 'mata_kuliah', 'course', 'raw_course_name'],
  sks: ['sks', 'credit', 'kredit', 'bobot sks', 'sks mata kuliah', 'raw_sks'],
  wCode: ['w', 'kode w', 'w_code', 'w code', 'kelompok', 'sifat', 'raw_w_code', 'kode_w'],
  semester: ['smtr', 'semester', 'smt', 'sem', 'tingkat', 'source_semester'],
  lecturer: ['d o s e n', 'dosen', 'dosen pengampu', 'pengampu', 'lecturer', 'nama dosen', 'pengajar', 'raw_lecturer_name'],
  no: ['no', 'nomor', 'no.', 'row', 'urut', 'raw_no'],
  academicPeriod: ['academic period', 'period', 'periode', 'semester akademik', 'tahun', 'academic_period'],
};

/**
 * Auto-detect column mapping from file headers without arbitrary fallbacks
 */
export function autoDetectColumnMapping(headers: string[]): MasterLecturerColumnMapping {
  const normalize = (h: string) => h.toLowerCase().replace(/[\s\_\-\.]+/g, ' ').trim();
  const normalizedHeaders = headers.map((h) => ({ original: h, normalized: normalize(h) }));

  const findBestMatch = (synonyms: string[]): string => {
    // 1. Exact match
    for (const syn of synonyms) {
      const found = normalizedHeaders.find((h) => h.normalized === syn);
      if (found) return found.original;
    }
    // 2. Substring match
    for (const syn of synonyms) {
      const found = normalizedHeaders.find((h) => {
        if (syn.length <= 2) {
          return h.normalized === syn;
        }
        return h.normalized.includes(syn) || syn.includes(h.normalized);
      });
      if (found) return found.original;
    }
    return '';
  };

  return {
    academicPeriodCol: findBestMatch(KNOWN_COLUMN_SYNONYMS.academicPeriod), // Can be empty, auto-detected from semester!
    courseNameCol: findBestMatch(KNOWN_COLUMN_SYNONYMS.courseName),
    sksCol: findBestMatch(KNOWN_COLUMN_SYNONYMS.sks),
    wCodeCol: findBestMatch(KNOWN_COLUMN_SYNONYMS.wCode),
    semesterCol: findBestMatch(KNOWN_COLUMN_SYNONYMS.semester),
    lecturerCol: findBestMatch(KNOWN_COLUMN_SYNONYMS.lecturer),
    noCol: findBestMatch(KNOWN_COLUMN_SYNONYMS.no),
  };
}

/**
 * Parse Section and Base Course Name from a raw course string.
 * Examples:
 * "Fisika Listrik & Magnet - A" -> { base: "Fisika Listrik & Magnet", section: "A" }
 * "Rangkaian Listrik I – C" -> { base: "Rangkaian Listrik I", section: "C" }
 * "Agama Islam - INTER" -> { base: "Agama Islam", section: "INTER" }
 * "Matematika I (A)" -> { base: "Matematika I", section: "A" }
 * "Kecerdasan Buatan Kelas B" -> { base: "Kecerdasan Buatan", section: "B" }
 */
export function parseSectionAndBaseCourseName(rawCourseName: string): {
  baseCourseName: string;
  section: string | null;
} {
  if (!rawCourseName || !rawCourseName.trim()) {
    return { baseCourseName: '', section: null };
  }

  const str = rawCourseName.trim();

  // 1. Check hyphen / en-dash / em-dash separator at the end
  const dashMatch = str.match(/^(.*?)\s*[\-\–\—]\s*([A-Za-z0-9\(\)\s]+)$/);
  if (dashMatch) {
    const candidateBase = dashMatch[1].trim();
    const candidateSec = dashMatch[2].trim();

    const secUpper = candidateSec.toUpperCase();
    if (
      /^[A-Z]$/.test(secUpper) ||
      /^INTER(\s*\([0-9]+\))?$/.test(secUpper) ||
      /^KELAS\s+[A-Z0-9]$/i.test(secUpper) ||
      /^[0-9]$/.test(secUpper)
    ) {
      const cleanSec = secUpper.replace(/^KELAS\s+/i, '').trim();
      return { baseCourseName: candidateBase, section: cleanSec };
    }
  }

  // 2. Check parenthesis at the end e.g. "Name (A)" or "Name (INTER)"
  const parenMatch = str.match(/^(.*?)\s*\(([A-Za-z0-9\s]+)\)$/);
  if (parenMatch) {
    const candidateBase = parenMatch[1].trim();
    const candidateSec = parenMatch[2].trim().toUpperCase();
    if (/^[A-Z]$/.test(candidateSec) || /^INTER/.test(candidateSec)) {
      return { baseCourseName: candidateBase, section: candidateSec };
    }
  }

  // 3. Check "Kelas X" at the end
  const kelasMatch = str.match(/^(.*?)\s+Kelas\s+([A-Za-z0-9]+)$/i);
  if (kelasMatch) {
    return {
      baseCourseName: kelasMatch[1].trim(),
      section: kelasMatch[2].trim().toUpperCase(),
    };
  }

  return { baseCourseName: str, section: null };
}

/**
 * Normalizes lecturer name and detects coordinator.
 * CRITICAL: rawLecturerName remains 100% VERBATIM.
 * Only normalizedName strips degrees for searching/matching against Master Dosen.
 * Never split cells by comma.
 */
export function normalizeLecturerName(rawLecturerName: string): {
  normalizedName: string;
  isCoordinator: boolean;
} {
  if (!rawLecturerName || !rawLecturerName.trim()) {
    return { normalizedName: '', isCoordinator: false };
  }

  const originalVerbatim = rawLecturerName.trim();
  const isCoordinator = /\((koordinator|koor)\)/i.test(originalVerbatim);

  // Remove coordinator text only for normalized comparison
  let str = originalVerbatim.replace(/\((koordinator|koor)\)/gi, '').trim();

  // Strip academic titles & degrees ONLY for search/matching normalization
  const cleanedName = str
    .replace(/\b(Dr\.|Prof\.|Ir\.|Ph\.D\.|S\.T\.|ST\.|M\.T\.|MT\.|S\.Pd\.|S\.Pd|M\.Si\.|M\.Si|M\.Ag\.|M\.Ag|S\.Ag\.|S\.Ag|M\.Eng\.|M\.Eng|M\.Sc\.|M\.Sc|B\.Eng\.|B\.Eng|IPU\.|ASEAN\.Eng\.|IPU|ASEAN Eng)\b/gi, '')
    .replace(/[\,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    normalizedName: cleanedName || str,
    isCoordinator,
  };
}

/**
 * Parse Semester Number from Roman (I..VIII), Arabic (1..8), or strings ("Semester 3")
 */
export function parseSemesterNumber(rawSemester: string | number | undefined | null): number {
  if (rawSemester === undefined || rawSemester === null) return 1;
  if (typeof rawSemester === 'number') {
    if (isNaN(rawSemester)) return 1;
    return Math.max(1, Math.min(8, Math.round(rawSemester)));
  }
  const s = String(rawSemester || '').trim().toUpperCase();
  const clean = s.replace(/^(SEMESTER|SMTR|SMT|SEM|TINGKAT)\s*/i, '').trim();

  const romanMap: Record<string, number> = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
  };
  if (romanMap[clean]) return romanMap[clean];
  if (romanMap[s]) return romanMap[s];

  // Try extracting any number 1-8
  const match = clean.match(/[1-8]/);
  if (match) {
    const parsed = parseInt(match[0], 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 8) return parsed;
  }

  const parsed = parseInt(clean, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 8) return parsed;
  return 1;
}

/**
 * Auto-detects Academic Period (GANJIL / GENAP) strictly from Semester Number:
 * Semester I, III, V, VII (1, 3, 5, 7) -> GANJIL
 * Semester II, IV, VI, VIII (2, 4, 6, 8) -> GENAP
 */
export function getAcademicPeriodFromSemester(semesterVal: string | number | undefined | null): AcademicPeriod {
  const num = parseSemesterNumber(semesterVal);
  return num % 2 === 1 ? 'GANJIL' : 'GENAP';
}

/**
 * Parse Effective SKS from string or number (e.g. "01.05" -> 1.5, "0" -> 0, "3" -> 3)
 */
export function parseEffectiveSks(rawSks: string | number): number {
  if (typeof rawSks === 'number') return isNaN(rawSks) ? 2 : rawSks;
  const str = String(rawSks || '').trim();
  if (str === '01.05' || str === '1.5' || str === '1,5') return 1.5;
  const val = parseFloat(str.replace(',', '.'));
  if (isNaN(val)) return 2;
  return val;
}

/**
 * Fuzzy/Normalized matching against Master Lecturers
 */
export function matchWithMasterLecturer(
  rawLecturerName: string,
  normalizedLecturerName: string,
  lecturers: Lecturer[]
): { lecturerId: string | null; lecturerCode: string | null; matchedName: string | null } {
  if (!rawLecturerName || !rawLecturerName.trim()) {
    return { lecturerId: null, lecturerCode: null, matchedName: null };
  }

  const cleanQuery = normalizedLecturerName.toLowerCase().replace(/[\s\.\,]/g, '');

  // 1. Direct name match on lecturer name
  for (const lec of lecturers) {
    const cleanLec = lec.name
      .toLowerCase()
      .replace(/\b(dr|prof|ir|ph\.d|s\.t|st|m\.t|mt|s\.pd|m\.si|m\.ag|s\.ag|m\.eng|m\.sc|ipu|asean eng)\b/g, '')
      .replace(/[\s\.\,]/g, '');

    if (cleanLec === cleanQuery || (cleanQuery.length > 5 && (cleanLec.includes(cleanQuery) || cleanQuery.includes(cleanLec)))) {
      return { lecturerId: lec.id, lecturerCode: lec.code || null, matchedName: lec.name };
    }
  }

  // 2. Token overlap match (e.g. "Kasnawi Al Hadi")
  const queryTokens = normalizedLecturerName
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (queryTokens.length >= 2) {
    let bestMatch: Lecturer | null = null;
    let maxOverlap = 0;

    for (const lec of lecturers) {
      const lecTokens = lec.name.toLowerCase().split(/\s+/);
      const overlap = queryTokens.filter((qt) => lecTokens.some((lt) => lt.includes(qt) || qt.includes(lt))).length;
      if (overlap >= 2 && overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = lec;
      }
    }

    if (bestMatch) {
      return { lecturerId: bestMatch.id, lecturerCode: bestMatch.code || null, matchedName: bestMatch.name };
    }
  }

  return { lecturerId: null, lecturerCode: null, matchedName: null };
}

/**
 * Normalized matching against Master Courses
 */
export function matchWithMasterCourse(
  baseCourseName: string,
  semesterNum: number,
  courses: Course[]
): { courseId: string | null; matchedCourseName: string | null } {
  if (!baseCourseName || !baseCourseName.trim()) {
    return { courseId: null, matchedCourseName: null };
  }

  const cleanQuery = baseCourseName.toLowerCase().replace(/[\s\(\)\-\_\,\.]/g, '');

  // 1. Exact cleaned match with same semester
  for (const c of courses) {
    const cleanC = c.name.toLowerCase().replace(/[\s\(\)\-\_\,\.]/g, '');
    if (cleanC === cleanQuery && c.semester === semesterNum) {
      return { courseId: c.id, matchedCourseName: c.name };
    }
  }

  // 2. Exact cleaned match regardless of semester
  for (const c of courses) {
    const cleanC = c.name.toLowerCase().replace(/[\s\(\)\-\_\,\.]/g, '');
    if (cleanC === cleanQuery) {
      return { courseId: c.id, matchedCourseName: c.name };
    }
  }

  // 3. Substring match
  for (const c of courses) {
    const cleanC = c.name.toLowerCase().replace(/[\s\(\)\-\_\,\.]/g, '');
    if (cleanQuery.length > 6 && (cleanC.includes(cleanQuery) || cleanQuery.includes(cleanC))) {
      return { courseId: c.id, matchedCourseName: c.name };
    }
  }

  return { courseId: null, matchedCourseName: null };
}

/**
 * Parse raw rows from sheet data into ParsedImportRowItem list
 */
export function parseSheetRowsToPreview(
  rawRows: Record<string, any>[],
  mapping: MasterLecturerColumnMapping,
  existingData: MasterLecturerAssignment[],
  lecturers: Lecturer[],
  courses: Course[]
): ParsedImportRowItem[] {
  const existingKeys = new Set(
    existingData.map(
      (d) => `${d.academic_period}|${d.raw_course_name.trim().toLowerCase()}|${d.raw_lecturer_name.trim().toLowerCase()}`
    )
  );

  const courseGroupLecturers = new Map<string, Set<string>>();

  // First pass: identify team teaching within incoming batch & compute period from semester
  rawRows.forEach((row) => {
    const rawSem = mapping.semesterCol ? row[mapping.semesterCol] : undefined;
    const period = getAcademicPeriodFromSemester(rawSem);
    const course = String(mapping.courseNameCol ? row[mapping.courseNameCol] || '' : '').trim();
    const lecturer = String(mapping.lecturerCol ? row[mapping.lecturerCol] || '' : '').trim();
    if (course) {
      const key = `${period}|${course.toLowerCase()}`;
      const set = courseGroupLecturers.get(key) || new Set();
      if (lecturer) set.add(lecturer.toLowerCase());
      courseGroupLecturers.set(key, set);
    }
  });

  return rawRows.map((row, index) => {
    const rawNo = mapping.noCol && row[mapping.noCol] !== undefined ? row[mapping.noCol] : index + 1;
    const rawCourse = String(mapping.courseNameCol && row[mapping.courseNameCol] !== undefined ? row[mapping.courseNameCol] : '').trim();
    const rawSks = String(mapping.sksCol && row[mapping.sksCol] !== undefined ? row[mapping.sksCol] : '2').trim();
    const rawWCode = String(mapping.wCodeCol && row[mapping.wCodeCol] !== undefined ? row[mapping.wCodeCol] : 'WS').trim();
    const rawSemester = String(mapping.semesterCol && row[mapping.semesterCol] !== undefined ? row[mapping.semesterCol] : 'I').trim();
    const rawLecturer = String(mapping.lecturerCol && row[mapping.lecturerCol] !== undefined ? row[mapping.lecturerCol] : '').trim();

    // AUTO-DETECT GANJIL/GENAP STRICTLY FROM SEMESTER
    const semester_num = parseSemesterNumber(rawSemester);
    const academic_period: AcademicPeriod = semester_num % 2 === 1 ? 'GANJIL' : 'GENAP';

    const { baseCourseName, section } = parseSectionAndBaseCourseName(rawCourse);
    const { normalizedName: normalized_lecturer_name, isCoordinator } = normalizeLecturerName(rawLecturer);
    const effective_sks = parseEffectiveSks(rawSks);

    const is_practicum =
      rawCourse.toLowerCase().includes('praktikum') ||
      rawWCode.toLowerCase().includes('p') ||
      rawCourse.toLowerCase().includes('lab');
    const is_kkn = rawCourse.toLowerCase().includes('kkn') || rawLecturer.toLowerCase().includes('lppm');

    // Matching against master tables (lookup only)
    const { lecturerId, lecturerCode, matchedName: matchedLecturerName } = matchWithMasterLecturer(
      rawLecturer,
      normalized_lecturer_name,
      lecturers
    );

    const { courseId, matchedCourseName } = matchWithMasterCourse(baseCourseName, semester_num, courses);

    // Diagnostics & Validation
    const issues: string[] = [];
    let status: 'valid' | 'warning' | 'error' = 'valid';

    if (!rawCourse) {
      issues.push('Nama Mata Kuliah kosong');
      status = 'error';
    }

    const itemKey = `${academic_period}|${rawCourse.toLowerCase()}|${rawLecturer.toLowerCase()}`;
    const isDuplicateLooking = existingKeys.has(itemKey);
    if (isDuplicateLooking) {
      issues.push('Record serupa sudah tersedia di Master Data (Periksa apakah Team Teaching atau Duplikat)');
      if (status !== 'error') status = 'warning';
    }

    // Check multiple lecturers for this course offering
    const groupKey = `${academic_period}|${rawCourse.toLowerCase()}`;
    const lecturerCountForCourse = courseGroupLecturers.get(groupKey)?.size || 0;
    const isMultipleLecturer = lecturerCountForCourse > 1;

    if (!lecturerId && rawLecturer && !is_kkn) {
      issues.push('Dosen belum terhubung ke Master Dosen (nama asli tetap disimpan)');
      if (status !== 'error') status = 'warning';
    }

    if (!courseId && rawCourse) {
      issues.push('Mata kuliah belum terhubung ke Kurikulum Master (nama asli tetap disimpan)');
      if (status !== 'error') status = 'warning';
    }

    const uniqueId = `import-${academic_period.toLowerCase()}-${Date.now()}-${index + 1}-${Math.random().toString(36).substring(2, 6)}`;

    const assignment: MasterLecturerAssignment = {
      source_row_id: uniqueId,
      academic_period,
      raw_no: typeof rawNo === 'number' ? rawNo : parseInt(String(rawNo), 10) || index + 1,
      raw_course_name: rawCourse,
      raw_sks: rawSks,
      effective_sks,
      raw_w_code: rawWCode,
      source_semester: rawSemester,
      raw_lecturer_name: rawLecturer,
      rawLecturerName: rawLecturer,
      is_coordinator: isCoordinator,
      section,
      base_course_name: baseCourseName,
      normalized_course_name: baseCourseName.toLowerCase().replace(/[\s\-\_\,\.]/g, ''),
      normalized_lecturer_name,
      normalizedLecturerName: normalized_lecturer_name,
      semester_num,
      is_practicum,
      is_kkn,
      lecturer_id: lecturerId,
      lecturer_code: lecturerCode,
      course_id: courseId,
      dataSource: 'imported',
      status_mapping: !lecturerId && !courseId ? 'unlinked' : !lecturerId ? 'lecturer_unlinked' : !courseId ? 'course_unlinked' : 'mapped',
    };

    return {
      rowIndex: index + 1,
      raw: {
        academic_period: `${academic_period} (Otomatis)`,
        raw_no: rawNo,
        raw_course_name: rawCourse,
        raw_sks: rawSks,
        raw_w_code: rawWCode,
        source_semester: rawSemester,
        raw_lecturer_name: rawLecturer,
      },
      assignment,
      status,
      issues,
      isDuplicateLooking,
      isMultipleLecturer,
      matchedLecturerName,
      matchedCourseName,
      selected: status !== 'error',
    };
  });
}

/**
 * Generates and triggers download of Excel template with sample rows and guidelines
 */
export function downloadExcelTemplate(): void {
  const headers = ['No', 'Matakuliah', 'SKS', 'W', 'Smtr', 'D O S E N'];

  const sampleRows = [
    [1, 'Fisika Listrik & Magnet - A', '3', 'WS', 'I', 'Dr. Kasnawi Al Hadi, S.Pd, M.Si.'],
    [2, 'Fisika Listrik & Magnet - B', '01.05', 'WS', 'I', 'I Wayan Sudiarta, Ph.D.'],
    [3, 'Fisika Listrik & Magnet - B', '01.05', 'WS', 'I', 'Sudi M. Al Sasongko, ST., MT.'],
    [4, 'Rangkaian Listrik I – C', '3', 'WS', 'I', 'Supriyatna, ST., MT. (Koordinator)'],
    [5, 'Rangkaian Listrik I – C', '3', 'WS', 'I', 'Bulkis Kanata, ST., MT.'],
    [6, 'Agama Islam - INTER', '2', 'WK', 'I', 'Humamurrizqi S.Ag, M.Ag'],
    [7, 'Pengukuran Besaran Listrik - A', '2', 'WS', 'II', 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.'],
    [8, 'Pengukuran Besaran Listrik - B', '2', 'WS', 'II', 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.'],
    [9, 'Praktikum Pengukuran Besaran Listrik - A', '1', 'PST', 'II', 'Dosen Pembina Lab Listrik'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 38 }, // Matakuliah
    { wch: 8 },  // SKS
    { wch: 8 },  // W
    { wch: 10 }, // Smtr
    { wch: 45 }, // D O S E N
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master Dosen Pengampu');

  // Also add instructions sheet
  const instructionHeaders = ['Panduan Format Import Master Dosen Pengampu'];
  const instructions = [
    ['1. Kolom "Matakuliah": Nama mata kuliah beserta kelas (contoh: "Fisika Listrik & Magnet - A").'],
    ['2. Kolom "SKS": Bobot SKS (misal: 2, 3, 01.05, 1.5, 0).'],
    ['3. Kolom "W": Kode kelompok mata kuliah (WS, WST, WK, PST, WE, WT).'],
    ['4. Kolom "Smtr": Semester (I, II, III, IV, V, VI, VII, VIII atau 1..8). Periode GANJIL/GENAP ditentukan OTOMATIS.'],
    ['5. Kolom "D O S E N": Nama dosen pengampu LENGKAP dengan seluruh gelar. Format dan gelar akan disimpan verbatim tanpa diubah.'],
    ['6. Team Teaching (Multi Dosen): Tulis baris baru dengan Matakuliah dan Kelas yang sama untuk dosen berikutnya.'],
    ['7. Huruf besar/kecil, koma gelar, titik, dan spasi asli nama dosen akan dipertahankan 100% persis.'],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet([instructionHeaders, ...instructions]);
  wsGuide['!cols'] = [{ wch: 85 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk & Aturan');

  XLSX.writeFile(wb, 'Template_Import_Master_Dosen_Pengampu.xlsx');
}
