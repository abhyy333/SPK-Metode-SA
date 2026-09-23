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
import { ExamBlockMatrix } from '../../components/exam/ExamBlockMatrix';
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
  RotateCcw,
  RefreshCw,
  Sliders,
  Check,
  Zap,
  GraduationCap,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { formatIndonesianDate, calculateExamTiming } from '../../utils/examUtils';

export const ExamSchedulingPage: React.FC = () => {
  const { showToast } = useToast();
  const currentUser = StorageService.getCurrentUser();
  const isAdmin = currentUser.role === 'admin';

  // Primary Selectors: UTS vs UAS
  const [examType, setExamType] = useState<ExamType>('UTS');
  const [academicYear, setAcademicYear] = useState<string>('2026/2027');
  const [academicTerm, setAcademicTerm] = useState<AcademicTerm>('Ganjil');

  // Master Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [examConfig, setExamConfig] = useState<ExamConfig>(StorageService.getExamConfig('UTS'));

  // Exam Offerings State (Derived from Lecture Schedule CourseOfferings)
  const [offerings, setOfferings] = useState<ExamOffering[]>([]);
  const [publishStatus, setPublishStatus] = useState<{ isPublished: boolean; publishedAt?: string; publishedBy?: string }>({
    isPublished: false,
  });

  // Sync state tracking with source lecture schedule
  const [syncStatus, setSyncStatus] = useState<{
    hasChanged: boolean;
    lectureOfferingsCount: number;
    examOfferingsCount: number;
    message: string;
  }>({
    hasChanged: false,
    lectureOfferingsCount: 0,
    examOfferingsCount: 0,
    message: '',
  });
  const [isSyncBannerDismissed, setIsSyncBannerDismissed] = useState(false);

  // Conflicts & Versioning
  const [conflicts, setConflicts] = useState<ExamConflictItem[]>([]);
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [changeLogs, setChangeLogs] = useState<ExamChangeLog[]>([]);

  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isChangeLogModalOpen, setIsChangeLogModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<ExamOffering | null>(null);

  // View Mode & Fullsize
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [showFilterBar, setShowFilterBar] = useState<boolean>(true);

  // Filters & Search
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'incomplete_supervisor' | 'unscheduled' | 'conflict'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Optimization State
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState<ExamOptimizationProgress | null>(null);
  const stopOptimizationRef = useRef<boolean>(false);

  // Load data on mount and whenever examType/academicYear/academicTerm changes
  const loadAllData = () => {
    const loadedCourses = StorageService.getCourses();
    const loadedRooms = StorageService.getRooms();
    const loadedLecturers = StorageService.getLecturers();
    const loadedSessions = StorageService.getExamSessions();
    const loadedConfig = StorageService.getExamConfig(examType);
    let loadedOfferings = StorageService.getExamOfferings(examType, academicYear, academicTerm);

    // Auto-bootstrap exam offerings from lecture schedule if empty
    if (loadedOfferings.length === 0) {
      const synced = StorageService.generateOrSyncExamOfferingsFromLectures(examType, academicYear, academicTerm, true);
      if (synced.offerings.length > 0) {
        loadedOfferings = synced.offerings;
      }
    }

    const loadedPublish = StorageService.getExamPublishStatus(examType, academicYear, academicTerm);
    const loadedVersions = StorageService.getExamVersions(examType, academicYear, academicTerm);
    const loadedLogs = StorageService.getExamChangeLogs(examType);

    setCourses(loadedCourses);
    setRooms(loadedRooms);
    setLecturers(loadedLecturers);
    setSessions(loadedSessions);
    setExamConfig(loadedConfig);
    setOfferings(loadedOfferings);
    setPublishStatus(loadedPublish);
    setVersions(loadedVersions);
    setChangeLogs(loadedLogs);

    // Run conflict detection
    const detected = detectExamConflicts(loadedOfferings, loadedRooms, loadedSessions, loadedLecturers);
    setConflicts(detected);

    // Check sync status against active lecture schedule
    checkSyncDiff(loadedOfferings);
  };

  useEffect(() => {
    loadAllData();
  }, [examType, academicYear, academicTerm]);

  // Dynamic available dates within exam period
  const availableDates = useMemo(() => {
    if (!examConfig.examStartDate || !examConfig.examEndDate) {
      // Fallback default: 5 working days
      return ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
    }
    const dates: string[] = [];
    try {
      const start = new Date(examConfig.examStartDate);
      const end = new Date(examConfig.examEndDate);
      const cur = new Date(start);
      while (cur <= end) {
        const day = cur.getDay();
        // Skip Sunday (0) and optionally Saturday (6) based on config
        const includeSat = examConfig.activeDays?.includes('Sabtu');
        if (day !== 0 && (day !== 6 || includeSat)) {
          dates.push(cur.toISOString().split('T')[0]);
        }
        cur.setDate(cur.getDate() + 1);
      }
    } catch {
      return ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
    }
    return dates.length > 0 ? dates : ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'];
  }, [examConfig]);

  // Check if lecture schedule has changed compared to current exam offerings
  const checkSyncDiff = (currentExamOfferings: ExamOffering[]) => {
    const lectureOfferings = StorageService.getCourseOfferings();
    const lectureMap = new Map(lectureOfferings.map(l => [l.id, l]));
    const examSourceIds = new Set(currentExamOfferings.map(e => e.sourceCourseOfferingId).filter(Boolean));

    let added = 0;
    lectureOfferings.forEach(l => {
      if (!examSourceIds.has(l.id)) added++;
    });

    if (added > 0 || lectureOfferings.length !== currentExamOfferings.length) {
      setSyncStatus({
        hasChanged: true,
        lectureOfferingsCount: lectureOfferings.length,
        examOfferingsCount: currentExamOfferings.length,
        message: `Terdapat ${added} kelas baru pada jadwal perkuliahan yang belum disinkronkan ke jadwal ujian.`,
      });
    } else {
      setSyncStatus({
        hasChanged: false,
        lectureOfferingsCount: lectureOfferings.length,
        examOfferingsCount: currentExamOfferings.length,
        message: '',
      });
    }
  };

  // Synchronize exam offerings from lecture schedule
  const handleSyncFromLectures = (forceReset: boolean = false) => {
    const result = StorageService.generateOrSyncExamOfferingsFromLectures(
      examType,
      academicYear,
      academicTerm,
      !forceReset
    );
    setOfferings(result.offerings);

    // Re-detect conflicts
    const detected = detectExamConflicts(result.offerings, rooms, sessions, lecturers);
    setConflicts(detected);

    setSyncStatus({
      hasChanged: false,
      lectureOfferingsCount: result.offerings.length,
      examOfferingsCount: result.offerings.length,
      message: '',
    });
    setIsSyncBannerDismissed(true);

    showToast(
      'success',
      'Sinkronisasi Berhasil',
      `Berhasil menyinkronkan ${result.offerings.length} kelas ujian dari jadwal perkuliahan (${result.addedCount} baru, ${result.updatedCount} diperbarui).`
    );
  };

  // Simulated Annealing Optimization
  const handleRunSAOptimization = async () => {
    if (isOptimizing) return;
    setIsOptimizing(true);
    stopOptimizationRef.current = false;

    showToast('info', 'Optimasi Dimulai', 'Menjalankan Simulated Annealing untuk alokasi waktu dan ruangan ujian...');

    try {
      const activeRooms = rooms.filter(r => r.isActive);
      const activeSessions = sessions.filter(s => s.isActive);

      if (availableDates.length === 0 || activeSessions.length === 0 || activeRooms.length === 0) {
        showToast('error', 'Konfigurasi Belum Lengkap', 'Pastikan tanggal periode ujian, sesi aktif, dan ruangan tersedia.');
        setIsOptimizing(false);
        return;
      }

      const initial = generateInitialExamSchedule(offerings, activeRooms, activeSessions, availableDates);
      const result = await optimizeExamScheduleSA(
        initial,
        rooms,
        sessions,
        lecturers,
        {
          availableDates,
          maxIterations: 600,
          initialTemperature: 1200,
        },
        progress => {
          setOptimizationProgress(progress);
        },
        stopOptimizationRef
      );

      setOfferings(result.offerings);
      setConflicts(result.conflicts);
      StorageService.saveExamOfferings(result.offerings, examType, academicYear, academicTerm);

      const highConf = result.conflicts.filter(c => c.severity === 'high').length;
      showToast(
        highConf === 0 ? 'success' : 'warning',
        'Optimasi Selesai',
        highConf === 0
          ? `Jadwal ${examType} berhasil dioptimasi tanpa konflik ruang atau pengawas!`
          : `Optimasi selesai dengan ${highConf} bentrok yang perlu penyesuaian manual.`
      );
    } catch (err) {
      console.error(err);
      showToast('error', 'Optimasi Terkendala', 'Terjadi kesalahan saat menjalankan optimasi SA.');
    } finally {
      setIsOptimizing(false);
      setOptimizationProgress(null);
    }
  };

  const handleStopOptimization = () => {
    stopOptimizationRef.current = true;
    showToast('info', 'Menghentikan Optimasi', 'Proses optimasi akan segera dihentikan...');
  };

  // Save changes to single ExamOffering
  const handleSaveOffering = (updatedOffering: ExamOffering) => {
    const updatedList = offerings.map(o => (o.id === updatedOffering.id ? updatedOffering : o));
    setOfferings(updatedList);
    StorageService.saveExamOfferings(updatedList, examType, academicYear, academicTerm);

    // Re-evaluate conflicts
    const detected = detectExamConflicts(updatedList, rooms, sessions, lecturers);
    setConflicts(detected);

    showToast(
      'success',
      'Jadwal Ujian Disimpan',
      `Penjadwalan ${updatedOffering.courseName} (${updatedOffering.sectionName || 'A'}) berhasil diperbarui.`
    );
  };

  // Clear slot for an offering
  const handleClearSlot = (offeringId: string) => {
    const target = offerings.find(o => o.id === offeringId);
    if (!target) return;

    const updatedList: ExamOffering[] = offerings.map(o => {
      if (o.id === offeringId) {
        return {
          ...o,
          examDate: undefined,
          examSessionId: undefined,
          roomIds: [],
          status: 'draft',
        };
      }
      return o;
    });

    setOfferings(updatedList);
    StorageService.saveExamOfferings(updatedList, examType, academicYear, academicTerm);

    const detected = detectExamConflicts(updatedList, rooms, sessions, lecturers);
    setConflicts(detected);

    showToast('info', 'Slot Dikosongkan', `Alokasi waktu dan ruangan untuk ${target.courseName} telah dikosongkan.`);
  };

  // Maps for rapid lookup
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const sessionMap = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);
  const lecturerMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);

  // Conflict item lookup per offering
  const offeringConflictMap = useMemo(() => {
    const map = new Map<string, ExamConflictItem[]>();
    conflicts.forEach((c) => {
      (c.examOfferingIds || []).forEach((id) => {
        const list = map.get(id) || [];
        list.push(c);
        map.set(id, list);
      });
    });
    return map;
  }, [conflicts]);

  // Filtered offerings for display
  const filteredOfferings = useMemo(() => {
    return offerings.filter((off) => {
      if (filterSemester !== 'all' && String(off.semester) !== filterSemester) return false;
      if (filterDate !== 'all' && off.examDate !== filterDate) return false;
      if (filterRoom !== 'all' && (!off.roomIds || !off.roomIds.includes(filterRoom))) return false;

      const s1 = off.supervisor1Id || off.supervisorLecturerIds?.[0];
      const s2 = off.supervisor2Id || (off.supervisorLecturerIds?.[1] && off.supervisorLecturerIds[1] !== s1);
      const isSupervisorsComplete = Boolean(s1 && s2);
      const isScheduled = Boolean(off.examDate && off.examSessionId && off.roomIds?.length);
      const hasConflict = (offeringConflictMap.get(off.id) || []).some(c => c.severity === 'high');

      if (filterStatus === 'complete' && (!isScheduled || !isSupervisorsComplete || hasConflict)) return false;
      if (filterStatus === 'incomplete_supervisor' && (!isScheduled || isSupervisorsComplete)) return false;
      if (filterStatus === 'unscheduled' && isScheduled) return false;
      if (filterStatus === 'conflict' && !hasConflict) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cName = off.courseName.toLowerCase();
        const cCode = off.courseCode.toLowerCase();
        const sec = (off.sectionName || '').toLowerCase();
        const supNames = (off.supervisorLecturerIds || [])
          .map((id) => lecturerMap.get(id)?.name.toLowerCase() || '')
          .join(' ');
        const lecNames = (off.lecturerIds || [])
          .map((id) => lecturerMap.get(id)?.name.toLowerCase() || '')
          .join(' ');

        if (!cName.includes(q) && !cCode.includes(q) && !sec.includes(q) && !supNames.includes(q) && !lecNames.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [offerings, filterSemester, filterDate, filterRoom, filterStatus, searchQuery, offeringConflictMap, lecturerMap]);

  // Statistics (Requirements 6 & 7: strictly separated)
  const scheduledCount = offerings.filter((o) => o.examDate && o.examSessionId && o.roomIds?.length).length;
  const completeSupervisorCount = offerings.filter((o) => {
    const s1 = o.supervisor1Id || o.supervisorLecturerIds?.[0];
    const s2 = o.supervisor2Id || (o.supervisorLecturerIds?.[1] && o.supervisorLecturerIds[1] !== s1);
    return Boolean(s1 && s2);
  }).length;

  const hardConflicts = conflicts.filter(c => c.severity === 'high');
  const warnings = conflicts.filter(c => c.severity !== 'high');
  const hardConflictCount = hardConflicts.length;

  // Warning visibility: incomplete supervisor warnings are ADMIN only (Requirement 6)
  const visibleWarnings = isAdmin
    ? warnings
    : warnings.filter(w => w.type !== 'UNASSIGNED_SUPERVISOR');
  const visibleWarningCount = visibleWarnings.length;

  // Comprehensive Publish Validation (Requirement 8)
  const publishValidation = useMemo(() => {
    if (offerings.length === 0) {
      return { allowed: false, reason: 'Belum ada kelas ujian untuk diterbitkan.' };
    }
    if (hardConflictCount > 0) {
      return { allowed: false, reason: `Masih terdapat ${hardConflictCount} hard conflict pada jadwal ujian.` };
    }
    const unscheduled = offerings.filter(o => !o.examDate || !o.examSessionId);
    if (unscheduled.length > 0) {
      return { allowed: false, reason: `${unscheduled.length} kelas ujian belum memiliki waktu pelaksanaan.` };
    }
    const noRoom = offerings.filter(o => !o.roomIds || o.roomIds.length === 0);
    if (noRoom.length > 0) {
      return { allowed: false, reason: `${noRoom.length} kelas ujian belum dialokasikan ruangan.` };
    }
    const missingSup1 = offerings.filter(o => !o.supervisor1Id && (!o.supervisorLecturerIds || !o.supervisorLecturerIds[0]));
    if (missingSup1.length > 0) {
      return { allowed: false, reason: `${missingSup1.length} kelas ujian belum memiliki Pengawas 1 (Dosen Pengampu).` };
    }
    const missingSup2 = offerings.filter(o => !o.supervisor2Id && (!o.supervisorLecturerIds || !o.supervisorLecturerIds[1]));
    if (missingSup2.length > 0) {
      return { allowed: false, reason: 'Lengkapi seluruh pengawas ujian terlebih dahulu.' };
    }
    return { allowed: true, reason: '' };
  }, [offerings, hardConflictCount]);

  // Publish / Unpublish Toggle Action
  const handleTogglePublish = () => {
    if (!isAdmin) {
      showToast('warning', 'Akses Terbatas', 'Hanya admin yang dapat mempublikasikan jadwal ujian.');
      return;
    }

    const nextState = !publishStatus.isPublished;
    if (nextState) {
      if (!publishValidation.allowed) {
        showToast('error', 'Belum Siap Publikasi', publishValidation.reason);
        return;
      }
    }

    StorageService.setExamPublishStatus(examType, nextState, currentUser.name, academicYear, academicTerm);
    setPublishStatus({
      isPublished: nextState,
      publishedAt: nextState ? new Date().toISOString() : undefined,
      publishedBy: nextState ? currentUser.name : undefined,
    });

    showToast(
      'success',
      nextState ? `Jadwal ${examType} Resmi Diterbitkan` : `Jadwal ${examType} Dikembalikan ke Draft`,
      nextState
        ? `Jadwal ujian ${examType} kini dapat diakses resmi oleh seluruh mahasiswa dan dosen.`
        : `Jadwal ${examType} telah berstatus draft untuk penyesuaian internal.`
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER & EXAM TYPE SWITCHER */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Penyusunan Jadwal Ujian ({examType})
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      publishStatus.isPublished
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {publishStatus.isPublished ? '● Resmi & Terbit' : '○ Draft'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Semester {academicTerm} {academicYear} • Master Dosen Pengampu & 2 Pengawas per Ruang
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sync from Lecture Schedule */}
            {isAdmin && (
              <button
                onClick={() => handleSyncFromLectures(false)}
                id="btn-sync-exam-lectures"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Sinkronkan data kelas dan dosen pengampu dari jadwal perkuliahan"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                Sinkronkan dari Jadwal Kuliah
              </button>
            )}

            {/* Config & Period Modal Button */}
            {isAdmin && (
              <button
                onClick={() => setIsSessionModalOpen(true)}
                id="btn-exam-sessions"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Sesi & Periode Ujian
              </button>
            )}

            {/* Version History Modal Button */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              id="btn-exam-history"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              Riwayat & Versi
            </button>

            {/* Publish / Unpublish Toggle (Requirement 8) */}
            {isAdmin && (
              <div className="relative group">
                <button
                  onClick={handleTogglePublish}
                  id="btn-toggle-publish-exam"
                  disabled={!publishStatus.isPublished && !publishValidation.allowed}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                    publishStatus.isPublished
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 cursor-pointer'
                      : !publishValidation.allowed
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  }`}
                >
                  {publishStatus.isPublished ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Batalkan Terbit
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Terbitkan Jadwal {examType}
                    </>
                  )}
                </button>
                {!publishStatus.isPublished && !publishValidation.allowed && (
                  <span className="hidden group-hover:block absolute bottom-full mb-1 right-0 w-64 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg text-center z-50 pointer-events-none">
                    {publishValidation.reason}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. UNIFIED TOOLBAR (Requirement 15): [ UTS ] [ UAS ] + [ Matriks Jadwal ] [ Daftar Tabel ] [ Filter ] [ ⛶ Fullsize ] */}
        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Exam Type Switcher [ UTS ] [ UAS ] */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jenis Ujian:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setExamType('UTS')}
                id="tab-uts"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  examType === 'UTS'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>UTS (Tengah Semester)</span>
              </button>
              <button
                onClick={() => setExamType('UAS')}
                id="tab-uas"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  examType === 'UAS'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>UAS (Akhir Semester)</span>
              </button>
            </div>
          </div>

          {/* Right: Board Controls [ Matriks Jadwal ] [ Daftar Tabel ] [ Filter ] [ ⛶ Fullsize ] */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setViewMode('matrix')}
                id="btn-exam-view-matrix"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Matriks Jadwal</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                id="btn-exam-view-list"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Daftar Tabel</span>
              </button>
            </div>

            <button
              onClick={() => setShowFilterBar(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                showFilterBar
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. BOARD CONTAINER */}
      <div className="space-y-4">
        {/* Filter Controls Bar */}
      {syncStatus.hasChanged && !isSyncBannerDismissed && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3 text-xs text-amber-950">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Jadwal Perkuliahan Sumber Telah Berubah</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {syncStatus.message} Sinkronkan data untuk menyelaraskan kelas ujian baru dengan tetap mempertahankan tanggal dan pengawas yang sudah diatur.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSyncBannerDismissed(true)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Pertahankan Draft Ujian
            </button>
            <button
              onClick={() => handleSyncFromLectures(false)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              Sinkronkan Data
            </button>
          </div>
        </div>
      )}

      {/* 4. SUMMARY STATS CARDS (Requirement 7: strictly separated) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kelas</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{offerings.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Disinkronkan dari perkuliahan</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Slot & Ruang Terisi</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {scheduledCount} <span className="text-xs font-semibold text-slate-400">/ {offerings.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {offerings.length > 0 ? `${Math.round((scheduledCount / offerings.length) * 100)}% terjadwal` : '0%'}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pengawas Lengkap</span>
            <UserCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700 mt-2">
            {completeSupervisorCount} <span className="text-xs font-semibold text-slate-400">/ {offerings.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {offerings.length - completeSupervisorCount > 0 ? (
              <span className="text-amber-600 font-bold">{offerings.length - completeSupervisorCount} kelas belum 2 pengawas</span>
            ) : (
              'Semua pengawas lengkap (2/2)'
            )}
          </div>
        </div>

        {/* Hard Conflict Card */}
        <div className={`p-4 rounded-2xl border shadow-2xs ${
          hardConflictCount > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hard Conflict</span>
            <ShieldAlert className={`w-4 h-4 ${hardConflictCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-black mt-2 ${hardConflictCount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {hardConflictCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {hardConflictCount > 0 ? 'Bentrok ruang / pengawas bersamaan' : 'Bebas Hard Conflict'}
          </div>
        </div>

        {/* Warning Card (Requirement 6) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Warning</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">{visibleWarningCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isAdmin ? 'Pengawas 2 belum diisi / catatan admin' : 'Peringatan jadwal'}
          </div>
        </div>
      </div>

      {/* 5. SA OPTIMIZER TOOLBAR */}
      {isAdmin && (
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Optimasi Jadwal Ujian ({examType}) dengan Simulated Annealing
              </h3>
              <p className="text-xs text-slate-500">
                Alokasikan tanggal, sesi ujian (100 menit / 2 sesi master), dan ruangan secara otomatis tanpa bentrok.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isOptimizing ? (
                <button
                  onClick={handleRunSAOptimization}
                  id="btn-exam-run-sa"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  Jalankan Optimasi SA
                </button>
              ) : (
                <button
                  onClick={handleStopOptimization}
                  id="btn-exam-stop-sa"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs animate-pulse cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  Hentikan Optimasi
                </button>
              )}
            </div>
          </div>

          {/* Progress bar during SA optimization */}
          {isOptimizing && optimizationProgress && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                <span>
                  Iterasi {optimizationProgress.iteration} / {optimizationProgress.maxIterations} • Suhu: {optimizationProgress.temperature.toFixed(1)}
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

      {/* 6. BOARD CONTAINER */}
        {/* Filter Controls Bar */}
        {showFilterBar && (
          <div className="p-3.5 sm:p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter:
            </div>

            {/* Semester */}
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>

            {/* Tanggal Ujian */}
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Tanggal</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {formatIndonesianDate(d)}
                </option>
              ))}
            </select>

            {/* Ruangan */}
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capacity} kursi)
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="complete">Lengkap (Terjadwal & 2 Pengawas)</option>
              <option value="incomplete_supervisor">Pengawas Belum Lengkap (&lt;2)</option>
              <option value="unscheduled">Belum Terjadwal</option>
              <option value="conflict">Bentrok / Peringatan</option>
            </select>

            {/* Search Input */}
            <div className="relative ml-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari MK / Dosen / Pengawas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 w-48 sm:w-64"
              />
            </div>
          </div>
        )}

        {/* 7. MAIN VIEW AREA: MATRIKS OR LIST */}
        <div>
          {viewMode === 'matrix' ? (
            <ExamBlockMatrix
              offerings={filteredOfferings}
              rooms={rooms}
              sessions={sessions}
              lecturers={lecturers}
              availableDates={availableDates}
              conflicts={conflicts}
              examType={examType}
              userRole={currentUser.role}
              onSelectOffering={(off) => {
                setEditingOffering(off);
              }}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Mata Kuliah & Kurikulum</th>
                      <th className="p-3.5">Sem</th>
                      <th className="p-3.5">Kelas</th>
                      <th className="p-3.5">Peserta</th>
                      <th className="p-3.5">Dosen Pengampu</th>
                      <th className="p-3.5">Tanggal & Sesi Ujian</th>
                      <th className="p-3.5">Ruangan</th>
                      <th className="p-3.5">Pengawas 1 (Auto)</th>
                      <th className="p-3.5">Pengawas 2 (Manual)</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOfferings.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-slate-400">
                          <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">Tidak ada kelas ujian yang sesuai filter.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredOfferings.map((off) => {
                        const roomObj = rooms.find((r) => off.roomIds?.includes(r.id));
                        const sessionObj = sessions.find((s) => s.id === off.examSessionId);
                        const isCapShort = roomObj ? roomObj.capacity < off.studentCount : false;

                        const sup1Obj = off.supervisor1Id ? lecturerMap.get(off.supervisor1Id) : (off.supervisorLecturerIds?.[0] ? lecturerMap.get(off.supervisorLecturerIds[0]) : null);
                        const sup2Obj = off.supervisor2Id ? lecturerMap.get(off.supervisor2Id) : (off.supervisorLecturerIds?.[1] && off.supervisorLecturerIds[1] !== sup1Obj?.id ? lecturerMap.get(off.supervisorLecturerIds[1]) : null);

                        const lecturerNames = (off.lecturerIds || [])
                          .map((id) => lecturerMap.get(id)?.name)
                          .filter(Boolean);

                        const offeringConflicts = offeringConflictMap.get(off.id) || [];
                        const hasHardConflict = offeringConflicts.some(c => c.severity === 'high');
                        const isSupervisorsComplete = Boolean(sup1Obj && sup2Obj);
                        const isScheduled = Boolean(off.examDate && off.examSessionId && off.roomIds?.length);

                        return (
                          <tr key={off.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Mata Kuliah */}
                            <td className="p-3.5">
                              <span className="font-bold text-slate-900 block">{off.courseName}</span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {off.courseCode} • Kurikulum {off.curriculumYear}
                              </span>
                            </td>

                            {/* Semester */}
                            <td className="p-3.5 font-bold text-slate-700">Sem {off.semester}</td>

                            {/* Kelas (Section) */}
                            <td className="p-3.5">
                              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                                Kelas {off.sectionName || 'A'}
                              </span>
                            </td>

                            {/* Peserta */}
                            <td className="p-3.5 font-bold text-slate-800">{off.studentCount} Mhs</td>

                            {/* Dosen Pengampu */}
                            <td className="p-3.5">
                              {lecturerNames.length > 0 ? (
                                <div className="space-y-0.5">
                                  {lecturerNames.map((name, i) => (
                                    <span key={i} className="block text-slate-700 text-[11px]">
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Belum terdaftar</span>
                              )}
                            </td>

                            {/* Tanggal & Sesi */}
                            <td className="p-3.5">
                              {off.examDate && sessionObj ? (
                                <div>
                                  <span className="font-bold text-slate-900 block">
                                    {formatIndonesianDate(off.examDate)}
                                  </span>
                                  <span className="text-[11px] text-indigo-700 font-medium">
                                    {sessionObj.name} ({sessionObj.startTime} – {sessionObj.endTime})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-amber-600 italic">Belum diplot</span>
                              )}
                            </td>

                            {/* Ruangan */}
                            <td className="p-3.5">
                              {roomObj ? (
                                <div>
                                  <span className="font-bold text-slate-800 block">{roomObj.name}</span>
                                  <span
                                    className={`text-[10px] block ${
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

                            {/* Pengawas 1 (Auto Dosen Pengampu) */}
                            <td className="p-3.5">
                              {sup1Obj ? (
                                <div>
                                  <span className="font-medium text-slate-900 block">{sup1Obj.name}</span>
                                  <span className="text-[10px] text-indigo-600 font-bold">Auto Pengampu</span>
                                </div>
                              ) : (
                                <span className="text-amber-600 italic text-[11px]">Belum Ada Pengampu</span>
                              )}
                            </td>

                            {/* Pengawas 2 (Manual Admin) */}
                            <td className="p-3.5">
                              {sup2Obj ? (
                                <div>
                                  <span className="font-medium text-slate-900 block">{sup2Obj.name}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">Manual Admin</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Belum Diisi</span>
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-3.5">
                              {hasHardConflict ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 block text-center">
                                  Bentrok
                                </span>
                              ) : !isScheduled ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 block text-center">
                                  Belum Terjadwal
                                </span>
                              ) : !isSupervisorsComplete ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 block text-center">
                                  Pengawas (1/2)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 block text-center">
                                  ✓ Lengkap (2/2)
                                </span>
                              )}
                            </td>

                            {/* Aksi */}
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => setEditingOffering(off)}
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title={isAdmin ? "Edit Penjadwalan & Pengawas" : "Lihat Detail Ujian"}
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {isAdmin && isScheduled && (
                                  <button
                                    onClick={() => handleClearSlot(off.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Kosongkan Slot Ujian"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
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
          )}
        </div>

      {/* 8. EDIT OFFERING MODAL (Requirement 16) */}
      {editingOffering && (
        <ExamOfferingEditModal
          isOpen={Boolean(editingOffering)}
          onClose={() => setEditingOffering(null)}
          offering={editingOffering}
          rooms={rooms}
          sessions={sessions}
          lecturers={lecturers}
          availableDates={availableDates}
          allOfferings={offerings}
          onSave={handleSaveOffering}
        />
      )}

      {/* 9. SESSION & EXAM CONFIG MODAL */}
      {isSessionModalOpen && (
        <ExamSessionModal
          isOpen={isSessionModalOpen}
          onClose={() => {
            setIsSessionModalOpen(false);
            setSessions(StorageService.getExamSessions());
          }}
          sessions={sessions}
          onSaveSessions={(updatedSessions) => {
            setSessions(updatedSessions);
            StorageService.saveExamSessions(updatedSessions);
          }}
          onResetDefault={() => {
            const defSessions = StorageService.resetDefaultExamSessions();
            setSessions(defSessions);
          }}
        />
      )}

      {/* 10. EXAM HISTORY MODAL */}
      {isHistoryModalOpen && (
        <ExamHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          versions={versions}
          examType={examType}
          academicYear={academicYear}
          academicTerm={academicTerm}
          onRestoreVersion={(version) => {
            const restoredOfferings = version.offerings;
            setOfferings(restoredOfferings);
            StorageService.saveExamOfferings(restoredOfferings, examType, academicYear, academicTerm);
            setIsHistoryModalOpen(false);
            showToast('success', 'Versi Dipulihkan', `Jadwal ujian versi "${version.versionName}" berhasil dipulihkan.`);
          }}
        />
      )}
      </div>
    </div>
  );
};
