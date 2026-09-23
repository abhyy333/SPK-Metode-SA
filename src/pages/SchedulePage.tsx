import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  Users,
  Search,
  Filter,
  GraduationCap,
  Building2,
  CalendarCheck,
  CheckCircle2,
  BookOpen,
  Info,
  Layers,
  Sparkles,
  Archive,
  AlertCircle,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  RotateCcw,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  LayoutGrid,
  List,
  Edit,
  ArrowLeftRight,
  Printer,
  History as HistoryIcon,
  AlertTriangle,
  Sliders,
  Check,
  Zap,
  Maximize2,
  Minimize2,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  DayOfWeek,
  CurrentUser,
  ScheduleStatus,
  ScheduleVersion,
  ConflictItem,
  ConstraintWeights,
  ScheduleChangeRecord,
  CourseOffering,
  KBK,
} from '../types';
import { StorageService } from '../services/storageService';
import { ScheduleBlockMatrix } from '../components/schedule/ScheduleBlockMatrix';
import { DownloadScheduleButton } from '../components/schedule/DownloadScheduleButton';
import { ScheduleExportItem, ScheduleExportOptions } from '../utils/scheduleExport';
import { calculateCourseTiming } from '../utils/sessionUtils';
import { useToast } from '../components/ui/Toast';
import { PublishBlockedModal } from '../components/schedule/PublishBlockedModal';
import { PublishConfirmModal } from '../components/schedule/PublishConfirmModal';
import { AssignmentAdjustmentModal } from '../components/schedule/AssignmentAdjustmentModal';
import { ConflictInspectorModal } from '../components/schedule/ConflictInspectorModal';
import {
  validateScheduleForPublish,
  PublishValidationReport,
} from '../utils/publishValidation';

interface SchedulePageProps {
  currentUser: CurrentUser;
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  academicYear: string;
  currentSchedule: ScheduleAssignment[] | null;
  conflicts: ConflictItem[];
  weights: ConstraintWeights;
  onRefreshSchedule?: () => void;
  onSaveSchedule?: (schedule: ScheduleAssignment[]) => void;
  onManualMoveAssignment?: (
    assignmentId: string,
    newTimeslotId: string,
    newRoomId: string,
    method?: ScheduleChangeRecord['method'],
    reason?: string
  ) => void;
  onSwapAssignments?: (
    assignment1Id: string,
    assignment2Id: string,
    reason?: string
  ) => void;
  onUpdateAssignmentLecturers?: (assignmentId: string, lecturerIds: string[]) => void;
  onPublishSchedule?: () => void;
  onNavigate?: (view: string) => void;
  initialViewMode?: 'matrix' | 'list';
  onRunOptimization?: () => Promise<void> | void;
  isOptimizing?: boolean;
}

const WEEKDAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export const SchedulePage: React.FC<SchedulePageProps> = ({
  currentUser,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  academicYear,
  currentSchedule,
  conflicts,
  weights,
  onRefreshSchedule,
  onSaveSchedule,
  onManualMoveAssignment,
  onSwapAssignments,
  onUpdateAssignmentLecturers,
  onPublishSchedule,
  onNavigate,
  initialViewMode = 'matrix',
  onRunOptimization,
  isOptimizing = false,
}) => {
  const { showToast } = useToast();
  const isAdmin = currentUser.role === 'admin';

  // 1. Status Filter: Draft vs Terbit
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  
  // Real schedule publication status from Storage
  const [isSchedulePublished, setIsSchedulePublished] = useState<boolean>(() => {
    return StorageService.getScheduleStatus() === 'published';
  });

  // 2. View Mode: Matriks vs Daftar
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>(initialViewMode);

  // Common Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedLecturer, setSelectedLecturer] = useState<string>(
    currentUser.role === 'lecturer' ? currentUser.lecturerId || 'all' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Assignment for Inspection & Admin Adjustments
  const [selectedAssignment, setSelectedAssignment] = useState<ScheduleAssignment | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isConflictInspectorOpen, setIsConflictInspectorOpen] = useState(false);
  const [conflictInspectorTab, setConflictInspectorTab] = useState<'conflicts' | 'warnings'>('conflicts');
  const [highlightAssignmentId, setHighlightAssignmentId] = useState<string | null>(null);
  const [showFilterBar, setShowFilterBar] = useState<boolean>(true);
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [isPublishBlockedOpen, setIsPublishBlockedOpen] = useState(false);
  const [publishReport, setPublishReport] = useState<PublishValidationReport | null>(null);

  // Version Selector State
  const [selectedVersionId, setSelectedVersionId] = useState<string>('current');
  const [scheduleVersions, setScheduleVersions] = useState<ScheduleVersion[]>([]);

  // Maps for rapid lookup
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map(timeslots.map((t) => [t.id, t])), [timeslots]);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  // Real-time publish validation report
  const validationReport = useMemo(() => {
    return validateScheduleForPublish(
      currentSchedule,
      StorageService.getCourseOfferings(),
      courses,
      lecturers,
      rooms,
      timeslots,
      weights,
      StorageService.getCurriculumPackages()
    );
  }, [currentSchedule, courses, lecturers, rooms, timeslots, weights]);

  // Load versions
  useEffect(() => {
    setScheduleVersions(StorageService.getScheduleVersions());
    setIsSchedulePublished(StorageService.getScheduleStatus() === 'published');
  }, [currentSchedule]);

  // Handler for running optimization directly from Schedule Page
  const handleRunOptimizationClick = async () => {
    if (!onRunOptimization) return;
    const initialHard = validationReport.hardConflictCount;
    try {
      await onRunOptimization();
      showToast(
        'success',
        'Optimasi Selesai',
        `Simulated Annealing selesai dijalankan. Hard conflict sebelumnya: ${initialHard}.`
      );
    } catch (err: any) {
      showToast('error', 'Optimasi Gagal', err.message || 'Terjadi kesalahan saat menjalankan optimasi.');
    }
  };

  // Focus and highlight specific assignment from conflict or warning inspector
  const handleFocusAssignment = (assignmentId: string, day?: string) => {
    setViewMode('matrix');
    if (day) {
      setSelectedDay('all');
    }
    setHighlightAssignmentId(assignmentId);
    const target = activeAssignments.find((a) => a.id === assignmentId);
    if (target && isAdmin) {
      setSelectedAssignment(target);
      setIsAdjustmentModalOpen(true);
    }
    setTimeout(() => {
      setHighlightAssignmentId((prev) => (prev === assignmentId ? null : prev));
    }, 3500);
  };

  const activeAssignments = useMemo(() => {
    return currentSchedule || [];
  }, [currentSchedule]);

  // Filtered Assignments for List View
  const filteredAssignments = useMemo(() => {
    return activeAssignments.filter((assign) => {
      const course = courseMap.get(assign.courseId);
      const slot = timeslotMap.get(assign.timeslotId);
      const room = roomMap.get(assign.roomId);

      if (selectedSemester !== 'all') {
        const semNum = parseInt(selectedSemester, 10);
        if (course && course.semester !== semNum) return false;
      }

      if (selectedDay !== 'all' && slot && slot.day !== selectedDay) {
        return false;
      }

      if (selectedRoom !== 'all' && assign.roomId !== selectedRoom) {
        return false;
      }

      if (selectedLecturer !== 'all') {
        const assignedIds = assign.lecturerIds || (assign.lecturerId ? [assign.lecturerId] : []);
        if (!assignedIds.includes(selectedLecturer)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cName = course?.name.toLowerCase() || '';
        const cCode = course?.code.toLowerCase() || '';
        const rName = room?.name.toLowerCase() || '';
        const lNames = (assign.lecturerIds || [assign.lecturerId])
          .map((id) => (id ? lecturerMap.get(id)?.name.toLowerCase() || '' : ''))
          .join(' ');

        if (!cName.includes(q) && !cCode.includes(q) && !rName.includes(q) && !lNames.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [activeAssignments, selectedSemester, selectedDay, selectedRoom, selectedLecturer, searchQuery, courseMap, timeslotMap, roomMap, lecturerMap]);

  // Handle Publish / Unpublish Toggle with real-time validation check
  const handleTogglePublish = () => {
    if (!isAdmin) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat mengubah status terbit jadwal.');
      return;
    }

    if (!isSchedulePublished) {
      // Run real-time check to prevent stale UI state
      const freshReport = validateScheduleForPublish(
        currentSchedule,
        StorageService.getCourseOfferings(),
        courses,
        lecturers,
        rooms,
        timeslots,
        weights,
        StorageService.getCurriculumPackages()
      );
      setPublishReport(freshReport);

      if (!freshReport.isValid || freshReport.hardConflictCount > 0) {
        setIsPublishBlockedOpen(true);
        return;
      }

      setIsPublishConfirmOpen(true);
    } else {
      executePublish(false);
    }
  };

  const executePublish = (publish: boolean) => {
    setIsPublishConfirmOpen(false);
    if (publish) {
      StorageService.setScheduleStatus('published');
      setIsSchedulePublished(true);
      if (onPublishSchedule) {
        onPublishSchedule();
      }
      if (onRefreshSchedule) {
        onRefreshSchedule();
      }
      showToast(
        'success',
        'Jadwal Berhasil Diterbitkan',
        'Jadwal perkuliahan kini berstatus Resmi & Terbit untuk seluruh sivitas akademika.'
      );
    } else {
      // BATALKAN JADWAL TERBIT:
      // Requirement: Batalkan jadwal terbit = jadwal aktif kembali kosong, bukan generate jadwal default/random.
      StorageService.setScheduleStatus('draft');
      setIsSchedulePublished(false);
      StorageService.saveCurrentSchedule([]);
      StorageService.saveInitialSchedule([]);
      StorageService.clearScheduleDraftMetadata();
      if (onSaveSchedule) {
        onSaveSchedule([]);
      }
      if (onPublishSchedule) {
        onPublishSchedule();
      } else if (onRefreshSchedule) {
        onRefreshSchedule();
      }
      showToast(
        'info',
        'Publikasi Jadwal Dibatalkan',
        'Jadwal terbit berhasil dibatalkan dan jadwal aktif telah dikosongkan.'
      );
    }
  };

  // Open Adjustment Modal for an Assignment
  const handleOpenAdjustment = (assign: ScheduleAssignment) => {
    setSelectedAssignment(assign);
    setIsAdjustmentModalOpen(true);
  };

  // Version change handler
  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    if (versionId === 'current') {
      if (onRefreshSchedule) onRefreshSchedule();
    } else {
      const ver = scheduleVersions.find((v) => v.id === versionId);
      if (ver && ver.scheduleAssignments && onSaveSchedule) {
        onSaveSchedule(ver.scheduleAssignments);
        showToast('info', 'Memuat Versi Jadwal', `Menampilkan versi "${ver.name || `Versi ${ver.versionNumber}`} ".`);
      }
    }
  };

  // Prepare Export Options
  const exportOptions: ScheduleExportOptions = useMemo(() => {
    const items: ScheduleExportItem[] = activeAssignments.map((a, idx) => {
      const c = courseMap.get(a.courseId);
      const r = roomMap.get(a.roomId);
      const t = timeslotMap.get(a.timeslotId);
      const cls = classMap.get(a.classId);
      const timing = calculateCourseTiming(t, c?.sks || 2, timeslots);
      const lNames = (a.lecturerIds || [a.lecturerId])
        .map((id) => (id ? lecturerMap.get(id)?.name || '' : ''))
        .filter(Boolean);

      return {
        no: idx + 1,
        dayOrDate: t?.day || 'Senin',
        time: timing.timeRangeLabel || `${t?.startTime || '07:50'} - ${t?.endTime || '09:30'}`,
        courseCode: c?.code || '',
        courseName: c?.name || '',
        sks: c?.sks || 2,
        semester: c?.semester || 1,
        sectionOrClass: cls?.name || 'A',
        room: r?.name || r?.code || '-',
        lecturerOrSupervisor: lNames.length > 0 ? lNames.join(', ') : '-',
        participantCount: cls?.studentCount || 40,
      };
    });

    return {
      title: 'JADWAL PERKULIAHAN TEKNIK ELEKTRO',
      academicYear,
      academicTerm: 'Ganjil',
      filterSubtitle: selectedSemester !== 'all' ? `Semester ${selectedSemester}` : 'Semua Semester',
      items,
    };
  }, [activeAssignments, courseMap, roomMap, timeslotMap, lecturerMap, classMap, academicYear, selectedSemester, timeslots]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. UNIFIED COCKPIT HEADER */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Jadwal Perkuliahan
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isSchedulePublished
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {isSchedulePublished ? '● Resmi & Terbit' : '○ Draft'}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Tahun Akademik {academicYear} • Teknik Elektro UNM • Total {activeAssignments.length} Kelas Terjadwal
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Version Selector */}
            {scheduleVersions.length > 0 && (
              <select
                value={selectedVersionId}
                onChange={(e) => handleSelectVersion(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="current">Versi Aktif (Live)</option>
                {scheduleVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || `Versi ${v.versionNumber}`} ({new Date(v.createdAt).toLocaleDateString('id-ID')})
                  </option>
                ))}
              </select>
            )}

            {/* Export & Download Buttons */}
            <DownloadScheduleButton options={exportOptions} />

            {/* Admin Publish / Unpublish Button */}
            {isAdmin && (
              <div className="relative group">
                <button
                  onClick={handleTogglePublish}
                  id="btn-toggle-publish-schedule"
                  disabled={!isSchedulePublished && validationReport.hardConflictCount > 0}
                  title={
                    !isSchedulePublished && validationReport.hardConflictCount > 0
                      ? 'Tidak dapat menerbitkan jadwal karena masih terdapat konflik.'
                      : isSchedulePublished
                      ? 'Batalkan terbit dan kembalikan ke Draft'
                      : 'Terbitkan Jadwal Resmi'
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                    isSchedulePublished
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                      : validationReport.hardConflictCount > 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isSchedulePublished ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      Batalkan Jadwal Terbit
                    </>
                  ) : validationReport.hardConflictCount > 0 ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-slate-400" />
                      Terbitkan Jadwal (Terkunci)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Terbitkan Jadwal Resmi
                    </>
                  )}
                </button>
                {!isSchedulePublished && validationReport.hardConflictCount > 0 && (
                  <span className="hidden group-hover:block absolute bottom-full mb-1 right-0 w-64 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg text-center z-50 pointer-events-none">
                    Tidak dapat menerbitkan jadwal karena masih terdapat konflik.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. SUMMARY CARD FOOTER */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            Jadwal diperbarui secara real-time berdasarkan Master Dosen Pengampu & Penugasan Terkini.
          </div>

          {/* Right: Quick Role-Specific Filter Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {validationReport.hardConflictCount > 0 ? (
              <button
                onClick={() => {
                  setConflictInspectorTab('conflicts');
                  setIsConflictInspectorOpen(true);
                }}
                className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{validationReport.hardConflictCount} Hard Conflict</span>
              </button>
            ) : (
              <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Jadwal Bebas Bentrok
              </span>
            )}
            {validationReport.warningCount > 0 && (
              <button
                onClick={() => {
                  setConflictInspectorTab('warnings');
                  setIsConflictInspectorOpen(true);
                }}
                className="flex items-center gap-1 text-amber-800 font-bold bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{validationReport.warningCount} Warning</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2.5 COMPACT PREVIEW SUMMARY PANEL */}
      {activeAssignments.length > 0 && (
        <div className="space-y-2.5">
          <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="font-bold text-slate-800">
                Offering Terjadwal: <span className="font-black text-indigo-600">{validationReport.scheduledOfferings} Sesi</span>
              </div>
              <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
              <button
                onClick={() => {
                  if (validationReport.hardConflictCount > 0) {
                    setConflictInspectorTab('conflicts');
                    setIsConflictInspectorOpen(true);
                  }
                }}
                className={`font-semibold flex items-center gap-1.5 transition-colors ${
                  validationReport.hardConflictCount > 0
                    ? 'text-rose-600 hover:text-rose-700 font-bold cursor-pointer'
                    : 'text-emerald-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${validationReport.hardConflictCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span>{validationReport.hardConflictCount} Hard Conflict</span>
              </button>
              <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
              <div className="text-slate-600 font-medium">
                <span className="text-amber-600 font-semibold">{validationReport.softPenaltyCount} Soft Penalty</span>
              </div>
              <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
              <button
                onClick={() => {
                  if (validationReport.warningCount > 0) {
                    setConflictInspectorTab('warnings');
                    setIsConflictInspectorOpen(true);
                  }
                }}
                className={`font-semibold transition-colors ${
                  validationReport.warningCount > 0 ? 'text-amber-700 hover:underline cursor-pointer' : 'text-slate-500'
                }`}
              >
                <span>{validationReport.warningCount} Belum Ada Dosen</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                validationReport.isPublishReady
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {validationReport.isPublishReady ? 'Siap Diterbitkan' : 'Belum Siap Terbit'}
              </span>
            </div>
          </div>

          {/* Compact Conflict Alert (ONLY if hardConflictCount > 0) */}
          {validationReport.hardConflictCount > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  ⚠ Terdapat <strong className="font-bold">{validationReport.hardConflictCount} Hard Conflict</strong> pada jadwal. Periksa bentrok sebelum menerbitkan.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setConflictInspectorTab('conflicts');
                    setIsConflictInspectorOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 font-bold text-xs transition-colors cursor-pointer"
                >
                  Periksa
                </button>
                {onRunOptimization && (
                  <button
                    onClick={handleRunOptimizationClick}
                    disabled={isOptimizing}
                    id="btn-schedule-quick-optimize"
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Zap className={`w-3.5 h-3.5 fill-current ${isOptimizing ? 'animate-spin' : ''}`} />
                    <span>{isOptimizing ? 'Optimasi...' : '⚡ Optimasi Sekarang'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Compact Warning Alert for Missing Lecturers */}
          {validationReport.warningCount > 0 && (
            <div className="p-2.5 px-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Terdapat <strong>{validationReport.warningCount} kelas belum ada dosen pengampu</strong>.
                </span>
              </div>
              <button
                onClick={() => {
                  setConflictInspectorTab('warnings');
                  setIsConflictInspectorOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs transition-colors cursor-pointer shrink-0"
              >
                Lihat & Lengkapi Dosen
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. MAIN SCHEDULE CONTENT OR EMPTY STATE */}
      {activeAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-slate-200/80 shadow-2xs text-center max-w-2xl mx-auto space-y-6 my-6">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              Belum ada jadwal perkuliahan aktif.
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Sistem belum memiliki alokasi jadwal kuliah aktif untuk semester ini. Anda dapat menyusun jadwal baru secara otomatis dengan optimasi Simulated Annealing, menggunakan template paket semester, atau menginput alokasi secara manual.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate && onNavigate('scheduling-new')}
              id="btn-empty-susun-jadwal"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Susun Jadwal Baru</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('scheduling-template')}
              id="btn-empty-gunakan-template"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Gunakan Template</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('scheduling-custom')}
              id="btn-empty-custom-manual"
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Edit className="w-4 h-4 text-slate-500" />
              <span>Custom Manual</span>
            </button>
          </div>
        </div>
      ) : (
        /* Unified Container */
        <div className="space-y-4">
          {/* Papan Jadwal Perkuliahan Section Toolbar */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Papan Jadwal Perkuliahan</span>
                  {selectedSemester !== 'all' && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold">
                      Semester {selectedSemester}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {filteredAssignments.length} jadwal perkuliahan aktif • Tahun Akademik {academicYear}
                </p>
              </div>
            </div>

            {/* Toolbar: [ Matriks ] [ Daftar ] [ Filter ] */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setViewMode('matrix')}
                  id="btn-schedule-view-matrix"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'matrix'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Matriks</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  id="btn-schedule-view-list"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Daftar</span>
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

          {/* Filter Controls Bar */}
          {showFilterBar && (
            <div className="p-3.5 sm:p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              Filter:
            </div>

            {/* Semester Filter */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>

            {/* Hari Filter */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Hari</option>
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Ruangan Filter */}
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>

            {/* Dosen Filter */}
            <select
              value={selectedLecturer}
              onChange={(e) => setSelectedLecturer(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 max-w-xs"
            >
              <option value="all">Semua Dosen</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>

            {/* Search Query */}
            <div className="relative ml-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari MK / Dosen / Ruang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
              />
            </div>
          </div>
          )}

          {/* Main View Area */}
          <div>
            {viewMode === 'matrix' ? (
              <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs h-full overflow-auto">
                <ScheduleBlockMatrix
                  assignments={filteredAssignments}
                  courses={courses}
                  lecturers={lecturers}
                  classes={classes}
                  rooms={rooms}
                  timeslots={timeslots}
                  readOnly={!isAdmin}
                  userRole={currentUser.role}
                  academicYear={academicYear}
                  defaultSemester={selectedSemester}
                  defaultDay={selectedDay as any}
                  defaultLecturerId={selectedLecturer !== 'all' ? selectedLecturer : undefined}
                  highlightAssignmentId={highlightAssignmentId}
                  onSelectAssignment={(assign) => {
                    if (isAdmin) {
                      handleOpenAdjustment(assign);
                    }
                  }}
                />
              </div>
            ) : (
              /* DAFTAR TABLE VIEW */
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden h-full flex flex-col">
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-3.5">Mata Kuliah</th>
                        <th className="p-3.5">Sem / Kelas</th>
                        <th className="p-3.5">SKS</th>
                        <th className="p-3.5">Dosen Pengampu</th>
                        <th className="p-3.5">Hari & Jam Kuliah</th>
                        <th className="p-3.5">Ruangan</th>
                        <th className="p-3.5">Peserta</th>
                        <th className="p-3.5 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-slate-400">
                            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-semibold text-slate-600">Tidak ada jadwal yang sesuai filter.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredAssignments.map((assign) => {
                          const course = courseMap.get(assign.courseId);
                          const slot = timeslotMap.get(assign.timeslotId);
                          const room = roomMap.get(assign.roomId);
                          const cls = classMap.get(assign.classId);
                          const timing = calculateCourseTiming(slot, course?.sks || 2, timeslots);
                          const lNames = (assign.lecturerIds || [assign.lecturerId])
                            .map((id) => (id ? lecturerMap.get(id)?.name || '' : ''))
                            .filter(Boolean);

                          return (
                            <tr key={assign.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3.5">
                                <span className="font-bold text-slate-900 block">{course?.name || assign.courseId}</span>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {course?.code} • Kurikulum {course?.curriculumYear || 2026}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-indigo-700">Sem {course?.semester || 1}</span>
                                <span className="text-slate-500 block text-[11px]">Kelas {cls?.name || 'A'}</span>
                              </td>
                              <td className="p-3.5 font-bold text-slate-700">{course?.sks || 2} SKS</td>
                              <td className="p-3.5">
                                {lNames.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {lNames.map((name, i) => (
                                      <span key={i} className="block text-slate-800 font-medium">
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-amber-600 font-bold italic">Belum Ada Dosen</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-900 block">{slot?.day || '-'}</span>
                                <span className="text-[11px] text-indigo-700 font-medium">
                                  {timing.timeRangeLabel}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-bold text-slate-800 block">{room?.name || '-'}</span>
                                <span className="text-[11px] text-slate-500 font-mono">{room?.code}</span>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                                  {cls?.studentCount || 40} Mhs
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                {isAdmin ? (
                                  <button
                                    onClick={() => handleOpenAdjustment(assign)}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    Penyesuaian
                                  </button>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Read-only</span>
                                )}
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
        </div>
      )}

      {/* 5. ASSIGNMENT ADJUSTMENT MODAL (RECOMMENDATIONS, SWAP, MANUAL) */}
      {isAdjustmentModalOpen && selectedAssignment && (
        <AssignmentAdjustmentModal
          isOpen={isAdjustmentModalOpen}
          onClose={() => {
            setIsAdjustmentModalOpen(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          currentSchedule={activeAssignments}
          courses={courses}
          lecturers={lecturers}
          rooms={rooms}
          timeslots={timeslots}
          classes={classes}
          weights={weights}
          onApplyMove={(assignmentId, newTimeslotId, newRoomId) => {
            if (isSchedulePublished) {
              StorageService.setScheduleStatus('draft');
              setIsSchedulePublished(false);
              showToast('info', 'Status Jadwal Diubah ke Draft', 'Penyesuaian manual mengubah status jadwal menjadi Draft.');
            }
            onManualMoveAssignment?.(
              assignmentId,
              newTimeslotId,
              newRoomId,
              'Manual Move',
              'Penyesuaian rekomendasi/manual oleh admin dari halaman Jadwal'
            );
            setIsAdjustmentModalOpen(false);
            setSelectedAssignment(null);
            showToast('success', 'Jadwal Berhasil Dipindahkan', 'Waktu dan ruangan jadwal telah diperbarui.');
          }}
          onApplySwap={(assignment1Id, assignment2Id) => {
            if (isSchedulePublished) {
              StorageService.setScheduleStatus('draft');
              setIsSchedulePublished(false);
              showToast('info', 'Status Jadwal Diubah ke Draft', 'Pertukaran slot mengubah status jadwal menjadi Draft.');
            }
            onSwapAssignments?.(
              assignment1Id,
              assignment2Id,
              'Pertukaran slot jadwal oleh admin dari halaman Jadwal'
            );
            setIsAdjustmentModalOpen(false);
            setSelectedAssignment(null);
            showToast('success', 'Jadwal Berhasil Ditukar', 'Dua jadwal telah saling bertukar waktu dan ruangan.');
          }}
          onUpdateLecturers={(assignmentId, lecturerIds) => {
            onUpdateAssignmentLecturers?.(assignmentId, lecturerIds);
            setIsAdjustmentModalOpen(false);
            setSelectedAssignment(null);
            showToast('success', 'Dosen Pengampu Diperbarui', 'Penetapan dosen pengampu kelas berhasil disimpan.');
          }}
        />
      )}

      {/* 6. CONFLICT & WARNING INSPECTOR MODAL */}
      {isConflictInspectorOpen && (
        <ConflictInspectorModal
          isOpen={isConflictInspectorOpen}
          onClose={() => setIsConflictInspectorOpen(false)}
          conflicts={conflicts}
          assignments={activeAssignments}
          courses={courses}
          lecturers={lecturers}
          classes={classes}
          rooms={rooms}
          timeslots={timeslots}
          offerings={StorageService.getCourseOfferings()}
          validationReport={validationReport}
          initialTab={conflictInspectorTab}
          onFocusAssignment={handleFocusAssignment}
        />
      )}

      {/* 7. PUBLISH BLOCKED MODAL (WHEN HARD CONFLICTS > 0) */}
      {isPublishBlockedOpen && publishReport && (
        <PublishBlockedModal
          isOpen={isPublishBlockedOpen}
          onClose={() => setIsPublishBlockedOpen(false)}
          report={publishReport}
          onViewConflicts={() => {
            setIsPublishBlockedOpen(false);
            setConflictInspectorTab('conflicts');
            setIsConflictInspectorOpen(true);
          }}
        />
      )}

      {/* 8. PUBLISH CONFIRM MODAL (WHEN ZERO HARD CONFLICTS) */}
      {isPublishConfirmOpen && publishReport && (
        <PublishConfirmModal
          isOpen={isPublishConfirmOpen}
          onClose={() => setIsPublishConfirmOpen(false)}
          onConfirm={() => executePublish(true)}
          report={publishReport}
          academicYear={academicYear}
          academicTerm="ganjil"
        />
      )}
    </div>
  );
};
