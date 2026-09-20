import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  Sparkles,
  Award,
  Clock,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Plus,
  Compass,
  Cpu,
  Radio,
  Zap,
  SlidersHorizontal,
  BookmarkCheck,
} from 'lucide-react';
import { Course, KBK, CurriculumPackage } from '../types';
import { StorageService } from '../services/storageService';
import { classifyCourseCategory } from '../data/curriculumDataset';

export const CurriculumPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(() => StorageService.getCourses());
  const [kbks] = useState<KBK[]>(() => StorageService.getKbks());
  const [packages] = useState<CurriculumPackage[]>(() => StorageService.getCurriculumPackages());

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
  const [selectedCurriculumYear, setSelectedCurriculumYear] = useState<number | 'all'>('all');
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<Course | null>(null);

  // KBK icon mapper
  const getKbkIcon = (code?: string) => {
    switch (code) {
      case 'KBK-POWER':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'KBK-TELECOM':
        return <Radio className="w-4 h-4 text-blue-500" />;
      case 'KBK-COMPUTER':
        return <Cpu className="w-4 h-4 text-purple-500" />;
      case 'KBK-ELECTRONICS':
        return <SlidersHorizontal className="w-4 h-4 text-emerald-500" />;
      default:
        return <Compass className="w-4 h-4 text-slate-400" />;
    }
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Curriculum year match
      if (selectedCurriculumYear !== 'all') {
        if (c.curriculumYear && c.curriculumYear !== selectedCurriculumYear) {
          return false;
        }
      }

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCode = c.code.toLowerCase().includes(term);
        const matchName = c.name.toLowerCase().includes(term);
        if (!matchCode && !matchName) return false;
      }

      // Semester
      if (selectedSemester !== 'all') {
        if (c.semester !== selectedSemester) return false;
      }

      // Category
      if (selectedCategory !== 'all') {
        const cat = c.category || classifyCourseCategory(c.code);
        if (selectedCategory === 'Wajib' && cat !== 'Wajib') return false;
        if (selectedCategory === 'Pilihan' && cat !== 'Pilihan') return false;
        if (selectedCategory === 'Praktikum' && c.type !== 'Praktikum') return false;
      }

      // KBK
      if (selectedKbk !== 'all') {
        const cKbk = c.kbkIds?.[0] || (c as any).kbkId;
        if (selectedKbk === 'none' && cKbk) return false;
        if (selectedKbk !== 'none' && cKbk !== selectedKbk && !c.kbkIds?.includes(selectedKbk)) return false;
      }

      return true;
    });
  }, [courses, searchTerm, selectedSemester, selectedCategory, selectedKbk, selectedCurriculumYear]);

  // Statistics
  const stats = useMemo(() => {
    const totalSks = courses.reduce((acc, c) => acc + c.sks, 0);
    const wajibCourses = courses.filter((c) => (c.category || classifyCourseCategory(c.code)) === 'Wajib');
    const totalSksWajib = wajibCourses.reduce((acc, c) => acc + c.sks, 0);
    const pilihanCourses = courses.filter((c) => (c.category || classifyCourseCategory(c.code)) === 'Pilihan');
    const totalSksPilihan = pilihanCourses.reduce((acc, c) => acc + c.sks, 0);

    return {
      totalCourses: courses.length,
      totalSks,
      wajibCount: wajibCourses.length,
      totalSksWajib,
      pilihanCount: pilihanCourses.length,
      totalSksPilihan,
      kbkCount: kbks.length,
    };
  }, [courses, kbks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Kurikulum S1 Teknik Elektro Universitas Mataram
              </span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                OBE 2022 &amp; Reguler
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Struktur Kurikulum &amp; Paket Mata Kuliah
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-3xl">
              Peta mata kuliah berjenjang dari Semester 1–4 (Paket Dasar Bersama) dan Semester 5–8 (Penjurusan KBK: Tenaga Listrik, Telekomunikasi, Komputer &amp; Elektronika).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 flex-wrap gap-1">
              <button
                onClick={() => setSelectedCurriculumYear('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedCurriculumYear === 'all'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Kurikulum
              </button>
              <button
                onClick={() => setSelectedCurriculumYear(2026)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedCurriculumYear === 2026
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kurikulum 2026
              </button>
              <button
                onClick={() => setSelectedCurriculumYear(2022)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedCurriculumYear === 2022
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kurikulum 2022 (OBE)
              </button>
              <button
                onClick={() => setSelectedCurriculumYear(2014)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedCurriculumYear === 2014
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kurikulum 2014
              </button>
            </div>
          </div>
        </div>

        {/* Quick Summary Bento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="text-xs font-medium text-slate-500">Total Mata Kuliah</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalCourses} Matkul</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{stats.totalSks} Total SKS Terdaftar</div>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/60">
            <div className="text-xs font-medium text-emerald-800 flex items-center gap-1">
              <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" />
              Mata Kuliah Wajib
            </div>
            <div className="text-xl font-bold text-emerald-950 mt-0.5">{stats.wajibCount} Matkul</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">{stats.totalSksWajib} SKS Wajib Kelulusan</div>
          </div>

          <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-200/60">
            <div className="text-xs font-medium text-indigo-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Mata Kuliah Pilihan / KBK
            </div>
            <div className="text-xl font-bold text-indigo-950 mt-0.5">{stats.pilihanCount} Matkul</div>
            <div className="text-[11px] text-indigo-700 mt-0.5">{stats.totalSksPilihan} SKS Peminatan</div>
          </div>

          <div className="bg-purple-50/60 rounded-xl p-3.5 border border-purple-200/60">
            <div className="text-xs font-medium text-purple-800 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              Bidang Keahlian (KBK)
            </div>
            <div className="text-xl font-bold text-purple-950 mt-0.5">{stats.kbkCount} Konsentrasi</div>
            <div className="text-[11px] text-purple-700 mt-0.5">Penjurusan Mulai Smtr 5</div>
          </div>

          <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/60 col-span-2 sm:col-span-4 lg:col-span-1">
            <div className="text-xs font-medium text-amber-800 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              Syarat Minimal S1
            </div>
            <div className="text-xl font-bold text-amber-950 mt-0.5">144 SKS</div>
            <div className="text-[11px] text-amber-700 mt-0.5">Termasuk KP &amp; Skripsi</div>
          </div>
        </div>
      </div>

      {/* KBK Badges Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kbks.map((kbk) => {
          const kbkCourses = courses.filter((c) => c.kbkIds?.includes(kbk.id) || (c as any).kbkId === kbk.id);
          const isSelected = selectedKbk === kbk.id;

          return (
            <button
              key={kbk.id}
              onClick={() => setSelectedKbk(isSelected ? 'all' : kbk.id)}
              className={`text-left rounded-xl p-4 border transition-all ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-100 border border-slate-200/80">
                    {getKbkIcon(kbk.code)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">{kbk.code}</div>
                    <div className="text-sm font-bold text-slate-900 line-clamp-1">{kbk.name}</div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{kbk.description}</p>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-medium text-slate-600">
                <span>{kbkCourses.length} Mata Kuliah</span>
                <span className="text-blue-600 font-semibold">{isSelected ? 'Filter Aktif' : 'Klik Filter'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode (FBS..., MWU...), nama mata kuliah..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Semester Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedSemester('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
              selectedSemester === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Semester
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                selectedSemester === sem
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Smtr {sem}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kategori</option>
            <option value="Wajib">Mata Kuliah Wajib</option>
            <option value="Pilihan">Mata Kuliah Pilihan</option>
            <option value="Praktikum">Praktikum / Lab</option>
          </select>

          <select
            value={selectedKbk}
            onChange={(e) => setSelectedKbk(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Peminatan KBK</option>
            <option value="none">Mata Kuliah Umum / Tanpa KBK</option>
            {kbks.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Courses List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">Daftar Mata Kuliah</span>
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {filteredCourses.length} Mata Kuliah Ditampilkan
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Total SKS Terfilter: <strong className="text-slate-900">{filteredCourses.reduce((a, b) => a + b.sks, 0)} SKS</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/50 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4 w-28">Kode MK</th>
                <th className="py-3 px-4">Nama Mata Kuliah</th>
                <th className="py-3 px-4 w-20 text-center">Smtr</th>
                <th className="py-3 px-4 w-16 text-center">SKS</th>
                <th className="py-3 px-4 w-32">Kategori / Sifat</th>
                <th className="py-3 px-4 w-44">Bidang Keahlian (KBK)</th>
                <th className="py-3 px-4 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Tidak ada mata kuliah yang cocok dengan filter.</p>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course, idx) => {
                  const category = course.category || classifyCourseCategory(course.code);
                  const isWajib = category === 'Wajib';
                  const kbk = kbks.find((k) => course.kbkIds?.includes(k.id) || (course as any).kbkId === k.id);

                  return (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCourseDetail(course)}
                    >
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-800">
                        {course.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {course.name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                          {course.semester}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200/60">
                          {course.sks} SKS
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                              isWajib
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {isWajib ? <CheckCircle2 className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            {category}
                          </span>
                          {course.type === 'Praktikum' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                              Praktikum Lab
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {kbk ? (
                          <div className="flex items-center gap-1.5">
                            {getKbkIcon(kbk.code)}
                            <span className="text-xs font-semibold text-slate-800">{kbk.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Umum / Semua KBK</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourseDetail(course);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCourseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/80">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                    {selectedCourseDetail.code}
                  </span>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                    {selectedCourseDetail.sks} SKS • Semester {selectedCourseDetail.semester}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedCourseDetail.name}</h3>
              </div>
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Sifat / Kategori:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedCourseDetail.category || classifyCourseCategory(selectedCourseDetail.code)} ({selectedCourseDetail.type || 'Teori'})
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Peminatan KBK:</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {kbks.find((k) => selectedCourseDetail.kbkIds?.includes(k.id) || (selectedCourseDetail as any).kbkId === k.id)?.name || 'Semua Bidang (Mata Kuliah Dasar/Bersama)'}
                  </p>
                </div>
              </div>

              {selectedCourseDetail.prerequisites && selectedCourseDetail.prerequisites.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 font-medium">Prasyarat (Prerequisites):</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedCourseDetail.prerequisites.map((p) => (
                      <span key={p} className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-xs font-semibold">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/60 text-xs text-blue-900">
                <div className="font-semibold flex items-center gap-1 mb-1">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Aturan Penjadwalan:
                </div>
                Mata kuliah ini tidak boleh bertabrakan jadwalnya dengan mata kuliah lain di semester yang sama atau sesama paket KBK bagi mahasiswa yang mengambilnya secara bersamaan.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
