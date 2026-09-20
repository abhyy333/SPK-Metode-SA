import {
  Course,
  CourseCategory,
  KBK,
  CurriculumPackage,
  CourseOffering,
  Curriculum,
  PackageType,
  ClassificationStatus,
  ElectiveSlot,
  CoursePackageItem,
} from '../types';

export const INITIAL_CURRICULA: Curriculum[] = [
  {
    id: 'curr-2022',
    year: 2022,
    name: 'Kurikulum 2022 (OBE)',
    description: 'Kurikulum Outcome-Based Education (OBE) S1 Teknik Elektro Universitas Mataram tahun 2022.',
    requiredGraduationCredits: 146,
    notes: [
      'Target kelulusan kurikulum 2022: 146 SKS',
      'Mata kuliah pilihan dari 10 SKS ambil nilai tertinggi dari 8 SKS',
      'Khusus Kurikulum 2022, data peminatan historis memiliki 4 bidang: Sistem Tenaga Listrik, Komputer, Telekomunikasi, dan Elektronika',
    ],
    isActive: true,
  },
  {
    id: 'curr-2026',
    year: 2026,
    name: 'Kurikulum 2026',
    description: 'Kurikulum terbaru S1 Teknik Elektro Universitas Mataram tahun 2026 dengan penguatan kompetensi integratif dan fleksibilitas peminatan 3 KBK.',
    requiredGraduationCredits: 144,
    notes: [
      'Target kelulusan kurikulum 2026: 144 SKS',
      'Komunikasi Data dan Jaringan Komputer: Includekan praktikum jarkom (bisa tugas besar)',
      'Variabel kompleks mengakomodir materi metode numerik',
      'Mata kuliah pilihan dari 10 SKS ambil nilai tertinggi dari 8 SKS',
      '3 KBK Aktif: Komputer (KOM), Sistem Tenaga Listrik (STL), Elektronika Digital dan Telekomunikasi (ELKOM)',
    ],
    isActive: true,
  },
];

/**
 * STRUKTUR KBK / KONSENTRASI:
 * Kurikulum 2026 (3 KBK Aktif):
 * 1. Komputer (id: 'kbk-komputer')
 * 2. Sistem Tenaga Listrik (id: 'kbk-stl')
 * 3. Elektronika Digital dan Telekomunikasi (id: 'kbk-elektronika-komunikasi')
 * 
 * Kurikulum 2022 (KBK Historis):
 * - Sistem Tenaga Listrik (id: 'kbk-stl')
 * - Komputer (id: 'kbk-komputer')
 * - Telekomunikasi (id: 'kbk-telekomunikasi-2022')
 * - Elektronika (id: 'kbk-elektronika-2022')
 */
export const INITIAL_KBKS: KBK[] = [
  {
    id: 'kbk-komputer',
    code: 'KOM',
    name: 'Komputer',
    curriculumYear: 'all',
    description: 'Fokus pada Pemrograman, Algoritma, Basis Data, Sistem Komputer, Jaringan Komputer, Kecerdasan Buatan (AI/ML), dan Sains Data.',
    color: '#8b5cf6', // Violet
    isActive: true,
  },
  {
    id: 'kbk-stl',
    code: 'STL',
    name: 'Sistem Tenaga Listrik',
    curriculumYear: 'all',
    description: 'Fokus pada Pembangkitan Energi Listrik, Transmisi & Distribusi Daya, Mesin Listrik, Proteksi & Kualitas Daya, Tegangan Tinggi, dan Energi Terbarukan.',
    color: '#f59e0b', // Amber
    isActive: true,
  },
  {
    id: 'kbk-elektronika-komunikasi',
    code: 'ELKOM',
    name: 'Elektronika Digital dan Telekomunikasi',
    curriculumYear: 2026,
    description: 'Penggabungan Konsentrasi Telekomunikasi dan Elektronika. Fokus pada Sistem Elektronika Digital, Telekomunikasi Nirkabel & Satelit, Gelombang Mikro & Antena, Pengolahan Sinyal Digital, Sistem Tertanam (Embedded/IoT), Sensor & Otomasi Industri.',
    color: '#0284c7', // Sky Blue
    isActive: true,
  },
  {
    id: 'kbk-telekomunikasi-2022',
    code: 'TEL',
    name: 'Telekomunikasi',
    curriculumYear: 2022,
    isHistorical: true,
    description: 'KBK Historis Telekomunikasi untuk mahasiswa Kurikulum 2022 (Fokus pada Jaringan Telekomunikasi, Komunikasi Digital, Antena, dan Propagasi Gelombang).',
    color: '#06b6d4', // Cyan
    isActive: false,
  },
  {
    id: 'kbk-elektronika-2022',
    code: 'EL',
    name: 'Elektronika',
    curriculumYear: 2022,
    isHistorical: true,
    description: 'KBK Historis Elektronika untuk mahasiswa Kurikulum 2022 (Fokus pada Elektronika Digital, Elektronika Industri, Mekatronika, dan Robotika).',
    color: '#10b981', // Emerald
    isActive: false,
  },
];

// 15 MK Pool Pilihan KBK STL Kurikulum 2026
export const STL_2026_ELECTIVE_POOL = [
  { code: 'MKL1077201', name: 'Dinamika dan Stabilitas STL', sks: 2 },
  { code: 'MKL1077202', name: 'Aplikasi Komputer dalam STL', sks: 2 },
  { code: 'MKL1077203', name: 'Distributed Generation (DG)', sks: 2 },
  { code: 'MKL1077204', name: 'Teknologi GI dan Pentanahan Sistem Tenaga', sks: 2 },
  { code: 'MKL1077205', name: 'Pemeliharaan Peralatan Sistem Tenaga', sks: 2 },
  { code: 'MKL1077206', name: 'Perancangan Mesin-Mesin Listrik', sks: 2 },
  { code: 'MKL1077207', name: 'Penggunaan & Pengaturan Mesin Listrik', sks: 2 },
  { code: 'MKL1077208', name: 'Programmable Logic Control (PLC)', sks: 2 },
  { code: 'MKL1077209', name: 'Keandalan Sistem Tenaga Listrik', sks: 2 },
  { code: 'MKL1077210', name: 'Gejala Medan Tinggi', sks: 2 },
  { code: 'MKL1077211', name: 'Sistem SCADA', sks: 2 },
  { code: 'MKL1077212', name: 'Optimasi Sistem Tenaga Listrik Modern', sks: 2 },
  { code: 'MKL1077213', name: 'Perencanaan Energi', sks: 2 },
  { code: 'MKL1077214', name: 'Keselamatan dan Kesehatan Kerja', sks: 2 },
  { code: 'MKL1077215', name: 'Ekplorasi dan Utilisasi Energi Geotermal', sks: 2 },
];

