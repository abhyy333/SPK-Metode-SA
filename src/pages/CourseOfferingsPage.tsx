import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  Users,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  BookOpen,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Zap,
  Info,
  ChevronDown,
  X,
  Check,
  Clock,
  CheckSquare,
  Square,
  RefreshCw,
  Cpu,
  Radio,
  FileSpreadsheet,
  ListFilter,
  ShieldCheck,
  Sliders,
  Award,
  Package,
  Lock,
  Unlock,
} from 'lucide-react';
import { CourseOffering, Course, Lecturer, ClassGroup, Room, Timeslot, KBK, CurriculumPackage } from '../types';
import { StorageService } from '../services/storageService';
import { CourseOfferingGeneratorService, GenerationOptions, GenerationReport } from '../services/courseOfferingGeneratorService';
import { SemesterPlanWizard } from '../components/offerings/SemesterPlanWizard';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

export const CourseOfferingsPage: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'planner' | 'offerings'>('offerings');

  const [offerings, setOfferings] = useState<CourseOffering[]>(() => StorageService.getCourseOfferings());
  const [courses, setCourses] = useState<Course[]>(() => StorageService.getCourses());
  const [lecturers, setLecturers] = useState<Lecturer[]>(() => StorageService.getLecturers());
  const [classes, setClasses] = useState<ClassGroup[]>(() => StorageService.getClasses());
  const [kbks, setKbks] = useState<KBK[]>(() => StorageService.getKbks());
  const [curriculumPackages, setCurriculumPackages] = useState<CurriculumPackage[]>(() => StorageService.getCurriculumPackages());

  // Filter and search states in Offerings list
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [selectedCurriculum, setSelectedCurriculum] = useState<number | 'all'>('all');
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedLecturerStatus, setSelectedLecturerStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Generation Report Modal
  const [latestReport, setLatestReport] = useState<GenerationReport | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Assign Lecturer Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetOffering, setTargetOffering] = useState<CourseOffering | null>(null);
  const [selectedLecturerIds, setSelectedLecturerIds] = useState<string[]>([]);
  const [lecturerSearchQuery, setLecturerSearchQuery] = useState('');

  // Edit Capacity Modal
  const [isEditCapacityModalOpen, setIsEditCapacityModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<CourseOffering | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(40);

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>(courses.map((c) => [c.id, c]));
    courses.forEach((c) => {
      if (c.code) map.set(c.code, c);
    });
    return map;
  }, [courses]);

  const lecturerMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);
  const classMap = useMemo(() => new Map(classes.map((cl) => [cl.id, cl])), [classes]);

  // Save changes to storage & update local state
  const updateOfferings = (newOfferings: CourseOffering[]) => {
    setOfferings(newOfferings);
    StorageService.saveCourseOfferings(newOfferings);
  };

  // Handler for Plan Application from SemesterPlanWizard
  const handleApplyPlan = (report: GenerationReport, replaceExisting: boolean) => {
    let finalOfferings: CourseOffering[];
    if (replaceExisting) {
      finalOfferings = report.generatedOfferings;
    } else {
      const existingMap = new Map(offerings.map((o) => [o.id, o]));
      report.generatedOfferings.forEach((newOff) => {
        existingMap.set(newOff.id, newOff);
      });
      finalOfferings = Array.from(existingMap.values());
    }

    updateOfferings(finalOfferings);
    setLatestReport(report);
    setActiveTab('offerings');
    setIsReportModalOpen(true);

    showToast(
      'success',
      'Course Offering Berhasil Dibuat',
      `Berhasil men-generate ${report.generatedOfferings.length} rombel kelas dari mata kuliah terpilih.`
    );
  };

  // Open Assign Lecturer Modal
  const openAssignModal = (off: CourseOffering) => {
    setTargetOffering(off);
    const initialLecIds =
      off.lecturerIds && off.lecturerIds.length > 0
        ? [...off.lecturerIds]
        : off.lecturerId
        ? [off.lecturerId]
        : [];
    setSelectedLecturerIds(initialLecIds);
    setLecturerSearchQuery('');
    setIsAssignModalOpen(true);
  };

  const toggleLecturerSelection = (lecId: string) => {
    setSelectedLecturerIds((prev) =>
      prev.includes(lecId) ? prev.filter((id) => id !== lecId) : [...prev, lecId]
    );
  };

  const handleSaveLecturerAssignment = () => {
    if (!targetOffering) return;

    const assignedLecs = selectedLecturerIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];
    const primaryLec = assignedLecs[0] || null;

    const updated = offerings.map((off) => {
      if (off.id === targetOffering.id) {
        return {
          ...off,
          lecturerIds: selectedLecturerIds,
          lecturerId: primaryLec ? primaryLec.id : null,
          lecturerName: primaryLec ? primaryLec.name : null,
          lecturerCode: primaryLec ? primaryLec.code : null,
          lecturerNames: assignedLecs.map((l) => l.name),
          lecturerCodes: assignedLecs.map((l) => l.code),
          status: 'ready' as const,
        };
      }
      return off;
    });

    updateOfferings(updated);

    // Also update in current schedule assignment if present
    const currentSchedule = StorageService.getCurrentSchedule();
    if (currentSchedule && currentSchedule.length > 0) {
      const updatedSchedule = currentSchedule.map((a) => {
        if (a.courseOfferingId === targetOffering.id) {
          return {
            ...a,
            lecturerIds: selectedLecturerIds,
            lecturerId: primaryLec ? primaryLec.id : null,
          };
        }
        return a;
      });
      StorageService.saveCurrentSchedule(updatedSchedule);
    }

    setIsAssignModalOpen(false);

    const course = courseMap.get(targetOffering.courseId);
    showToast(
      'success',
      'Dosen Pengampu Diperbarui',
      `${assignedLecs.length > 0 ? assignedLecs.map((l) => l.name).join(', ') : 'Dosen dikosongkan'} untuk ${
        course?.name || targetOffering.code
      }.`
    );
  };

  // Toggle lock state
  const handleToggleLock = (offId: string) => {
    const updated = offerings.map((off) => {
      if (off.id === offId) {
        return { ...off, isLocked: !off.isLocked };
      }
      return off;
    });
    updateOfferings(updated);
    showToast('info', 'Status Kunci Diubah', 'Status lock offering telah diperbarui.');
  };

  // Open Edit Capacity Modal
  const openEditCapacityModal = (off: CourseOffering) => {
    setEditingOffering(off);
    setNewCapacity(off.capacity || off.studentCount || 40);
    setIsEditCapacityModalOpen(true);
  };

  const handleSaveCapacity = () => {
    if (!editingOffering) return;
    const updated = offerings.map((off) => {
      if (off.id === editingOffering.id) {
        return {
          ...off,
          capacity: newCapacity,
          studentCount: newCapacity,
          expectedEnrollment: newCapacity,
        };
      }
      return off;
    });
    updateOfferings(updated);
    setIsEditCapacityModalOpen(false);
    showToast('success', 'Kapasitas Diperbarui', `Kapasitas offering diatur ke ${newCapacity} mahasiswa.`);
  };

  // Delete offering
  const handleDeleteOffering = (offId: string) => {
    const updated = offerings.filter((off) => off.id !== offId);
    updateOfferings(updated);
    showToast('info', 'Course Offering Dihapus', 'Course offering telah berhasil dihapus.');
  };

  // Filtered offerings
  const filteredOfferings = useMemo(() => {
    return offerings.filter((off) => {
      const course = courseMap.get(off.courseId) || (off.courseCode ? courseMap.get(off.courseCode) : null);
      const assignedLecIds =
        off.lecturerIds && off.lecturerIds.length > 0
          ? off.lecturerIds
          : off.lecturerId
          ? [off.lecturerId]
          : [];

      const sem = off.semester || course?.semester;
      const cYear = off.curriculumYear || course?.curriculumYear;

      if (selectedSemester !== 'all' && sem !== selectedSemester) {
        return false;
      }

      if (selectedCurriculum !== 'all' && cYear !== selectedCurriculum) {
        return false;
      }

      if (selectedKbk !== 'all') {
        if (selectedKbk === 'common') {
          if (off.kbkId) return false;
        } else {
          if (off.kbkId !== selectedKbk && course?.kbkIds?.[0] !== selectedKbk) return false;
        }
      }

      if (selectedClass !== 'all' && off.classId !== selectedClass && off.sectionName !== selectedClass) {
        return false;
      }

      if (selectedLecturerStatus === 'assigned' && assignedLecIds.length === 0) {
        return false;
      }

      if (selectedLecturerStatus === 'unassigned' && assignedLecIds.length > 0) {
        return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCode = (course?.code || off.courseId || off.code || '').toLowerCase().includes(term);
        const matchName = (course?.name || off.courseName || '').toLowerCase().includes(term);
        const matchLec = assignedLecIds.some((lid) => {
          const lec = lecturerMap.get(lid);
          return (lec?.name || '').toLowerCase().includes(term) || (lec?.code || '').toLowerCase().includes(term);
        });
        if (!matchCode && !matchName && !matchLec) return false;
      }

      return true;
    });
  }, [
    offerings,
    courseMap,
    lecturerMap,
    selectedSemester,
    selectedCurriculum,
    selectedKbk,
    selectedClass,
    selectedLecturerStatus,
    searchTerm,
  ]);

  // Statistics
  const totalOfferings = offerings.length;
  const totalStudents = offerings.reduce((sum, o) => sum + (o.studentCount || o.capacity || 0), 0);
  const assignedCount = offerings.filter(
    (o) => (o.lecturerIds && o.lecturerIds.length > 0) || Boolean(o.lecturerId)
  ).length;
  const unassignedCount = totalOfferings - assignedCount;

  return (
    <div className="space-y-6" id="course-offerings-page">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Penyusunan Mata Kuliah &amp; Rombel Generator
              </span>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Alur Bebas KRS
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Penyusunan Mata Kuliah Semester &amp; Course Offering
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Tentukan mata kuliah yang dibuka, input jumlah mahasiswa terencana, generate pembagian kelas seimbang (&le;40 mhs/kelas), dan tetapkan dosen pengampu per rombel.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {latestReport && (
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                <span>Laporan Generate Terakhir</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation: Planner vs Active Offerings */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('planner')}
            id="tab-planner"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'planner'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Penyusunan &amp; Pemilihan Mata Kuliah (Wizard)</span>
          </button>

          <button
            onClick={() => setActiveTab('offerings')}
            id="tab-offerings"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'offerings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Daftar Course Offering Aktif ({totalOfferings} Rombel)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SEMESTER PLAN WIZARD */}
      {activeTab === 'planner' && (
        <SemesterPlanWizard
          curriculumPackages={curriculumPackages}
          courses={courses}
          lecturers={lecturers}
          kbks={kbks}
          onApplyPlan={handleApplyPlan}
        />
      )}

      {/* VIEW 2: ACTIVE COURSE OFFERINGS LIST */}
      {activeTab === 'offerings' && (
        <div className="space-y-6">
          {/* Statistical Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Total Course Offerings</div>
                <div className="text-xl font-extrabold text-slate-900 font-mono">{totalOfferings} Rombel</div>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-emerald-800">Dosen Telah Ditetapkan</div>
                <div className="text-xl font-extrabold text-emerald-700 font-mono">{assignedCount} Rombel</div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-amber-800">Dosen Belum Ditentukan</div>
                <div className="text-xl font-extrabold text-amber-700 font-mono">{unassignedCount} Rombel</div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-700">
                <UserX className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-purple-800">Total Mahasiswa Terdaftar</div>
                <div className="text-xl font-extrabold text-purple-700 font-mono">{totalStudents} Mhs</div>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-700">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode MK, nama mata kuliah, atau nama dosen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Quick Action: Back to Planner */}
              <button
                onClick={() => setActiveTab('planner')}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Susun / Tambah Offering Baru</span>
              </button>
            </div>

            {/* Filter pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              {/* Semester Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kurikulum Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kurikulum</label>
                <select
                  value={selectedCurriculum}
                  onChange={(e) => setSelectedCurriculum(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua Kurikulum</option>
                  <option value={2026}>Kurikulum 2026</option>
                  <option value={2022}>Kurikulum 2022</option>
                </select>
              </div>

              {/* KBK Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">KBK</label>
                <select
                  value={selectedKbk}
                  onChange={(e) => setSelectedKbk(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua KBK</option>
                  <option value="common">Mata Kuliah Bersama (Non-KBK)</option>
                  {kbks.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lecturer Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Dosen</label>
                <select
                  value={selectedLecturerStatus}
                  onChange={(e) => setSelectedLecturerStatus(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="assigned">Sudah Ada Dosen</option>
                  <option value="unassigned">Belum Ada Dosen</option>
                </select>
              </div>
            </div>
          </div>

          {/* Offerings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Menampilkan {filteredOfferings.length} dari {offerings.length} Course Offering
              </span>
              {filteredOfferings.length > 0 && (
                <span className="text-[11px] text-slate-500">
                  Total Kapasitas: {filteredOfferings.reduce((sum, o) => sum + (o.studentCount || o.capacity || 0), 0)} Mhs
                </span>
              )}
            </div>

            {filteredOfferings.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Layers className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700">Belum ada Course Offering yang sesuai.</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Gunakan menu Penyusunan &amp; Pemilihan Mata Kuliah untuk men-generate rombel kelas berdasarkan kurikulum dan jumlah mahasiswa.
                </p>
                <button
                  onClick={() => setActiveTab('planner')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Buka Menu Penyusunan
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                      <th className="p-3 w-32">Kode Offering</th>
                      <th className="p-3">Mata Kuliah</th>
                      <th className="p-3 w-16 text-center">Kelas</th>
                      <th className="p-3 w-16 text-center">SKS</th>
                      <th className="p-3 w-24 text-center">Sem / Kur</th>
                      <th className="p-3 w-28 text-center">Kapasitas</th>
                      <th className="p-3">Dosen Pengampu</th>
                      <th className="p-3 w-32 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOfferings.map((off) => {
                      const course = courseMap.get(off.courseId) || (off.courseCode ? courseMap.get(off.courseCode) : null);
                      const assignedLecIds =
                        off.lecturerIds && off.lecturerIds.length > 0
                          ? off.lecturerIds
                          : off.lecturerId
                          ? [off.lecturerId]
                          : [];

                      const assignedLecturers = assignedLecIds
                        .map((id) => lecturerMap.get(id))
                        .filter(Boolean) as Lecturer[];

                      const sectionLetter = off.section || off.sectionName || 'A';
                      const sem = off.semester || course?.semester || 1;
                      const cYear = off.curriculumYear || course?.curriculumYear || 2026;

                      return (
                        <tr key={off.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Code */}
                          <td className="p-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{off.code || `${course?.code || off.courseId}-${sectionLetter}`}</span>
                              {off.isLocked && (
                                <span title="Jadwal Dikunci">
                                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Course Name */}
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">
                              {course?.name || off.courseName}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>{course?.category || 'Wajib'}</span>
                              {off.kbkId && (
                                <span>• KBK: {off.kbkId.replace('kbk-', '').toUpperCase()}</span>
                              )}
                            </div>
                          </td>

                          {/* Section Badge */}
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-xs">
                              {sectionLetter}
                            </span>
                          </td>

                          {/* SKS */}
                          <td className="p-3 text-center font-bold text-slate-700">
                            {off.sks || course?.sks} SKS
                          </td>

                          {/* Sem / Kur */}
                          <td className="p-3 text-center">
                            <div className="font-bold text-slate-800">Sem {sem}</div>
                            <div className="text-[10px] text-slate-400">{cYear}</div>
                          </td>

                          {/* Capacity / Students */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() => openEditCapacityModal(off)}
                              className="font-bold text-slate-800 hover:text-indigo-600 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Klik untuk ubah kapasitas"
                            >
                              <span>{off.studentCount || off.capacity || 40} Mhs</span>
                              <Edit className="w-3 h-3 text-slate-400" />
                            </button>
                          </td>

                          {/* Lecturer Assignment */}
                          <td className="p-3">
                            {assignedLecturers.length > 0 ? (
                              <div className="flex items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  {assignedLecturers.map((lec) => (
                                    <div key={lec.id} className="flex items-center gap-1.5">
                                      <span className="font-semibold text-slate-800 text-xs">{lec.name}</span>
                                      <span className="font-mono text-[10px] text-slate-400">({lec.code})</span>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => openAssignModal(off)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                                >
                                  Ganti
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <UserX className="w-3 h-3" />
                                  Belum Ditentukan
                                </span>
                                <button
                                  onClick={() => openAssignModal(off)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                                >
                                  + Pilih Dosen
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleToggleLock(off.id)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  off.isLocked
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                                title={off.isLocked ? 'Buka Kunci' : 'Kunci Offering'}
                              >
                                {off.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>

                              <button
                                onClick={() => handleDeleteOffering(off.id)}
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                                title="Hapus Course Offering"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ASSIGN LECTURER */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Tetapkan Dosen Pengampu Kelas"
        size="lg"
      >
        <div className="space-y-4">
          {targetOffering && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-indigo-950">
                  {courseMap.get(targetOffering.courseId)?.name || targetOffering.courseName}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-200 text-indigo-900 font-extrabold text-xs">
                  Kelas {targetOffering.section || targetOffering.sectionName || 'A'}
                </span>
              </div>
              <div className="text-[11px] text-indigo-800 flex items-center gap-3">
                <span>Kode: {courseMap.get(targetOffering.courseId)?.code || targetOffering.courseCode}</span>
                <span>• SKS: {targetOffering.sks || courseMap.get(targetOffering.courseId)?.sks}</span>
                <span>• Semester: {targetOffering.semester}</span>
                <span>• Kapasitas: {targetOffering.studentCount || targetOffering.capacity} Mhs</span>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama dosen, kode (SNR, YUKI), atau keahlian..."
              value={lecturerSearchQuery}
              onChange={(e) => setLecturerSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {lecturers
              .filter((l) => {
                const q = lecturerSearchQuery.toLowerCase();
                return (
                  l.name.toLowerCase().includes(q) ||
                  l.code.toLowerCase().includes(q) ||
                  (l.expertise && l.expertise.toLowerCase().includes(q))
                );
              })
              .map((lec) => {
                const isSelected = selectedLecturerIds.includes(lec.id);
                return (
                  <div
                    key={lec.id}
                    onClick={() => toggleLecturerSelection(lec.id)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">{lec.name}</span>
                          <span className="font-mono text-[11px] font-bold text-indigo-600">({lec.code})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Keahlian: {lec.expertise || 'Umum'} • NIP: {lec.nip || '—'}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        Terpilih
                      </span>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500 font-medium">
              {selectedLecturerIds.length} Dosen Dipilih (Bisa Team-Teaching)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveLecturerAssignment}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan Penugasan
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: EDIT CAPACITY */}
      <Modal
        isOpen={isEditCapacityModalOpen}
        onClose={() => setIsEditCapacityModalOpen(false)}
        title="Ubah Kapasitas Kelas Mahasiswa"
        size="sm"
      >
        <div className="space-y-4">
          {editingOffering && (
            <div className="text-xs text-slate-600">
              Ubah jumlah kapasitas terdaftar untuk rombel <strong>{editingOffering.code}</strong>:
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Mahasiswa</label>
            <input
              type="number"
              min={1}
              max={100}
              value={newCapacity}
              onChange={(e) => setNewCapacity(Number(e.target.value))}
              className="w-full text-sm font-bold px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsEditCapacityModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSaveCapacity}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Simpan
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: GENERATION REPORT */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Laporan Pembentukan Course Offering"
        size="lg"
      >
        {latestReport && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="text-[10px] text-indigo-700 font-bold uppercase">Total Rombel Baru</div>
                <div className="text-lg font-extrabold text-indigo-900 mt-0.5">
                  {latestReport.summary.totalSections} Kelas
                </div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">Mata Kuliah Unik</div>
                <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                  {latestReport.summary.totalUniqueCourses} MK
                </div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="text-[10px] text-amber-700 font-bold uppercase">Praktikum Terpisah</div>
                <div className="text-lg font-extrabold text-amber-900 mt-0.5">
                  {latestReport.summary.totalPracticumExcluded} Modul
                </div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                <div className="text-[10px] text-purple-700 font-bold uppercase">Maks. Ukuran Kelas</div>
                <div className="text-lg font-extrabold text-purple-900 mt-0.5">40 Mhs</div>
              </div>
            </div>

            {/* Excluded Practicums */}
            {latestReport.excludedPracticums.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-amber-50 px-3.5 py-2 font-bold text-amber-900 border-b border-amber-100 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Praktikum Tidak Dijadwalkan di Penjadwalan Utama Kuliah ({latestReport.excludedPracticums.length})</span>
                </div>
                <div className="p-3 max-h-40 overflow-y-auto space-y-1.5">
                  {latestReport.excludedPracticums.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-slate-700">
                      <div>
                        <span className="font-mono font-bold text-slate-900">{p.courseCode}</span> - {p.courseName} ({p.sks} SKS, Sem {p.semester})
                      </div>
                      <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-medium">
                        Jadwal Mandiri Lab
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Tutup Laporan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
