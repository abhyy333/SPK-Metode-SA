import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ExamOffering,
  ExamSession,
  ExamType,
  AcademicTerm,
  Room,
  Lecturer,
  Course,
  ExamConflictItem,
  ExamVersion,
  ExamChangeLog,
  ExamConfig,
} from '../../types';
import { StorageService } from '../../services/storageService';
import {
  detectExamConflicts,
  generateInitialExamSchedule,
  optimizeExamScheduleSA,
  ExamOptimizationProgress,
} from '../../algorithms/examScheduler';
import { ExamSessionModal } from '../../components/exam/ExamSessionModal';
import { ExamOfferingEditModal } from '../../components/exam/ExamOfferingEditModal';
import { ExamHistoryModal } from '../../components/exam/ExamHistoryModal';
import { ExamChangeLogModal } from '../../components/exam/ExamChangeLogModal';
import { useToast } from '../../components/ui/Toast';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  AlertTriangle,
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  Share2,
  FileText,
  History,
  Settings,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Users,
  Layers,
  ChevronRight,
  Download,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const ExamSchedulingPage: React.FC = () => {
  const { showToast } = useToast();
  const currentUser = StorageService.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  // Primary Academic & Exam Selectors (UTS vs UAS)
  const [examType, setExamType] = useState<ExamType>('UTS');
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');
  const [academicTerm, setAcademicTerm] = useState<AcademicTerm>('Ganjil');

  // Master Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [examConfig, setExamConfig] = useState<ExamConfig>(StorageService.getExamConfig('UTS'));

  // Exam Offerings State
  const [offerings, setOfferings] = useState<ExamOffering[]>([]);
  const [publishStatus, setPublishStatus] = useState<{ isPublished: boolean; publishedAt?: string; publishedBy?: string }>({
    isPublished: false,
  });

  // Conflicts & Versioning
  const [conflicts, setConflicts] = useState<ExamConflictItem[]>([]);
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [changeLogs, setChangeLogs] = useState<ExamChangeLog[]>([]);

  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isChangeLogModalOpen, setIsChangeLogModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ExamOffering | null>(null);

  // Active Tab in Unified Workflow
  const [activeTab, setActiveTab] = useState<'selection' | 'allocation' | 'schedule' | 'publish'>('schedule');

  // Course Selection & Sectioning Workspace
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [courseStudentInputs, setCourseStudentInputs] = useState<Record<string, string>>({}); // EMPTY by default!
  const [courseDurations, setCourseDurations] = useState<Record<string, number>>({});
  const [searchCourseQuery, setSearchCourseQuery] = useState('');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterCurriculum, setFilterCurriculum] = useState<string>('all');

  // Schedule View Filters
  const [scheduleFilterDate, setScheduleFilterDate] = useState<string>('all');
  const [scheduleFilterSemester, setScheduleFilterSemester] = useState<string>('all');
  const [scheduleFilterRoom, setScheduleFilterRoom] = useState<string>('all');
  const [scheduleFilterSearch, setScheduleFilterSearch] = useState<string>('');

  // Optimization State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<ExamOptimizationProgress | null>(null);
  const stopOptimizationRef = useRef<{ current: boolean }>({ current: false });

  // Load all data on mount and whenever examType/academicYear/academicTerm changes
  useEffect(() => {
    const loadedCourses = StorageService.getCourses();
    const loadedRooms = StorageService.getRooms();
    const loadedLecturers = StorageService.getLecturers();
    const loadedSessions = StorageService.getExamSessions();
    const loadedConfig = StorageService.getExamConfig(examType);
    const loadedOfferings = StorageService.getExamOfferings(examType, academicYear, academicTerm);
    const loadedStatus = StorageService.getExamPublishStatus(examType, academicYear, academicTerm);
    const loadedVersions = StorageService.getExamVersions(examType, academicYear, academicTerm);
    const loadedLogs = StorageService.getExamChangeLogs(examType);

    setCourses(loadedCourses);
    setRooms(loadedRooms);
    setLecturers(loadedLecturers);
    setSessions(loadedSessions);
    setExamConfig(loadedConfig);
    setOfferings(loadedOfferings);
    setPublishStatus(loadedStatus);
    setVersions(loadedVersions);
    setChangeLogs(loadedLogs);

    // Initial selected courses from existing offerings
    const existingCourseIds = Array.from(new Set(loadedOfferings.map(o => o.courseId)));
    setSelectedCourseIds(existingCourseIds);

    // Initial conflict detection
    const currentConflicts = detectExamConflicts(loadedOfferings, loadedRooms, loadedSessions, loadedLecturers);
    setConflicts(currentConflicts);
  }, [examType, academicYear, academicTerm]);

  // Recalculate conflicts when offerings change
  useEffect(() => {
    if (rooms.length > 0 && sessions.length > 0) {
      const currentConflicts = detectExamConflicts(offerings, rooms, sessions, lecturers);
      setConflicts(currentConflicts);
    }
  }, [offerings, rooms, sessions, lecturers]);

  // Generate available dates based on config
  const availableDates = useMemo(() => {
    const dates: string[] = [];
    if (!examConfig.examStartDate || !examConfig.examEndDate) return dates;

    const start = new Date(examConfig.examStartDate);
    const end = new Date(examConfig.examEndDate);
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      if (!examConfig.excludeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [examConfig.examStartDate, examConfig.examEndDate, examConfig.excludeWeekends]);

  // Handle Save Sessions
  const handleSaveSessions = (newSessions: ExamSession[]) => {
    StorageService.saveExamSessions(newSessions);
    setSessions(newSessions);
    StorageService.logExamChange({
      examType,
      academicYear,
      academicTerm,
      action: 'UPDATE_SESSIONS',
      description: `Konfigurasi sesi ujian diperbarui (${newSessions.length} sesi).`,
      changedBy: currentUser.name,
    });
    showToast('success', 'Sesi Ujian Disimpan', 'Daftar sesi ujian telah diperbarui.');
  };

  // Handle Reset Default Sessions
  const handleResetDefaultSessions = () => {
    const defaultSessions = StorageService.resetDefaultExamSessions();
    setSessions(defaultSessions);
    showToast('info', 'Reset Sesi Ujian', 'Sesi ujian dikembalikan ke standar.');
  };

  // Toggle Course Selection for Exam
  const handleToggleCourseSelect = (courseId: string) => {
    if (!isAdmin) return;
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(prev => prev.filter(id => id !== courseId));
    } else {
      setSelectedCourseIds(prev => [...prev, courseId]);
      // Default input MUST be EMPTY (not 0) as per Requirement 4
      if (courseStudentInputs[courseId] === undefined) {
        setCourseStudentInputs(prev => ({ ...prev, [courseId]: '' }));
      }
    }
  };

  // Quick Select Semester Package
  const handleSelectSemesterPackage = (targetSemester: number) => {
    if (!isAdmin) return;
    const semesterCourses = courses.filter(c => c.semester === targetSemester && c.isActive);
    const semCourseIds = semesterCourses.map(c => c.id);
    setSelectedCourseIds(prev => Array.from(new Set([...prev, ...semCourseIds])));

    // Initialize blank student inputs
    setCourseStudentInputs(prev => {
      const next = { ...prev };
      semCourseIds.forEach(id => {
        if (next[id] === undefined) next[id] = '';
      });
      return next;
    });

    showToast(
      'success',
      `Paket Semester ${targetSemester} Dipilih`,
      `${semCourseIds.length} mata kuliah berhasil ditambahkan ke daftar ujian.`
    );
  };

  // Generate / Split Offerings from Selected Courses
  const handleGenerateOfferingsFromCourses = () => {
    if (!isAdmin) return;
    if (selectedCourseIds.length === 0) {
      showToast('error', 'Pilih Mata Kuliah', 'Silakan pilih minimal satu mata kuliah.');
      return;
    }

    const newOfferings: ExamOffering[] = [];
    const maxSectionCap = examConfig.maxStudentsPerSection || 40;

    for (const courseId of selectedCourseIds) {
      const course = courses.find(c => c.id === courseId);
      if (!course) continue;

      const rawCount = courseStudentInputs[courseId];
      const studentCount = parseInt(rawCount, 10);

      if (isNaN(studentCount) || studentCount <= 0) {
        showToast(
          'error',
          'Jumlah Peserta Wajib Diisi',
          `Masukkan jumlah peserta untuk "${course.name}". Input tidak boleh kosong atau 0.`
        );
        return;
      }

      const duration = courseDurations[courseId] || examConfig.defaultDurationMinutes;

      // Section splitting calculation
      // E.g. 127 students with max 40 -> 4 sections (32, 32, 32, 31)
      const numSections = Math.max(1, Math.ceil(studentCount / maxSectionCap));
      const basePerSection = Math.floor(studentCount / numSections);
      const remainder = studentCount % numSections;

      const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

      for (let s = 0; s < numSections; s++) {
        const countForThisSection = basePerSection + (s < remainder ? 1 : 0);
        const sectionName = numSections > 1 ? sectionLetters[s] : 'A';

        // Check if existing offering already exists to preserve manual slot if any
        const existing = offerings.find(o => o.courseId === courseId && o.sectionName === sectionName);

        newOfferings.push({
          id: existing ? existing.id : `ex-off-${course.id}-${sectionName}-${Date.now()}`,
          examType,
          academicYear,
          academicTerm,
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          curriculumYear: course.curriculumYear ? Number(course.curriculumYear) : 2026,
          semester: course.semester,
          kbkId: course.kbkIds?.[0],
          sectionName,
          studentCount: countForThisSection,
          durationMinutes: duration,
          examDate: existing?.examDate,
          examSessionId: existing?.examSessionId,
          roomIds: existing?.roomIds || [],
          supervisorLecturerIds: existing?.supervisorLecturerIds || [],
          lecturerIds: course.lecturerId ? [course.lecturerId] : [],
          status: existing?.status || 'draft',
        });
      }
    }

    setOfferings(newOfferings);
    StorageService.saveExamOfferings(newOfferings, examType, academicYear, academicTerm);
    StorageService.logExamChange({
      examType,
      academicYear,
      academicTerm,
      action: 'GENERATE_OFFERINGS',
      description: `Generate ${newOfferings.length} exam offerings dari ${selectedCourseIds.length} mata kuliah.`,
      changedBy: currentUser.name,
    });

    showToast(
      'success',
      'Exam Offerings Dibuat',
      `${newOfferings.length} seksi ujian berhasil dibuat siap dijadwalkan.`
    );
    setActiveTab('allocation');
  };

  // Run Initial Schedule Generation (Greedy Heuristic)
  const handleGenerateInitialSchedule = () => {
    if (!isAdmin) return;
    if (offerings.length === 0) {
      showToast('warning', 'Tidak Ada Ujian', 'Buat exam offerings terlebih dahulu.');
      return;
    }
    if (availableDates.length === 0) {
      showToast('error', 'Rentang Tanggal Kosong', 'Tentukan rentang tanggal ujian pada pengaturan.');
      return;
    }

    const scheduled = generateInitialExamSchedule(offerings, rooms, sessions, availableDates);
    setOfferings(scheduled);
    StorageService.saveExamOfferings(scheduled, examType, academicYear, academicTerm);

    StorageService.logExamChange({
      examType,
      academicYear,
      academicTerm,
      action: 'INITIAL_HEURISTIC_SCHEDULE',
      description: `Generate jadwal awal heuristik untuk ${scheduled.length} ujian.`,
      changedBy: currentUser.name,
    });

    showToast(
      'success',
      'Jadwal Awal Berhasil Dibuat',
      'Ujian telah diplot secara otomatis berdasarkan kapasitas ruangan dan sesi.'
    );
    setActiveTab('schedule');
  };

  // Run Simulated Annealing Optimizer
  const handleRunSAOptimization = async () => {
    if (!isAdmin) return;
    if (offerings.length === 0) {
      showToast('warning', 'Belum Ada Ujian', 'Tambahkan mata kuliah ujian terlebih dahulu.');
      return;
    }

    setIsOptimizing(true);
    stopOptimizationRef.current = { current: false };

    try {
      const result = await optimizeExamScheduleSA(
        offerings,
        rooms,
        sessions,
        lecturers,
        {
          availableDates,
          maxIterations: 1000,
          initialTemperature: 2000,
          coolingRate: 0.994,
          keepParallelSectionsTogether: true,
        },
        progress => {
          setOptimizationProgress(progress);
        },
        stopOptimizationRef.current
      );

      setOfferings(result.offerings);
      setConflicts(result.conflicts);
      StorageService.saveExamOfferings(result.offerings, examType, academicYear, academicTerm);

      StorageService.logExamChange({
        examType,
        academicYear,
        academicTerm,
        action: 'OPTIMIZE_SA',
        description: `Optimasi Simulated Annealing selesai. Sisa konflik: ${result.conflicts.length}.`,
        changedBy: currentUser.name,
      });

      showToast(
        'success',
        'Optimasi Selesai',
        `Jadwal ujian berhasil dioptimasi dengan ${result.conflicts.length} catatan konflik.`
      );
    } catch (err: any) {
      showToast('error', 'Optimasi Terkendala', err.message || 'Gagal menjalankan optimasi.');
    } finally {
      setIsOptimizing(false);
      setOptimizationProgress(null);
    }
  };

  // Stop Optimizer
  const handleStopOptimization = () => {
    stopOptimizationRef.current.current = true;
    setIsOptimizing(false);
    showToast('info', 'Optimasi Dihentikan', 'Algoritma Simulated Annealing dihentikan oleh pengguna.');
  };

  // Manual Offering Save
  const handleSaveOfferingModal = (updated: ExamOffering) => {
    const updatedOfferings = offerings.map(o => (o.id === updated.id ? updated : o));
    setOfferings(updatedOfferings);
    StorageService.saveExamOfferings(updatedOfferings, examType, academicYear, academicTerm);

    StorageService.logExamChange({
      examType,
      academicYear,
      academicTerm,
      action: 'MANUAL_EDIT_OFFERING',
      description: `Edit manual ujian ${updated.courseName} (${updated.sectionName || 'Utama'}).`,
      before: offerings.find(o => o.id === updated.id),
      after: updated,
      changedBy: currentUser.name,
      examOfferingId: updated.id,
    });

    showToast('success', 'Perubahan Disimpan', `Ujian ${updated.courseName} diperbarui.`);
  };

  // Publish / Unpublish Schedule
  const handleTogglePublish = () => {
    if (!isAdmin) return;
    const newStatus = !publishStatus.isPublished;

    if (newStatus && conflicts.some(c => c.severity === 'high')) {
      if (
        !confirm(
          'Masih terdapat konflik bentrok berbobot TINGGI pada jadwal ujian. Apakah Anda yakin ingin tetap menerbitkan jadwal ini?'
        )
      ) {
        return;
      }
    }

    StorageService.setExamPublishStatus(examType, newStatus, currentUser.name, academicYear, academicTerm);
    setPublishStatus({
      isPublished: newStatus,
      publishedAt: newStatus ? new Date().toISOString() : undefined,
      publishedBy: newStatus ? currentUser.name : undefined,
    });

    // Update offerings state
    setOfferings(prev =>
      prev.map(o => ({
        ...o,
        status: newStatus ? 'published' : o.examDate && o.examSessionId ? 'scheduled' : 'draft',
      }))
    );

    // Snapshot version automatically when published
    if (newStatus) {
      const newVersion = StorageService.createExamVersion(
        examType,
        `${academicYear} ${academicTerm} — ${examType} — Published v${versions.length + 1}`,
        offerings,
        'published',
        currentUser.name,
        'Otomatis dibuat saat publikasi jadwal ujian.',
        academicYear,
        academicTerm
      );
      setVersions(prev => [newVersion, ...prev]);
    }

    StorageService.logExamChange({
      examType,
      academicYear,
      academicTerm,
      action: newStatus ? 'PUBLISH_SCHEDULE' : 'UNPUBLISH_SCHEDULE',
      description: newStatus ? `Jadwal ${examType} resmi diterbitkan.` : `Publikasi jadwal ${examType} dibatalkan.`,
      changedBy: currentUser.name,
    });

    showToast(
      newStatus ? 'success' : 'info',
      newStatus ? 'Jadwal Ujian Diterbitkan!' : 'Publikasi Dibatalkan',
      newStatus
        ? `Jadwal ${examType} kini dapat diakses oleh Mahasiswa dan Dosen.`
        : `Jadwal ${examType} dikembalikan ke status draft internal.`
    );
  };

  // Restore Version Snapshot
  const handleRestoreVersion = (ver: ExamVersion) => {
    setOfferings(ver.offerings);
    StorageService.saveExamOfferings(ver.offerings, examType, academicYear, academicTerm);
    StorageService.logExamChange({
      examType,
      academicYear,
      academicTerm,
      action: 'RESTORE_VERSION',
      description: `Memulihkan jadwal ke versi "${ver.versionName}".`,
      changedBy: currentUser.name,
    });
    showToast(
      'success',
      'Versi Dipulihkan',
      `Jadwal ${examType} telah dikembalikan sesuai snapshot "${ver.versionName}".`
    );
  };

  // Filtered Offerings for Schedule View
  const filteredScheduleOfferings = useMemo(() => {
    return offerings.filter(o => {
      if (scheduleFilterDate !== 'all' && o.examDate !== scheduleFilterDate) return false;
      if (scheduleFilterSemester !== 'all' && String(o.semester) !== scheduleFilterSemester) return false;
      if (scheduleFilterRoom !== 'all' && !o.roomIds.includes(scheduleFilterRoom)) return false;
      if (scheduleFilterSearch) {
        const query = scheduleFilterSearch.toLowerCase();
        const matchesName = o.courseName.toLowerCase().includes(query);
        const matchesCode = o.courseCode.toLowerCase().includes(query);
        const matchesSection = o.sectionName?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesSection) return false;
      }
      return true;
    });
  }, [offerings, scheduleFilterDate, scheduleFilterSemester, scheduleFilterRoom, scheduleFilterSearch]);

  // Group filtered offerings by Date and then by Session (Requirement 17)
  const groupedSchedule = useMemo(() => {
    // Sort dates
    const dateGroups = new Map<string, ExamOffering[]>();
    for (const off of filteredScheduleOfferings) {
      const dateKey = off.examDate || 'Belum Ditentukan';
      const list = dateGroups.get(dateKey) || [];
      list.push(off);
      dateGroups.set(dateKey, list);
    }

    const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => {
      if (a === 'Belum Ditentukan') return 1;
      if (b === 'Belum Ditentukan') return -1;
      return a.localeCompare(b);
    });

    return sortedDates.map(date => {
      const items = dateGroups.get(date) || [];
      // Group by session inside this date
      const sessionGroups = new Map<string, ExamOffering[]>();
      for (const item of items) {
        const sesKey = item.examSessionId || 'unassigned';
        const list = sessionGroups.get(sesKey) || [];
        list.push(item);
        sessionGroups.set(sesKey, list);
      }

      // Sort session keys by session startTime
      const sortedSessionKeys = Array.from(sessionGroups.keys()).sort((a, b) => {
        const sesA = sessions.find(s => s.id === a);
        const sesB = sessions.find(s => s.id === b);
        if (!sesA) return 1;
        if (!sesB) return -1;
        return sesA.startTime.localeCompare(sesB.startTime);
      });

      return {
        date,
        sessions: sortedSessionKeys.map(sesKey => ({
          sessionId: sesKey,
          session: sessions.find(s => s.id === sesKey),
          offerings: sessionGroups.get(sesKey) || [],
        })),
      };
    });
  }, [filteredScheduleOfferings, sessions]);

  // Helper formatting for Indonesian Date
  const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Belum Ditentukan') return 'Belum Ditentukan';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Toolbar: UTS/UAS & Year/Term Selection & Action Buttons */}
      <div className="p-4 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-100 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                MODUL PENJADWALAN UJIAN
              </span>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                  publishStatus.isPublished
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {publishStatus.isPublished ? '● TERBIT (PUBLISHED)' : '○ DRAFT INTERNAL'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Penyusunan Jadwal Ujian {examType}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sistem Penjadwalan Ujian Semester Elektro-Scheduler (UTS & UAS Terpisah, Optimasi Ruangan & Sesi)
            </p>
          </div>

          {/* UTS vs UAS Selector & Academic Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* UTS / UAS Switcher */}
            <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setExamType('UTS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  examType === 'UTS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                UTS
              </button>
              <button
                onClick={() => setExamType('UAS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  examType === 'UAS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                UAS
              </button>
            </div>

            {/* Academic Year Selector */}
            <select
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="2026/2027">2026/2027</option>
              <option value="2025/2026">2025/2026</option>
              <option value="2024/2025">2024/2025</option>
            </select>

            {/* Academic Term Switcher */}
            <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setAcademicTerm('Ganjil')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  academicTerm === 'Ganjil'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Ganjil
              </button>
              <button
                onClick={() => setAcademicTerm('Genap')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  academicTerm === 'Genap'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Genap
              </button>
            </div>

            {/* Kelola Sesi Ujian */}
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Sesi Ujian ({sessions.length})
            </button>

            {/* Riwayat & Versi */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              Versi ({versions.length})
            </button>

            {/* Log Audit */}
            <button
              onClick={() => setIsChangeLogModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Log Audit
            </button>
          </div>
        </div>

        {/* Workflow Tabs Navigation */}
        <div className="flex border-b border-slate-100 overflow-x-auto gap-2 pt-2">
          <button
            onClick={() => setActiveTab('selection')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === 'selection'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            1. Pemilihan Mata Kuliah & Peserta ({selectedCourseIds.length})
          </button>

          <button
            onClick={() => setActiveTab('allocation')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === 'allocation'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            2. Pengawas & Alokasi Ruang ({offerings.length})
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === 'schedule'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            3. Jadwal & Optimasi
            {conflicts.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-full text-[10px] font-bold">
                {conflicts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('publish')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
              activeTab === 'publish'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            4. Terbitkan & Ekspor
          </button>
        </div>
      </div>

      {/* Access Control Notice for Non-Admins */}
      {!isAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-800">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Mode Lihat Saja:</strong> Anda login sebagai <strong>{currentUser.role.toUpperCase()}</strong>.
            Hanya Administrator yang dapat mengubah, mengoptimasi, atau menerbitkan jadwal ujian.
          </span>
        </div>
      )}

      {/* TAB 1: PEMILIHAN MATA KULIAH & PESERTA */}
      {activeTab === 'selection' && (
        <div className="space-y-6">
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Katalog Mata Kuliah untuk Ujian {examType}
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih mata kuliah secara manual atau per paket semester. Masukkan jumlah peserta ujian (input kosong tanpa default 0).
                </p>
              </div>

              {/* Quick Semester Package Buttons */}
              {isAdmin && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500">Pilih Paket:</span>
                  {[1, 3, 5, 7].map(sem => (
                    <button
                      key={sem}
                      onClick={() => handleSelectSemesterPackage(sem)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Sem {sem}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode atau nama mata kuliah..."
                  value={searchCourseQuery}
                  onChange={e => setSearchCourseQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <select
                value={filterSemester}
                onChange={e => setFilterSemester(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">Semua Semester</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={String(s)}>Semester {s}</option>
                ))}
              </select>

              <select
                value={filterCurriculum}
                onChange={e => setFilterCurriculum(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="all">Semua Kurikulum</option>
                <option value="2026">Kurikulum 2026</option>
                <option value="2022">Kurikulum 2022</option>
              </select>
            </div>

            {/* Table Mata Kuliah */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">Pilih</th>
                    <th className="p-3">Kode & Mata Kuliah</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3">Kurikulum</th>
                    <th className="p-3 w-40">Jumlah Peserta Ujian</th>
                    <th className="p-3 w-32">Durasi ({examType})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courses
                    .filter(c => {
                      if (filterSemester !== 'all' && String(c.semester) !== filterSemester) return false;
                      if (filterCurriculum !== 'all' && String(c.curriculumYear) !== filterCurriculum) return false;
                      if (searchCourseQuery) {
                        const q = searchCourseQuery.toLowerCase();
                        if (!c.name.toLowerCase().includes(q) && !c.code.toLowerCase().includes(q)) return false;
                      }
                      return true;
                    })
                    .map(course => {
                      const isSelected = selectedCourseIds.includes(course.id);
                      return (
                        <tr
                          key={course.id}
                          className={`transition-colors ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isAdmin}
                              onChange={() => handleToggleCourseSelect(course.id)}
                              className="rounded-md text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{course.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {course.code} • {course.sks} SKS
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">Semester {course.semester}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px]">
                              {course.curriculumYear}
                            </span>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min={1}
                              disabled={!isSelected || !isAdmin}
                              placeholder="Ketik peserta..."
                              value={courseStudentInputs[course.id] ?? ''}
                              onChange={e =>
                                setCourseStudentInputs(prev => ({
                                  ...prev,
                                  [course.id]: e.target.value,
                                }))
                              }
                              className={`w-full px-2.5 py-1.5 text-xs rounded-xl border font-semibold ${
                                isSelected
                                  ? 'bg-white border-indigo-300 text-indigo-900 focus:ring-2 focus:ring-indigo-500'
                                  : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}
                            />
                          </td>
                          <td className="p-3">
                            <select
                              disabled={!isSelected || !isAdmin}
                              value={courseDurations[course.id] || examConfig.defaultDurationMinutes}
                              onChange={e =>
                                setCourseDurations(prev => ({
                                  ...prev,
                                  [course.id]: parseInt(e.target.value, 10),
                                }))
                              }
                              className={`w-full px-2 py-1.5 text-xs rounded-xl border ${
                                isSelected ? 'bg-white border-slate-200' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <option value={60}>60 Menit</option>
                              <option value={90}>90 Menit</option>
                              <option value={100}>100 Menit</option>
                              <option value={120}>120 Menit</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Bottom Generate Button */}
            {isAdmin && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  {selectedCourseIds.length} mata kuliah dipilih untuk ujian {examType}.
                </span>
                <button
                  onClick={handleGenerateOfferingsFromCourses}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Exam Offerings & Bagi Seksi
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENGAWAS & ALOKASI RUANG */}
      {activeTab === 'allocation' && (
        <div className="space-y-6">
          <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Daftar Seksi Ujian & Alokasi Pengawas / Ruang
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap mata kuliah telah dipecah menjadi seksi (misal A, B, C) sesuai kapasitas. Pilih pengawas ujian dan alokasikan ruangan.
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  Lanjut ke Penyusunan Jadwal
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {offerings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Belum ada exam offerings yang dibuat.</p>
                <button
                  onClick={() => setActiveTab('selection')}
                  className="mt-3 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  Pilih Mata Kuliah Sekarang
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Mata Kuliah & Seksi</th>
                      <th className="p-3">Semester</th>
                      <th className="p-3">Peserta</th>
                      <th className="p-3">Dosen Pengampu</th>
                      <th className="p-3">Pengawas Ujian</th>
                      <th className="p-3">Ruangan</th>
                      <th className="p-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {offerings.map(off => {
                      const roomObj = rooms.find(r => off.roomIds.includes(r.id));
                      const isCapShort = roomObj ? roomObj.capacity < off.studentCount : false;
                      const supervisorNames = lecturers
                        .filter(l => off.supervisorLecturerIds?.includes(l.id))
                        .map(l => l.name);

                      const lecturerNames = lecturers
                        .filter(l => off.lecturerIds?.includes(l.id))
                        .map(l => l.name);

                      return (
                        <tr key={off.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-slate-900 block">{off.courseName}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {off.courseCode} • Seksi {off.sectionName || 'Utama'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">Sem {off.semester}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-xs">
                              {off.studentCount} Mhs
                            </span>
                          </td>
                          <td className="p-3 text-slate-600">
                            {lecturerNames.length > 0 ? lecturerNames.join(', ') : '—'}
                          </td>
                          <td className="p-3">
                            {supervisorNames.length > 0 ? (
                              <span className="font-semibold text-indigo-700">
                                {supervisorNames.join(', ')}
                              </span>
                            ) : (
                              <span className="text-amber-600 font-medium italic">
                                Pengawas belum ditentukan
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            {roomObj ? (
                              <div>
                                <span className="font-bold text-slate-800">{roomObj.name}</span>
                                <span
                                  className={`block text-[10px] ${
                                    isCapShort ? 'text-rose-600 font-bold' : 'text-slate-500'
                                  }`}
                                >
                                  Kapasitas: {roomObj.capacity} kursi {isCapShort && '(Kurang!)'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Belum diplot</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {isAdmin && (
                              <button
                                onClick={() => setEditingOffering(off)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Seksi Ujian"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
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

      {/* TAB 3: JADWAL & OPTIMASI (HEURISTIC & SA) */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Optimization Controls Bar */}
          {isAdmin && (
            <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Mesin Penjadwalan & Optimasi Simulated Annealing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Jalankan generator heuristik atau optimasi SA untuk menempatkan ujian pada tanggal, sesi, dan ruangan tanpa bentrok.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleGenerateInitialSchedule}
                    disabled={isOptimizing}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Generate Jadwal Awal (Heuristik)
                  </button>

                  {!isOptimizing ? (
                    <button
                      onClick={handleRunSAOptimization}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Jalankan Optimasi SA
                    </button>
                  ) : (
                    <button
                      onClick={handleStopOptimization}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Hentikan Optimasi
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar during optimization */}
              {isOptimizing && optimizationProgress && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                    <span>
                      Iterasi {optimizationProgress.iteration} / {optimizationProgress.maxIterations} • Suhu:{' '}
                      {optimizationProgress.temperature.toFixed(1)}
                    </span>
                    <span>Konflik: {optimizationProgress.conflictCount}</span>
                  </div>
                  <div className="w-full h-2 bg-indigo-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-100"
                      style={{
                        width: `${(optimizationProgress.iteration / optimizationProgress.maxIterations) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conflict Warnings Panel */}
          {conflicts.length > 0 && (
            <div className="p-5 bg-white rounded-3xl border border-rose-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Deteksi Konflik & Peringatan ({conflicts.length})
                </h4>
                <span className="text-[11px] text-slate-500">
                  {conflicts.filter(c => c.severity === 'high').length} Kritis •{' '}
                  {conflicts.filter(c => c.severity === 'medium').length} Sedang / Potensi
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {conflicts.map(c => (
                  <div key={c.id} className="pt-2 text-xs flex items-start gap-2.5">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase mt-0.5 shrink-0 ${
                        c.severity === 'high'
                          ? 'bg-rose-100 text-rose-800'
                          : c.severity === 'medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.type}
                    </span>
                    <div>
                      <h5 className="font-bold text-slate-900">{c.title}</h5>
                      <p className="text-slate-600 text-[11px] mt-0.5">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Filters Bar */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-2">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter Tampilan:
            </div>

            <select
              value={scheduleFilterDate}
              onChange={e => setScheduleFilterDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">Semua Tanggal</option>
              {availableDates.map(d => (
                <option key={d} value={d}>
                  {formatIndonesianDate(d)}
                </option>
              ))}
            </select>

            <select
              value={scheduleFilterSemester}
              onChange={e => setScheduleFilterSemester(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">Semua Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={String(s)}>Semester {s}</option>
              ))}
            </select>

            <select
              value={scheduleFilterRoom}
              onChange={e => setScheduleFilterRoom(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="all">Semua Ruangan</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity} kursi)
                </option>
              ))}
            </select>

            <div className="relative ml-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ujian..."
                value={scheduleFilterSearch}
                onChange={e => setScheduleFilterSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 17. TAMPILAN JADWAL UJIAN GROUPED BY DATE & SESSION */}
          <div className="space-y-6">
            {groupedSchedule.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada jadwal ujian yang sesuai dengan filter.</p>
              </div>
            ) : (
              groupedSchedule.map(dateGroup => (
                <div
                  key={dateGroup.date}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden"
                >
                  {/* Date Header */}
                  <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-black tracking-wider uppercase font-mono">
                        {formatIndonesianDate(dateGroup.date)}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {dateGroup.sessions.reduce((sum, s) => sum + s.offerings.length, 0)} Ujian
                    </span>
                  </div>

                  {/* Sessions within this Date */}
                  <div className="divide-y divide-slate-100 p-4 space-y-4">
                    {dateGroup.sessions.map(sessionBlock => (
                      <div key={sessionBlock.sessionId} className="pt-2">
                        {/* Session Time Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg flex items-center gap-1.5 border border-indigo-100">
                            <Clock className="w-3.5 h-3.5" />
                            {sessionBlock.session
                              ? `${sessionBlock.session.startTime} – ${sessionBlock.session.endTime}`
                              : 'Waktu Belum Ditentukan'}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {sessionBlock.session?.name || 'Sesi Kustom'}
                          </span>
                        </div>

                        {/* Exam Offerings Cards formatted strictly as per Requirement 17 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {sessionBlock.offerings.map(off => {
                            const assignedRooms = rooms.filter(r => off.roomIds.includes(r.id));
                            const roomLabel = assignedRooms.map(r => r.name).join(', ') || 'Belum diplot';

                            const supervisorNames = lecturers
                              .filter(l => off.supervisorLecturerIds?.includes(l.id))
                              .map(l => l.name)
                              .join(', ') || 'Belum ditentukan';

                            const lecturerNames = lecturers
                              .filter(l => off.lecturerIds?.includes(l.id))
                              .map(l => l.name)
                              .join(', ') || '—';

                            return (
                              <div
                                key={off.id}
                                className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all space-y-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-900">
                                      {off.courseName}{' '}
                                      <span className="text-xs font-semibold text-slate-500">
                                        ({off.courseCode})
                                      </span>
                                    </h4>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                      {off.examType} • Semester {off.semester} • Seksi {off.sectionName || 'Utama'}{' '}
                                      {off.kbkId ? `• ${off.kbkId.replace('kbk-', '').toUpperCase()}` : ''}
                                    </p>
                                  </div>

                                  {isAdmin && (
                                    <button
                                      onClick={() => setEditingOffering(off)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                      title="Edit Penjadwalan"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100/80 space-y-1 font-mono">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Peserta:</span>
                                    <span className="font-bold text-indigo-700">{off.studentCount} Mahasiswa</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Ruang:</span>
                                    <span className="font-bold text-slate-900">{roomLabel}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Pengawas:</span>
                                    <span className="font-semibold text-slate-800 text-right">{supervisorNames}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-500">Dosen Pengampu:</span>
                                    <span className="text-slate-600 text-right">{lecturerNames}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TERBITKAN & EKSPOR (PUBLISH) */}
      {activeTab === 'publish' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" />
                Status Publikasi & Ekspor Jadwal Ujian {examType}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tahun Akademik: <strong>{academicYear}</strong> • Semester: <strong>{academicTerm}</strong>
              </p>
            </div>

            {/* Publication Card */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                publishStatus.isPublished
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      publishStatus.isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  <h4 className="text-sm font-bold text-slate-900">
                    Status Jadwal: {publishStatus.isPublished ? 'TELAH DITERBITKAN' : 'STATUS DRAFT INTERNAL'}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {publishStatus.isPublished
                    ? `Jadwal resmi dapat dilihat oleh mahasiswa dan pengawas sejak ${new Date(
                        publishStatus.publishedAt || ''
                      ).toLocaleString('id-ID')} (Diterbitkan oleh: ${publishStatus.publishedBy || 'Admin'}).`
                    : 'Jadwal masih berstatus draft dan belum dapat diakses pada portal Mahasiswa/Dosen.'}
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={handleTogglePublish}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-2 shrink-0 ${
                    publishStatus.isPublished
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {publishStatus.isPublished ? 'Batalkan Publikasi' : `Terbitkan Jadwal ${examType}`}
                </button>
              )}
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Ujian Diplot</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">{offerings.length} Seksi</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Total Peserta Terdaftar</span>
                <span className="text-lg font-black text-indigo-700 mt-0.5 block">
                  {offerings.reduce((sum, o) => sum + (o.studentCount || 0), 0)} Mhs
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Sesi Ujian Aktif</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block">
                  {sessions.filter(s => s.isActive).length} Sesi/Hari
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-400 block">Konflik Terdeteksi</span>
                <span
                  className={`text-lg font-black mt-0.5 block ${
                    conflicts.length > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {conflicts.length} Kasus
                </span>
              </div>
            </div>

            {/* Export Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Cetak / Ekspor PDF
              </button>

              <button
                onClick={() => {
                  // CSV download
                  const headers = ['Tanggal', 'Sesi', 'Kode MK', 'Mata Kuliah', 'Semester', 'Seksi', 'Peserta', 'Ruangan', 'Pengawas'];
                  const rows = offerings.map(o => {
                    const roomName = rooms.filter(r => o.roomIds.includes(r.id)).map(r => r.name).join('; ');
                    const supNames = lecturers.filter(l => o.supervisorLecturerIds?.includes(l.id)).map(l => l.name).join('; ');
                    return [
                      o.examDate || '',
                      o.examSessionId || '',
                      o.courseCode,
                      o.courseName,
                      o.semester,
                      o.sectionName || 'A',
                      o.studentCount,
                      roomName,
                      supNames,
                    ];
                  });

                  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `Jadwal_${examType}_${academicYear.replace('/', '-')}_${academicTerm}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  showToast('success', 'Unduhan Dimulai', `Berkas CSV Jadwal ${examType} berhasil diunduh.`);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Unduh CSV / Spreadsheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ExamSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        sessions={sessions}
        onSaveSessions={handleSaveSessions}
        onResetDefault={handleResetDefaultSessions}
      />

      <ExamOfferingEditModal
        isOpen={Boolean(editingOffering)}
        onClose={() => setEditingOffering(null)}
        offering={editingOffering}
        rooms={rooms}
        sessions={sessions}
        lecturers={lecturers}
        availableDates={availableDates}
        onSave={handleSaveOfferingModal}
      />

      <ExamHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        versions={versions}
        examType={examType}
        academicYear={academicYear}
        academicTerm={academicTerm}
        onRestoreVersion={handleRestoreVersion}
      />

      <ExamChangeLogModal
        isOpen={isChangeLogModalOpen}
        onClose={() => setIsChangeLogModalOpen(false)}
        logs={changeLogs}
        examType={examType}
      />
    </div>
  );
};

export default ExamSchedulingPage;