export const INITIAL_ELECTIVE_SLOTS: ElectiveSlot[] = [
  // STL 2026
  {
    id: '2026-stl-s6-elective-1',
    curriculumYear: 2026,
    kbkId: 'kbk-stl',
    packageSemester: 6,
    slotName: 'MK Pilihan I',
    credits: 2,
    courseCode: 'MKL10762XX',
  },
  {
    id: '2026-stl-s7-elective-2',
    curriculumYear: 2026,
    kbkId: 'kbk-stl',
    packageSemester: 7,
    slotName: 'MK Pilihan II',
    credits: 2,
    courseCode: 'MKL10772XX',
    allowedCourseIds: STL_2026_ELECTIVE_POOL.map((c) => `crs-${c.code.toLowerCase()}`),
  },
  {
    id: '2026-stl-s8-elective-3',
    curriculumYear: 2026,
    kbkId: 'kbk-stl',
    packageSemester: 8,
    slotName: 'MK Pilihan III',
    credits: 2,
    courseCode: 'MKL10782XX',
  },
  {
    id: '2026-stl-s8-elective-4',
    curriculumYear: 2026,
    kbkId: 'kbk-stl',
    packageSemester: 8,
    slotName: 'MK Pilihan IV',
    credits: 2,
    courseCode: 'MKL10782XX',
  },

  // STL 2022
  {
    id: '2022-stl-s6-elective-1',
    curriculumYear: 2022,
    kbkId: 'kbk-stl',
    packageSemester: 6,
    slotName: 'MK Pilihan I',
    credits: 2,
    courseCode: 'FBA0001',
  },
  {
    id: '2022-stl-s7-elective-2',
    curriculumYear: 2022,
    kbkId: 'kbk-stl',
    packageSemester: 7,
    slotName: 'MK Pilihan II',
    credits: 2,
    courseCode: 'FBA0002',
  },
  {
    id: '2022-stl-s7-elective-3',
    curriculumYear: 2022,
    kbkId: 'kbk-stl',
    packageSemester: 7,
    slotName: 'MK Pilihan III',
    credits: 2,
    courseCode: null,
    dataWarning: true,
    warningMessage: 'Kode mata kuliah belum tersedia pada dokumen sumber.',
  },
  {
    id: '2022-stl-s8-elective-4',
    curriculumYear: 2022,
    kbkId: 'kbk-stl',
    packageSemester: 8,
    slotName: 'MK Pilihan IV',
    credits: 2,
    courseCode: 'FBA0003',
  },
  {
    id: '2022-stl-s8-elective-5',
    curriculumYear: 2022,
    kbkId: 'kbk-stl',
    packageSemester: 8,
    slotName: 'MK Pilihan V',
    credits: 2,
    courseCode: 'FBA0004',
  },

  // Komputer 2026
  {
    id: '2026-komputer-s7-elective-1',
    curriculumYear: 2026,
    kbkId: 'kbk-komputer',
    packageSemester: 7,
    slotName: 'MK Pilihan I',
    credits: 2,
    courseCode: 'MKL10772XX',
  },
  {
    id: '2026-komputer-s7-elective-2',
    curriculumYear: 2026,
    kbkId: 'kbk-komputer',
    packageSemester: 7,
    slotName: 'MK Pilihan II',
    credits: 2,
    courseCode: 'MKL10772XX',
  },
  {
    id: '2026-komputer-s8-elective-3',
    curriculumYear: 2026,
    kbkId: 'kbk-komputer',
    packageSemester: 8,
    slotName: 'MK Pilihan III',
    credits: 2,
    courseCode: 'MKL10782XX',
  },
  {
    id: '2026-komputer-s8-elective-4',
    curriculumYear: 2026,
    kbkId: 'kbk-komputer',
    packageSemester: 8,
    slotName: 'MK Pilihan IV',
    credits: 2,
    courseCode: 'MKL10782XX',
  },

  // Komputer 2022
  {
    id: '2022-komputer-s7-elective-1',
    curriculumYear: 2022,
    kbkId: 'kbk-komputer',
    packageSemester: 7,
    slotName: 'MK Pilihan I',
    credits: 2,
    courseCode: 'FBD0001',
  },
  {
    id: '2022-komputer-s7-elective-2',
    curriculumYear: 2022,
    kbkId: 'kbk-komputer',
    packageSemester: 7,
    slotName: 'MK Pilihan II',
    credits: 2,
    courseCode: 'FBD0002',
  },
  {
    id: '2022-komputer-s7-elective-3',
    curriculumYear: 2022,
    kbkId: 'kbk-komputer',
    packageSemester: 7,
    slotName: 'Pilihan III',
    credits: 2,
    courseCode: 'FBD0003',
  },
  {
    id: '2022-komputer-s8-elective-4',
    curriculumYear: 2022,
    kbkId: 'kbk-komputer',
    packageSemester: 8,
    slotName: 'Pilihan IV',
    credits: 2,
    courseCode: 'FBD0004',
  },
  {
    id: '2022-komputer-s8-elective-5',
    curriculumYear: 2022,
    kbkId: 'kbk-komputer',
    packageSemester: 8,
    slotName: 'Pilihan V',
    credits: 2,
    courseCode: 'FBD0005',
  },

  // Elektronika Komunikasi 2026
  {
    id: '2026-elkom-s7-elective-1',
    curriculumYear: 2026,
    kbkId: 'kbk-elektronika-komunikasi',
    packageSemester: 7,
    slotName: 'MK Pilihan I',
    credits: 2,
    courseCode: 'MKB1077152',
  },
  {
    id: '2026-elkom-s7-elective-2',
    curriculumYear: 2026,
    kbkId: 'kbk-elektronika-komunikasi',
    packageSemester: 7,
    slotName: 'MK Pilihan II',
    credits: 2,
    courseCode: 'MKL10772XX',
  },
  {
    id: '2026-elkom-s8-elective-3',
    curriculumYear: 2026,
    kbkId: 'kbk-elektronika-komunikasi',
    packageSemester: 8,
    slotName: 'MK Pilihan III',
    credits: 2,
    courseCode: 'MKL10782XX',
  },
  {
    id: '2026-elkom-s8-elective-4',
    curriculumYear: 2026,
    kbkId: 'kbk-elektronika-komunikasi',
    packageSemester: 8,
    slotName: 'MK Pilihan IV',
    credits: 2,
    courseCode: 'MKL10782XX',
  },

  // Telekomunikasi 2022 (Historical)
  {
    id: '2022-tel-s7-elective-1',
    curriculumYear: 2022,
    kbkId: 'kbk-telekomunikasi-2022',
    packageSemester: 7,
    slotName: 'MK Pilihan I',
    credits: 2,
    courseCode: 'FBC0001',
  },
  {
    id: '2022-tel-s7-elective-2',
    curriculumYear: 2022,
    kbkId: 'kbk-telekomunikasi-2022',
    packageSemester: 7,
    slotName: 'MK Pilihan II',
    credits: 2,
    courseCode: 'FBC0002',
  },
  {
    id: '2022-tel-s7-elective-3',
    curriculumYear: 2022,
    kbkId: 'kbk-telekomunikasi-2022',
    packageSemester: 7,
    slotName: 'MK Pilihan III',
    credits: 2,
    courseCode: 'FBC0003',
  },
  {
    id: '2022-tel-s8-elective-4',
    curriculumYear: 2022,
    kbkId: 'kbk-telekomunikasi-2022',
    packageSemester: 8,
    slotName: 'MK Pilihan IV',
    credits: 2,
    courseCode: 'FBC0004',
  },
  {
    id: '2022-tel-s8-elective-5',
    curriculumYear: 2022,
    kbkId: 'kbk-telekomunikasi-2022',
    packageSemester: 8,
    slotName: 'MK Pilihan V',
    credits: 2,
    courseCode: 'FBC0005',
  },

  // Elektronika 2022 (Historical)
  {
    id: '2022-el-s7-elective-1',
    curriculumYear: 2022,
    kbkId: 'kbk-elektronika-2022',
    packageSemester: 7,
    slotName: 'MK Pilihan I',
    credits: 2,
    courseCode: 'FBC0001',
  },
  {
    id: '2022-el-s7-elective-2',
    curriculumYear: 2022,
    kbkId: 'kbk-elektronika-2022',
    packageSemester: 7,
    slotName: 'MK Pilihan II',
    credits: 2,
    courseCode: 'FBC0002',
  },
  {
    id: '2022-el-s7-elective-3',
    curriculumYear: 2022,
    kbkId: 'kbk-elektronika-2022',
    packageSemester: 7,
    slotName: 'MK Pilihan III',
    credits: 2,
    courseCode: 'FBC0003',
  },
  {
    id: '2022-el-s8-elective-4',
    curriculumYear: 2022,
    kbkId: 'kbk-elektronika-2022',
    packageSemester: 8,
    slotName: 'MK Pilihan IV',
    credits: 2,
    courseCode: 'FBC0004',
  },
  {
    id: '2022-el-s8-elective-5',
    curriculumYear: 2022,
    kbkId: 'kbk-elektronika-2022',
    packageSemester: 8,
    slotName: 'MK Pilihan V',
    credits: 2,
    courseCode: 'FBC0005',
  },
];

