import { MasterLecturerAssignment, MasterLecturerValidationReport } from '../types/masterLecturer';
import { RAW_LECTURERS } from './realDataset';

export function parseSemesterRoman(roman: string): number {
  const map: Record<string, number> = {
    'I': 1,
    'II': 2,
    'III': 3,
    'IV': 4,
    'V': 5,
    'VI': 6,
    'VII': 7,
    'VIII': 8,
  };
  return map[(roman || '').trim().toUpperCase()] || 1;
}

export function parseEffectiveSks(rawSks: string): number {
  const clean = (rawSks || '').trim();
  if (clean === '01.05') return 1.5;
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 2 : parsed;
}

export function extractSectionAndBaseName(rawCourseName: string): { section: string | null; baseName: string } {
  const trimmed = (rawCourseName || '').trim();
  const normalized = trimmed.replace(/[–—]/g, '-');

  // 1. Hyphen pattern: "Agama Islam - A", "Fisika Listrik & Magnet - B", "Dasar Pemrograman - INTER", "Kimia Dasar - INTER (1)"
  const match = normalized.match(/^(.*?)\s*-\s*([A-Za-z0-9\(\)\s]+)$/);
  if (match) {
    const candidate = match[2].trim();
    if (/^(?:[A-G]|INTER(?:\s*\(\d+\))?)$/i.test(candidate)) {
      return {
        baseName: match[1].trim(),
        section: candidate.toUpperCase(),
      };
    }
  }

  // 2. Space pattern: "Transmisi Tenaga Listrik A", "Transmisi Tenaga Listrik B"
  const spaceMatch = normalized.match(/^(.*?)\s+([A-G])$/);
  if (spaceMatch) {
    return {
      baseName: spaceMatch[1].trim(),
      section: spaceMatch[2].toUpperCase(),
    };
  }

  return {
    baseName: trimmed,
    section: null,
  };
}

