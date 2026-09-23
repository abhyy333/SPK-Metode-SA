import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Layers,
  BookOpen,
  Plus,
  Trash2,
  Cpu,
  Zap,
  Radio,
  CheckCircle2,
  Info,
  Calendar,
  Users,
  Search,
  Sparkles,
  ChevronRight,
  ArrowRight,
  PlusCircle,
  X,
  Award,
  ListFilter,
  Check,
  Compass,
  Grid,
  Filter,
} from 'lucide-react';
import {
  CurriculumPackage,
  Course,
  KBK,
  Curriculum,
  CoursePackageItem,
  ElectiveSlot,
} from '../types';
import { StorageService } from '../services/storageService';
import {
  INITIAL_CURRICULUM_PACKAGES,
  INITIAL_ELECTIVE_SLOTS,
  STL_2026_ELECTIVE_POOL,
} from '../data/curriculumDataset';
import {
  calculateDegreeCreditTrack,
  evaluateStudentElectiveCredits,
} from '../services/curriculumEvaluationService';

export const CurriculumPackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<CurriculumPackage[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [kbks, setKbks] = useState<KBK[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [selectedCurriculumYear, setSelectedCurriculumYear] = useState<2026 | 2022>(2026);
  // Default: 'all' to show all packages across semesters 1 to 8
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<number | 'all'>('all');
  const [selectedKbkTab, setSelectedKbkTab] = useState<string>('all');
  const [packageSearchQuery, setPackageSearchQuery] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Add course to package modal
  const [targetPackage, setTargetPackage] = useState<CurriculumPackage | null>(null);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');

  // Elective slot detail modal
  const [selectedElectiveSlot, setSelectedElectiveSlot] = useState<ElectiveSlot | null>(null);

  // Degree Track Audit modal
  const [auditKbkId, setAuditKbkId] = useState<string>('kbk-stl');
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPackages(StorageService.getCurriculumPackages());
    setCourses(StorageService.getCourses());
    setKbks(StorageService.getKbks());
    setCurricula(StorageService.getCurricula());
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRemoveItemFromPackage = (pkgId: string, itemIdx: number) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (!pkg) return;

    let updatedCourseItems: CoursePackageItem[] = [];
    let updatedCourseIds: string[] = [];

    if (pkg.courseItems && pkg.courseItems.length > 0) {
      updatedCourseItems = pkg.courseItems.filter((_, idx) => idx !== itemIdx);
      updatedCourseIds = updatedCourseItems.map((it) => it.courseId || it.slotId || '');
    } else {
      updatedCourseIds = pkg.courseIds.filter((_, idx) => idx !== itemIdx);
    }

    const calculatedSks =
      updatedCourseItems.length > 0
        ? updatedCourseItems.reduce((sum, it) => sum + it.credits, 0)
        : updatedCourseIds
            .map((id) => courses.find((c) => c.id === id || c.code === id)?.sks || 0)
            .reduce((a, b) => a + b, 0);

    const updatedPkg: CurriculumPackage = {
      ...pkg,
      courseItems: updatedCourseItems.length > 0 ? updatedCourseItems : undefined,
      courseIds: updatedCourseIds,
      totalSks: calculatedSks,
      totalCredits: calculatedSks,
    };

    StorageService.updateCurriculumPackage(updatedPkg);
    loadData();
    showNotification('Mata kuliah / slot berhasil dikeluarkan dari paket.');
  };

  const handleAddCourseToPackage = (pkg: CurriculumPackage, course: Course) => {
    if (pkg.courseIds.includes(course.id)) {
      showNotification('Mata kuliah sudah ada di dalam paket ini!');
      return;
    }

    const newItem: CoursePackageItem = {
      type: 'course',
      courseId: course.id,
      courseCode: course.code,
      courseName: course.name,
      credits: course.sks,
      isElective: course.category === 'Pilihan',
      kbkId: course.kbkIds?.[0] || undefined,
    };

    const updatedCourseItems = pkg.courseItems ? [...pkg.courseItems, newItem] : [newItem];
    const updatedCourseIds = [...pkg.courseIds, course.id];
    const calculatedSks = updatedCourseItems.reduce((sum, it) => sum + it.credits, 0);

    const updatedPkg: CurriculumPackage = {
      ...pkg,
      courseItems: updatedCourseItems,
      courseIds: updatedCourseIds,
      totalSks: calculatedSks,
      totalCredits: calculatedSks,
    };

    StorageService.updateCurriculumPackage(updatedPkg);
    loadData();
    setTargetPackage(null);
    showNotification(`Mata kuliah ${course.name} berhasil ditambahkan ke paket ${pkg.name}.`);
  };

  const handleResetPackages = () => {
    if (window.confirm('Reset seluruh paket kurikulum ke Master Package resmi Teknik Elektro UNRAM (Source of Truth)?')) {
      StorageService.saveCurriculumPackages(INITIAL_CURRICULUM_PACKAGES);
      loadData();
      showNotification('Seluruh paket kurikulum berhasil direset ke Master Package.');
    }
  };

  // Filter packages for selected curriculum year, semester, KBK, and query
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Must match active curriculum year
      if (pkg.curriculumYear !== selectedCurriculumYear) return false;

      // Semester filter ('all' or 1..8)
      if (selectedSemesterFilter !== 'all' && pkg.semester !== selectedSemesterFilter) {
        return false;
      }

      // KBK filter
      if (selectedKbkTab !== 'all') {
        if (selectedKbkTab === 'common') {
          if (!pkg.isCommonPackage && pkg.packageType !== 'common') return false;
        } else {
          if (pkg.kbkId !== selectedKbkTab) return false;
        }
      }

      // Query filter
      if (packageSearchQuery.trim()) {
        const q = packageSearchQuery.toLowerCase();
        const matchCode = (pkg.code || '').toLowerCase().includes(q);
        const matchName = (pkg.name || '').toLowerCase().includes(q);
        const matchDesc = (pkg.description || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDesc) return false;
      }

      return true;
    });
  }, [packages, selectedCurriculumYear, selectedSemesterFilter, selectedKbkTab, packageSearchQuery]);

  // Group filtered packages by semester for easy scanning when 'all' is selected
  const packagesBySemester = useMemo(() => {
    const map = new Map<number, CurriculumPackage[]>();
    for (let sem = 1; sem <= 8; sem++) {
      map.set(sem, []);
    }
    for (const pkg of filteredPackages) {
      const list = map.get(pkg.semester) || [];
      list.push(pkg);
      map.set(pkg.semester, list);
    }
    return map;
  }, [filteredPackages]);

  // Active KBKs for current curriculum year
  const activeKbks = kbks.filter((k) => k.curriculumYear === selectedCurriculumYear && k.isActive);

  // Overall Statistics for the selected Curriculum
  const stats = useMemo(() => {
    const curPkgs = packages.filter((p) => p.curriculumYear === selectedCurriculumYear);
    const totalPackages = curPkgs.length;
    const totalSksAll = curPkgs.reduce((sum, p) => sum + (p.totalSks || p.totalCredits || 0), 0);
    const avgSks = totalPackages > 0 ? Math.round(totalSksAll / totalPackages) : 0;
    const commonPkgsCount = curPkgs.filter((p) => p.isCommonPackage || p.packageType === 'common').length;
    const kbkPkgsCount = curPkgs.filter((p) => !p.isCommonPackage && p.packageType !== 'common').length;

    return {
      totalPackages,
      avgSks,
      commonPkgsCount,
      kbkPkgsCount,
      targetCredits: selectedCurriculumYear === 2026 ? 144 : 146,
    };
  }, [packages, selectedCurriculumYear]);

  // Degree track evaluation
  const degreeAudit = calculateDegreeCreditTrack(selectedCurriculumYear, auditKbkId);

  return (
    <div className="space-y-6" id="curriculum-packages-page">
      {/* Toast Notification */}
      {notification && (
        <div
          className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border bg-slate-900 text-white border-slate-700 flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200"
          id="package-toast"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Package className="w-3.5 h-3.5" />
                Master Package Kurikulum Teknik Elektro
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" />
                Source of Truth
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              Kurikulum, KBK & Paket Semester
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl mt-1 leading-relaxed">
              Seluruh struktur paket akademik resmi Teknik Elektro UNRAM. Semester 1–4 merupakan <strong>Paket Bersama</strong> (fondasi wajib),
              sedangkan Semester 5–8 terdistribusi ke dalam <strong>3 Jalur KBK</strong> (Komputer, STL, ELKOM) serta mata kuliah pilihan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-open-audit-track"
              onClick={() => {
                setAuditKbkId(selectedCurriculumYear === 2026 ? 'kbk-stl' : 'kbk-sistem-tenaga');
                setShowAuditModal(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors flex items-center gap-1.5"
            >
              <Award className="w-4 h-4" />
              Audit Total SKS Kelulusan ({stats.targetCredits} SKS)
            </button>
            <button
              id="btn-reset-master-packages"
              onClick={handleResetPackages}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl border border-slate-300 transition-colors"
            >
              Reset ke Master Package
            </button>
          </div>
        </div>

        {/* Curriculum Version Selector */}
        <div className="mt-6 border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-slate-500 mr-1">Versi Kurikulum:</span>
            <button
              id="pkg-tab-curr-2026"
              onClick={() => {
                setSelectedCurriculumYear(2026);
                setSelectedKbkTab('all');
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
                selectedCurriculumYear === 2026
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Kurikulum 2026 (144 SKS · 3 Jalur KBK)
            </button>
            <button
              id="pkg-tab-curr-2022"
              onClick={() => {
                setSelectedCurriculumYear(2022);
                setSelectedKbkTab('all');
              }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${
                selectedCurriculumYear === 2022
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Kurikulum 2022 OBE (146 SKS)
            </button>
          </div>

          <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            Kurikulum Terkait: <strong className="text-slate-900">Kurikulum {selectedCurriculumYear}</strong> ({stats.totalPackages} Paket Terdaftar)
          </div>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Package Terdaftar</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats.totalPackages} Paket</div>
          <p className="text-[11px] text-slate-500 mt-1">Lengkap Semester 1 s.d. Semester 8</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paket Bersama (Wajib)</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <BookOpen className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono">{stats.commonPkgsCount} Paket</div>
          <p className="text-[11px] text-slate-500 mt-1">Semester 1–4 (Fondasi) & Semester 8</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paket Spesialisasi KBK</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
              <Cpu className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2 font-mono">{stats.kbkPkgsCount} Paket</div>
          <p className="text-[11px] text-slate-500 mt-1">Semester 5, 6, 7 (KOM, STL, ELKOM)</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Beban SKS Rata-Rata</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs">
              <Award className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2 font-mono">{stats.avgSks} SKS / Paket</div>
          <p className="text-[11px] text-slate-500 mt-1">Target Kelulusan: {stats.targetCredits} SKS</p>
        </div>
      </div>

      {/* Semester Navigator Tabs (All, 1, 2, 3, 4, 5, 6, 7, 8) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm">
        <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filter Paket Semester</span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan: <strong className="text-indigo-600">{filteredPackages.length}</strong> dari {stats.totalPackages} paket kurikulum
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2" id="semester-nav-pills">
          {/* ALL SEMESTERS TAB */}
          <button
            id="sem-tab-all"
            onClick={() => {
              setSelectedSemesterFilter('all');
              setSelectedKbkTab('all');
            }}
            className={`py-2.5 px-3 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
              selectedSemesterFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-700/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1">
              <Grid className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Semua Paket</span>
            </div>
            <span className={`text-[10px] font-medium mt-0.5 ${selectedSemesterFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              (Semester 1–8)
            </span>
            <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.2 rounded ${selectedSemesterFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {stats.totalPackages} Paket
            </span>
          </button>

          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
            const isSelected = selectedSemesterFilter === sem;
            const isCommon = sem <= 4 || sem === 8;
            const pkgsInSem = packages.filter(
              (p) => p.curriculumYear === selectedCurriculumYear && p.semester === sem
            );
            const totalSksSample = pkgsInSem[0]?.totalSks || pkgsInSem[0]?.totalCredits || 0;

            return (
              <button
                key={sem}
                id={`sem-tab-${sem}`}
                onClick={() => {
                  setSelectedSemesterFilter(sem);
                  setSelectedKbkTab('all');
                }}
                className={`py-2.5 px-3 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
                  isSelected
                    ? isCommon
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Smtr {sem}
                  </span>
                </div>
                <span className={`text-[11px] font-medium mt-0.5 ${isSelected ? 'text-white/85' : 'text-slate-500'}`}>
                  {sem <= 4 ? 'Bersama' : sem === 8 ? 'Tugas Akhir' : '3 KBK'}
                </span>
                <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.2 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'}`}>
                  {totalSksSample} SKS ({pkgsInSem.length} pkt)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Filters: Search Query & KBK Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama paket, kode paket (misal: PKG-2026-S5-KOM)..."
              value={packageSearchQuery}
              onChange={(e) => setPackageSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {packageSearchQuery && (
              <button
                onClick={() => setPackageSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* KBK Filter Pill Selector */}
        <div className="flex flex-wrap items-center gap-1.5 border-t md:border-t-0 pt-3 md:pt-0">
          <span className="text-xs font-semibold text-slate-500 mr-1">Filter Jalur:</span>
          <button
            onClick={() => setSelectedKbkTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              selectedKbkTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Paket
          </button>
          <button
            onClick={() => setSelectedKbkTab('common')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              selectedKbkTab === 'common'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Paket Bersama
          </button>
          <button
            onClick={() => setSelectedKbkTab(selectedCurriculumYear === 2026 ? 'kbk-stl' : 'kbk-sistem-tenaga')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              selectedKbkTab === 'kbk-stl' || selectedKbkTab === 'kbk-sistem-tenaga'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            STL
          </button>
          <button
            onClick={() => setSelectedKbkTab(selectedCurriculumYear === 2026 ? 'kbk-komputer' : 'kbk-komputer')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              selectedKbkTab === 'kbk-komputer'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            KOM
          </button>
          <button
            onClick={() => setSelectedKbkTab(selectedCurriculumYear === 2026 ? 'kbk-elkom' : 'kbk-elektronika-komunikasi')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              selectedKbkTab === 'kbk-elkom' || selectedKbkTab === 'kbk-elektronika-komunikasi'
                ? 'bg-sky-600 text-white'
                : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            ELKOM
          </button>
        </div>
      </div>

      {/* Packages Grid / Cards (Iterates over all filtered packages via .map()) */}
      <div className="space-y-8" id="packages-display-container">
        {filteredPackages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Tidak ada paket kurikulum yang cocok dengan kriteria filter.</p>
            <p className="text-xs text-slate-400 mt-1">
              Sesuaikan kata kunci pencarian atau gunakan tombol "Reset ke Master Package".
            </p>
          </div>
        ) : selectedSemesterFilter === 'all' ? (
          // Grouped Display by Semester when ALL is selected
          [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
            const semPkgs = packagesBySemester.get(sem) || [];
            if (semPkgs.length === 0) return null;

            const isFoundation = sem <= 4;
            const isTa = sem === 8;

            return (
              <div key={sem} className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isFoundation
                          ? 'bg-emerald-100 text-emerald-800'
                          : isTa
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      S{sem}
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      Semester {sem} — {isFoundation ? 'Paket Wajib Bersama' : isTa ? 'Tugas Akhir / Proyek Akhir' : 'Paket Spesialisasi KBK & Pilihan'}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {semPkgs.length} Paket Tersedia
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {semPkgs.map((pkg) => renderPackageCard(pkg))}
                </div>
              </div>
            );
          })
        ) : (
          // Flat Grid for Specific Single Semester
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => renderPackageCard(pkg))}
          </div>
        )}
      </div>

      {/* Audit Total SKS Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Audit Total SKS Kelulusan Kurikulum {selectedCurriculumYear}
                </h3>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-slate-700">
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-1">
                <div className="font-bold text-indigo-950 text-sm font-mono">
                  Struktur Kelulusan: {degreeAudit.totalTrackSks} / {degreeAudit.targetGraduationSks} SKS
                </div>
                <p className="text-indigo-800/80">
                  {selectedCurriculumYear === 2026
                    ? 'Kurikulum 2026: 144 SKS wajib lulus. 134 SKS Wajib & Spesialisasi KBK + 10 SKS Mata Kuliah Pilihan diambil (8 SKS terbaik dihitung kelulusan).'
                    : 'Kurikulum 2022 OBE: 146 SKS total kelulusan sarjana Teknik Elektro.'}
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Semester</th>
                      <th className="py-2 px-3">Paket Kurikulum</th>
                      <th className="py-2 px-3 text-right">Beban SKS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {degreeAudit.semesterBreakdown.map((row) => (
                      <tr key={row.semester} className="hover:bg-slate-50/60">
                        <td className="py-1.5 px-3 font-semibold text-slate-900">Semester {row.semester}</td>
                        <td className="py-1.5 px-3 text-slate-700">{row.packageName}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">{row.sks} SKS</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/50 font-bold">
                      <td className="py-2 px-3 text-indigo-950" colSpan={2}>Total SKS Jalur {auditKbkId.replace('kbk-', '').toUpperCase()}</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-950">{degreeAudit.totalTrackSks} SKS</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elective Slot Detail Modal */}
      {selectedElectiveSlot && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">{selectedElectiveSlot.name || selectedElectiveSlot.slotName}</h3>
              <button onClick={() => setSelectedElectiveSlot(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Slot pilihan semester {selectedElectiveSlot.packageSemester} ({selectedElectiveSlot.credits} SKS). Mahasiswa dapat memilih mata kuliah dari pool pilihan di bawah ini.
              </p>
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Mata Kuliah Pilihan Tersedia ({selectedElectiveSlot.availableCourseIds?.length || selectedElectiveSlot.allowedCourseIds?.length || 0}):
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {(selectedElectiveSlot.availableCourseIds || selectedElectiveSlot.allowedCourseIds || []).map((cId) => {
                  const courseObj = courses.find((c) => c.id === cId || c.code === cId);
                  return (
                    <div
                      key={cId}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {courseObj?.code || cId} - {courseObj?.name || cId}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {courseObj?.category || 'Pilihan'} · {courseObj?.semester ? `Semester ${courseObj.semester}` : ''}
                        </div>
                      </div>
                      <span className="font-bold font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {courseObj?.sks || 2} SKS
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedElectiveSlot(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course to Package Modal */}
      {targetPackage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tambah MK ke {targetPackage.name}</h3>
              <button onClick={() => setTargetPackage(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Cari mata kuliah..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {courses
                  .filter((c) => {
                    if (targetPackage.courseIds.includes(c.id)) return false;
                    if (!courseSearchQuery) return true;
                    return (
                      c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
                      c.code.toLowerCase().includes(courseSearchQuery.toLowerCase())
                    );
                  })
                  .slice(0, 15)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">
                          {c.code} - {c.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {c.sks} SKS · Semester {c.semester} · {c.category}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddCourseToPackage(targetPackage, c)}
                        className="px-2.5 py-1 bg-indigo-600 text-white font-semibold rounded-md text-xs hover:bg-indigo-700"
                      >
                        Pilih
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderPackageCard(pkg: CurriculumPackage) {
    const isKom = pkg.kbkId === 'kbk-komputer';
    const isStl = pkg.kbkId === 'kbk-stl' || pkg.kbkId === 'kbk-sistem-tenaga';
    const isElkom = pkg.kbkId === 'kbk-elkom' || pkg.kbkId === 'kbk-elektronika-komunikasi';
    const isCommon = pkg.isCommonPackage || pkg.packageType === 'common';

    const items: CoursePackageItem[] =
      pkg.courseItems && pkg.courseItems.length > 0
        ? pkg.courseItems
        : pkg.courseIds.map((cId) => {
            const found = courses.find((c) => c.id === cId || c.code === cId);
            return {
              type: 'course' as const,
              courseId: found?.id || cId,
              courseCode: found?.code || cId,
              courseName: found?.name || cId,
              credits: found?.sks || 0,
              isElective: found?.category === 'Pilihan',
              kbkId: found?.kbkIds?.[0] || undefined,
            };
          });

    const calculatedSks = items.reduce((sum, item) => sum + item.credits, 0);

    return (
      <div
        key={pkg.id}
        id={`package-card-${pkg.id}`}
        className={`bg-white rounded-2xl border transition-all shadow-sm flex flex-col justify-between ${
          isKom
            ? 'border-purple-200 hover:border-purple-300'
            : isStl
            ? 'border-amber-200 hover:border-amber-300'
            : isElkom
            ? 'border-sky-200 hover:border-sky-300'
            : 'border-emerald-200 hover:border-emerald-300'
        }`}
      >
        <div>
          {/* Card Header */}
          <div
            className={`p-5 rounded-t-2xl border-b ${
              isKom
                ? 'bg-purple-50/70 border-purple-100 text-purple-950'
                : isStl
                ? 'bg-amber-50/70 border-amber-100 text-amber-950'
                : isElkom
                ? 'bg-sky-50/70 border-sky-100 text-sky-950'
                : 'bg-emerald-50/70 border-emerald-100 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-white/90 border border-slate-200/60 text-slate-800">
                  {pkg.code}
                </span>
                {pkg.isLocked ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-800 border border-emerald-600/20 flex items-center gap-1">
                    <span>🔒 Master Terkunci</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-800 border border-indigo-600/20">
                    Master KBK
                  </span>
                )}
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                {calculatedSks} SKS Total
              </span>
            </div>

            <h3 className="text-base font-bold mt-2.5 flex items-center gap-2">
              {isKom && <Cpu className="w-4 h-4 text-purple-600 shrink-0" />}
              {isStl && <Zap className="w-4 h-4 text-amber-600 shrink-0" />}
              {isElkom && <Radio className="w-4 h-4 text-sky-600 shrink-0" />}
              {isCommon && <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span>{pkg.name}</span>
            </h3>

            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {pkg.description ||
                (pkg.isLocked
                  ? `Paket Wajib Dasar Semester ${pkg.semester} (${calculatedSks} SKS Source of Truth, tidak terikat KBK).`
                  : '')}
            </p>
          </div>

          {/* Course Items List inside Package */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              <span>Mata Kuliah / Slot Paket ({items.length})</span>
              <span>SKS / Tipe</span>
            </div>

            {items.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Belum ada mata kuliah dalam paket ini.
              </div>
            ) : (
              items.map((item, idx) => {
                const isElectiveSlot = item.type === 'elective-slot';
                const slotDef = isElectiveSlot
                  ? INITIAL_ELECTIVE_SLOTS.find((s) => s.id === item.slotId)
                  : null;

                return (
                  <div
                    key={`${item.courseCode || item.slotId || idx}-${idx}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors group ${
                      isElectiveSlot
                        ? 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50'
                        : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-400 mt-0.5">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-xs font-bold ${
                              isElectiveSlot ? 'text-amber-900' : 'text-indigo-900'
                            }`}
                          >
                            {item.courseCode || 'SLOT-MK-PIL'}
                          </span>
                          {isElectiveSlot ? (
                            <button
                              onClick={() => slotDef && setSelectedElectiveSlot(slotDef)}
                              className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-200/80 text-amber-900 border border-amber-300 flex items-center gap-1 hover:bg-amber-300 transition-colors"
                              title="Klik untuk melihat pool mata kuliah pilihan"
                            >
                              <span>⚡ Slot MK Pilihan</span>
                              <Info className="w-2.5 h-2.5" />
                            </button>
                          ) : (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                item.isElective
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.isElective ? 'Pilihan' : 'Wajib'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-800 truncate mt-0.5">
                          {item.courseName}
                        </div>
                        {isElectiveSlot && slotDef && (
                          <div className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1">
                            <span>Tersedia {slotDef.availableCourseIds.length} pilihan mata kuliah aktual</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">
                        {item.credits} SKS
                      </span>
                      {!pkg.isLocked && (
                        <button
                          onClick={() => handleRemoveItemFromPackage(pkg.id, idx)}
                          className="p-1 text-slate-300 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Hapus dari paket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span>Semester: <strong className="text-slate-800">{pkg.semester}</strong></span>
            <span>·</span>
            <span>Kurikulum <strong className="text-slate-800">{pkg.curriculumYear}</strong></span>
          </div>

          {!pkg.isLocked && (
            <button
              onClick={() => {
                setTargetPackage(pkg);
                setCourseSearchQuery('');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah MK</span>
            </button>
          )}
        </div>
      </div>
    );
  }
};

export default CurriculumPackagesPage;