/**
 * ATURAN KLASIFIKASI KATEGORI KURIKULUM TEKNIK ELEKTRO UNRAM:
 * Jika kode diawali dengan:
 * FBS, MPS, MWU, MWK, MPK -> category = 'Wajib'
 * Selain itu (FBA, FBB, FBC, FBD, ES, MKB, MKL, dll.) -> category = 'Pilihan'
 */
export function classifyCourseCategory(code: string): CourseCategory {
  const upper = (code || '').trim().toUpperCase();
  if (
    upper.startsWith('FBS') ||
    upper.startsWith('MPS') ||
    upper.startsWith('MWU') ||
    upper.startsWith('MWK') ||
    upper.startsWith('MPK')
  ) {
    return 'Wajib';
  }
  return 'Pilihan';
}

export function detectCourseKbk(code: string, name: string): string[] {
  const upperCode = (code || '').trim().toUpperCase();
  const lowerName = (name || '').toLowerCase();
  const matchedKbks = new Set<string>();

  // 1. STL (Sistem Tenaga Listrik)
  if (
    upperCode.startsWith('FBA') ||
    lowerName.includes('tenaga') ||
    lowerName.includes('listrik') ||
    lowerName.includes('stl') ||
    lowerName.includes('geotermal') ||
    lowerName.includes('tegangan tinggi') ||
    lowerName.includes('distribusi') ||
    lowerName.includes('scada') ||
    lowerName.includes('gardu') ||
    lowerName.includes('mesin-mesin') ||
    lowerName.includes('mesin listrik') ||
    lowerName.includes('pembangkit') ||
    lowerName.includes('transmisi') ||
    lowerName.includes('proteksi') ||
    lowerName.includes('kualitas daya') ||
    lowerName.includes('elektronika daya') ||
    lowerName.includes('energi terbarukan')
  ) {
    matchedKbks.add('kbk-stl');
  }

  // 2. KOM (Komputer)
  if (
    upperCode.startsWith('FBD') ||
    lowerName.includes('perangkat lunak') ||
    lowerName.includes('machine learning') ||
    lowerName.includes('artificial intelligence') ||
    lowerName.includes('kecerdasan') ||
    lowerName.includes('game') ||
    lowerName.includes('forensic') ||
    lowerName.includes('basis data') ||
    lowerName.includes('jaringan komputer') ||
    lowerName.includes('cloud') ||
    lowerName.includes('komputasi') ||
    lowerName.includes('pemrograman') ||
    lowerName.includes('algoritma') ||
    lowerName.includes('sistem komputer') ||
    lowerName.includes('sistem informasi') ||
    lowerName.includes('arsitektur komputer') ||
    lowerName.includes('data mining') ||
    lowerName.includes('sistem operasi') ||
    lowerName.includes('diskrit')
  ) {
    matchedKbks.add('kbk-komputer');
  }

  // 3. ELKOM (Elektronika Komunikasi - Merger Telekomunikasi & Elektronika)
  if (
    upperCode.startsWith('FBC') ||
    upperCode.startsWith('FBB') ||
    lowerName.includes('telekomunikasi') ||
    lowerName.includes('satelit') ||
    lowerName.includes('antena') ||
    lowerName.includes('gelombang') ||
    lowerName.includes('propagasi') ||
    lowerName.includes('radio') ||
    lowerName.includes('radar') ||
    lowerName.includes('trafik') ||
    lowerName.includes('elektronika') ||
    lowerName.includes('instrumentasi') ||
    lowerName.includes('kendali') ||
    lowerName.includes('kontrol') ||
    lowerName.includes('biomedika') ||
    lowerName.includes('mekatronika') ||
    lowerName.includes('plc') ||
    lowerName.includes('sensor') ||
    lowerName.includes('optoelektronika') ||
    lowerName.includes('sinyal') ||
    lowerName.includes('komunikasi') ||
    lowerName.includes('nirkabel') ||
    lowerName.includes('mikrokontroler') ||
    lowerName.includes('mikroprosesor') ||
    lowerName.includes('jaringan telekomunikasi')
  ) {
    matchedKbks.add('kbk-elektronika-komunikasi');
  }

  return Array.from(matchedKbks);
}

export function classifyCourseMetadata(
  code: string,
  name: string,
  semester: number,
  curriculumYear: number
): {
  category: CourseCategory;
  subCategory: string;
  kbkIds: string[];
  packageType: PackageType;
  classificationStatus: ClassificationStatus;
  confidenceScore: number;
  classificationReason: string;
} {
  const category = classifyCourseCategory(code);
  const upperCode = (code || '').trim().toUpperCase();
  const detectedKbks = detectCourseKbk(code, name);

  // SubCategory
  let subCategory = 'Pilihan Bebas';
  if (upperCode.startsWith('MWU') || upperCode.startsWith('MWK')) {
    subCategory = 'Wajib Universitas';
  } else if (upperCode.startsWith('FBS')) {
    subCategory = semester <= 4 ? 'Wajib Fakultas' : 'Wajib Program Studi';
  } else if (upperCode.startsWith('MPS') || upperCode.startsWith('MPK')) {
    subCategory = 'Wajib Program Studi';
  } else if (detectedKbks.length > 0) {
    subCategory = category === 'Wajib' ? 'Wajib KBK' : 'Pilihan KBK';
  }

  // Package Type & Status
  let packageType: PackageType = 'common';
  let classificationStatus: ClassificationStatus = 'verified';
  let confidenceScore = 95;
  let classificationReason = '';

  if (semester <= 4) {
    packageType = 'common';
    classificationStatus = 'verified';
    confidenceScore = 98;
    classificationReason = `Mata kuliah Paket Dasar Bersama Semester ${semester} (${category})`;
  } else {
    // Semester 5-8
    if (detectedKbks.length > 1) {
      packageType = 'cross-kbk';
      classificationStatus = 'needs-review';
      confidenceScore = 85;
      classificationReason = 'Mencakup domain lintas bidang keahlian (Komputer / STL / Elkom)';
    } else if (detectedKbks.length === 1) {
      packageType = 'kbk';
      const kbkName = INITIAL_KBKS.find((k) => k.id === detectedKbks[0])?.name || 'KBK Terkait';
      if (upperCode.startsWith('FBA') || upperCode.startsWith('FBD') || upperCode.startsWith('FBC') || upperCode.startsWith('FBB')) {
        classificationStatus = 'verified';
        confidenceScore = 95;
        classificationReason = `Sesuai kode resmi peminatan ${kbkName}`;
      } else {
        classificationStatus = category === 'Wajib' ? 'verified' : 'needs-review';
        confidenceScore = 88;
        classificationReason = `Kandidat bidang keahlian ${kbkName} berdasarkan analisis materi & kurikulum`;
      }
    } else {
      packageType = 'elective';
      classificationStatus = 'needs-review';
      confidenceScore = 60;
      classificationReason = 'Mata kuliah pilihan umum / belum terpetakan ke KBK spesifik';
    }
  }

  return {
    category,
    subCategory,
    kbkIds: semester <= 4 && category === 'Wajib' ? [] : detectedKbks,
    packageType,
    classificationStatus,
    confidenceScore,
    classificationReason,
  };
}

interface RawCourseDoc {
  sem: number;
  no: number;
  code: string;
  nameWithYear: string;
  sks: number;
}

