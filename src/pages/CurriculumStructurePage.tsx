import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Layers,
  Sparkles,
  Download,
  RotateCcw,
  Zap,
  Info,
  SlidersHorizontal,
  X,
  Cpu,
  Radio,
  Share2,
} from 'lucide-react';
import { Course, KBK, CourseCategory, PackageType, ClassificationStatus } from '../types';
import { StorageService } from '../services/storageService';
import { MASTER_COURSES } from '../data/curriculumDataset';

export const CurriculumStructurePage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [kbks, setKbks] = useState<KBK[]>([]);
  const [selectedCurriculumYear, setSelectedCurriculumYear] = useState<'all' | 2026 | 2022>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state for Admin Correction
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editCategory, setEditCategory] = useState<CourseCategory>('Wajib');
  const [editSubCategory, setEditSubCategory] = useState<string>('');
  const [editKbkIds, setEditKbkIds] = useState<string[]>([]);
  const [editPackageType, setEditPackageType] = useState<PackageType>('common');
  const [editAdminNotes, setEditAdminNotes] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedCourses = StorageService.getCourses();
    const loadedKbks = StorageService.getKbks();
    setCourses(loadedCourses);
    setKbks(loadedKbks);
  };

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setEditCategory(course.category);
    setEditSubCategory(course.subCategory || '');
    setEditKbkIds(course.kbkIds || []);
    setEditPackageType(course.packageType || (course.semester <= 4 ? 'common' : 'kbk'));
    setEditAdminNotes(course.adminNotes || '');
  };

  const handleSaveCorrection = () => {
    if (!editingCourse) return;

    StorageService.updateCourseClassification(editingCourse.id, {
      category: editCategory,
      type: editCategory,
      subCategory: editSubCategory,
      kbkIds: editKbkIds.length > 0 ? editKbkIds : undefined,
      packageType: editPackageType,
      adminNotes: editAdminNotes,
      classificationStatus: 'admin-corrected',
      confidenceScore: 100,
      classificationReason: `Dikoreksi & divalidasi oleh Admin: ${editAdminNotes || 'Penyesuaian kurikulum manual'}`,
    });

    loadData();
    setEditingCourse(null);
    showNotification(`Mata kuliah ${editingCourse.code} (${editingCourse.name}) berhasil dikoreksi.`);
  };

  const handleQuickVerify = (courseId: string) => {
    StorageService.updateCourseClassification(courseId, {
      classificationStatus: 'verified',
      confidenceScore: 98,
      adminNotes: 'Diverifikasi cepat oleh Admin',
    });
    loadData();
    showNotification('Mata kuliah berhasil diverifikasi.');
  };

  const handleBatchVerifyAll = () => {
    const unverified = courses.filter((c) => c.classificationStatus === 'needs-review');
    unverified.forEach((c) => {
      StorageService.updateCourseClassification(c.id, {
        classificationStatus: 'verified',
        confidenceScore: 95,
        adminNotes: 'Batch verification oleh Admin',
      });
    });
    loadData();
    showNotification(`${unverified.length} mata kuliah berhasil diverifikasi secara massal.`);
  };

  const handleResetToAI = () => {
    if (window.confirm('Kembalikan seluruh klasifikasi mata kuliah ke rekomendasi AI awal dari dataset resmi?')) {
      StorageService.saveCourses(MASTER_COURSES);
      loadData();
      showNotification('Klasifikasi mata kuliah berhasil direset ke rekomendasi AI resmi.', 'info');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Kode MK', 'Nama Mata Kuliah', 'SKS', 'Semester', 'Kurikulum', 'Kategori', 'Sub Kategori', 'KBK', 'Tipe Paket', 'Status Klasifikasi', 'Skor Keyakinan', 'Catatan'];
    const rows = filteredCourses.map((c) => {
      const kbkNames = (c.kbkIds || [])
        .map((kId) => kbks.find((k) => k.id === kId)?.name || kId)
        .join('; ');
      return [
        `"${c.code}"`,
        `"${c.name}"`,
        c.sks,
        c.semester,
        c.curriculumYear || 2026,
        `"${c.category}"`,
        `"${c.subCategory || ''}"`,
        `"${kbkNames}"`,
        `"${c.packageType || ''}"`,
        `"${c.classificationStatus || 'verified'}"`,
        `"${c.confidenceScore || 90}%"`,
        `"${c.adminNotes || c.classificationReason || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `struktur_kurikulum_elektro_unram_${selectedCurriculumYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Data struktur kurikulum berhasil diekspor ke CSV.');
  };

  // Filter logic
  const filteredCourses = courses.filter((c) => {
    // Curriculum Year
    if (selectedCurriculumYear !== 'all' && c.curriculumYear !== selectedCurriculumYear) {
      return false;
    }
    // Semester
    if (selectedSemester !== 'all' && c.semester !== parseInt(selectedSemester, 10)) {
      return false;
    }
    // Category
    if (selectedCategory !== 'all' && c.category !== selectedCategory) {
      return false;
    }
    // Status
    if (selectedStatus !== 'all' && (c.classificationStatus || 'verified') !== selectedStatus) {
      return false;
    }
    // KBK
    if (selectedKbk !== 'all') {
      if (selectedKbk === 'none') {
        if (c.kbkIds && c.kbkIds.length > 0) return false;
      } else if (selectedKbk === 'cross-kbk') {
        if (!c.kbkIds || c.kbkIds.length <= 1) return false;
      } else {
        if (!c.kbkIds || !c.kbkIds.includes(selectedKbk)) return false;
      }
    }
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const codeMatch = c.code.toLowerCase().includes(q);
      const nameMatch = c.name.toLowerCase().includes(q);
      const notesMatch = (c.adminNotes || '').toLowerCase().includes(q);
      const reasonMatch = (c.classificationReason || '').toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !notesMatch && !reasonMatch) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalCourses = filteredCourses.length;
  const totalSks = filteredCourses.reduce((sum, c) => sum + c.sks, 0);
  const wajibCount = filteredCourses.filter((c) => c.category === 'Wajib').length;
  const wajibSks = filteredCourses.filter((c) => c.category === 'Wajib').reduce((sum, c) => sum + c.sks, 0);
  const pilihanCount = filteredCourses.filter((c) => c.category === 'Pilihan').length;
  const pilihanSks = filteredCourses.filter((c) => c.category === 'Pilihan').reduce((sum, c) => sum + c.sks, 0);
  const needsReviewCount = courses.filter((c) => c.classificationStatus === 'needs-review').length;
  const adminCorrectedCount = courses.filter((c) => c.classificationStatus === 'admin-corrected').length;

  return (
    <div className="space-y-6" id="curriculum-structure-page">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-sky-50 border-sky-300 text-sky-900'
            }`}
            id="curriculum-toast"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5" />
                Sistem Penyelarasan Kurikulum UNRAM
              </span>
              {needsReviewCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  {needsReviewCount} MK Perlu Tinjauan
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Struktur Kurikulum & Klasifikasi KBK
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl">
              Kelola master kurikulum Teknik Elektro Universitas Mataram (Kurikulum 2026 & Kurikulum 2022 OBE),
              pembagian 3 Kelompok Bidang Keahlian (KBK), dan penyesuaian klasifikasi AI secara interaktif.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {needsReviewCount > 0 && (
              <button
                id="btn-batch-verify"
                onClick={handleBatchVerifyAll}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                title="Setujui semua rekomendasi klasifikasi AI yang berstatus perlu tinjauan"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verifikasi Semua ({needsReviewCount})
              </button>
            )}
            <button
              id="btn-export-csv"
              onClick={handleExportCsv}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-600" />
              Ekspor CSV
            </button>
            <button
              id="btn-reset-ai"
              onClick={handleResetToAI}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
              title="Reset ke rekomendasi AI awal"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              Reset AI
            </button>
          </div>
        </div>

        {/* Kurikulum Tabs */}
        <div className="mt-6 border-t border-slate-200 pt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider mr-2">
            Pilih Kurikulum:
          </span>
          <button
            id="tab-curr-all"
            onClick={() => setSelectedCurriculumYear('all')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              selectedCurriculumYear === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Kurikulum ({courses.length} MK)
          </button>
          <button
            id="tab-curr-2026"
            onClick={() => setSelectedCurriculumYear(2026)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              selectedCurriculumYear === 2026
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Kurikulum 2026 (Terbaru)
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/20">
              {courses.filter((c) => c.curriculumYear === 2026).length} MK
            </span>
          </button>
          <button
            id="tab-curr-2022"
            onClick={() => setSelectedCurriculumYear(2022)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
              selectedCurriculumYear === 2022
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Kurikulum 2022 (OBE)
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/20">
              {courses.filter((c) => c.curriculumYear === 2022).length} MK
            </span>
          </button>
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Mata Kuliah</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalCourses}</span>
            <span className="text-xs text-slate-500">MK ({totalSks} SKS)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Mata Kuliah Wajib</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{wajibCount}</span>
            <span className="text-xs text-slate-500">MK ({wajibSks} SKS)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Mata Kuliah Pilihan</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{pilihanCount}</span>
            <span className="text-xs text-slate-500">MK ({pilihanSks} SKS)</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Koreksi Admin</span>
            <Edit3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-700">{adminCorrectedCount}</span>
            <span className="text-xs text-slate-500">MK Diverifikasi Admin</span>
          </div>
        </div>
      </div>

      {/* KBK Color Legend */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold uppercase text-slate-700">3 KBK Resmi Teknik Elektro:</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-900 font-medium">
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            <span>KBK Komputer (KOM)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>KBK Sistem Tenaga Listrik (STL)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 font-medium">
            <Radio className="w-3.5 h-3.5 text-sky-600" />
            <span>KBK Elektronika Digital dan Telekomunikasi (ELKOM)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium">
            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lintas KBK (Cross-KBK)</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-course-input"
              type="text"
              placeholder="Cari kode MK, nama, atau silabus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Semester */}
          <div>
            <select
              id="filter-semester"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
            >
              <option value="all">Semua Semester (1–8)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s} {s <= 4 ? '(Paket Dasar Bersama)' : '(KBK / Lanjut)'}
                </option>
              ))}
            </select>
          </div>

          {/* Filter KBK */}
          <div>
            <select
              id="filter-kbk"
              value={selectedKbk}
              onChange={(e) => setSelectedKbk(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
            >
              <option value="all">Semua Bidang KBK</option>
              <option value="kbk-komputer">KBK Komputer (KOM)</option>
              <option value="kbk-sistem-tenaga">KBK Sistem Tenaga Listrik (STL)</option>
              <option value="kbk-elektronika-komunikasi">KBK Elektronika Digital dan Telekomunikasi (ELKOM)</option>
              <option value="cross-kbk">Mata Kuliah Lintas KBK</option>
              <option value="none">Tanpa KBK / Dasar Umum</option>
            </select>
          </div>

          {/* Filter Kategori & Status */}
          <div>
            <select
              id="filter-category-status"
              value={selectedCategory === 'all' ? selectedStatus : selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Wajib' || val === 'Pilihan') {
                  setSelectedCategory(val);
                  setSelectedStatus('all');
                } else if (val === 'needs-review' || val === 'admin-corrected' || val === 'verified') {
                  setSelectedStatus(val);
                  setSelectedCategory('all');
                } else {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }
              }}
              className="w-full py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
            >
              <option value="all">Semua Kategori & Status</option>
              <option value="Wajib">Hanya Wajib (FBS, MPS, MWU, MWK, MPK)</option>
              <option value="Pilihan">Hanya Pilihan (FBA, FBB, FBC, FBD, MKB, MKL)</option>
              <option value="needs-review">Status: Perlu Tinjauan Admin</option>
              <option value="admin-corrected">Status: Telah Dikoreksi Admin</option>
              <option value="verified">Status: Terverifikasi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Table View */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" id="curriculum-courses-table-wrapper">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-600">
              Daftar Mata Kuliah ({filteredCourses.length} dari {courses.length})
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Klik tombol Koreksi untuk mengubah Kategori, KBK, atau Catatan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm" id="curriculum-courses-table">
            <thead>
              <tr className="bg-slate-100 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200">
                <th className="py-3 px-4 w-28">Kode MK</th>
                <th className="py-3 px-4">Nama Mata Kuliah</th>
                <th className="py-3 px-3 w-16 text-center">SKS</th>
                <th className="py-3 px-3 w-16 text-center">Smtr</th>
                <th className="py-3 px-3 w-28">Kurikulum</th>
                <th className="py-3 px-3 w-32">Kategori</th>
                <th className="py-3 px-3 w-48">KBK / Peminatan</th>
                <th className="py-3 px-3 w-36">Status AI</th>
                <th className="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Tidak ada mata kuliah yang cocok dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const isWajib = course.category === 'Wajib';
                  const isCrossKbk = (course.kbkIds || []).length > 1;
                  const isNeedsReview = course.classificationStatus === 'needs-review';
                  const isCorrected = course.classificationStatus === 'admin-corrected';

                  return (
                    <tr
                      key={course.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isNeedsReview ? 'bg-amber-50/40' : ''
                      }`}
                      id={`course-row-${course.id}`}
                    >
                      {/* Kode */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 text-xs">
                        {course.code}
                      </td>

                      {/* Nama & Reason */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{course.name}</div>
                        {(course.classificationReason || course.adminNotes) && (
                          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <Info className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-md">
                              {course.adminNotes || course.classificationReason}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* SKS */}
                      <td className="py-3 px-3 text-center font-bold text-slate-800">
                        {course.sks}
                      </td>

                      {/* Semester */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                          {course.semester}
                        </span>
                      </td>

                      {/* Kurikulum Year */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                            course.curriculumYear === 2026
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {course.curriculumYear === 2026 ? '2026 (Baru)' : '2022 (OBE)'}
                        </span>
                      </td>

                      {/* Kategori & SubKategori */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isWajib
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {course.category}
                          </span>
                          {course.subCategory && (
                            <div className="text-[11px] text-slate-500 leading-tight">
                              {course.subCategory}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* KBK */}
                      <td className="py-3 px-3">
                        {course.kbkIds && course.kbkIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {course.kbkIds.map((kId) => {
                              const kbk = kbks.find((k) => k.id === kId);
                              const isKom = kId === 'kbk-komputer';
                              const isStl = kId === 'kbk-sistem-tenaga';
                              const isElkom = kId === 'kbk-elektronika-komunikasi';

                              return (
                                <span
                                  key={kId}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    isKom
                                      ? 'bg-purple-100 text-purple-800'
                                      : isStl
                                      ? 'bg-amber-100 text-amber-800'
                                      : isElkom
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {kbk?.code || kId}
                                </span>
                              );
                            })}
                            {isCrossKbk && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Lintas KBK
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {course.semester <= 4 ? 'Paket Bersama' : 'Umum / Bebas'}
                          </span>
                        )}
                      </td>

                      {/* Status AI & Confidence */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {isCorrected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                              Koreksi Admin
                            </span>
                          ) : isNeedsReview ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Perlu Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Terverifikasi
                            </span>
                          )}

                          {/* Confidence Score meter */}
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (course.confidenceScore || 90) >= 90
                                    ? 'bg-emerald-500'
                                    : (course.confidenceScore || 90) >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${course.confidenceScore || 90}%` }}
                              />
                            </div>
                            <span>{course.confidenceScore || 90}%</span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isNeedsReview && (
                            <button
                              onClick={() => handleQuickVerify(course.id)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Setujui dan verifikasi rekomendasi AI"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            id={`btn-edit-course-${course.id}`}
                            onClick={() => handleOpenEditModal(course)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            Koreksi
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Classification Correction Modal */}
      <AnimatePresence>
        {editingCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" id="edit-classification-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Koreksi Klasifikasi Mata Kuliah
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingCourse.code} - {editingCourse.name} ({editingCourse.sks} SKS, Semester {editingCourse.semester})
                  </p>
                </div>
                <button
                  onClick={() => setEditingCourse(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm">
                {/* Kategori Wajib / Pilihan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kategori Mata Kuliah:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditCategory('Wajib')}
                      className={`py-2 px-3 rounded-lg font-semibold text-xs border transition-all ${
                        editCategory === 'Wajib'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Wajib (FBS / MPS / MWU / MWK / MPK)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCategory('Pilihan')}
                      className={`py-2 px-3 rounded-lg font-semibold text-xs border transition-all ${
                        editCategory === 'Pilihan'
                          ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      Pilihan (FBA / FBB / FBC / FBD / MKB / MKL)
                    </button>
                  </div>
                </div>

                {/* Sub Kategori */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sub-Kategori:
                  </label>
                  <input
                    type="text"
                    value={editSubCategory}
                    onChange={(e) => setEditSubCategory(e.target.value)}
                    placeholder="Contoh: Wajib Program Studi, Wajib KBK, Pilihan Bebas"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* KBK Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Penetapan Kelompok Bidang Keahlian (KBK):
                  </label>
                  <div className="space-y-2">
                    {kbks.map((kbk) => {
                      const isChecked = editKbkIds.includes(kbk.id);
                      return (
                        <label
                          key={kbk.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-medium'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditKbkIds([...editKbkIds, kbk.id]);
                                } else {
                                  setEditKbkIds(editKbkIds.filter((id) => id !== kbk.id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{kbk.name} ({kbk.code})</span>
                          </div>
                          <span className="text-xs text-slate-500">{kbk.description.slice(0, 45)}...</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Package Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe Paket Kurikulum:
                  </label>
                  <select
                    value={editPackageType}
                    onChange={(e) => setEditPackageType(e.target.value as PackageType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="common">Paket Umum Bersama (Semester 1–4)</option>
                    <option value="kbk">Paket Konsentrasi KBK (Semester 5–8)</option>
                    <option value="cross-kbk">Paket Lintas KBK</option>
                    <option value="elective">Pilihan Bebas</option>
                  </select>
                </div>

                {/* Admin Justification Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Alasan Koreksi Admin:
                  </label>
                  <textarea
                    rows={2}
                    value={editAdminNotes}
                    onChange={(e) => setEditAdminNotes(e.target.value)}
                    placeholder="Contoh: Berdasarkan SK Dekan No. XX, mata kuliah ini masuk peminatan KBK Komputer..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  id="btn-save-classification-correction"
                  onClick={handleSaveCorrection}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Koreksi Admin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