export function normalizeLecturerName(rawName: string): { normalizedName: string; isCoordinator: boolean } {
  const trimmed = (rawName || '').trim().replace(/^["']|["']$/g, '');
  const isCoordinator = /\(koordinator\)/i.test(trimmed);
  const normalizedName = trimmed.replace(/\s*\(koordinator\)/i, '').trim();
  return { normalizedName, isCoordinator };
}

const LECTURER_MATCH_ALIASES: Record<string, string> = {
  'giriwahyuwiriasto': 'giriwahyuwiriastro',
  'muhammadrivaldiharjian': 'mrivaldiharjian',
  'mrivaldiharjian': 'mrivaldiharjian',
  'wiraramawedashwara': 'wiraramawedhaswara',
  'igdeputuwiraramawedashwarawirawan': 'wiraramawedhaswara',
};

export function cleanLecturerForMatching(name: string): string {
  let s = (name || '').replace(/\(koordinator\)/gi, '').replace(/["'\t]/g, ' ').toLowerCase();
  // Strip common titles and punctuation
  const words = s.match(/[a-zA-Z]+/g) || [];
  const titleWords = new Set([
    'dr', 'ir', 'prof', 'phd', 'spd', 'msi', 'st', 'mt', 'ipu', 'asean', 'eng', 'meng', 'mhum',
    'sag', 'mag', 'mpdi', 'sh', 'mkn', 'mh', 'ssi', 'skom', 'msc', 'nat', 'rer', 'drs', 'kom'
  ]);
  let filtered = words.filter((w) => !titleWords.has(w)).join('');
  for (const [k, v] of Object.entries(LECTURER_MATCH_ALIASES)) {
    if (filtered.includes(k)) {
      filtered = filtered.replace(k, v);
    }
  }
  return filtered;
}

export function resolveLecturerFromMaster(rawName: string): { lecturerId: string | null; lecturerCode: string | null; canonicalName: string | null } {
  const target = cleanLecturerForMatching(rawName);
  if (!target) return { lecturerId: null, lecturerCode: null, canonicalName: null };

  // 1. Exact match by clean target
  for (const lec of RAW_LECTURERS) {
    const lecTarget = cleanLecturerForMatching(lec.name);
    if (lecTarget === target) {
      const codeLower = lec.code.toLowerCase();
      return {
        lecturerId: `lec-${codeLower}`,
        lecturerCode: lec.code,
        canonicalName: lec.name,
      };
    }
  }

  // 2. Substring / contains
  for (const lec of RAW_LECTURERS) {
    const lecTarget = cleanLecturerForMatching(lec.name);
    if (target && (target.includes(lecTarget) || lecTarget.includes(target))) {
      const codeLower = lec.code.toLowerCase();
      return {
        lecturerId: `lec-${codeLower}`,
        lecturerCode: lec.code,
        canonicalName: lec.name,
      };
    }
  }

  return { lecturerId: null, lecturerCode: null, canonicalName: null };
}

// RAW GANJIL DATA (183 ROWS VERBATIM FROM USER SOURCE OF TRUTH)
export const RAW_GANJIL_DATA: { no: number; course: string; sks: string; wCode: string; semester: string; lecturer: string }[] = [
  { no: 1, course: 'Agama Islam - A', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Humamurrizqi S.Ag, M.Ag' },
  { no: 2, course: 'Agama Islam - B', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Jamaludin, M.Pd.I' },
  { no: 3, course: 'Agama Islam - C', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Supriyatna, ST., MT.' },
  { no: 4, course: 'Agama Islam - INTER', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Dr. rer. nat. Teti Zubaidah, ST., MT.' },
  { no: 5, course: 'Fisika Listrik & Magnet - A', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Dr. Kasnawi Al Hadi, S.Pd, M.Si.' },
  { no: 6, course: 'Fisika Listrik & Magnet - B', sks: '01.05', wCode: 'WS', semester: 'I', lecturer: 'I Wayan Sudiarta, Ph.D.' },
  { no: 7, course: 'Fisika Listrik & Magnet - B', sks: '01.05', wCode: 'WS', semester: 'I', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 8, course: 'Fisika Listrik & Magnet - C', sks: '01.05', wCode: 'WS', semester: 'I', lecturer: 'Abdullah Zainuddin, ST., MT.' },
  { no: 9, course: 'Fisika Listrik & Magnet - C', sks: '01.05', wCode: 'WS', semester: 'I', lecturer: 'I Gusti Ngurah Yudi Handayana, Ph.D.' },
  { no: 10, course: 'Fisika Listrik & Magnet- INTER', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Siti Alaa’ , M.Si' },
  { no: 11, course: 'Fisika Mekanika - A', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Dr. Kasnawi Al Hadi, S.Pd, M.Si.' },
  { no: 12, course: 'Fisika Mekanika - B', sks: '01.05', wCode: 'WS', semester: 'I', lecturer: 'Dr. Drs. Marzuki, M.Si.' },
  { no: 13, course: 'Fisika Mekanika - B', sks: '01.05', wCode: 'WS', semester: 'I', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 14, course: 'Fisika Mekanika - C', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Dr.Nurul Qomariyah, S.Si, M.Si.' },
  { no: 15, course: 'Fisika Mekanika - INTER', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Dr. rer. nat. Teti Zubaidah, ST., MT.' },
  { no: 16, course: 'Dasar Integral & Differensial - A', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 17, course: 'Dasar Integral & Differensial - B', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 18, course: 'Dasar Integral & Differensial - C', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 19, course: 'Dasar Integral & Differensial - INTER', sks: '3', wCode: 'WS', semester: 'I', lecturer: 'Djul Fikry Budiman, ST., MT.' },
  { no: 20, course: 'Kimia Dasar - A', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Paniran, ST., MT.' },
  { no: 21, course: 'Kimia Dasar - B', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 22, course: 'Kimia Dasar - C', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 23, course: 'Kimia Dasar - INTER (1)', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Made Ganesh Dharmayanti, Ph.D' },
  { no: 24, course: 'Kimia Dasar - D', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 25, course: 'Kimia Dasar - E', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Saprini Hamdiani, Ph.D' },
  { no: 26, course: 'Kimia Dasar - F', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Dr. Maria Ulfa' },
  { no: 27, course: 'Kimia Dasar - G', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Iwan Sumarlan, S.Si., M.Si.' },
  { no: 28, course: 'Kimia Dasar - INTER (2)', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Prof. Hendri Sake Tira, ST, MT, PhD' },
  { no: 29, course: 'Kimia Dasar - INTER (2)', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Maulida Septiyana, S.Si., M.Si.' },
  { no: 30, course: 'Pancasila - A', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Allan Mustafa Umami, S.H., M.Kn.' },
  { no: 31, course: 'Pancasila - B', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Zahratul\'ain Taufik, SH., MH.' },
  { no: 32, course: 'Pancasila - C', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 33, course: 'Pancasila - INTER', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Djul Fikry Budiman, ST., MT.' },
  { no: 34, course: 'Dasar Teknologi Informasi - A', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Prof. Dr. Ir. Misbahuddin, ST., MT. IPU' },
  { no: 35, course: 'Dasar Teknologi Informasi - B', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'M.Rivaldi Harjian' },
  { no: 36, course: 'Dasar Teknologi Informasi - C', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 37, course: 'Dasar Teknologi Informasi - INTER', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Heri Wijayanto, ST, MSC, PhD' },
  { no: 38, course: 'Dasar Teknologi Informasi - INTER', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Wirarama Wedhaswara, ST, MT, PhD' },
  { no: 39, course: 'Rangkaian Logika - A', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 40, course: 'Rangkaian Logika - B', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 41, course: 'Rangkaian Logika - C', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 42, course: 'Rangkaian Logika - INTER', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Djul Fikry Budiman, ST., MT.' },
  { no: 43, course: 'Praktikum Rangkaian Logika (Koordinator)', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 44, course: 'Praktikum Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 45, course: 'Praktikum Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Djul Fikry Budiman, ST., MT.' },
  { no: 46, course: 'Praktikum Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 47, course: 'Praktikum Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Supriono, ST., MT.' },
  { no: 48, course: 'Praktikum Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'I', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 49, course: 'Bahasa Inggris - A', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Siti Sumarti, M.Hum.' },
  { no: 50, course: 'Bahasa Inggris - B', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 51, course: 'Bahasa Inggris - C', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 52, course: 'Bahasa Inggris - INTER', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 53, course: 'Aljabar Linier - A', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 54, course: 'Aljabar Linier - B', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Sultan, ST., MT.' },
  { no: 55, course: 'Aljabar Linier - C', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 56, course: 'Aljabar Linier - INTER', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Supriono, ST., MT.' },
  { no: 57, course: 'Rangkaian Listrik II - A', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 58, course: 'Rangkaian Listrik II - B', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 59, course: 'Rangkaian Listrik II - C', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 60, course: 'Rangkaian Listrik II - INTER', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 61, course: 'Dasar Elektronika - A', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 62, course: 'Dasar Elektronika - B', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Paniran, ST., MT.' },
  { no: 63, course: 'Dasar Elektronika - C', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 64, course: 'Dasar Elektronika - INTER', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 65, course: 'Dasar Tenaga Listrik - A', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 66, course: 'Dasar Tenaga Listrik - B', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Supriyatna, ST., MT.' },
  { no: 67, course: 'Dasar Tenaga Listrik - C', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Sultan, ST., MT.' },
  { no: 68, course: 'Dasar Tenaga Listrik - INTER', sks: '3', wCode: 'WS', semester: 'III', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 69, course: 'Pengukuran & Instrumentasi - A', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 70, course: 'Pengukuran & Instrumentasi - B', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 71, course: 'Pengukuran & Instrumentasi - C', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Sultan, ST., MT.' },
  { no: 72, course: 'Pengukuran & Instrumentasi - INTER', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 73, course: 'Probabilitas dan Statistik', sks: '2', wCode: 'WS', semester: 'III', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 74, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 75, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 76, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 77, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Sultan, ST., MT.' },
  { no: 78, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 79, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 80, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 81, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 82, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Paniran, ST., MT.' },
  { no: 83, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 84, course: 'Praktikum Pengukuran dan Instrumentasi', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Muhamad Syamsu Iqbal, ST., MT., Ph.D.' },
  { no: 85, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 86, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 87, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 88, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 89, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 90, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 91, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 92, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Sultan, ST., MT.' },
  { no: 93, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 94, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Supriyatna, ST., MT.' },
  { no: 95, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 96, course: 'Praktikum Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'III', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 97, course: 'Lingkungan dan etika Rekayasa', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Djul Fikry Budiman, ST., MT.' },
  { no: 98, course: 'Literasi Abad 21', sks: '2', wCode: 'WS', semester: 'V', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 99, course: 'Sistem Kontrol - A', sks: '3', wCode: 'WS', semester: 'V', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 100, course: 'Sistem Kontrol - B', sks: '3', wCode: 'WS', semester: 'V', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 101, course: 'Sistem Kontrol - C', sks: '3', wCode: 'WS', semester: 'V', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 102, course: 'Sistem Kontrol - INTER', sks: '3', wCode: 'WS', semester: 'V', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 103, course: 'Sistem Kendali', sks: '4', wCode: 'WS', semester: 'V', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 104, course: 'Analisis Sistem Tenaga I - A', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 105, course: 'Analisis Sistem Tenaga I - B', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Supriono, ST., MT.' },
  { no: 106, course: 'Analisis Sistem Tenaga I - INTER', sks: '3', wCode: 'WST', semester: 'V', lecturer: 'Dr.Ir. Rosmaliati, ST., MT.' },
  { no: 107, course: 'Transmisi Tenaga Listrik A', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 108, course: 'Transmisi Tenaga Listrik B', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 109, course: 'Transmisi Tenaga Listrik - INTER', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'M.Rivaldi Harjian' },
  { no: 110, course: 'Konversi Energi Hidro-Thermal - A', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 111, course: 'Konversi Energi Hidro-Thermal - B', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 112, course: 'Konversi Energi Hidro-Thermal - INTER', sks: '3', wCode: 'WST', semester: 'V', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 113, course: 'Mesin-Mesin Listrik - A', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 114, course: 'Mesin-Mesin Listrik - B', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Supriono, ST., MT.' },
  { no: 115, course: 'Mesin-Mesin Listrik - INTER', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 116, course: 'Elektronika Daya - A', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 117, course: 'Elektronika Daya - B', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 118, course: 'Elektronika Daya - C', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'Dr.Ir. Rosmaliati, ST., MT.' },
  { no: 119, course: 'Elektronika Daya - INTER', sks: '2', wCode: 'WST', semester: 'V', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 120, course: 'Praktikum Mesin-Mesin Listrik (koordinator)', sks: '1', wCode: 'WST', semester: 'V', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 121, course: 'Praktikum Mesin-Mesin Listrik', sks: '1', wCode: 'WST', semester: 'V', lecturer: 'Supriono, ST., MT.' },
  { no: 122, course: 'Praktikum Elektronika Daya (koordinator)', sks: '1', wCode: 'WST', semester: 'V', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 123, course: 'Praktikum Elektronika Daya', sks: '1', wCode: 'WST', semester: 'V', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 124, course: 'Praktikum Elektronika Daya', sks: '1', wCode: 'WST', semester: 'V', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 125, course: 'Praktikum Elektronika Daya', sks: '1', wCode: 'WST', semester: 'V', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 126, course: 'Sistem Elektronika Digital', sks: '2', wCode: 'WTE', semester: 'V', lecturer: 'Paniran, ST., MT.' },
  { no: 127, course: 'Sistem Instrumentasi dan Elektronika Industri', sks: '2', wCode: 'WTE', semester: 'V', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 128, course: 'Sistem Telekomunikasi Digital', sks: '2', wCode: 'WTE', semester: 'V', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 129, course: 'Jaringan Telekomunikasi', sks: '2', wCode: 'WTE', semester: 'V', lecturer: 'Abdullah Zainuddin, ST., MT.' },
  { no: 130, course: 'Rekayasa Trafik', sks: '2', wCode: 'WTE', semester: 'V', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 131, course: 'Transmisi Dan Perambatan Gelombang', sks: '2', wCode: 'WTE', semester: 'V', lecturer: 'Abdullah Zainuddin, ST., MT.' },
  { no: 132, course: 'Matematika Diskrit', sks: '2', wCode: 'WK', semester: 'V', lecturer: 'Budi Irmawati, Skom, MT, PhD' },
  { no: 133, course: 'Basis Data', sks: '01.05', wCode: 'WK', semester: 'V', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 134, course: 'Basis Data', sks: '01.05', wCode: 'WK', semester: 'V', lecturer: 'Wirarama Wedhaswara, ST, MT, PhD' },
  { no: 135, course: 'Rekayasa Perangkat Lunak', sks: '2', wCode: 'WK', semester: 'V', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 136, course: 'Pemrograman Berorientasi Objek', sks: '2', wCode: 'WK', semester: 'V', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 137, course: 'Sistem Operasi', sks: '2', wCode: 'WK', semester: 'V', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 138, course: 'Praktikum Sistem Mikroprosessor', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 139, course: 'Praktikum Sistem Mikroprosessor', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Supriono, ST., MT.' },
  { no: 140, course: 'Praktikum Sistem Kontrol', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 141, course: 'Praktikum Sistem Kontrol', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 142, course: 'Praktikum Sistem Kontrol', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 143, course: 'Praktikum Sistem Kontrol', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Supriono, ST., MT.' },
  { no: 144, course: 'Praktikum Sistem Kontrol', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Paniran, ST., MT.' },
  { no: 145, course: 'Praktikum Sistem Kontrol', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Djul Fikry Budiman, ST., MT.' },
  { no: 146, course: 'Praktikum Sistem Kontrol', sks: '1', wCode: 'WS', semester: 'V', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 147, course: 'Proses Stokastik', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Muhamad Syamsu Iqbal, ST., MT., Ph.D.' },
  { no: 148, course: 'Manajemen Operasi Sistem Tenaga Listrik - A', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 149, course: 'Manajemen Operasi Sistem Tenaga Listrik - B', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 150, course: 'Proteksi Sistem Tenaga Listrik - A', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'Supriyatna, ST., MT.' },
  { no: 151, course: 'Proteksi Sistem Tenaga Listrik - B', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 152, course: 'Kualitas Daya Listrik - A', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 153, course: 'Kualitas Daya Listrik - B', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'Dr.Ir. Rosmaliati, ST., MT.' },
  { no: 154, course: 'Teknik Tegangan Tinggi - A', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 155, course: 'Teknik Tegangan Tinggi - B', sks: '2', wCode: 'WST', semester: 'VII', lecturer: 'Supriono, ST., MT.' },
  { no: 156, course: 'Perancangan Sistem Elektronika', sks: '2', wCode: 'WTE', semester: 'VII', lecturer: 'Paniran, ST., MT.' },
  { no: 157, course: 'Sistem Elektronika Terintegrasi', sks: '2', wCode: 'WTE', semester: 'VII', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 158, course: 'Antena', sks: '2', wCode: 'WTE', semester: 'VII', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 159, course: 'Pengukuran Sistem Telekomunikasi', sks: '2', wCode: 'WTE', semester: 'VII', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 160, course: 'Keamanan Sistem Informasi', sks: '2', wCode: 'WK', semester: 'VII', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 161, course: 'Teknologi Cloud Computing', sks: '2', wCode: 'WK', semester: 'VII', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 162, course: 'Teknologi IoT', sks: '2', wCode: 'WK', semester: 'VII', lecturer: 'Prof. Dr. Ir. Misbahuddin, ST., MT. IPU' },
  { no: 163, course: 'Praktikum IoT', sks: '1', wCode: 'WK', semester: 'VII', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 164, course: 'Praktikum Algoritma dan Struktur Data', sks: '1', wCode: 'WK', semester: 'VII', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 165, course: 'Perancangan Proyek - A', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Prof. Dr. Ir. Misbahuddin, ST., MT. IPU' },
  { no: 166, course: 'Perancangan Proyek - B', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Muhamad Syamsu Iqbal, ST., MT., Ph.D.' },
  { no: 167, course: 'Perancangan Proyek - C', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 168, course: 'Perancangan Proyek - D', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Dr.Ir. Rosmaliati, ST., MT.' },
  { no: 169, course: 'Pra Tugas Akhir - E', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 170, course: 'Pra Tugas Akhir - F', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Abdullah Zainuddin, ST., MT.' },
  { no: 171, course: 'Pra Tugas Akhir - G', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 172, course: 'Keselamatan Dan Kesehatan Kerja', sks: '2', wCode: 'PST', semester: 'VII', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 173, course: 'Sistem SCADA', sks: '2', wCode: 'PST', semester: 'VII', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 174, course: 'Keandalan SistemTenaga Listrik', sks: '2', wCode: 'PST', semester: 'VII', lecturer: 'Supriyatna, ST., MT.' },
  { no: 175, course: 'Optoelektronika', sks: '2', wCode: 'PE', semester: 'VII', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 176, course: 'Telekomunikasi Gelombang Mikro', sks: '2', wCode: 'PT', semester: 'VII', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 177, course: 'Telekomunikasi Bergerak', sks: '2', wCode: 'PT', semester: 'VII', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 178, course: 'Telekomunikasi Satelit', sks: '2', wCode: 'PT', semester: 'VII', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 179, course: 'Data Engineering', sks: '2', wCode: 'PTK', semester: 'VII', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 180, course: 'Keamanan Jaringan Komputer', sks: '2', wCode: 'PTK', semester: 'VII', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 181, course: 'Proyek Perangkat lunak', sks: '2', wCode: 'PTK', semester: 'VII', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 182, course: 'AIoT Cerdas', sks: '2', wCode: 'WTK', semester: 'VII', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 183, course: 'Teknik Kendali Digital', sks: '2', wCode: 'PE', semester: 'VII', lecturer: 'Syafarudin Ch, ST., MT.' },
];

// RAW GENAP DATA (209 ROWS VERBATIM FROM USER SOURCE OF TRUTH)
export const RAW_GENAP_DATA: { no: number; course: string; sks: string; wCode: string; semester: string; lecturer: string }[] = [
  { no: 1, course: 'Dasar Pemrograman - A', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ir. Misbahuddin, ST., MT., IPU.' },
  { no: 2, course: 'Dasar Pemrograman - B', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 3, course: 'Dasar Pemrograman - C', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 4, course: 'Dasar Pemrograman - D', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 5, course: 'Dasar Pemrograman - INTER', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Dr. Eng. Budi Irmawati, Skom, MT' },
  { no: 6, course: 'Probabilitas dan Statistik - B', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 7, course: 'Probabilitas dan Statistik - A', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 8, course: 'Probabilitas dan Statistik - C', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Paniran, ST., MT.' },
  { no: 9, course: 'Probabilitas dan Statistik - D', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 10, course: 'Probabilitas dan Statistik -INTER', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Muhammad Rivaldi Harjian, ST., MT' },
  { no: 11, course: 'Dasar Telekomunikasi - A', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 12, course: 'Dasar Telekomunikasi - B', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Djul Fikry  Budiman, ST., MT.' },
  { no: 13, course: 'Dasar Telekomunikasi - C', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Ir. Muhamad Syamsu Iqbal, ST., MT., Ph.D.' },
  { no: 14, course: 'Dasar Telekomunikasi - D', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 15, course: 'Dasar Telekomunikasi - INTER', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 16, course: 'Fisika II - A', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 17, course: 'Fisika II - B', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 18, course: 'Fisika II - C', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 19, course: 'Fisika II - D', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 20, course: 'Fisika II - INTER', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 21, course: 'Kalkulus II - A', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 22, course: 'Kalkulus II - B', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 23, course: 'Kalkulus II - C', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 24, course: 'Kalkulus II - D', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 25, course: 'Kalkulus II - INTER', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 26, course: 'Rangkaian Listrik I - A', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 27, course: 'Rangkaian Listrik I - B', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 28, course: 'Rangkaian Listrik I – C', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 29, course: 'Rangkaian Listrik I – D', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 30, course: 'Rangkaian Listrik I – INTER', sks: '3', wCode: 'WS', semester: 'II', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 31, course: 'Pembangunan Karakter - A', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 32, course: 'Pembangunan Karakter - B', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Supriyatna, ST., MT.' },
  { no: 33, course: 'Pembangunan Karakter - C', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 34, course: 'Pembangunan Karakter - D', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 35, course: 'Pembangunan Karakter - INTER', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ir. Rosmaliati, ST., MT.' },
  { no: 36, course: 'Sistem Mikroprosesor - A', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 37, course: 'Sistem Mikroprosesor - B', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Djul Fikry  Budiman, ST., MT.' },
  { no: 38, course: 'Sistem Mikroprosesor - C', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 39, course: 'Sistem Mikroprosesor - D', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 40, course: 'Sistem Mikroprosesor -INTER', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Dr.Eng. I Gde Putu Wirarama Wedashwara Wirawan ST., MT.' },
  { no: 41, course: 'Sistem Mikroprosesor -INTER', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 42, course: 'Sinyal dan Sistem - A', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 43, course: 'Sinyal dan Sistem - B', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 44, course: 'Sinyal dan Sistem - C', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 45, course: 'Sinyal dan Sistem - D', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 46, course: 'Sinyal dan Sistem - INTER', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 47, course: 'Ekonomi Teknik - A', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 48, course: 'Ekonomi Teknik - B', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Sultan, ST., MT.' },
  { no: 49, course: 'Ekonomi Teknik - C', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 50, course: 'Ekonomi Teknik - C', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Heri Wijayanto, ST, MT, PhD' },
  { no: 51, course: 'Ekonomi Teknik - D', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 52, course: 'Ekonomi Teknik - INTER', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. Rosmaliati, ST., MT.' },
  { no: 53, course: 'Matematika Teknik II - A', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 54, course: 'Matematika Teknik II - B', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 55, course: 'Matematika Teknik II – C', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Supriono, ST., MT.' },
  { no: 56, course: 'Matematika Teknik II – D', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 57, course: 'Matematika Teknik II – INTER', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 58, course: 'Elektromagnetika - A', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Muhammad Rivaldi Harjian, ST., MT' },
  { no: 59, course: 'Elektromagnetika - B', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 60, course: 'Elektromagnetika - C', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Supriono, ST., MT.' },
  { no: 61, course: 'Elektromagnetika - D', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Abdullah Zainuddin, ST., MT.' },
  { no: 62, course: 'Elektromagnetika - INTER', sks: '3', wCode: 'WS', semester: 'IV', lecturer: 'Dr. rer. nat. Teti Zubaidah, ST., MT.' },
  { no: 63, course: 'Metode Numerik - A', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 64, course: 'Metode Numerik - B', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Paniran, ST., MT.' },
  { no: 65, course: 'Metode Numerik - C', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 66, course: 'Metode Numerik - D', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 67, course: 'Metode Numerik - INTER', sks: '2', wCode: 'WS', semester: 'IV', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 68, course: 'Analisa Sistem Tenaga Listrik  II - A', sks: '2', wCode: 'WST', semester: 'VI', lecturer: 'Dr. Ir. Rosmaliati, ST., MT.' },
  { no: 69, course: 'Analisa Sistem Tenaga Listrik  II - B', sks: '2', wCode: 'WST', semester: 'VI', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 70, course: 'Konversi Energi Terbarukan - A', sks: '2', wCode: 'WST', semester: 'VI', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 71, course: 'Konversi Energi Terbarukan - B', sks: '2', wCode: 'WST', semester: 'VI', lecturer: 'Dr. Ir. Rosmaliati, ST., MT.' },
  { no: 72, course: 'Sistem Distribusi Modern - A', sks: '2', wCode: 'WST', semester: 'VI', lecturer: 'Supriyatna, ST., MT.' },
  { no: 73, course: 'Sistem Distribusi Modern - B', sks: '2', wCode: 'WST', semester: 'VI', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 74, course: 'Perencanaan Instalasi Listrik - A', sks: '3', wCode: 'WST', semester: 'VI', lecturer: 'Sultan, ST., MT.' },
  { no: 75, course: 'Perencanaan Instalasi Listrik - B', sks: '3', wCode: 'WST', semester: 'VI', lecturer: 'Supriyatna, ST., MT.' },
  { no: 76, course: 'Gejala Medan Tinggi', sks: '2', wCode: 'PST', semester: 'VI', lecturer: 'Dr. rer. nat. Teti Zubaidah, ST., MT.' },
  { no: 77, course: 'Gardu Induk & Pentanahan STL', sks: '2', wCode: 'PST', semester: 'VI', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 78, course: 'Pemilihan & Peng. Motor Listrik (PPML)', sks: '2', wCode: 'PST', semester: 'VI', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 79, course: 'Distributed Generation (DG)- A', sks: '2', wCode: 'PST', semester: 'VI', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 80, course: 'Distributed Generation (DG)- B', sks: '2', wCode: 'PST', semester: 'VI', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 81, course: 'Eksplorasi & Utilisasi Energi Geotermal', sks: '2', wCode: 'PST', semester: 'VI', lecturer: 'Dr. rer. nat. Teti Zubaidah, ST., MT.' },
  { no: 82, course: 'Perencanaan Energi', sks: '2', wCode: 'PST', semester: 'VI', lecturer: 'Dr. Ir. Rosmaliati, ST., MT.' },
  { no: 83, course: 'Pengolahan Sinyal Digital - A', sks: '3', wCode: 'WE,WT', semester: 'VI', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 84, course: 'Pengolahan Sinyal Digital - B', sks: '3', wCode: 'WE,WT', semester: 'VI', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 85, course: 'Elektronika Analog', sks: '2', wCode: 'WE', semester: 'VI', lecturer: 'Paniran, ST., MT.' },
  { no: 86, course: 'Programable Logic Control', sks: '2', wCode: 'WE,PST', semester: 'VI', lecturer: 'Paniran, ST., MT.' },
  { no: 87, course: 'Mekatronika', sks: '2', wCode: 'WE', semester: 'VI', lecturer: 'Paniran, ST., MT.' },
  { no: 88, course: 'Tek Antarmuka & Sist.Tertanam', sks: '3', wCode: 'WE', semester: 'VI', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 89, course: 'Tek Antarmuka & Sist.Tertanam - B', sks: '3', wCode: 'WE', semester: 'VI', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 90, course: 'Instrumentasi Geo-Elektromagetika', sks: '2', wCode: 'PE', semester: 'VI', lecturer: 'Paniran, ST., MT.' },
  { no: 91, course: 'Trans & Perambatan Gelombang', sks: '3', wCode: 'WT', semester: 'VI', lecturer: 'Abdullah Zainuddin, ST., MT.' },
  { no: 92, course: 'Elektronika Telekomunikasi', sks: '3', wCode: 'WT', semester: 'VI', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 93, course: 'Komdat dan Jaringan Komputer', sks: '3', wCode: 'WT,WTK', semester: 'VI', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 94, course: 'Deep Neural Network', sks: '2', wCode: 'PT', semester: 'VI', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 95, course: 'Radar dan sensor Jarak jauh', sks: '2', wCode: 'PT', semester: 'VI', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 96, course: 'Pengolahan Citra Digital', sks: '2', wCode: 'PT,PE', semester: 'VI', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 97, course: 'Organisasi & Arsitektur Komputer', sks: '2', wCode: 'WTK', semester: 'VI', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 98, course: 'Algoritma & Struktur Data', sks: '2', wCode: 'WTK,PE', semester: 'VI', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 99, course: 'Kecerdasan Artifisial', sks: '2', wCode: 'WTK,PE', semester: 'VI', lecturer: 'Dr. Ir. Misbahuddin, ST., MT., IPU.' },
  { no: 100, course: 'Pemrograman Web & Mobile', sks: '2', wCode: 'WTK', semester: 'VI', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 101, course: 'Telekomunikasi IoT Nirkabel', sks: '2', wCode: 'PTK', semester: 'VI', lecturer: 'Dr. Ir. Misbahuddin, ST., MT., IPU.' },
  { no: 102, course: 'Teknik Pengembangan Game', sks: '2', wCode: 'PTK', semester: 'VI', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 103, course: 'Machine Learning', sks: '2', wCode: 'PTK', semester: 'VI', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 104, course: 'Technopreneurship - A', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 105, course: 'Technopreneurship - B', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 106, course: 'Technopreneurship - B', sks: '0', wCode: 'WS', semester: 'VIII', lecturer: 'Sultan, ST., MT.' },
  { no: 107, course: 'Technopreneurship - C', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 108, course: 'Technopreneurship - D', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 109, course: 'Lingk. dan Etika Rekayasa - A', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: 'Supriyatna, ST., MT.' },
  { no: 110, course: 'Lingk. dan Etika Rekayasa - B', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 111, course: 'Lingk. dan Etika Rekayasa - C', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: 'Dr. Ir. Rosmaliati, ST., MT.' },
  { no: 112, course: 'Pra Tugas Akhir - A', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Ir. Muhamad Syamsu Iqbal, ST., MT., Ph.D.' },
  { no: 113, course: 'Pra Tugas Akhir - B', sks: '2', wCode: 'WS', semester: 'VII', lecturer: 'Dr. Ir. Misbahuddin, ST., MT., IPU.' },
  { no: 114, course: 'Kewarganegaraan - A', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: '"	Ika Yuliana Susilawati, SH., MH. "' },
  { no: 115, course: 'Kewarganegaraan - B', sks: '2', wCode: 'WS', semester: 'VIII', lecturer: '"	Ika Yuliana Susilawati, SH., MH. "' },
  { no: 116, course: 'Fisika I', sks: '2', wCode: 'WS', semester: 'I', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 117, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 118, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Paniran, ST., MT.' },
  { no: 119, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 120, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 121, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Supriono, ST., MT.' },
  { no: 122, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 123, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 124, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 125, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 126, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Djul Fikry  Budiman, ST., MT.' },
  { no: 127, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 128, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 129, course: 'Prak. Rangkaian Logika', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Muhammad Rivaldi Harjian, ST., MT' },
  { no: 130, course: 'Prak. Dasar Pemrograman', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 131, course: 'Prak. Dasar Pemrograman', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 132, course: 'Prak. Dasar Pemrograman', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Dr. Ir. Misbahuddin, ST., MT., IPU.' },
  { no: 133, course: 'Prak. Dasar Pemrograman', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 134, course: 'Prak. Dasar Pemrograman', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 135, course: 'Prak. Dasar Pemrograman', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 136, course: 'Prak. Dasar Pemrograman', sks: '1', wCode: 'WS', semester: 'II', lecturer: 'Djul Fikry  Budiman, ST., MT.' },
  { no: 137, course: 'Prak. Dasar Pemrograman', sks: '2', wCode: 'WS', semester: 'II', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 138, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 139, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 140, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 141, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Supriyatna, ST., MT.' },
  { no: 142, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 143, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 144, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Sultan, ST., MT.' },
  { no: 145, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 146, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 147, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'I Nyoman Wahyu Satiawan., ST., MSc., Ph.D.' },
  { no: 148, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 149, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 150, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 151, course: 'Prak. Rangkaian Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 152, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 153, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Paniran, ST., MT.' },
  { no: 154, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 155, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 156, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Supriono, ST., MT.' },
  { no: 157, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 158, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 159, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 160, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 161, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Djul Fikry  Budiman, ST., MT.' },
  { no: 162, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 163, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 164, course: 'Prak. Dasar Elektronika', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Muhammad Rivaldi Harjian, ST., MT' },
  { no: 165, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Sabar Nababan, ST., MT.' },
  { no: 166, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Sultan, ST., MT.' },
  { no: 167, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Supriono, ST., MT.' },
  { no: 168, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 169, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 170, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Ketut Wiryajati,ST.,MT.,IPU.,ASEAN.Eng.' },
  { no: 171, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ida Ayu Sri Adnyani, ST., M.Erg.' },
  { no: 172, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ir. Ni Made Seniari, ST., MT.' },
  { no: 173, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ida Bagus Fery Citarsa, ST., MT.' },
  { no: 174, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 175, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 176, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 177, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Muhammad Rivaldi Harjian, ST., MT' },
  { no: 178, course: 'Prak. Dasar Tenaga Listrik', sks: '1', wCode: 'WS', semester: 'IV', lecturer: 'Supriyatna, ST., MT.' },
  { no: 179, course: 'Prak. Analisis Sistem Tenaga', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Sultan, ST., MT.' },
  { no: 180, course: 'Prak. Analisis Sistem Tenaga', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Ir. I Made Ari Nrartha, ST., MT.' },
  { no: 181, course: 'Prak. Analisis Sistem Tenaga', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Dr. Ir. I Made Ginarsa, ST., MT., IPU' },
  { no: 182, course: 'Prak. Analisis Sistem Tenaga', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Dr. Ir. Rosmaliati, ST., MT.' },
  { no: 183, course: 'Prak. Analisis Sistem Tenaga', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 184, course: 'Prak. Analisis Sistem Tenaga', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Supriyatna, ST., MT.' },
  { no: 185, course: 'Prak. Analisis Sistem Tenaga', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Muhammad Rivaldi Harjian, ST., MT' },
  { no: 186, course: 'Prak. Transmisi & Distribusi', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Sultan, ST., MT.' },
  { no: 187, course: 'Prak. Transmisi & Distribusi', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Supriyatna, ST., MT.' },
  { no: 188, course: 'Prak. Transmisi & Distribusi', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Abdul Natsir, ST., MT.' },
  { no: 189, course: 'Prak. Transmisi & Distribusi', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Ir. Agung Budi Muljono, ST., MT., IPU' },
  { no: 190, course: 'Prak. Transmisi & Distribusi', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'I Ketut Perdana Putra, ST., MT.' },
  { no: 191, course: 'Prak. Transmisi & Distribusi', sks: '1', wCode: 'WST', semester: 'VI', lecturer: 'Muhammad Rivaldi Harjian, ST., MT' },
  { no: 192, course: 'Prak. Elektronika Lanjut', sks: '1', wCode: 'WE', semester: 'VI', lecturer: 'Paniran, ST., MT.' },
  { no: 193, course: 'Prak. Elektronika Lanjut', sks: '1', wCode: 'WE', semester: 'VI', lecturer: 'Syafarudin Ch, ST., MT.' },
  { no: 194, course: 'Prak. Pengolahan Sinyal Digital', sks: '1', wCode: 'WE', semester: 'VI', lecturer: 'Budi Darmawan, ST., M.Eng.' },
  { no: 195, course: 'Prak. Pengolahan Sinyal Digital', sks: '1', wCode: 'WE', semester: 'VI', lecturer: 'I Made Budi Suksmadana, ST., MT.' },
  { no: 196, course: 'Prak. Jaringan Telekomunikasi', sks: '1', wCode: 'WT', semester: 'VI', lecturer: 'Bulkis Kanata, ST., MT.' },
  { no: 197, course: 'Prak. Jaringan Telekomunikasi', sks: '1', wCode: 'WT', semester: 'VI', lecturer: 'Made Sutha Yadnya, ST., MT.' },
  { no: 198, course: 'Prak. Sistem Telekomunikasi', sks: '1', wCode: 'WT', semester: 'VI', lecturer: 'Djul Fikry  Budiman, ST., MT.' },
  { no: 199, course: 'Prak. Sistem Telekomunikasi', sks: '1', wCode: 'WT', semester: 'VI', lecturer: 'Sudi M. Al Sasongko, ST., MT.' },
  { no: 200, course: 'Prak. Sistem Telekomunikasi', sks: '1', wCode: 'WT', semester: 'VI', lecturer: 'Cahyo Mustiko O. M., ST., MSc., Ph.D.' },
  { no: 201, course: 'Prak. PBO', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Dr. Ir. Misbahuddin, ST., MT., IPU.' },
  { no: 202, course: 'Prak. PBO', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'A. Sjamsjiar Rachman, ST., MT.' },
  { no: 203, course: 'Prak. PBO', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 204, course: 'Prak. Algoritma & Struktur Data', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 205, course: 'Prak. Algoritma & Struktur Data', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 206, course: 'Prak. Algoritma & Struktur Data', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Cipta Ramadhani, ST., M.Eng' },
  { no: 207, course: 'Prak. Jaringan Komputer', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Lalu A. Syamsul Irfan Akbar, ST., M.Eng.' },
  { no: 208, course: 'Prak. Jaringan Komputer', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Giri Wahyu Wiriasto, ST., MT.' },
  { no: 209, course: 'Prak. Jaringan Komputer', sks: '1', wCode: 'WTK', semester: 'VI', lecturer: 'Dr. Ir. Misbahuddin, ST., MT., IPU.' },
];

export function buildMasterLecturerDataset(): MasterLecturerAssignment[] {
  const result: MasterLecturerAssignment[] = [];

  // Ganjil
  RAW_GANJIL_DATA.forEach((raw) => {
    const { section, baseName } = extractSectionAndBaseName(raw.course);
    const { normalizedName, isCoordinator } = normalizeLecturerName(raw.lecturer);
    const semNum = parseSemesterRoman(raw.semester);
    const effSks = parseEffectiveSks(raw.sks);
    const isPrk = /prak\.|praktikum/i.test(raw.course);
    const isKkn = (raw.course || '').trim().toUpperCase() === 'KKN';
    const resolved = resolveLecturerFromMaster(raw.lecturer);

    const rowId = `src-ganjil-${raw.no}`;
    result.push({
      id: rowId,
      source_row_id: rowId,
      academic_period: 'GANJIL',
      academicPeriod: 'GANJIL',
      raw_no: raw.no,
      raw_course_name: raw.course,
      rawCourseName: raw.course,
      raw_sks: raw.sks,
      rawSks: raw.sks,
      effective_sks: effSks,
      raw_w_code: raw.wCode,
      codeW: raw.wCode,
      source_semester: raw.semester,
      semester: raw.semester,
      raw_lecturer_name: raw.lecturer,
      rawLecturerName: raw.lecturer,
      is_coordinator: isCoordinator,
      section,
      base_course_name: baseName,
      normalized_course_name: baseName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      normalizedCourseName: baseName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      normalized_lecturer_name: normalizedName,
      normalizedLecturerName: normalizedName,
      semester_num: semNum,
      is_practicum: isPrk,
      is_kkn: isKkn,
      lecturer_code: resolved.lecturerCode,
      lecturer_id: resolved.lecturerId,
      lecturerId: resolved.lecturerId,
      sourceType: 'embedded_master',
      manualOverride: false,
    });
  });

  // Genap
  RAW_GENAP_DATA.forEach((raw) => {
    const { section, baseName } = extractSectionAndBaseName(raw.course);
    const { normalizedName, isCoordinator } = normalizeLecturerName(raw.lecturer);
    const semNum = parseSemesterRoman(raw.semester);
    const effSks = parseEffectiveSks(raw.sks);
    const isPrk = /prak\.|praktikum/i.test(raw.course);
    const isKkn = (raw.course || '').trim().toUpperCase() === 'KKN';
    const resolved = resolveLecturerFromMaster(raw.lecturer);

    const rowId = `src-genap-${raw.no}`;
    result.push({
      id: rowId,
      source_row_id: rowId,
      academic_period: 'GENAP',
      academicPeriod: 'GENAP',
      raw_no: raw.no,
      raw_course_name: raw.course,
      rawCourseName: raw.course,
      raw_sks: raw.sks,
      rawSks: raw.sks,
      effective_sks: effSks,
      raw_w_code: raw.wCode,
      codeW: raw.wCode,
      source_semester: raw.semester,
      semester: raw.semester,
      raw_lecturer_name: raw.lecturer,
      rawLecturerName: raw.lecturer,
      is_coordinator: isCoordinator,
      section,
      base_course_name: baseName,
      normalized_course_name: baseName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      normalizedCourseName: baseName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      normalized_lecturer_name: normalizedName,
      normalizedLecturerName: normalizedName,
      semester_num: semNum,
      is_practicum: isPrk,
      is_kkn: isKkn,
      lecturer_code: resolved.lecturerCode,
      lecturer_id: resolved.lecturerId,
      lecturerId: resolved.lecturerId,
      sourceType: 'embedded_master',
      manualOverride: false,
    });
  });

  return result;
}

export const INITIAL_MASTER_LECTURER_ASSIGNMENTS: MasterLecturerAssignment[] = buildMasterLecturerDataset();

export function validateMasterLecturerDataset(data: MasterLecturerAssignment[] = INITIAL_MASTER_LECTURER_ASSIGNMENTS): MasterLecturerValidationReport {
  const ganjil = data.filter((d) => d.academic_period === 'GANJIL');
  const genap = data.filter((d) => d.academic_period === 'GENAP');

  const expectedGanjil = 183;
  const expectedGenap = 209;
  const expectedTotal = 392;

  const totalSourceRows = data.length;
  const ganjilRows = ganjil.length;
  const genapRows = genap.length;

  const skippedCount = Math.max(0, expectedTotal - totalSourceRows);
  const missingCount = (expectedGanjil - ganjilRows) + (expectedGenap - genapRows);
  const modifiedCount = 0;

  const uniqueCourses = new Set(data.map((d) => d.raw_course_name));
  const uniqueLecturers = new Set(data.map((d) => d.raw_lecturer_name).filter((l) => Boolean(l && l.trim())));

  const courseCounts = new Map<string, number>();
  data.forEach((d) => {
    const key = `${d.academic_period}__${d.raw_course_name}`;
    courseCounts.set(key, (courseCounts.get(key) || 0) + 1);
  });
  let multipleLecturerRowsCount = 0;
  courseCounts.forEach((count) => {
    if (count > 1) multipleLecturerRowsCount += count;
  });

  const practicumRowsCount = data.filter((d) => d.is_practicum).length;
  const kknRowsCount = data.filter((d) => d.is_kkn).length;

  return {
    totalSourceRows,
    ganjilRows,
    genapRows,
    expectedTotal,
    expectedGanjil,
    expectedGenap,
    skippedCount,
    missingCount,
    modifiedCount,
    isValid: ganjilRows === expectedGanjil && genapRows === expectedGenap && totalSourceRows === expectedTotal,
    uniqueCoursesCount: uniqueCourses.size,
    uniqueLecturersCount: uniqueLecturers.size,
    multipleLecturerRowsCount,
    practicumRowsCount,
    kknRowsCount,
  };
}