const RAW_DOCUMENT_COURSES: RawCourseDoc[] = [
  // ==================== SEMESTER 1 ====================
  // Kurikulum 2026 (9 MK, 20 SKS)
  { sem: 1, no: 1, code: 'MWK1071101', nameWithYear: 'Agama / 2026', sks: 2 },
  { sem: 1, no: 2, code: 'MPS1071101', nameWithYear: 'Fisika Listrik dan Magnet / 2026', sks: 3 },
  { sem: 1, no: 3, code: 'MPS1071102', nameWithYear: 'Fisika Mekanika / 2026', sks: 3 },
  { sem: 1, no: 4, code: 'MPS1071103', nameWithYear: 'Dasar Integral dan Differensial / 2026', sks: 3 },
  { sem: 1, no: 5, code: 'MPS1071104', nameWithYear: 'Kimia Dasar / 2026', sks: 2 },
  { sem: 1, no: 6, code: 'MWK1071102', nameWithYear: 'Pancasila / 2026', sks: 2 },
  { sem: 1, no: 7, code: 'MPS1071105', nameWithYear: 'Dasar Teknologi Informasi / 2026', sks: 2 },
  { sem: 1, no: 8, code: 'MPS1071106', nameWithYear: 'Praktikum Rangkaian Logika / 2026', sks: 1 },
  { sem: 1, no: 9, code: 'MPS1071107', nameWithYear: 'Rangkaian Logika / 2026', sks: 2 },
  // Kurikulum 2022 (8 MK, 18 SKS)
  { sem: 1, no: 10, code: 'FBS1101', nameWithYear: 'Agama / 2022', sks: 2 },
  { sem: 1, no: 11, code: 'FBS1211', nameWithYear: 'Fisika II / 2022', sks: 3 },
  { sem: 1, no: 12, code: 'FBS1103', nameWithYear: 'Fisika I / 2022', sks: 3 },
  { sem: 1, no: 13, code: 'FBS1104', nameWithYear: 'Kalkulus I / 2022', sks: 3 },
  { sem: 1, no: 14, code: 'FBS1108', nameWithYear: 'Pancasila / 2022', sks: 2 },
  { sem: 1, no: 15, code: 'FBS1109', nameWithYear: 'Dasar Teknologi Informasi / 2022', sks: 2 },
  { sem: 1, no: 16, code: 'FBS1218', nameWithYear: 'Praktikum Rangkaian Logika / 2022', sks: 1 },
  { sem: 1, no: 17, code: 'FBS1107', nameWithYear: 'Rangkaian Logika / 2022', sks: 2 },
  { sem: 1, no: 18, code: 'FBS1106', nameWithYear: 'Konsep Sains dan Teknologi / 2022', sks: 2 },

  // ==================== SEMESTER 2 ====================
  // Kurikulum 2026 (9 MK, 20 SKS)
  { sem: 2, no: 1, code: 'MPS1072108', nameWithYear: 'Praktikum Dasar Pemrograman / 2026', sks: 1 },
  { sem: 2, no: 2, code: 'MPS1072109', nameWithYear: 'Persamaan Differensial dan Integral / 2026', sks: 3 },
  { sem: 2, no: 3, code: 'MPS1072110', nameWithYear: 'Rangkaian Listrik I / 2026', sks: 3 },
  { sem: 2, no: 4, code: 'MWK1072103', nameWithYear: 'Kewarganegaraan / 2026', sks: 2 },
  { sem: 2, no: 5, code: 'MPS1072111', nameWithYear: 'Dasar Pemrograman / 2026', sks: 3 },
  { sem: 2, no: 6, code: 'MPS1072112', nameWithYear: 'Dasar Telekomunikasi / 2026', sks: 3 },
  { sem: 2, no: 7, code: 'MPS1072113', nameWithYear: 'Fisika Optik dan Gelombang / 2026', sks: 2 },
  { sem: 2, no: 8, code: 'MPS1072114', nameWithYear: 'Praktikum Dasar Telekomunikasi / 2026', sks: 1 },
  { sem: 2, no: 9, code: 'MWK1072104', nameWithYear: 'Bahasa Indonesia / 2026', sks: 2 },
  // Kurikulum 2022 (8 MK, 18 SKS)
  { sem: 2, no: 10, code: 'FBS1216', nameWithYear: 'Praktikum Dasar Pemrograman / 2022', sks: 1 },
  { sem: 2, no: 11, code: 'FBS1212', nameWithYear: 'Kalkulus II / 2022', sks: 3 },
  { sem: 2, no: 12, code: 'FBS1213', nameWithYear: 'Rangkaian Listrik I / 2022', sks: 3 },
  { sem: 2, no: 13, code: 'FBS3137', nameWithYear: 'Kewarganegaraan / 2022', sks: 2 },
  { sem: 2, no: 14, code: 'FBS1215', nameWithYear: 'Dasar Pemrograman / 2022', sks: 3 },
  { sem: 2, no: 15, code: 'FBS1217', nameWithYear: 'Dasar Telekomunikasi / 2022', sks: 3 },
  { sem: 2, no: 16, code: 'FBS2127', nameWithYear: 'Praktikum Dasar Telekomunikasi / 2022', sks: 1 },
  { sem: 2, no: 17, code: 'FBS1102', nameWithYear: 'Bahasa Indonesia Akademik / 2022', sks: 2 },
  { sem: 2, no: 18, code: 'FBS1210', nameWithYear: 'Pembangunan Karakter / 2022', sks: 2 },
  { sem: 2, no: 19, code: 'FBS1214', nameWithYear: 'Probabilitas dan Statistik / 2022', sks: 2 },

  // ==================== SEMESTER 3 ====================
  // Kurikulum 2026 (10 MK, 20 SKS)
  { sem: 3, no: 1, code: 'MPS1073115', nameWithYear: 'Aljabar Linier / 2026', sks: 3 },
  { sem: 3, no: 2, code: 'MWU1073101', nameWithYear: 'Bahasa Inggris / 2026', sks: 2 },
  { sem: 3, no: 3, code: 'MPS1073116', nameWithYear: 'Rangkaian Listrik II / 2026', sks: 2 },
  { sem: 3, no: 4, code: 'MPS1073117', nameWithYear: 'Dasar Elektronika / 2026', sks: 3 },
  { sem: 3, no: 5, code: 'MPS1073118', nameWithYear: 'Dasar Tenaga Listrik / 2026', sks: 3 },
  { sem: 3, no: 6, code: 'MPS1073119', nameWithYear: 'Praktikum Pengukuran dan Instrumentasi / 2026', sks: 1 },
  { sem: 3, no: 7, code: 'MPS1073120', nameWithYear: 'Pengukuran dan Instrumentasi / 2026', sks: 2 },
  { sem: 3, no: 8, code: 'MPS1073121', nameWithYear: 'Probabilitas dan Statistik / 2026', sks: 2 },
  { sem: 3, no: 9, code: 'MPS1073122', nameWithYear: 'Praktikum Fisika / 2026', sks: 1 },
  { sem: 3, no: 10, code: 'MPS1073123', nameWithYear: 'Praktikum Rangkaian Listrik / 2026', sks: 1 },
  // Kurikulum 2022 (9 MK, 20 SKS)
  { sem: 3, no: 11, code: 'FBS2120', nameWithYear: 'Matematika Teknik I / 2022', sks: 3 },
  { sem: 3, no: 12, code: 'FBS2119', nameWithYear: 'Bahasa Inggris Akademik / 2022', sks: 2 },
  { sem: 3, no: 13, code: 'FBS2122', nameWithYear: 'Rangkaian Listrik II / 2022', sks: 3 },
  { sem: 3, no: 14, code: 'FBS2125', nameWithYear: 'Dasar Elektronika / 2022', sks: 3 },
  { sem: 3, no: 15, code: 'FBS2126', nameWithYear: 'Dasar Tenaga Listrik / 2022', sks: 3 },
  { sem: 3, no: 16, code: 'FBS2124', nameWithYear: 'Praktikum Pengukuran Besaran Listrik / 2022', sks: 1 },
  { sem: 3, no: 17, code: 'FBS2123', nameWithYear: 'Pengukuran Besaran Listrik / 2022', sks: 2 },
  { sem: 3, no: 18, code: 'FBS2231', nameWithYear: 'Praktikum Rangkaian Listrik / 2022', sks: 1 },
  { sem: 3, no: 19, code: 'ES2124', nameWithYear: 'DASAR ELEKTRONIKA / 2014', sks: 3 },

  // ==================== SEMESTER 4 ====================
  // Kurikulum 2026 (10 MK, 20 SKS)
  { sem: 4, no: 1, code: 'MPS1074116', nameWithYear: 'Matematika Stokastik / 2026', sks: 2 },
  { sem: 4, no: 2, code: 'MPS1074117', nameWithYear: 'Variabel Kompleks / 2026', sks: 3 },
  { sem: 4, no: 3, code: 'MPS1074118', nameWithYear: 'Bahan Listrik / 2026', sks: 2 },
  { sem: 4, no: 4, code: 'MPS1074119', nameWithYear: 'Sinyal dan Sistem / 2026', sks: 2 },
  { sem: 4, no: 5, code: 'MPS1074120', nameWithYear: 'Elektromagnetik / 2026', sks: 2 },
  { sem: 4, no: 6, code: 'MPS1074121', nameWithYear: 'Sistem Mikroprosessor / 2026', sks: 2 },
  { sem: 4, no: 7, code: 'MPS1074122', nameWithYear: 'Pengolahan Sinyal Digital / 2026', sks: 3 },
  { sem: 4, no: 8, code: 'MPS1074123', nameWithYear: 'Fisika Panas dan Fluida / 2026', sks: 2 },
  { sem: 4, no: 9, code: 'MPS1074124', nameWithYear: 'Praktikum Dasar Elektronika / 2026', sks: 1 },
  { sem: 4, no: 10, code: 'MPS1074125', nameWithYear: 'Praktikum Dasar Tenaga Listrik / 2026', sks: 1 },
  // Kurikulum 2022 (8 MK, 18 SKS)
  { sem: 4, no: 11, code: 'FBS2121', nameWithYear: 'Proses Stokastik / 2022', sks: 2 },
  { sem: 4, no: 12, code: 'FBS2228', nameWithYear: 'Matematika Teknik II / 2022', sks: 3 },
  { sem: 4, no: 13, code: 'FBS1105', nameWithYear: 'Bahan Listrik / 2022', sks: 2 },
  { sem: 4, no: 14, code: 'FBS2229', nameWithYear: 'Sinyal dan Sistem / 2022', sks: 3 },
  { sem: 4, no: 15, code: 'FBS2232', nameWithYear: 'Elektromagnetika / 2022', sks: 3 },
  { sem: 4, no: 16, code: 'FBS2235', nameWithYear: 'Sistem Mikroprosesor / 2022', sks: 3 },
  { sem: 4, no: 17, code: 'FBS2233', nameWithYear: 'Praktikum Dasar Elektronika / 2022', sks: 1 },
  { sem: 4, no: 18, code: 'FBS2234', nameWithYear: 'Praktikum Dasar Tenaga Listrik / 2022', sks: 1 },
  { sem: 4, no: 19, code: 'FBS2230', nameWithYear: 'Metode Numerik / 2022', sks: 2 },

  // ==================== SEMESTER 5 (49 MK) ====================
  { sem: 5, no: 1, code: 'MKB1075101', nameWithYear: 'Analisis Sistem Tenaga I / 2026', sks: 2 },
  { sem: 5, no: 2, code: 'FBD3103', nameWithYear: 'Rekayasa Perangkat Lunak / 2022', sks: 2 },
  { sem: 5, no: 3, code: 'FBA3104', nameWithYear: 'Mesin-Mesin Listrik / 2022', sks: 3 },
  { sem: 5, no: 4, code: 'MKB1075106', nameWithYear: 'Praktikum Mesin-Mesin Listrik / 2026', sks: 1 },
  { sem: 5, no: 5, code: 'MKB1075122', nameWithYear: 'Pemrograman Berorientasi Objek / 2026', sks: 2 },
  { sem: 5, no: 6, code: 'MKB1075142', nameWithYear: 'Jaringan Telekomunikasi / 2026', sks: 2 },
  { sem: 5, no: 7, code: 'FBS3138', nameWithYear: 'Praktikum Sistem Mikroprosesor / 2022', sks: 1 },
  { sem: 5, no: 8, code: 'FBC3102', nameWithYear: 'Sistem Telekomunikasi / 2022', sks: 3 },
  { sem: 5, no: 9, code: 'FBB3102', nameWithYear: 'Praktikum Rangkaian Elektronika / 2022', sks: 1 },
  { sem: 5, no: 10, code: 'FBA3102', nameWithYear: 'Transmisi Tenaga Listrik / 2022', sks: 2 },
  { sem: 5, no: 11, code: 'FBD3101', nameWithYear: 'Matematika Diskrit / 2022', sks: 3 },
  { sem: 5, no: 12, code: 'MKB1075104', nameWithYear: 'Mesin-Mesin Listrik / 2026', sks: 2 },
  { sem: 5, no: 13, code: 'FBD3106', nameWithYear: 'Praktikum Basis Data / 2022', sks: 1 },
  { sem: 5, no: 14, code: 'FBA3107', nameWithYear: 'Praktikum Elektronika Daya / 2022', sks: 1 },
  { sem: 5, no: 15, code: 'MPS1075127', nameWithYear: 'Praktikum Sistem Mikroprosessor / 2026', sks: 1 },
  { sem: 5, no: 16, code: 'MKB1075120', nameWithYear: 'Basis Data / 2026', sks: 3 },
  { sem: 5, no: 17, code: 'MKB1075140', nameWithYear: 'Sistem Instrumentasi dan Elektronika Industri / 2026', sks: 2 },
  { sem: 5, no: 18, code: 'FBC3105', nameWithYear: 'Rekayasa Trafik / 2022', sks: 2 },
  { sem: 5, no: 19, code: 'FBB3105', nameWithYear: 'Sistem Instrumentasi Elektronika / 2022', sks: 3 },
  { sem: 5, no: 20, code: 'MKB1075102', nameWithYear: 'Transmisi Tenaga Listrik / 2026', sks: 2 },
  { sem: 5, no: 21, code: 'FBD3104', nameWithYear: 'Pemrograman Berorientasi Objek / 2022', sks: 2 },
  { sem: 5, no: 22, code: 'FBA3105', nameWithYear: 'Praktikum Mesin-Mesin Listrik / 2022', sks: 1 },
  { sem: 5, no: 23, code: 'MKB1075107', nameWithYear: 'Praktikum Elektronika Daya / 2026', sks: 1 },
  { sem: 5, no: 24, code: 'MKB1075123', nameWithYear: 'Sistem Operasi / 2026', sks: 2 },
  { sem: 5, no: 25, code: 'MKB1075143', nameWithYear: 'Rekayasa Trafik / 2026', sks: 2 },
  { sem: 5, no: 26, code: 'FBS3139', nameWithYear: 'Sistem Kendali / 2022', sks: 3 },
  { sem: 5, no: 27, code: 'FBC3103', nameWithYear: 'Jaringan Telekomunikasi / 2022', sks: 3 },
  { sem: 5, no: 28, code: 'FBB3103', nameWithYear: 'Elektronika Digital / 2022', sks: 2 },
  { sem: 5, no: 29, code: 'FBD3102', nameWithYear: 'Basis Data / 2022', sks: 3 },
  { sem: 5, no: 30, code: 'FBA3103', nameWithYear: 'Konversi Energi Hidro-Thermal / 2022', sks: 2 },
  { sem: 5, no: 31, code: 'MKB1075105', nameWithYear: 'Elektronika Daya / 2026', sks: 2 },
  { sem: 5, no: 32, code: 'MPS1075128', nameWithYear: 'Praktikum Sistem Kontrol / 2026', sks: 1 },
  { sem: 5, no: 33, code: 'MKB1075121', nameWithYear: 'Rekayasa Perangkat Lunak / 2026', sks: 2 },
  { sem: 5, no: 34, code: 'MKB1075141', nameWithYear: 'Sistem Telekomunikasi Digital / 2026', sks: 2 },
  { sem: 5, no: 35, code: 'FBC3101', nameWithYear: 'Elektromagnetik Lanjut / 2022', sks: 2 },
  { sem: 5, no: 36, code: 'FBB3101', nameWithYear: 'Rangkaian Elektronika / 2022', sks: 3 },
  { sem: 5, no: 37, code: 'FBA3101', nameWithYear: 'Analisis Sistem Tenaga I / 2022', sks: 2 },
  { sem: 5, no: 38, code: 'MKB1075103', nameWithYear: 'Konversi Energi Hidro-Thermal / 2026', sks: 2 },
  { sem: 5, no: 39, code: 'FBD3105', nameWithYear: 'Sistem Operasi / 2022', sks: 2 },
  { sem: 5, no: 40, code: 'FBA3106', nameWithYear: 'Elektronika Daya / 2022', sks: 2 },
  { sem: 5, no: 41, code: 'MPS1075126', nameWithYear: 'Sistem Kontrol / 2026', sks: 3 },
  { sem: 5, no: 42, code: 'MKB1075119', nameWithYear: 'Matematika Diskrit / 2026', sks: 2 },
  { sem: 5, no: 43, code: 'MKB1075139', nameWithYear: 'Sistem Elektronika Digital / 2026', sks: 2 },
  { sem: 5, no: 44, code: 'MWU1075102', nameWithYear: 'Literasi Abad 21 / 2026', sks: 2 },
  { sem: 5, no: 45, code: 'MKB1075144', nameWithYear: 'Transmisi Dan Perambatan Gelombang / 2026', sks: 2 },
  { sem: 5, no: 46, code: 'FBS3140', nameWithYear: 'Praktikum Sistem Kendali / 2022', sks: 1 },
  { sem: 5, no: 47, code: 'FBC3104', nameWithYear: 'Komunikasi Digital / 2022', sks: 2 },
  { sem: 4, no: 48, code: 'FBS4245', nameWithYear: 'Lingkungan dan Etika Rekayasa / 2022', sks: 2 },
  { sem: 5, no: 49, code: 'FBB3104', nameWithYear: 'Praktikum Elektronika Digital / 2022', sks: 1 },

  // ==================== SEMESTER 6 (23 MK) ====================
  { sem: 6, no: 1, code: 'FBA3209', nameWithYear: 'Praktikum Analisis Sistem Tenaga / 2022', sks: 1 },
  { sem: 6, no: 2, code: 'FBC0003', nameWithYear: 'Telekomunikasi Gelombang Mikro / 2022', sks: 2 },
  { sem: 6, no: 3, code: 'FBB0001', nameWithYear: 'Algoritma dan Struktur Data / 2022', sks: 2 },
  { sem: 6, no: 4, code: 'FBD0004', nameWithYear: 'Proyek Perangkat lunak / 2022', sks: 2 },
  { sem: 6, no: 5, code: 'FBA3212', nameWithYear: 'Praktikum Transmisi dan Distribusi / 2022', sks: 1 },
  { sem: 6, no: 6, code: 'FBB0004', nameWithYear: 'Kecerdasan Artifisial / 2022', sks: 2 },
  { sem: 6, no: 7, code: 'FBA0005', nameWithYear: 'Pemeliharaan Peralatan Sistem Tenaga / 2022', sks: 2 },
  { sem: 6, no: 8, code: 'FBS3241', nameWithYear: 'Praktek Kerja Lapangan / 2022', sks: 2 },
  { sem: 6, no: 9, code: 'FBA3210', nameWithYear: 'Konversi Energi Terbarukan / 2022', sks: 2 },
  { sem: 6, no: 10, code: 'MPS1076130', nameWithYear: 'Praktek Kerja Lapangan / 2026', sks: 2 },
  { sem: 6, no: 11, code: 'FBC0004', nameWithYear: 'Telekomunikasi Satelit / 2022', sks: 2 },
  { sem: 6, no: 12, code: 'FBB0002', nameWithYear: 'Pengolahan Citra Digital / 2022', sks: 2 },
  { sem: 6, no: 13, code: 'FBD0005', nameWithYear: 'Keamanan Jaringan Komputer / 2022', sks: 2 },
  { sem: 6, no: 14, code: 'FBC3208', nameWithYear: 'Elektronika Telekomunikasi / 2022', sks: 3 },
  { sem: 6, no: 15, code: 'FBA3208', nameWithYear: 'Analisis Sistem Tenaga II / 2022', sks: 2 },
  { sem: 6, no: 16, code: 'FBC0002', nameWithYear: 'Telekomunikasi Bergerak / 2022', sks: 2 },
  { sem: 6, no: 17, code: 'FBA3213', nameWithYear: 'Perencanaan Instalasi Listrik / 2022', sks: 3 },
  { sem: 6, no: 18, code: 'FBD0003', nameWithYear: 'Machine Learning / 2022', sks: 2 },
  { sem: 6, no: 19, code: 'FBA0006', nameWithYear: 'Perancangan Mesin-Mesin Listrik / 2022', sks: 2 },
  { sem: 6, no: 20, code: 'FBC3206', nameWithYear: 'Transmisi dan Perambatan Gelombang / 2022', sks: 3 },
  { sem: 6, no: 21, code: 'FBA3211', nameWithYear: 'Sistem Distribusi Modern / 2022', sks: 2 },
  { sem: 6, no: 22, code: 'FBB0003', nameWithYear: 'Optoelektronika / 2022', sks: 2 },
  { sem: 6, no: 23, code: 'FBD0001', nameWithYear: 'Pengenalan Pola / 2022', sks: 2 },

  // ==================== SEMESTER 7 (102 MK) ====================
  { sem: 7, no: 1, code: 'MKL1077246', nameWithYear: 'Instrumentasi Geo-elektromagnetika / 2026', sks: 2 },
  { sem: 7, no: 2, code: 'FBC4114', nameWithYear: 'Pengukuran Sistem Telekomunikasi / 2022', sks: 3 },
  { sem: 7, no: 3, code: 'MKB1077114', nameWithYear: 'Manajemen Operasi Sistem Tenaga Listrik / 2026', sks: 2 },
  { sem: 7, no: 4, code: 'MKL1077219', nameWithYear: 'Proyek Perangkat lunak / 2026', sks: 2 },
  { sem: 7, no: 5, code: 'MKL1077224', nameWithYear: 'Teknik Pengembangan Game / 2026', sks: 2 },
  { sem: 7, no: 6, code: 'MKB1077134', nameWithYear: 'Keamanan Sistem Informasi / 2026', sks: 2 },
  { sem: 7, no: 7, code: 'FBA4114', nameWithYear: 'Manajemen Operasi Sistem Tenaga / 2022', sks: 2 },
  { sem: 7, no: 8, code: 'MKL1077229', nameWithYear: 'Artificial Intelligence Engineering / 2026', sks: 2 },
  { sem: 7, no: 9, code: 'MKB1077151', nameWithYear: 'Perancangan Sistem Elektronika / 2026', sks: 2 },
  { sem: 7, no: 10, code: 'FBC0008', nameWithYear: 'Telemetry / 2022', sks: 2 },
  { sem: 7, no: 11, code: 'MKL1077202', nameWithYear: 'Aplikasi Komputer dalam STL / 2026', sks: 2 },
  { sem: 7, no: 12, code: 'FBB0006', nameWithYear: 'Mekatronika Lanjut / 2022', sks: 2 },
  { sem: 7, no: 13, code: 'MKL1077234', nameWithYear: 'Pengolahan Citra Digital / 2026', sks: 2 },
  { sem: 7, no: 14, code: 'MKL1077239', nameWithYear: 'Software Defined Radio / 2026', sks: 2 },
  { sem: 7, no: 15, code: 'MKL1077207', nameWithYear: 'Penggunaan dan Pengaturan Mesin Listrik / 2026', sks: 2 },
  { sem: 7, no: 16, code: 'FBS4143', nameWithYear: 'Pra Tugas Akhir / 2022', sks: 2 },
  { sem: 7, no: 17, code: 'FBD0009', nameWithYear: 'Teknik Pengembangan Game / 2022', sks: 2 },
  { sem: 7, no: 18, code: 'MKL1077244', nameWithYear: 'Instrumentasi Biomedika / 2026', sks: 2 },
  { sem: 7, no: 19, code: 'FBC4112', nameWithYear: 'Praktikum Pengolahan Sinyal Digital / 2022', sks: 1 },
  { sem: 7, no: 20, code: 'MKL1077249', nameWithYear: 'Data Analytics / 2026', sks: 2 },
  { sem: 7, no: 21, code: 'MKL1077217', nameWithYear: 'Data Engineering / 2026', sks: 2 },
  { sem: 7, no: 22, code: 'MKL1077222', nameWithYear: 'IoT Cerdas (AIoT) / 2026', sks: 2 },
  { sem: 7, no: 23, code: 'MKB1077117', nameWithYear: 'Kualitas Daya Listrik / 2026', sks: 2 },
  { sem: 7, no: 24, code: 'FBA4117', nameWithYear: 'Kualitas Daya / 2022', sks: 2 },
  { sem: 7, no: 25, code: 'MKL1077227', nameWithYear: 'Sistem Terdistribusi / 2026', sks: 2 },
  { sem: 7, no: 26, code: 'MKB1077137', nameWithYear: 'Praktikum IoT / 2026', sks: 1 },
  { sem: 7, no: 27, code: 'FBC0006', nameWithYear: 'Radar dan Sensor Jarak Jauh / 2022', sks: 2 },
  { sem: 7, no: 28, code: 'FBD4116', nameWithYear: 'Teknologi Cloud Computing / 2022', sks: 2 },
  { sem: 7, no: 29, code: 'FBC0011', nameWithYear: 'Pengolahan Sinyal dan Data Geo-Elektromagnetik / 2022', sks: 2 },
  { sem: 7, no: 30, code: 'FBD0002', nameWithYear: 'Data Engineering / 2022', sks: 2 },
  { sem: 7, no: 31, code: 'MKL1077232', nameWithYear: 'Telekomunikasi Gelombang Mikro / 2026', sks: 2 },
  { sem: 7, no: 32, code: 'MKB1077155', nameWithYear: 'Pengukuran Sistem Telekomunikasi / 2026', sks: 2 },
  { sem: 7, no: 33, code: 'MKL1077205', nameWithYear: 'Pemeliharaan Peralatan Sistem Tenaga / 2026', sks: 2 },
  { sem: 7, no: 34, code: 'FBB0009', nameWithYear: 'Algoritma Cepat / 2022', sks: 2 },
  { sem: 7, no: 35, code: 'FBD0007', nameWithYear: 'IoT Cerdas (AIoT) / 2022', sks: 2 },
  { sem: 7, no: 36, code: 'FBA0010', nameWithYear: 'Gejala Medan Tinggi / 2022', sks: 2 },
  { sem: 7, no: 37, code: 'MKL1077237', nameWithYear: 'Telemetry / 2026', sks: 2 },
  { sem: 7, no: 38, code: 'FBA0015', nameWithYear: 'Eksplorasi dan Utilisasi Energi Geotermal / 2022', sks: 2 },
  { sem: 7, no: 39, code: 'MKL1077242', nameWithYear: 'Optoelektronika / 2026', sks: 2 },
  { sem: 7, no: 40, code: 'MKL1077210', nameWithYear: 'Gejala Medan Tinggi / 2026', sks: 2 },
  { sem: 7, no: 41, code: 'FBD0012', nameWithYear: 'Sistem Terdistribusi / 2022', sks: 2 },
  { sem: 7, no: 42, code: 'MKL1077247', nameWithYear: 'Elektronika Daya / 2026', sks: 2 },
  { sem: 7, no: 43, code: 'MKL1077215', nameWithYear: 'Ekplorasi dan Utilisasi Energi Geotermal / 2026', sks: 2 },
  { sem: 7, no: 44, code: 'FBC4116', nameWithYear: 'Praktikum Pengukuran Sistem Telekomunikasi / 2022', sks: 1 },
  { sem: 7, no: 45, code: 'MKL1077220', nameWithYear: 'Keamanan Jaringan Komputer / 2026', sks: 2 },
  { sem: 7, no: 46, code: 'MKB1077115', nameWithYear: 'Proteksi Sistem Tenaga Listrik / 2026', sks: 2 },
  { sem: 7, no: 47, code: 'FBB4115', nameWithYear: 'Perancangan Sistem Elektronika / 2022', sks: 2 },
  { sem: 7, no: 48, code: 'MKL1077225', nameWithYear: 'Audit Sistem Informasi / 2026', sks: 2 },
  { sem: 7, no: 49, code: 'MKB1077135', nameWithYear: 'Teknologi Cloud Computing / 2026', sks: 2 },
  { sem: 7, no: 50, code: 'FBA4115', nameWithYear: 'Proteksi Sistem Tenaga / 2022', sks: 2 },
  { sem: 7, no: 51, code: 'MKL1077230', nameWithYear: 'Deep Learning / 2026', sks: 2 },
  { sem: 7, no: 52, code: 'MKB1077153', nameWithYear: 'Sistem Elektronika Terintegrasi / 2026', sks: 2 },
  { sem: 7, no: 53, code: 'FBC0009', nameWithYear: 'Topik Khusus Telekomunikasi / 2022', sks: 2 },
  { sem: 7, no: 54, code: 'MKL1077203', nameWithYear: 'Distributed Generation (DG) / 2026', sks: 2 },
  { sem: 7, no: 55, code: 'FBB0007', nameWithYear: 'Instrumentasi Geo-elektromagnetika / 2022', sks: 2 },
  { sem: 7, no: 56, code: 'MKL1077235', nameWithYear: 'Radar dan Sensor Jarak Jauh / 2026', sks: 2 },
  { sem: 7, no: 57, code: 'MKL1077240', nameWithYear: 'Elektromagnetik / 2026', sks: 2 },
  { sem: 7, no: 58, code: 'MKL1077208', nameWithYear: 'Programmable Logic Control (PLC) / 2026', sks: 2 },
  { sem: 7, no: 59, code: 'FBD0010', nameWithYear: 'Audit Sistem Informasi / 2022', sks: 2 },
  { sem: 7, no: 60, code: 'MKL1077245', nameWithYear: 'Mekatronika Lanjut / 2026', sks: 2 },
  { sem: 7, no: 61, code: 'MKL1077213', nameWithYear: 'Perencanaan Energi / 2026', sks: 2 },
  { sem: 7, no: 62, code: 'FBC4113', nameWithYear: 'Antena / 2022', sks: 2 },
  { sem: 7, no: 63, code: 'MPK1077101', nameWithYear: 'KKN / 2026', sks: 4 },
  { sem: 7, no: 64, code: 'MKL1077218', nameWithYear: 'Machine Learning / 2026', sks: 2 },
  { sem: 7, no: 65, code: 'MKL1077223', nameWithYear: 'Komputasi Grafis / 2026', sks: 2 },
  { sem: 7, no: 66, code: 'MKB1077118', nameWithYear: 'Teknik Tegangan Tinggi / 2026', sks: 2 },
  { sem: 7, no: 67, code: 'FBA4118', nameWithYear: 'Teknik Tegangan Tinggi / 2022', sks: 2 },
  { sem: 7, no: 68, code: 'MKL1077228', nameWithYear: 'Topik Khusus Komputer / 2026', sks: 2 },
  { sem: 7, no: 69, code: 'MKB1077138', nameWithYear: 'Praktikum Algoritma dan Struktur Data / 2026', sks: 1 },
  { sem: 7, no: 70, code: 'FBC0007', nameWithYear: 'Sistem Telekomunikasi Fiber Optik / 2022', sks: 2 },
  { sem: 7, no: 71, code: 'FBD4117', nameWithYear: 'Teknologi IoT / 2022', sks: 2 },
  { sem: 7, no: 72, code: 'FBB0005', nameWithYear: 'Instrumentasi Biomedika / 2022', sks: 2 },
  { sem: 7, no: 73, code: 'MKL1077233', nameWithYear: 'Telekomunikasi Satelit / 2026', sks: 2 },
  { sem: 7, no: 74, code: 'MKL1077201', nameWithYear: 'Dinamika dan Stabilitas STL / 2026', sks: 2 },
  { sem: 7, no: 75, code: 'MKL1077238', nameWithYear: 'Topik Khusus Telekomunikasi / 2026', sks: 2 },
  { sem: 7, no: 76, code: 'MKL1077206', nameWithYear: 'Perancangan Mesin-Mesin Listrik / 2026', sks: 2 },
  { sem: 7, no: 77, code: 'FBS4142', nameWithYear: 'KKN / 2022', sks: 4 },
  { sem: 7, no: 78, code: 'FBD0008', nameWithYear: 'Komputasi Grafis / 2022', sks: 2 },
  { sem: 7, no: 79, code: 'FBA0011', nameWithYear: 'Sistem SCADA / 2022', sks: 2 },
  { sem: 7, no: 80, code: 'MKL1077243', nameWithYear: 'Kecerdasan Artifisial / 2026', sks: 2 },
  { sem: 7, no: 81, code: 'FBD0013', nameWithYear: 'Topik Khusus Komputer / 2022', sks: 2 },
  { sem: 7, no: 82, code: 'MKL1077248', nameWithYear: 'Algoritma Cepat / 2026', sks: 2 },
  { sem: 7, no: 83, code: 'MKL1077216', nameWithYear: 'Pengenalan Pola / 2026', sks: 2 },
  { sem: 7, no: 84, code: 'MKL1077221', nameWithYear: 'Telekomunikasi IoT Nirkabel / 2026', sks: 2 },
  { sem: 7, no: 85, code: 'MKB1077116', nameWithYear: 'Praktikum Proteksi Sistem Tenaga Listrik / 2026', sks: 1 },
  { sem: 7, no: 86, code: 'FBB4116', nameWithYear: 'Teknik Kendali Digital / 2022', sks: 2 },
  { sem: 7, no: 87, code: 'MPS1077130', nameWithYear: 'Perancangan Proyek / 2026', sks: 2 },
  { sem: 7, no: 88, code: 'MKL1077226', nameWithYear: 'Digital Forensic / 2026', sks: 2 },
  { sem: 7, no: 89, code: 'MKB1077136', nameWithYear: 'Teknologi IoT / 2026', sks: 2 },
  { sem: 7, no: 90, code: 'FBD4115', nameWithYear: 'Keamanan Sistem Informasi / 2022', sks: 2 },
  { sem: 7, no: 91, code: 'FBA4116', nameWithYear: 'Praktikum Proteksi Sistem Tenaga / 2022', sks: 1 },
  { sem: 7, no: 92, code: 'FBC0010', nameWithYear: 'Software Defined Radio / 2022', sks: 2 },
  { sem: 7, no: 93, code: 'MKL1077231', nameWithYear: 'Telekomunikasi Bergerak / 2026', sks: 2 },
  { sem: 7, no: 94, code: 'MKB1077154', nameWithYear: 'Antena / 2026', sks: 2 },
  { sem: 7, no: 95, code: 'MKL1077204', nameWithYear: 'Teknologi GI dan Pentanahan Sistem Tenaga / 2026', sks: 2 },
  { sem: 7, no: 96, code: 'FBB0008', nameWithYear: 'Elektronika Daya / 2022', sks: 2 },
  { sem: 7, no: 97, code: 'FBA0009', nameWithYear: 'Keandalan Sistem Tenaga Listrik / 2022', sks: 2 },
  { sem: 7, no: 98, code: 'MKL1077236', nameWithYear: 'Sistem Telekomunikasi Fiber Optik / 2026', sks: 2 },
  { sem: 7, no: 99, code: 'FBA0014', nameWithYear: 'Keselamatan dan Kesehatan Kerja / 2022', sks: 2 },
  { sem: 7, no: 100, code: 'MKL1077241', nameWithYear: 'Algoritma dan Struktur Data / 2026', sks: 2 },
  { sem: 7, no: 101, code: 'MKL1077209', nameWithYear: 'Keandalan Sistem Tenaga Listrik / 2026', sks: 2 },
  { sem: 7, no: 102, code: 'FBD0011', nameWithYear: 'Digital Forensic / 2022', sks: 2 },

  // ==================== SEMESTER 8 (3 MK) ====================
  { sem: 8, no: 1, code: 'MPS1078131', nameWithYear: 'Proyek Akhir / 2026', sks: 4 },
  { sem: 8, no: 2, code: 'FBS4246', nameWithYear: 'Tugas Akhir / 2022', sks: 4 },
  { sem: 8, no: 3, code: 'FBS4244', nameWithYear: 'Technopreneurship / 2022', sks: 2 },
];

