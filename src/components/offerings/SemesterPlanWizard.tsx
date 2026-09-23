import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Calendar,
  Layers,
  BookOpen,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Check,
  X,
  Search,
  Users,
  Building,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react';
import {
  Course,
  CurriculumPackage,
  Lecturer,
  KBK,
  CourseOffering,
  CoursePackageItem,
} from '../../types';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import {
  createBalancedSections,
  validateStudentCount,
  MIN_STUDENTS_PER_CLASS,
  MAX_STUDENTS_PER_CLASS,
  BalancedSectionItem,
} from '../../utils/sectionSplitting';
import {
  CourseOfferingGeneratorService,
  CoursePlanningItem,
  GenerationReport,
} from '../../services/courseOfferingGeneratorService';
import { MasterLecturerImportService } from '../../services/masterLecturerImportService';

interface SemesterPlanWizardProps {
  curriculumPackages: CurriculumPackage[];
  courses: Course[];
  lecturers: Lecturer[];
  kbks: KBK[];
  onApplyPlan: (report: GenerationReport, replaceExisting: boolean) => void;
  onCancel?: () => void;
}

export const SemesterPlanWizard: React.FC<SemesterPlanWizardProps> = ({
  curriculumPackages,
  courses,
  lecturers,
  kbks,
  onApplyPlan,
  onCancel,
}) => {
  const { showToast } = useToast();

  // Step 1: Global Parameters
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');
  const [academicTerm, setAcademicTerm] = useState<'ganjil' | 'genap'>('ganjil');
  const [curriculumYear, setCurriculumYear] = useState<2026 | 2022>(2026);
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [selectedKbkId, setSelectedKbkId] = useState<string>('all');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);

  // Step 2: Selected Planning Items keyed by unique course identifier (courseId)
  // Default values populated from packages when user changes filters
  const [plannedCourses, setPlannedCourses] = useState<Record<string, CoursePlanningItem>>({});

  // Search & Filter within Wizard
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Modal: Add Custom Course from Master
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState<boolean>(false);
  const [customCourseSearch, setCustomCourseSearch] = useState<string>('');
  const [customCourseSemester, setCustomCourseSemester] = useState<number>(1);
  const [customCourseKbk, setCustomCourseKbk] = useState<string>('');
  const [customCourseStudents, setCustomCourseStudents] = useState<number>(40);

  // Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);

  // Maps
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>(courses.map((c) => [c.id, c]));
    courses.forEach((c) => {
      if (c.code) map.set(c.code, c);
    });
    return map;
  }, [courses]);

  const lecturerMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);

  // Determine active semesters based on term
  const termSemesters = useMemo(() => {
    return academicTerm === 'ganjil' ? [1, 3, 5, 7] : [2, 4, 6, 8];
  }, [academicTerm]);

  // Available packages matching current filter
  const relevantPackages = useMemo(() => {
    return curriculumPackages.filter((pkg) => {
      if (pkg.curriculumYear !== curriculumYear) return false;
      if (!termSemesters.includes(pkg.semester)) return false;
      if (selectedSemester !== 'all' && pkg.semester !== selectedSemester) return false;
      if (selectedKbkId !== 'all') {
        if (pkg.semester >= 5 && pkg.kbkId && pkg.kbkId !== selectedKbkId) return false;
      }
      return true;
    });
  }, [curriculumPackages, curriculumYear, termSemesters, selectedSemester, selectedKbkId]);

  // Populate reference courses from relevant packages
  const handleLoadPackageDefaults = () => {
    const newPlanned: Record<string, CoursePlanningItem> = {};

    relevantPackages.forEach((pkg) => {
      const sem = pkg.semester;
      const cYear = pkg.curriculumYear;

      const items: CoursePackageItem[] =
        pkg.courseItems && pkg.courseItems.length > 0
          ? pkg.courseItems
          : pkg.courseIds.map((cId) => {
              const found = courseMap.get(cId);
              return {
                type: 'course',
                courseId: found?.id || cId,
                courseCode: found?.code || cId,
                courseName: found?.name || cId,
                credits: found?.sks || 0,
                isElective: found?.category === 'Pilihan',
                kbkId: found?.kbkIds?.[0] || pkg.kbkId || undefined,
              };
            });

      items.forEach((item) => {
        if (item.type === 'elective-slot' && !item.courseId) return;
        const cId = item.courseId || item.courseCode || '';
        const course = courseMap.get(cId);
        if (!course) return;

        const isPracticum = course.type === 'Praktikum' || CourseOfferingGeneratorService.isPracticumCourse(course);

        // Default student count based on cohort projections
        let defaultStudents = 76;
        if (sem === 3 || sem === 4) defaultStudents = 72;
        else if (sem >= 5) {
          defaultStudents = course.category === 'Pilihan' ? 25 : 35;
        }

        newPlanned[course.id] = {
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          sks: course.sks,
          semester: sem,
          curriculumYear: cYear,
          kbkId: pkg.kbkId || course.kbkIds?.[0] || null,
          totalStudents: isPracticum ? 0 : defaultStudents,
          assignedLecturerId: null, // Initial requirement: NO auto-assigned lecturers
          assignedLecturerIds: [],
          isPracticum,
          allowBelowMinimum: false,
        };
      });
    });

    setPlannedCourses(newPlanned);
    showToast('info', 'Referensi Paket Dimuat', `Memuat ${Object.keys(newPlanned).length} mata kuliah dari paket semester.`);
  };

  // Toggle course selection in planning list
  const toggleCourseInPlan = (course: Course, semester: number, kbkId?: string | null) => {
    setPlannedCourses((prev) => {
      const copy = { ...prev };
      if (copy[course.id]) {
        delete copy[course.id];
      } else {
        const isPracticum = course.type === 'Praktikum' || CourseOfferingGeneratorService.isPracticumCourse(course);
        const defaultStudents = semester <= 2 ? 76 : semester <= 4 ? 72 : 35;

        copy[course.id] = {
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          sks: course.sks,
          semester,
          curriculumYear: course.curriculumYear || curriculumYear,
          kbkId: kbkId || course.kbkIds?.[0] || null,
          totalStudents: isPracticum ? 0 : defaultStudents,
          assignedLecturerId: null,
          assignedLecturerIds: [],
          isPracticum,
          allowBelowMinimum: false,
        };
      }
      return copy;
    });
  };

  // Update student count for a course
  const updateStudentCount = (courseId: string, count: number) => {
    setPlannedCourses((prev) => {
      if (!prev[courseId]) return prev;
      return {
        ...prev,
        [courseId]: {
          ...prev[courseId],
          totalStudents: Math.max(0, count),
        },
      };
    });
  };

  // Toggle allow below minimum for a course (<10)
  const toggleAllowBelowMinimum = (courseId: string) => {
    setPlannedCourses((prev) => {
      if (!prev[courseId]) return prev;
      return {
        ...prev,
        [courseId]: {
          ...prev[courseId],
          allowBelowMinimum: !prev[courseId].allowBelowMinimum,
        },
      };
    });
  };

  // Add custom course from master
  const handleAddCustomCourse = (course: Course) => {
    setPlannedCourses((prev) => ({
      ...prev,
      [course.id]: {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        sks: course.sks,
        semester: customCourseSemester,
        curriculumYear: course.curriculumYear || curriculumYear,
        kbkId: customCourseKbk || course.kbkIds?.[0] || null,
        totalStudents: customCourseStudents,
        assignedLecturerId: null,
        assignedLecturerIds: [],
        isPracticum: course.type === 'Praktikum' || CourseOfferingGeneratorService.isPracticumCourse(course),
        allowBelowMinimum: false,
      },
    }));

    setIsAddCustomModalOpen(false);
    showToast('success', 'Mata Kuliah Ditambahkan', `${course.code} - ${course.name} berhasil ditambahkan ke daftar perencanaan.`);
  };

  // Preview Summary Calculation
  const planningSummary = useMemo(() => {
    const items = Object.values(plannedCourses);
    const theoryItems = items.filter((i) => !i.isPracticum);
    const practicumItems = items.filter((i) => i.isPracticum);

    let totalSections = 0;
    let totalTheoryStudents = 0;
    let belowMinWarningCount = 0;

    theoryItems.forEach((item) => {
      totalTheoryStudents += item.totalStudents;
      if (item.totalStudents < MIN_STUDENTS_PER_CLASS && !item.allowBelowMinimum) {
        belowMinWarningCount++;
      } else {
        const sections = createBalancedSections(item.totalStudents);
        totalSections += sections.length;
      }
    });

    return {
      totalCourses: items.length,
      theoryCount: theoryItems.length,
      practicumCount: practicumItems.length,
      totalSections,
      totalTheoryStudents,
      belowMinWarningCount,
    };
  }, [plannedCourses]);

  // Execute Generation
  const handleExecuteGeneration = () => {
    const items = Object.values(plannedCourses);
    if (items.length === 0) {
      showToast('error', 'Daftar Kosong', 'Pilih minimal satu mata kuliah untuk di-generate.');
      return;
    }

    try {
      const report = CourseOfferingGeneratorService.generateOfferingsFromSemesterPlan(items, {
        academicTerm,
        academicYear,
        maxClassSize: MAX_STUDENTS_PER_CLASS,
      });

      onApplyPlan(report, replaceExisting);
      try {
        const period = academicTerm === 'ganjil' ? 'GANJIL' : 'GENAP';
        MasterLecturerImportService.syncToCourseOfferings(period);
      } catch (e) {
        console.warn('Auto-assign sync error:', e);
      }
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      showToast('error', 'Gagal Generate Course Offering', err.message || 'Terjadi kesalahan.');
    }
  };

  return (
    <div className={`space-y-6 ${planningSummary.totalCourses > 0 ? 'pb-24 sm:pb-20' : 'pb-4'}`}>
      {/* 1. Header & Parameter Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Penyusunan Mata Kuliah Semester</h2>
              <p className="text-xs text-slate-500">
                Tentukan mata kuliah yang dibuka, input jumlah mahasiswa, dan generate pembagian kelas seimbang
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadPackageDefaults}
              id="btn-load-package-defaults"
              className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Muat Referensi Paket ({relevantPackages.length} Paket)</span>
            </button>

            <button
              onClick={() => setIsAddCustomModalOpen(true)}
              id="btn-add-custom-course"
              className="px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>+ MK dari Master</span>
            </button>
          </div>
        </div>

        {/* Global Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Tahun Akademik</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="2026/2027">2026/2027</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
            </select>
          </div>

          {/* Academic Term */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Semester Perkuliahan</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setAcademicTerm('ganjil')}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  academicTerm === 'ganjil' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ganjil
              </button>
              <button
                type="button"
                onClick={() => setAcademicTerm('genap')}
                className={`py-1 text-xs font-bold rounded-lg transition-all ${
                  academicTerm === 'genap' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Genap
              </button>
            </div>
          </div>

          {/* Curriculum */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Kurikulum Acuan</label>
            <select
              value={curriculumYear}
              onChange={(e) => setCurriculumYear(Number(e.target.value) as 2026 | 2022)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value={2026}>Kurikulum 2026 (OBE)</option>
              <option value={2022}>Kurikulum 2022 (Transisi)</option>
            </select>
          </div>

          {/* Target Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Filter Semester</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="all">Semua ({academicTerm === 'ganjil' ? '1, 3, 5, 7' : '2, 4, 6, 8'})</option>
              {termSemesters.map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* KBK Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">KBK (Sem ≥ 5)</label>
            <select
              value={selectedKbkId}
              onChange={(e) => setSelectedKbkId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="all">Semua KBK</option>
              {kbks.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* Replace Mode */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Mode Penerapan</label>
            <select
              value={replaceExisting ? 'replace' : 'merge'}
              onChange={(e) => setReplaceExisting(e.target.value === 'replace')}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium"
            >
              <option value="replace">Ganti Seluruh Offering</option>
              <option value="merge">Gabungkan (Append)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Notice: Package is Reference List, not auto-scheduled */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 space-y-1">
          <p className="font-bold">
            Paket Semester sebagai Referensi Penyusunan (Default List):
          </p>
          <p className="text-indigo-900 leading-relaxed">
            Paket kurikulum di bawah bertindak sebagai daftar acuan. Mata kuliah tidak akan dijadwalkan secara otomatis
            sampai Anda mencentang mata kuliah dan menetapkan jumlah mahasiswa. Sistem akan otomatis membagi kelas secara
            seimbang (maksimal 40 mhs/kelas) dan menetapkan mata kuliah praktikum ke jadwal lab terpisah.
          </p>
        </div>
      </div>

      {/* 3. Live Planning Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total MK Dipilih</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{planningSummary.totalCourses} MK</div>
          <span className="text-[10px] text-slate-500">{planningSummary.theoryCount} Teori, {planningSummary.practicumCount} Praktikum</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Section (Rombel)</span>
          <div className="text-xl font-extrabold text-indigo-600 mt-0.5">{planningSummary.totalSections} Kelas</div>
          <span className="text-[10px] text-slate-500">Maks. 40 mhs / kelas</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Mahasiswa Teori</span>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{planningSummary.totalTheoryStudents} Mhs</div>
          <span className="text-[10px] text-slate-500">Peserta kuliah aktif</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Praktikum (Terpisah)</span>
          <div className="text-xl font-extrabold text-amber-600 mt-0.5">{planningSummary.practicumCount} Modul</div>
          <span className="text-[10px] text-slate-500">Jadwal lab mandiri</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Peringatan (&lt;10 Mhs)</span>
          <div className={`text-xl font-extrabold mt-0.5 ${planningSummary.belowMinWarningCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {planningSummary.belowMinWarningCount} MK
          </div>
          <span className="text-[10px] text-slate-500">Batas minimum 10</span>
        </div>

        <div className="p-2 rounded-2xl bg-indigo-600 text-white flex flex-col justify-between shadow-xs">
          <div className="px-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Aksi Final</span>
            <div className="text-xs font-bold text-white mt-0.5">Terapkan Offering</div>
          </div>
          <button
            onClick={() => setIsConfirmModalOpen(true)}
            id="btn-apply-course-offerings"
            disabled={planningSummary.totalCourses === 0}
            className="w-full py-2 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Generate ({planningSummary.totalSections} Rombel)</span>
          </button>
        </div>
      </div>

      {/* 4. Packages and Course Planning List */}
      <div className="space-y-4">
        {relevantPackages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold">Tidak ada paket semester yang sesuai dengan filter.</p>
            <p className="text-xs text-slate-400 mt-1">Ubah filter kurikulum/semester atau gunakan tombol "+ MK dari Master" untuk menambahkan secara manual.</p>
          </div>
        ) : (
          relevantPackages.map((pkg) => {
            const sem = pkg.semester;
            const items: CoursePackageItem[] =
              pkg.courseItems && pkg.courseItems.length > 0
                ? pkg.courseItems
                : pkg.courseIds.map((cId) => {
                    const found = courseMap.get(cId);
                    return {
                      type: 'course',
                      courseId: found?.id || cId,
                      courseCode: found?.code || cId,
                      courseName: found?.name || cId,
                      credits: found?.sks || 0,
                      isElective: found?.category === 'Pilihan',
                      kbkId: found?.kbkIds?.[0] || pkg.kbkId || undefined,
                    };
                  });

            const kbkObj = kbks.find((k) => k.id === pkg.kbkId);

            return (
              <div
                key={pkg.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Package Header */}
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-extrabold text-xs">
                      Semester {sem}
                    </span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                      {pkg.name}
                    </span>
                    {kbkObj && (
                      <Badge variant="warning" size="sm">
                        {kbkObj.code || kbkObj.name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{items.length} Mata Kuliah Terdaftar</span>
                  </div>
                </div>

                {/* Course Items Table for Desktop */}
                <div className="hidden md:block divide-y divide-slate-100 overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <th className="p-3 w-10 text-center">Pilih</th>
                        <th className="p-3 w-28">Kode MK</th>
                        <th className="p-3">Nama Mata Kuliah</th>
                        <th className="p-3 w-16 text-center">SKS</th>
                        <th className="p-3 w-28">Sifat / Tipe</th>
                        <th className="p-3 w-40">Jumlah Mahasiswa</th>
                        <th className="p-3">Pembagian Kelas Seimbang</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const courseId = item.courseId || item.courseCode || '';
                        const course = courseMap.get(courseId);
                        if (!course) return null;

                        const isSelected = !!plannedCourses[course.id];
                        const plan = plannedCourses[course.id];
                        const isPracticum = course.type === 'Praktikum' || CourseOfferingGeneratorService.isPracticumCourse(course);

                        const totalStudents = plan?.totalStudents ?? 0;
                        const validation = validateStudentCount(totalStudents);

                        return (
                          <tr
                            key={`${pkg.id}-${course.id}-${idx}`}
                            className={`transition-colors ${
                              isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCourseInPlan(course, sem, pkg.kbkId)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* Code */}
                            <td className="p-3 font-mono font-bold text-slate-900">
                              {course.code}
                            </td>

                            {/* Name */}
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{course.name}</div>
                              {course.kbkIds && course.kbkIds.length > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  KBK: {course.kbkIds.map((k) => k.replace('kbk-', '').toUpperCase()).join(', ')}
                                </span>
                              )}
                            </td>

                            {/* SKS */}
                            <td className="p-3 text-center font-bold text-slate-700">
                              {course.sks} SKS
                            </td>

                            {/* Category / Practicum */}
                            <td className="p-3">
                              {isPracticum ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Praktikum (Lab Terpisah)
                                </span>
                              ) : course.category === 'Pilihan' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                                  Pilihan
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                                  Wajib
                                </span>
                              )}
                            </td>

                            {/* Student Count Input */}
                            <td className="p-3">
                              {isPracticum ? (
                                <span className="text-[11px] text-slate-400 italic">Excluded from SA</span>
                              ) : isSelected ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={500}
                                      step={1}
                                      value={totalStudents}
                                      onChange={(e) => updateStudentCount(course.id, Number(e.target.value))}
                                      className="w-24 px-2.5 py-1 text-xs rounded-lg border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                                      placeholder="Mhs"
                                    />
                                    <span className="text-[11px] text-slate-500 font-medium">Mhs</span>
                                  </div>

                                  {totalStudents < MIN_STUDENTS_PER_CLASS && totalStudents > 0 && (
                                    <div className="text-[10px] text-rose-600 flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={plan?.allowBelowMinimum || false}
                                        onChange={() => toggleAllowBelowMinimum(course.id)}
                                        className="rounded text-rose-600 focus:ring-rose-500"
                                      />
                                      <span>Buka khusus (&lt;10)</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">Centang untuk buka</span>
                              )}
                            </td>

                            {/* Balanced Section Splitting Result */}
                            <td className="p-3">
                              {isPracticum ? (
                                <span className="text-[11px] text-slate-400">Tidak dijadwalkan di SA</span>
                              ) : !isSelected ? (
                                <span className="text-[11px] text-slate-400">—</span>
                              ) : totalStudents === 0 ? (
                                <span className="text-[11px] text-amber-600 font-semibold">0 Mahasiswa (Isi jumlah)</span>
                              ) : totalStudents < MIN_STUDENTS_PER_CLASS && !plan?.allowBelowMinimum ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  &lt;10 Mhs (Batas Minimum)
                                </span>
                              ) : (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-bold text-indigo-700 text-xs bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                                    {validation.sections.length} Kelas
                                  </span>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {validation.sections.map((sec) => (
                                      <span
                                        key={sec.section}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                      >
                                        {sec.section}: {sec.studentCount}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Cards for Course Items (Screen < md) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const courseId = item.courseId || item.courseCode || '';
                    const course = courseMap.get(courseId);
                    if (!course) return null;

                    const isSelected = !!plannedCourses[course.id];
                    const plan = plannedCourses[course.id];
                    const isPracticum = course.type === 'Praktikum' || CourseOfferingGeneratorService.isPracticumCourse(course);
                    const totalStudents = plan?.totalStudents ?? 0;
                    const validation = validateStudentCount(totalStudents);

                    return (
                      <div
                        key={`mob-${pkg.id}-${course.id}-${idx}`}
                        className={`p-3.5 space-y-2.5 transition-colors ${
                          isSelected ? 'bg-indigo-50/40' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5 shrink-0">
                            <input
                              id={`cb-plan-${pkg.id}-${course.id}`}
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCourseInPlan(course, sem, pkg.kbkId)}
                              className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={`cb-plan-${pkg.id}-${course.id}`}
                              className="font-bold text-slate-900 text-xs leading-snug cursor-pointer block"
                            >
                              {course.name}
                            </label>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                                {course.code}
                              </span>
                              <span className="text-[11px] font-bold text-slate-700">
                                {course.sks} SKS
                              </span>
                              <span className="text-slate-300">•</span>
                              {isPracticum ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Praktikum
                                </span>
                              ) : course.category === 'Pilihan' ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                  Pilihan
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  Wajib
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="pl-8 pt-1.5 space-y-2 border-t border-indigo-100/60 mt-1">
                            {isPracticum ? (
                              <div className="text-[11px] text-amber-700 font-semibold">
                                🧪 Praktikum Lab — Jadwal Khusus
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="text-xs text-slate-700 font-semibold">
                                    Jumlah Mahasiswa:
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={500}
                                      value={totalStudents}
                                      onChange={(e) => updateStudentCount(course.id, Number(e.target.value))}
                                      className="w-20 px-2 py-1 text-xs rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">mhs</span>
                                  </div>
                                </div>

                                {totalStudents < MIN_STUDENTS_PER_CLASS && totalStudents > 0 && (
                                  <div className="text-[10px] text-rose-600 flex items-center gap-1">
                                    <input
                                      type="checkbox"
                                      checked={plan?.allowBelowMinimum || false}
                                      onChange={() => toggleAllowBelowMinimum(course.id)}
                                      className="rounded text-rose-600"
                                      id={`allow-below-min-mob-${course.id}`}
                                    />
                                    <label htmlFor={`allow-below-min-mob-${course.id}`}>
                                      Buka khusus (&lt;10 Mahasiswa)
                                    </label>
                                  </div>
                                )}

                                {validation.sections.length > 0 && (
                                  <div className="p-2 rounded-xl bg-indigo-50/80 border border-indigo-100 text-[11px] text-indigo-950 space-y-0.5">
                                    <div className="font-bold text-indigo-900">
                                      Status: {validation.sections.length} Rombel Kelas
                                    </div>
                                    <div className="text-slate-600 font-medium">
                                      {validation.sections.map((sec) => `${sec.section}: ${sec.studentCount} mhs`).join(', ')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Action Bar (Only shown when courses are planned) */}
      {planningSummary.totalCourses > 0 && (
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-xl sticky bottom-4 z-20 animate-in fade-in slide-in-from-bottom-4 duration-200 border border-slate-800">
          <div className="min-w-0 flex-1">
            <div className="hidden sm:block">
              <div className="font-bold text-xs text-white">
                {planningSummary.totalCourses} Mata Kuliah Terpilih ({planningSummary.totalSections} Kelas Rombel)
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {planningSummary.totalTheoryStudents} mahasiswa teori siap digenerate menjadi Course Offerings.
              </div>
            </div>
            <div className="sm:hidden">
              <div className="font-bold text-xs text-white truncate">
                {planningSummary.totalCourses} MK • {planningSummary.totalTheoryStudents} Mahasiswa
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {planningSummary.totalSections} Rombel Terbentuk
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsConfirmModalOpen(true)}
            id="btn-apply-offerings-sticky"
            className="shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs transition-all active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Generate {planningSummary.totalSections} Rombel</span>
            <span className="xs:hidden">Generate</span>
          </button>
        </div>
      )}

      {/* 5. Modal: Add Custom Course from Master */}
      <Modal
        isOpen={isAddCustomModalOpen}
        onClose={() => setIsAddCustomModalOpen(false)}
        title="Tambah Mata Kuliah dari Master"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode atau nama mata kuliah..."
                value={customCourseSearch}
                onChange={(e) => setCustomCourseSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <select
              value={customCourseSemester}
              onChange={(e) => setCustomCourseSemester(Number(e.target.value))}
              className="text-xs px-3 py-2 rounded-xl border border-slate-200"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Sem {s}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {courses
              .filter((c) => {
                const q = customCourseSearch.toLowerCase();
                return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
              })
              .slice(0, 30)
              .map((course) => (
                <div
                  key={course.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-700">{course.code}</span>
                      <span className="font-semibold text-xs text-slate-800">{course.name}</span>
                      <span className="text-[10px] text-slate-500 font-semibold">({course.sks} SKS)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Sifat: {course.category} • Kur. {course.curriculumYear || 2026}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddCustomCourse(course)}
                    className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Pilih
                  </button>
                </div>
              ))}
          </div>
        </div>
      </Modal>

      {/* 6. Modal: Confirm Generate Offerings */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Konfirmasi Generate Course Offering"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Anda akan membuat Course Offering baru untuk <strong>T.A. {academicYear} ({academicTerm.toUpperCase()})</strong>:
          </p>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Mata Kuliah Teori:</span>
              <span className="font-bold text-slate-900">{planningSummary.theoryCount} MK</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Rombel / Section:</span>
              <span className="font-bold text-indigo-600">{planningSummary.totalSections} Kelas</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Total Mahasiswa Teori:</span>
              <span className="font-bold text-emerald-700">{planningSummary.totalTheoryStudents} Mahasiswa</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Praktikum Excluded:</span>
              <span className="font-bold text-amber-700">{planningSummary.practicumCount} Modul</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mode Penerapan:</span>
              <span className="font-bold text-slate-900">{replaceExisting ? 'Ganti Seluruh Offering' : 'Gabungkan (Append)'}</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
            <strong>Catatan Dosen Pengampu:</strong> Saat offering dibuat, status dosen akan di-set <em>"Belum Ditentukan"</em>. Anda dapat menetapkan dosen pengampu per section setelah offering muncul di daftar.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsConfirmModalOpen(false)}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleExecuteGeneration}
              id="btn-confirm-generate-offerings"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Ya, Generate Course Offering
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
