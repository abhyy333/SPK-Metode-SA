import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Layers,
  BookOpen,
  Plus,
  Trash2,
  Cpu,
  Zap,
  Radio,
  Share2,
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
  const [selectedSemester, setSelectedSemester] = useState<number>(5);
  const [selectedKbkTab, setSelectedKbkTab] = useState<string>('all');
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

    const calculatedSks = updatedCourseItems.length > 0
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

  // Filter packages by Curriculum Year and Semester
  const filteredPackages = packages.filter((pkg) => {
    if (pkg.curriculumYear !== selectedCurriculumYear) return false;
    if (pkg.semester !== selectedSemester) return false;
    if (selectedKbkTab !== 'all') {
      if (selectedKbkTab === 'common') {
        if (!pkg.isCommonPackage) return false;
      } else {
        if (pkg.kbkId !== selectedKbkTab) return false;
      }
    }
    return true;
  });

  const isFoundationSemester = selectedSemester <= 4;
  const isTaSemester = selectedSemester === 8;

  // Active KBKs for current curriculum year
  const activeKbks = kbks.filter((k) => k.curriculumYear === selectedCurriculumYear && k.isActive);

  // Degree track evaluation
  const degreeAudit = calculateDegreeCreditTrack(selectedCurriculumYear, auditKbkId);

  return (
    <div className="space-y-6" id="curriculum-packages-page">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl border bg-slate-900 text-white border-slate-700 flex items-center gap-3 text-sm font-medium"
            id="package-toast"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
              Paket Semester & Kelompok Bidang Keahlian (KBK)
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl mt-1 leading-relaxed">
              Struktur paket akademik resmi Teknik Elektro UNRAM. Semester 1–4 merupakan <strong>Paket Bersama</strong> (fondasi wajib tanpa KBK),
              sedangkan Semester 5–8 terdistribusi ke dalam <strong>3 Jalur KBK</strong> (Komputer, STL, ELKOM) serta mata kuliah pilihan (10 SKS diambil, 8 SKS terbaik dihitung kelulusan).
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
              Audit Total SKS Kelulusan (144 / 146)
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
              Kurikulum 2026 (Angkatan 2024+ · 144 SKS · 3 KBK)
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
              Kurikulum 2022 OBE (Angkatan 2023 · 146 SKS)
            </button>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            Total {packages.filter((p) => p.curriculumYear === selectedCurriculumYear).length} Paket Resmi Terdaftar
          </div>
        </div>
      </div>

      {/* Semester Navigator Tabs (1 to 8) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-sm">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2" id="semester-nav-pills">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
            const isSelected = selectedSemester === sem;
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
                  setSelectedSemester(sem);
                  setSelectedKbkTab('all');
                }}
                className={`py-3 px-3 rounded-xl text-center transition-all flex flex-col items-center justify-center border ${
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
                  {sem <= 4 ? 'Paket Bersama' : sem === 8 ? 'Tugas Akhir' : '3 Jalur KBK'}
                </span>
                <span className={`text-[10px] font-semibold mt-1 px-1.5 py-0.2 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-600'}`}>
                  {totalSksSample} SKS
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Semester Info & KBK Sub-filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${
              isFoundationSemester
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : isTaSemester
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
            }`}
          >
            S{selectedSemester}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isFoundationSemester
                ? `Semester ${selectedSemester}: Paket Wajib Bersama (Fondasi Teknik Elektro)`
                : isTaSemester
                ? `Semester ${selectedSemester}: Paket Proyek Akhir / Skripsi & Seminar`
                : `Semester ${selectedSemester}: Paket Spesialisasi Kelompok Bidang Keahlian (KBK)`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isFoundationSemester
                ? 'Seluruh mahasiswa angkatan wajib mengambil seluruh paket mata kuliah ini secara serentak tanpa pembagian konsentrasi.'
                : isTaSemester
                ? 'Penyelesaian skripsi / proyek akhir dan mata kuliah kewirausahaan/etika profesi.'
                : 'Mahasiswa memilih mata kuliah spesialisasi KBK dan mata kuliah pilihan (10 SKS total pilihan, 8 SKS terbaik dinilai kelulusan).'}
            </p>
          </div>
        </div>

        {/* KBK filter if Semester 5-7 */}
        {!isFoundationSemester && !isTaSemester && (
          <div className="flex flex-wrap items-center gap-1.5 border-t md:border-t-0 pt-3 md:pt-0">
            <span className="text-xs font-semibold text-slate-500 mr-1">Tampilkan:</span>
            <button
              onClick={() => setSelectedKbkTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedKbkTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua KBK
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
        )}
      </div>

      {/* Packages Grid / Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="packages-cards-grid">
        {filteredPackages.length === 0 ? (
          <div className="col-span-3 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">Tidak ada paket kurikulum untuk filter ini.</p>
            <p className="text-xs text-slate-400 mt-1">
              Gunakan tombol "Reset ke Master Package" untuk memuat paket kurikulum rekomendasi Teknik Elektro UNRAM.
            </p>
          </div>
        ) : (
          filteredPackages.map((pkg) => {
            const isKom = pkg.kbkId === 'kbk-komputer';
            const isStl = pkg.kbkId === 'kbk-stl' || pkg.kbkId === 'kbk-sistem-tenaga';
            const isElkom = pkg.kbkId === 'kbk-elkom' || pkg.kbkId === 'kbk-elektronika-komunikasi';
            const isCommon = pkg.isCommonPackage || pkg.packageType === 'common';

            // Extract items: use courseItems if available, otherwise fallback to courseIds
            const items: CoursePackageItem[] = pkg.courseItems && pkg.courseItems.length > 0
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
                    kbkId: found?.kbkId || undefined,
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
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
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
                      {pkg.description || (pkg.isLocked ? `Paket Wajib Dasar Semester ${pkg.semester} (${calculatedSks} SKS Source of Truth, tidak terikat KBK).` : '')}
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
                                  <span className={`font-mono text-xs font-bold ${isElectiveSlot ? 'text-amber-900' : 'text-indigo-900'}`}>
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
                              <span className="text-xs font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200">
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
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Target: Semester {pkg.semester}</span>
                  </div>

                  {pkg.isLocked ? (
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <span>✓ Paket Standar Baku</span>
                    </span>
                  ) : (
                    <button
                      id={`btn-add-course-to-pkg-${pkg.id}`}
                      onClick={() => {
                        setTargetPackage(pkg);
                        setCourseSearchQuery('');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah MK
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Elective Slot Detail Modal */}
      <AnimatePresence>
        {selectedElectiveSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" id="elective-slot-pool-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {selectedElectiveSlot.code}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {selectedElectiveSlot.sks} SKS
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {selectedElectiveSlot.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mata Kuliah Pilihan Paket Semester {selectedElectiveSlot.packageSemester} ({selectedElectiveSlot.academicYear})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedElectiveSlot(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Aturan Pengambilan & Evaluasi MK Pilihan:</p>
                  <p className="mt-0.5 text-amber-800">
                    Mahasiswa dapat memilih mata kuliah aktual dari pool di bawah ini. Dari total 10 SKS mata kuliah pilihan yang dapat diambil, hanya 8 SKS terbaik yang dihitung ke total kelulusan.
                  </p>
                </div>
              </div>

              {/* Elective Pool List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-80">
                <span className="text-xs font-bold uppercase text-slate-500">
                  Pool Mata Kuliah Pilihan yang Tersedia ({selectedElectiveSlot.availableCourseIds.length}):
                </span>
                {selectedElectiveSlot.availableCourseIds.map((cId) => {
                  const course = courses.find((c) => c.id === cId || c.code === cId);
                  return (
                    <div
                      key={cId}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-900">
                            {course?.code || cId}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {course?.sks || selectedElectiveSlot.sks} SKS
                          </span>
                          {course?.semester && (
                            <span className="text-[11px] text-slate-400">
                              Semester {course.semester}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-medium text-slate-800 mt-0.5">
                          {course?.name || cId}
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                        Opsi Pilihan
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedElectiveSlot(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Degree Track Audit Modal */}
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" id="degree-track-audit-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Audit Total SKS Kelulusan Jalur KBK
                    </h3>
                    <p className="text-xs text-slate-500">
                      Kurikulum {selectedCurriculumYear} · Target: {degreeAudit.targetGraduationSks} SKS Kelulusan
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KBK Track Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Pilih Jalur KBK:</span>
                {activeKbks.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setAuditKbkId(k.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      auditKbkId === k.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {k.name} ({k.code})
                  </button>
                ))}
              </div>

              {/* Breakdown Table */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                      <tr>
                        <th className="p-3">Semester</th>
                        <th className="p-3">Nama Paket</th>
                        <th className="p-3">Tipe Paket</th>
                        <th className="p-3 text-right">Beban SKS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {degreeAudit.semesterBreakdown.map((item) => (
                        <tr key={item.semester} className="hover:bg-slate-50/60">
                          <td className="p-3 font-bold text-slate-900">Semester {item.semester}</td>
                          <td className="p-3 font-medium text-slate-800">{item.packageName}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                item.isCommon
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {item.isCommon ? 'Wajib Bersama' : 'Spesialisasi KBK'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">{item.sks} SKS</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-bold">
                      <tr>
                        <td colSpan={3} className="p-3 text-right uppercase tracking-wider">
                          Total SKS Terstruktur (Semester 1–8):
                        </td>
                        <td className="p-3 text-right text-sm text-emerald-400">
                          {degreeAudit.totalTrackSks} SKS
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Status Card */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Integritas SKS Kurikulum Terpenuhi</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    Total paket SKS terstruktur ({degreeAudit.totalTrackSks} SKS) telah mencakup seluruh mata kuliah wajib bersama dan spesialisasi KBK. Dari total 10 SKS mata kuliah pilihan, sistem menetapkan 8 SKS terbaik untuk pemenuhan syarat kelulusan {degreeAudit.targetGraduationSks} SKS.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Add Course to Package */}
      <AnimatePresence>
        {targetPackage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" id="add-course-to-package-modal">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tambahkan Mata Kuliah ke Paket
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paket: <span className="font-semibold text-indigo-700">{targetPackage.name}</span> ({targetPackage.code})
                  </p>
                </div>
                <button
                  onClick={() => setTargetPackage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau kode mata kuliah..."
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Course Selection List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-96">
                {courses
                  .filter((c) => {
                    if (targetPackage.courseIds.includes(c.id)) return false;
                    if (courseSearchQuery.trim()) {
                      const q = courseSearchQuery.toLowerCase();
                      return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
                    }
                    return true;
                  })
                  .map((course) => (
                    <div
                      key={course.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {course.code}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {course.sks} SKS
                          </span>
                          <span className="text-xs text-slate-400">
                            Smtr {course.semester}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-800 mt-0.5">
                          {course.name}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddCourseToPackage(targetPackage, course)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1 shrink-0 ml-3"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Pilih
                      </button>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-end border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setTargetPackage(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