function parseCourseName(nameWithYear: string): { cleanName: string; year: number } {
  const parts = nameWithYear.split('/');
  if (parts.length >= 2) {
    const cleanName = parts[0].trim();
    const year = parseInt(parts[1].trim(), 10) || 2022;
    return { cleanName, year };
  }
  return { cleanName: nameWithYear.trim(), year: 2022 };
}

// Generate the authoritative MASTER_COURSES with rich classification metadata and strict uniqueness
export const MASTER_COURSES: Course[] = (() => {
  const seenIds = new Set<string>();
  const list: Course[] = [];

  for (const doc of RAW_DOCUMENT_COURSES) {
    const { cleanName, year } = parseCourseName(doc.nameWithYear);
    const metadata = classifyCourseMetadata(doc.code, cleanName, doc.sem, year);
    const isPackage = doc.sem <= 4 && metadata.category === 'Wajib';
    const id = `crs-${doc.code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    list.push({
      id,
      code: doc.code,
      name: cleanName,
      sks: doc.sks,
      credits: doc.sks,
      semester: doc.sem,
      recommendedSemester: doc.sem,
      category: metadata.category,
      type: metadata.category,
      subCategory: metadata.subCategory,
      curriculumYear: year,
      kbkIds: metadata.kbkIds.length > 0 ? metadata.kbkIds : undefined,
      packageType: metadata.packageType,
      isPackageCourse: isPackage,
      classificationStatus: metadata.classificationStatus,
      confidenceScore: metadata.confidenceScore,
      classificationReason: metadata.classificationReason,
      durationMinutes: doc.sks * 50,
      priority: metadata.category === 'Wajib' ? 'Tinggi' : 'Normal',
      isActive: true,
    });
  }

  return list;
})();

// Re-export Master Packages & Offerings
export { MASTER_CURRICULUM_PACKAGES as INITIAL_CURRICULUM_PACKAGES, INITIAL_COURSE_OFFERINGS } from './masterPackages';
