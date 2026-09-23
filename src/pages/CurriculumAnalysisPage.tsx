import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Cpu,
  Zap,
  Radio,
  Share2,
  BookOpen,
  Sparkles,
  Users,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Course, KBK, Student, Curriculum } from '../types';
import { StorageService } from '../services/storageService';

export const CurriculumAnalysisPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [kbks, setKbks] = useState<KBK[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);

  useEffect(() => {
    setCourses(StorageService.getCourses());
    setKbks(StorageService.getKbks());
    setStudents(StorageService.getStudents());
    setCurricula(StorageService.getCurricula());
  }, []);

  // 1. SKS & Courses per Semester distribution for 2026 vs 2022
  const semesterChartData = [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
    const semCourses2026 = courses.filter((c) => c.curriculumYear === 2026 && c.semester === sem);
    const semCourses2022 = courses.filter((c) => c.curriculumYear === 2022 && c.semester === sem);

    const sks2026Wajib = semCourses2026.filter((c) => c.category === 'Wajib').reduce((s, c) => s + c.sks, 0);
    const sks2026Pilihan = semCourses2026.filter((c) => c.category === 'Pilihan').reduce((s, c) => s + c.sks, 0);

    const sks2022Wajib = semCourses2022.filter((c) => c.category === 'Wajib').reduce((s, c) => s + c.sks, 0);
    const sks2022Pilihan = semCourses2022.filter((c) => c.category === 'Pilihan').reduce((s, c) => s + c.sks, 0);

    return {
      semester: `Sem ${sem}`,
      semNumber: sem,
      '2026 Wajib': sks2026Wajib,
      '2026 Pilihan': sks2026Pilihan,
      '2022 Wajib': sks2022Wajib,
      '2022 Pilihan': sks2022Pilihan,
      totalSks2026: sks2026Wajib + sks2026Pilihan,
      totalSks2022: sks2022Wajib + sks2022Pilihan,
    };
  });

  // 2. KBK Distribution (Courses & SKS)
  const komCourses = courses.filter((c) => c.kbkIds?.includes('kbk-komputer'));
  const stlCourses = courses.filter((c) => c.kbkIds?.includes('kbk-sistem-tenaga'));
  const elkomCourses = courses.filter((c) => c.kbkIds?.includes('kbk-elektronika-komunikasi'));
  const crossKbkCourses = courses.filter((c) => (c.kbkIds?.length || 0) > 1);
  const commonCourses = courses.filter((c) => !c.kbkIds || c.kbkIds.length === 0);

  const kbkPieData = [
    { name: 'KBK Komputer (KOM)', value: komCourses.length, color: '#8B5CF6' },
    { name: 'KBK Tenaga Listrik (STL)', value: stlCourses.length, color: '#F59E0B' },
    { name: 'KBK Elektronika Digital dan Telekomunikasi (ELKOM)', value: elkomCourses.length, color: '#0284C7' },
    { name: 'Lintas KBK (Cross-KBK)', value: crossKbkCourses.length, color: '#6366F1' },
    { name: 'Dasar / Paket Bersama', value: commonCourses.length, color: '#10B981' },
  ];

  // 3. Student Curriculum Transition Analysis
  const curr2026Students = students.filter((s) => (s.curriculumYear || 2026) === 2026);
  const curr2022Students = students.filter((s) => (s.curriculumYear || 2026) === 2022);

  const studentCohortData = [
    {
      name: 'Angkatan 2024+',
      total: students.filter((s) => s.cohortYear >= 2024).length,
      curr2026: students.filter((s) => s.cohortYear >= 2024).length,
      curr2022: 0,
      keterangan: 'Otomatis Kurikulum 2026',
    },
    {
      name: 'Angkatan 2023 (≥120 SKS)',
      total: students.filter((s) => s.cohortYear === 2023 && (s.totalEarnedCredits || 0) >= 120).length,
      curr2026: 0,
      curr2022: students.filter((s) => s.cohortYear === 2023 && (s.totalEarnedCredits || 0) >= 120).length,
      keterangan: 'Tetap Kurikulum 2022 (OBE)',
    },
    {
      name: 'Angkatan 2023 (<120 SKS)',
      total: students.filter((s) => s.cohortYear === 2023 && (s.totalEarnedCredits || 0) < 120).length,
      curr2026: students.filter((s) => s.cohortYear === 2023 && (s.totalEarnedCredits || 0) < 120).length,
      curr2022: 0,
      keterangan: 'Transisi ke Kurikulum 2026',
    },
    {
      name: 'Angkatan 2022 ke bawah',
      total: students.filter((s) => s.cohortYear <= 2022).length,
      curr2026: students.filter((s) => s.cohortYear <= 2022 && (s.curriculumYear || 2022) === 2026).length,
      curr2022: students.filter((s) => s.cohortYear <= 2022 && (s.curriculumYear || 2022) === 2022).length,
      keterangan: 'Evaluasi berdasarkan capaian SKS',
    },
  ];

  // 4. AI Classification Confidence & Health
  const verifiedCount = courses.filter((c) => (c.classificationStatus || 'verified') === 'verified').length;
  const needsReviewCount = courses.filter((c) => c.classificationStatus === 'needs-review').length;
  const adminCorrectedCount = courses.filter((c) => c.classificationStatus === 'admin-corrected').length;

  const avgConfidence = Math.round(
    courses.reduce((sum, c) => sum + (c.confidenceScore || 90), 0) / (courses.length || 1)
  );

  return (
    <div className="space-y-6" id="curriculum-analysis-page">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <TrendingUp className="w-3.5 h-3.5" />
                Audit & Analisis Kurikulum
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              Analisis Struktur Kurikulum & Transisi Mahasiswa
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl mt-1">
              Evaluasi komparatif antara Kurikulum 2026 dan Kurikulum 2022 OBE, persebaran beban SKS per semester,
              analisis 3 KBK resmi Teknik Elektro UNRAM, serta peta transisi kurikulum mahasiswa.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Kurikulum 2026</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700">
              {courses.filter((c) => c.curriculumYear === 2026).length}
            </span>
            <span className="text-xs text-slate-500">MK ({courses.filter((c) => c.curriculumYear === 2026).reduce((s, c) => s + c.sks, 0)} SKS)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{curr2026Students.length} Mahasiswa terdaftar</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Kurikulum 2022 (OBE)</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">
              {courses.filter((c) => c.curriculumYear === 2022).length}
            </span>
            <span className="text-xs text-slate-500">MK ({courses.filter((c) => c.curriculumYear === 2022).reduce((s, c) => s + c.sks, 0)} SKS)</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{curr2022Students.length} Mahasiswa terdaftar</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Akurasi Klasifikasi AI</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{avgConfidence}%</span>
            <span className="text-xs text-slate-500">Confidence Rata-rata</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{verifiedCount} MK Terverifikasi</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Status Konsentrasi</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">3 KBK</span>
            <span className="text-xs text-slate-500">Resmi Terpadu</span>
          </div>
          <div className="mt-2 text-xs text-purple-700 font-medium">
            KOM • STL • ELKOM
          </div>
        </div>
      </div>

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester Load Comparison */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Distribusi Beban SKS per Semester (Kurikulum 2026)
              </h2>
              <p className="text-xs text-slate-500">
                Komposisi Mata Kuliah Wajib vs Mata Kuliah Pilihan per Semester 1 sampai 8
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              SKS Wajib vs Pilihan
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semesterChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="semester" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} SKS`, name]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="2026 Wajib" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="2026 Pilihan" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KBK Distribution Pie */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Proporsi 3 KBK Teknik Elektro
            </h2>
            <p className="text-xs text-slate-500">
              Persebaran mata kuliah spesialisasi berdasarkan Kelompok Bidang Keahlian
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={kbkPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {kbkPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any, name: any) => [`${value} Mata Kuliah`, name]}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {kbkPieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value} MK</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Student Curriculum Migration Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Peta Aturan Penentuan Kurikulum Mahasiswa
            </h2>
            <p className="text-xs text-slate-500">
              Simulasi penerapan kebijakan transisi kurikulum berdasarkan Angkatan dan Capaian SKS Lulus
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
            Total {students.length} Mahasiswa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-indigo-900">Angkatan 2024+</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">Kurikulum 2026</span>
            </div>
            <div className="text-2xl font-bold text-indigo-950">
              {students.filter((s) => s.cohortYear >= 2024).length} Mahasiswa
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Mahasiswa baru (Angkatan 2024 ke atas) wajib menempuh Kurikulum 2026 secara penuh.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-blue-900">Angkatan 2023 (≥120 SKS)</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">Kurikulum 2022</span>
            </div>
            <div className="text-2xl font-bold text-blue-950">
              {students.filter((s) => s.cohortYear === 2023 && (s.totalEarnedCredits || 0) >= 120).length} Mahasiswa
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              Telah memenuhi ambang batas 120 SKS lulus, menyelesaikan studi dengan Kurikulum 2022 OBE.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-amber-900">Angkatan 2023 (&lt;120 SKS)</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-600 text-white">Kurikulum 2026</span>
            </div>
            <div className="text-2xl font-bold text-amber-950">
              {students.filter((s) => s.cohortYear === 2023 && (s.totalEarnedCredits || 0) < 120).length} Mahasiswa
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Belum memenuhi 120 SKS lulus, dikonversi dan mengikuti paket penyesuaian Kurikulum 2026.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-700">Angkatan 2022 ke bawah</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-white">Kondisional</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {students.filter((s) => s.cohortYear <= 2022).length} Mahasiswa
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mahasiswa tingkat akhir dengan evaluasi SKS individual atau penetapan override khusus Admin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
