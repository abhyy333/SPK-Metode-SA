import React, { useState, useMemo, useEffect } from 'react';
import {
  History,
  Archive,
  RotateCcw,
  Copy,
  Trash2,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  ArrowRight,
  Shield,
  Sparkles,
  Download,
  CalendarDays,
  User,
  Building2,
  BookOpen,
  ArrowLeftRight,
  Undo2,
  Info,
  Check,
  ChevronRight,
  Tag,
} from 'lucide-react';
import {
  CurrentUser,
  ScheduleSnapshot,
  ScheduleChangeLog,
  ScheduleAssignment,
  CourseOffering,
  Course,
  Lecturer,
  Room,
  Timeslot,
  ScheduleChangeAction,
} from '../types';
import { StorageService } from '../services/storageService';
import { Modal } from '../components/ui/Modal';
import { AccessDenied } from '../components/ui/AccessDenied';

interface ScheduleHistoryPageProps {
  currentUser: CurrentUser;
  onNavigateToSchedule?: () => void;
  onRefreshScheduleState?: () => void;
}

export const ScheduleHistoryPage: React.FC<ScheduleHistoryPageProps> = ({
  currentUser,
  onNavigateToSchedule,
  onRefreshScheduleState,
}) => {
  // Access control
  const isAdmin = currentUser.role === 'admin';

  // Active Tab: 'snapshots' | 'logs'
  const [activeTab, setActiveTab] = useState<'snapshots' | 'logs'>('snapshots');

  // State: Snapshots & Logs
  const [snapshots, setSnapshots] = useState<ScheduleSnapshot[]>(() =>
    StorageService.getScheduleSnapshots()
  );
  const [logs, setLogs] = useState<ScheduleChangeLog[]>(() =>
    StorageService.getScheduleChangeLogs()
  );

  // Search & Filters for Snapshots
  const [snapshotSearch, setSnapshotSearch] = useState('');
  const [snapshotYearFilter, setSnapshotYearFilter] = useState('all');
  const [snapshotTypeFilter, setSnapshotTypeFilter] = useState<'all' | 'manual' | 'autobackup'>('all');

  // Search & Filters for Logs
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState<string>('all');
  const [logEntityFilter, setLogEntityFilter] = useState<string>('all');

  // Notification Toast
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showNotification = (
    type: 'success' | 'info' | 'warning' | 'error',
    title: string,
    message: string
  ) => {
    setToast({ show: true, type, title, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  // Reload snapshots & logs helper
  const reloadData = () => {
    setSnapshots(StorageService.getScheduleSnapshots());
    setLogs(StorageService.getScheduleChangeLogs());
  };

  // Master lookups
  const courses = useMemo(() => StorageService.getCourses(), []);
  const lecturers = useMemo(() => StorageService.getLecturers(), []);
  const rooms = useMemo(() => StorageService.getRooms(), []);
  const timeslots = useMemo(() => StorageService.getTimeslots(), []);

  const courseMap = useMemo(() => new Map<string, Course>(courses.map((c) => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map((l) => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map((t) => [t.id, t])), [timeslots]);

  // Modal States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');

  const [selectedSnapshot, setSelectedSnapshot] = useState<ScheduleSnapshot | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState<ScheduleSnapshot | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [snapshotForTemplate, setSnapshotForTemplate] = useState<ScheduleSnapshot | null>(null);
  const [templateYear, setTemplateYear] = useState('2027/2028');
  const [templateTerm, setTemplateTerm] = useState('Ganjil');
  const [templateName, setTemplateName] = useState('');

  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [snapshotToDuplicate, setSnapshotToDuplicate] = useState<ScheduleSnapshot | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<ScheduleSnapshot | null>(null);

  const [selectedLogDiff, setSelectedLogDiff] = useState<ScheduleChangeLog | null>(null);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [logToUndo, setLogToUndo] = useState<ScheduleChangeLog | null>(null);

  // Filtered Snapshots
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter((snap) => {
      if (snapshotTypeFilter === 'manual' && snap.isAutoBackup) return false;
      if (snapshotTypeFilter === 'autobackup' && !snap.isAutoBackup) return false;

      if (snapshotYearFilter !== 'all' && snap.academicYear !== snapshotYearFilter) {
        return false;
      }

      if (snapshotSearch.trim() !== '') {
        const query = snapshotSearch.toLowerCase();
        const matchesName = snap.name.toLowerCase().includes(query);
        const matchesNotes = snap.notes?.toLowerCase().includes(query) || false;
        const matchesUser = snap.createdBy.toLowerCase().includes(query);
        return matchesName || matchesNotes || matchesUser;
      }
      return true;
    });
  }, [snapshots, snapshotSearch, snapshotYearFilter, snapshotTypeFilter]);

  // Unique academic years in snapshots
  const availableYears = useMemo(() => {
    const years = new Set(snapshots.map((s) => s.academicYear));
    return Array.from(years);
  }, [snapshots]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logActionFilter !== 'all' && log.action !== logActionFilter) return false;
      if (logEntityFilter !== 'all' && log.entityType !== logEntityFilter) return false;

      if (logSearch.trim() !== '') {
        const query = logSearch.toLowerCase();
        const matchesDesc = log.description.toLowerCase().includes(query);
        const matchesUser = log.changedBy.toLowerCase().includes(query);
        const matchesCourse =
          (log.courseName && log.courseName.toLowerCase().includes(query)) ||
          (log.courseCode && log.courseCode.toLowerCase().includes(query));
        return matchesDesc || matchesUser || matchesCourse;
      }
      return true;
    });
  }, [logs, logSearch, logActionFilter, logEntityFilter]);

  if (!isAdmin) {
    return (
      <AccessDenied
        currentUser={currentUser}
        requiredRole="Administrator"
        onNavigateHome={() => {
          if (onNavigateToSchedule) onNavigateToSchedule();
        }}
      />
    );
  }

  // Action Handlers
  const handleOpenSaveModal = () => {
    const currentYear = StorageService.getAcademicYear();
    const currentVer = StorageService.getScheduleVersion();
    setSaveName(`${currentYear} — Versi Manual (${new Date().toLocaleDateString('id-ID')})`);
    setSaveNotes('');
    setIsSaveModalOpen(true);
  };

  const handleConfirmSaveSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    try {
      const created = StorageService.createSnapshotFromCurrent(
        saveName.trim(),
        saveNotes.trim(),
        currentUser,
        false
      );
      setIsSaveModalOpen(false);
      reloadData();
      showNotification(
        'success',
        'Snapshot Berhasil Disimpan',
        `Snapshot "${created.name}" berhasil disimpan dengan ${created.scheduleData?.length || 0} sesi perkuliahan.`
      );
    } catch (err: any) {
      showNotification('error', 'Gagal Menyimpan Snapshot', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  const handleOpenRestoreModal = (snap: ScheduleSnapshot) => {
    setSnapshotToRestore(snap);
    setIsRestoreModalOpen(true);
  };

  const handleConfirmRestore = () => {
    if (!snapshotToRestore) return;
    try {
      const result = StorageService.restoreScheduleSnapshot(snapshotToRestore.id, currentUser);
      setIsRestoreModalOpen(false);
      reloadData();
      if (onRefreshScheduleState) onRefreshScheduleState();

      showNotification(
        'success',
        'Jadwal Berhasil Dipulihkan',
        `Jadwal aktif berhasil dipulihkan dari snapshot "${snapshotToRestore.name}". Cadangan otomatis telah dibuat.`
      );
    } catch (err: any) {
      showNotification('error', 'Gagal Memulihkan Jadwal', err.message || 'Terjadi kesalahan.');
    }
  };

  const handleOpenTemplateModal = (snap: ScheduleSnapshot) => {
    setSnapshotForTemplate(snap);
    setTemplateYear('2027/2028');
    setTemplateTerm('Ganjil');
    setTemplateName(`${snap.name} (Template 2027/2028 Ganjil)`);
    setIsTemplateModalOpen(true);
  };

  const handleConfirmTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotForTemplate) return;

    try {
      const result = StorageService.createScheduleFromTemplate(
        snapshotForTemplate.id,
        templateYear,
        templateTerm,
        templateName,
        currentUser
      );

      setIsTemplateModalOpen(false);
      reloadData();
      if (onRefreshScheduleState) onRefreshScheduleState();

      if (result.validationWarnings.length > 0) {
        showNotification(
          'warning',
          'Template Diterapkan dengan Catatan',
          `Jadwal baru draft berhasil dibuat. Ditemukan ${result.validationWarnings.length} penyesuaian master data.`
        );
      } else {
        showNotification(
          'success',
          'Template Semester Baru Diterapkan',
          `Jadwal baru semester ${templateYear} ${templateTerm} berhasil disiapkan dalam status Draft.`
        );
      }
    } catch (err: any) {
      showNotification('error', 'Gagal Menerapkan Template', err.message || 'Terjadi kesalahan.');
    }
  };

  const handleOpenDuplicateModal = (snap: ScheduleSnapshot) => {
    setSnapshotToDuplicate(snap);
    setDuplicateName(`${snap.name} (Salinan)`);
    setIsDuplicateModalOpen(true);
  };

  const handleConfirmDuplicate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotToDuplicate || !duplicateName.trim()) return;

    try {
      const copy = StorageService.duplicateScheduleSnapshot(
        snapshotToDuplicate.id,
        duplicateName.trim(),
        currentUser
      );
      setIsDuplicateModalOpen(false);
      reloadData();
      showNotification(
        'success',
        'Snapshot Berhasil Diduplikasi',
        `Salinan snapshot "${copy.name}" telah berhasil dibuat.`
      );
    } catch (err: any) {
      showNotification('error', 'Gagal Duplikasi Snapshot', err.message || 'Terjadi kesalahan.');
    }
  };

  const handleOpenDeleteModal = (snap: ScheduleSnapshot) => {
    setSnapshotToDelete(snap);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!snapshotToDelete) return;
    try {
      StorageService.deleteScheduleSnapshot(snapshotToDelete.id, currentUser);
      setIsDeleteModalOpen(false);
      reloadData();
      showNotification('success', 'Snapshot Dihapus', `Snapshot "${snapshotToDelete.name}" telah dihapus.`);
    } catch (err: any) {
      showNotification('error', 'Gagal Menghapus', err.message || 'Terjadi kesalahan.');
    }
  };

  const handleOpenUndoModal = (log: ScheduleChangeLog) => {
    setLogToUndo(log);
    setIsUndoModalOpen(true);
  };

  const handleConfirmUndo = () => {
    if (!logToUndo) return;
    try {
      const result = StorageService.undoScheduleChange(logToUndo.id, currentUser);
      setIsUndoModalOpen(false);
      reloadData();
      if (onRefreshScheduleState) onRefreshScheduleState();

      if (result.success) {
        showNotification('success', 'Perubahan Dibatalkan (Undo)', result.message);
      } else {
        showNotification('warning', 'Undo Gagal', result.message);
      }
    } catch (err: any) {
      showNotification('error', 'Gagal Melakukan Undo', err.message || 'Terjadi kesalahan.');
    }
  };

  const handleExportSnapshotsJson = () => {
    const dataStr = JSON.stringify(snapshots, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elektro_schedule_snapshots_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div
          className={`p-4 rounded-2xl border transition-all flex items-start gap-3 shadow-md animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs">{toast.title}</h4>
            <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast((prev) => ({ ...prev, show: false }))}
            className="text-xs opacity-60 hover:opacity-100 font-bold px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Riwayat & Versi Jadwal
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manajemen snapshot versi jadwal, pemulihan (rollback), template semester baru, dan audit log perubahan
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportSnapshotsJson}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Export Snapshot JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={handleOpenSaveModal}
            id="btn-save-current-snapshot"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Simpan Versi Saat Ini</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('snapshots')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'snapshots'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Versi & Snapshot Jadwal</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'snapshots' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {snapshots.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Log Perubahan</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeTab === 'logs' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {logs.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SNAPSHOTS & SCHEDULE VERSIONS                     */}
      {/* ======================================================== */}
      {activeTab === 'snapshots' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {/* Search */}
              <div className="relative min-w-[220px] flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={snapshotSearch}
                  onChange={(e) => setSnapshotSearch(e.target.value)}
                  placeholder="Cari snapshot jadwal atau catatan..."
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Year Filter */}
              <select
                value={snapshotYearFilter}
                onChange={(e) => setSnapshotYearFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:bg-white"
              >
                <option value="all">Semua Tahun Akademik</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={snapshotTypeFilter}
                onChange={(e) => setSnapshotTypeFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:bg-white"
              >
                <option value="all">Semua Tipe Snapshot</option>
                <option value="manual">Snapshot Manual</option>
                <option value="autobackup">Auto Backup Sistem</option>
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Menampilkan <strong className="text-indigo-900">{filteredSnapshots.length}</strong> dari {snapshots.length} versi
            </div>
          </div>

          {/* Snapshots Grid */}
          {filteredSnapshots.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3 shadow-2xs">
              <Archive className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="font-bold text-slate-800 text-sm">Tidak ada snapshot yang cocok</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Belum ada snapshot yang sesuai dengan kriteria pencarian Anda. Klik tombol "Simpan Versi Saat Ini" untuk membuat snapshot baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredSnapshots.map((snap) => {
                const totalSessions = snap.scheduleData?.length || 0;
                const totalOfferings = snap.courseOfferingData?.length || 0;
                const createdDate = new Date(snap.createdAt);
                const formattedDate = createdDate.toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={snap.id}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-2xs flex flex-col justify-between ${
                      snap.isAutoBackup
                        ? 'border-amber-200/80 bg-gradient-to-br from-white to-amber-50/20'
                        : 'border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Header info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 truncate">
                              {snap.name}
                            </span>
                            {snap.isAutoBackup ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Auto Backup
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Manual Version
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {snap.academicYear} {snap.academicTerm}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formattedDate}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {snap.createdBy}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {snap.notes && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-3 italic leading-relaxed">
                          "{snap.notes}"
                        </p>
                      )}

                      {/* Metrics Summary Pills */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[10px] font-semibold text-slate-500">Sesi Terjadwal</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">{totalSessions} Sesi</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[10px] font-semibold text-slate-500">Penawaran MK</div>
                          <div className="text-xs font-bold text-slate-900 mt-0.5">{totalOfferings} Kelas</div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="text-[10px] font-semibold text-slate-500">Hard Conflict</div>
                          <div
                            className={`text-xs font-bold mt-0.5 ${
                              snap.metrics?.hardConflicts && snap.metrics.hardConflicts > 0
                                ? 'text-rose-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {snap.metrics?.hardConflicts || 0} Bentrok
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSnapshot(snap);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Lihat Rincian Snapshot"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detail</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDuplicateModal(snap)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Duplikasi Snapshot"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Duplikat</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDeleteModal(snap)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Hapus Snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenTemplateModal(snap)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Gunakan struktur snapshot ini untuk semester baru"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Jadikan Template</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRestoreModal(snap)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          title="Pulihkan jadwal aktif dari snapshot ini"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Pulihkan</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AUDIT LOGS & CHANGE HISTORY                       */}
      {/* ======================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="relative min-w-[220px] flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Cari aktivitas, user, mata kuliah..."
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:bg-white"
              >
                <option value="all">Semua Jenis Aksi</option>
                <option value="MOVE_SESSION">Pindah Sesi</option>
                <option value="CHANGE_ROOM">Ganti Ruangan</option>
                <option value="ASSIGN_LECTURER">Tugaskan Dosen</option>
                <option value="CHANGE_LECTURER">Ubah Dosen</option>
                <option value="SWAP_SCHEDULE">Tukar Jadwal</option>
                <option value="SA_OPTIMIZATION">Optimasi SA</option>
                <option value="RESTORE_SCHEDULE">Pulihkan Jadwal</option>
                <option value="TEMPLATE_APPLIED">Terapkan Template</option>
                <option value="SAVE_SNAPSHOT">Simpan Snapshot</option>
                <option value="PUBLISH_SCHEDULE">Terbitkan Jadwal</option>
                <option value="UNDO_CHANGE">Undo Perubahan</option>
              </select>

              <select
                value={logEntityFilter}
                onChange={(e) => setLogEntityFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-hidden focus:bg-white"
              >
                <option value="all">Semua Objek Data</option>
                <option value="ScheduleAssignment">Jadwal Sesi</option>
                <option value="CourseOffering">Penawaran MK</option>
                <option value="ScheduleSnapshot">Snapshot Jadwal</option>
                <option value="SYSTEM">Sistem</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                Total: <strong className="text-indigo-900">{filteredLogs.length}</strong> log tercatat
              </span>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4 w-40">Waktu & User</th>
                    <th className="py-3 px-4 w-36">Jenis Aksi</th>
                    <th className="py-3 px-4">Deskripsi Perubahan</th>
                    <th className="py-3 px-4 w-48">Mata Kuliah / Target</th>
                    <th className="py-3 px-4 text-center w-28">Status / Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        Tidak ada catatan log perubahan yang cocok.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const dateObj = new Date(log.changedAt);
                      const timeStr = dateObj.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      });
                      const dateStr = dateObj.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });

                      const isUndoAvailable = log.isUndoable && !log.undoneAt && log.before;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{timeStr}</div>
                            <div className="text-[11px] text-slate-500">{dateStr}</div>
                            <div className="text-[10px] text-indigo-700 font-bold mt-0.5 flex items-center gap-1">
                              <User className="w-2.5 h-2.5" />
                              <span>{log.changedBy}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                log.action === 'RESTORE_SCHEDULE'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : log.action === 'UNDO_CHANGE'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : log.action === 'SA_OPTIMIZATION'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                  : log.action === 'PUBLISH_SCHEDULE'
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {log.action}
                            </span>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {log.entityType}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800 leading-snug">
                              {log.description}
                            </div>
                            {log.before && log.after && (
                              <button
                                type="button"
                                onClick={() => setSelectedLogDiff(log)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1 cursor-pointer inline-flex items-center gap-0.5"
                              >
                                <span>Lihat Rincian Nilai Sebelum & Sesudah</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {log.courseName ? (
                              <div>
                                <div className="font-bold text-slate-900 truncate">{log.courseName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {log.courseCode || ''} {log.semester ? `• Sem ${log.semester}` : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-center">
                            {log.undoneAt ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Undone</span>
                              </span>
                            ) : isUndoAvailable ? (
                              <button
                                type="button"
                                onClick={() => handleOpenUndoModal(log)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                                title="Batalkan perubahan ini"
                              >
                                <Undo2 className="w-3 h-3" />
                                <span>Undo</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
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
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SIMPAN SNAPSHOT BARU                             */}
      {/* ======================================================== */}
      <Modal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="Simpan Snapshot / Versi Jadwal"
        size="md"
      >
        <form onSubmit={handleConfirmSaveSnapshot} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Nama Versi Jadwal <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Contoh: 2026/2027 Ganjil — Final Published"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Catatan / Keterangan Tambahan</label>
            <textarea
              rows={3}
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              placeholder="Contoh: Hasil penyesuaian setelah rapat pleno kurikulum dan ketersediaan dosen."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:bg-white focus:border-indigo-500 text-xs"
            />
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-indigo-900 leading-relaxed text-[11px]">
            <p className="font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Informasi Penyimpanan</span>
            </p>
            <p className="mt-1 text-slate-600">
              Snapshot akan membekukan seluruh alokasi sesi, penawaran mata kuliah, ruangan, dan dosen pada kondisi saat ini sehingga dapat dipulihkan atau dijadikan template sewaktu-waktu.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan Snapshot</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: PULIHKAN JADWAL (RESTORE)                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        title="Pulihkan Jadwal dari Snapshot"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">Konfirmasi Pemulihan (Rollback) Jadwal</p>
              <p className="mt-1 text-slate-700">
                Anda akan memulihkan jadwal aktif sistem ke versi: <br />
                <strong className="text-slate-900">"{snapshotToRestore?.name}"</strong>
              </p>
              <div className="mt-2.5 p-2 bg-white/80 rounded-lg border border-amber-300 text-[11px] font-semibold text-emerald-800">
                ✓ Sistem akan otomatis membuat satu snapshot cadangan (Auto-Backup) dari jadwal aktif saat ini sebelum proses pemulihan dieksekusi.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmRestore}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ya, Pulihkan Jadwal</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: GUNAKAN SEBAGAI TEMPLATE SEMESTER BARU            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Jadikan Template untuk Semester Baru"
        size="md"
      >
        <form onSubmit={handleConfirmTemplate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Sumber Template Snapshot
            </label>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700">
              {snapshotForTemplate?.name}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Tahun Akademik Target</label>
              <input
                type="text"
                required
                value={templateYear}
                onChange={(e) => setTemplateYear(e.target.value)}
                placeholder="2027/2028"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:bg-white text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Term / Semester Target</label>
              <select
                value={templateTerm}
                onChange={(e) => setTemplateTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:bg-white text-xs font-semibold"
              >
                <option value="Ganjil">Ganjil</option>
                <option value="Genap">Genap</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Nama Jadwal Baru</label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:bg-white text-xs font-semibold"
            />
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-indigo-900 leading-relaxed text-[11px]">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Mekanisme Penerapan Template</span>
            </p>
            <p className="mt-1 text-slate-600">
              Sistem akan menduplikasi struktur penawaran dan alokasi sesi, memeriksa validitas dosen, ruangan, dan mata kuliah di database aktif, lalu menyimpannya sebagai draf jadwal awal semester baru.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Terapkan Template</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: DUPLIKASI SNAPSHOT                                */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Duplikasi Snapshot Jadwal"
        size="sm"
      >
        <form onSubmit={handleConfirmDuplicate} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Nama Duplikat Baru</label>
            <input
              type="text"
              required
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:bg-white text-xs font-semibold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDuplicateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer"
            >
              Duplikasi
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: HAPUS SNAPSHOT                                    */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Hapus Snapshot Jadwal"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
            <p className="font-bold">Apakah Anda yakin ingin menghapus snapshot ini?</p>
            <p className="mt-1 text-slate-700 font-semibold">"{snapshotToDelete?.name}"</p>
            <p className="mt-1 text-slate-500 text-[11px]">
              Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ya, Hapus</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: DETAIL RINCIAN SNAPSHOT                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Rincian Snapshot: ${selectedSnapshot?.name || ''}`}
        size="2xl"
      >
        {selectedSnapshot && (
          <div className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium">Tahun Akademik</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedSnapshot.academicYear} {selectedSnapshot.academicTerm}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium">Dibuat Oleh</div>
                <div className="font-bold text-slate-900 mt-0.5 truncate">
                  {selectedSnapshot.createdBy}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium">Total Sesi Terjadwal</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedSnapshot.scheduleData?.length || 0} Sesi
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 font-medium">Penawaran MK</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedSnapshot.courseOfferingData?.length || 0} Kelas
                </div>
              </div>
            </div>

            {selectedSnapshot.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-700 text-[11px]">Catatan Versi:</div>
                <div className="text-slate-600 mt-0.5">{selectedSnapshot.notes}</div>
              </div>
            )}

            {/* Assignments Table Preview */}
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center justify-between">
                <span>Daftar Sesi Perkuliahan ({selectedSnapshot.scheduleData?.length || 0})</span>
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Mata Kuliah</th>
                      <th className="py-2 px-3">Kelas</th>
                      <th className="py-2 px-3">Hari & Waktu</th>
                      <th className="py-2 px-3">Ruangan</th>
                      <th className="py-2 px-3">Dosen Pengampu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedSnapshot.scheduleData || []).slice(0, 50).map((assign) => {
                      const course = courseMap.get(assign.courseId);
                      const room = roomMap.get(assign.roomId);
                      const timeslot = timeslotMap.get(assign.timeslotId);
                      const lecIds = assign.lecturerIds || (assign.lecturerId ? [assign.lecturerId] : []);
                      const lecs = lecIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];

                      return (
                        <tr key={assign.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {course?.name || assign.courseId}
                          </td>
                          <td className="py-2 px-3 font-bold text-indigo-700">
                            {assign.classId || 'A'}
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            {timeslot ? `${timeslot.day}, ${timeslot.startTime}-${timeslot.endTime}` : '-'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {room?.code || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                            {lecs.map((l) => l.name).join(', ') || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: DIFF PERUBAHAN LOG                                */}
      {/* ======================================================== */}
      <Modal
        isOpen={Boolean(selectedLogDiff)}
        onClose={() => setSelectedLogDiff(null)}
        title="Rincian Nilai Sebelum & Sesudah Perubahan"
        size="md"
      >
        {selectedLogDiff && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900">{selectedLogDiff.description}</div>
              <div className="text-[11px] text-slate-500 mt-1">
                Aksi: <strong className="text-indigo-800">{selectedLogDiff.action}</strong> • User:{' '}
                {selectedLogDiff.changedBy}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                <div className="font-bold text-rose-900 mb-1.5 flex items-center gap-1">
                  <span>Keadaan Sebelum (Before)</span>
                </div>
                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto bg-white p-2 rounded-lg border border-rose-100">
                  {JSON.stringify(selectedLogDiff.before, null, 2)}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="font-bold text-emerald-900 mb-1.5 flex items-center gap-1">
                  <span>Keadaan Sesudah (After)</span>
                </div>
                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap overflow-x-auto bg-white p-2 rounded-lg border border-emerald-100">
                  {JSON.stringify(selectedLogDiff.after, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedLogDiff(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL: UNDO PERUBAHAN                                    */}
      {/* ======================================================== */}
      <Modal
        isOpen={isUndoModalOpen}
        onClose={() => setIsUndoModalOpen(false)}
        title="Batalkan Perubahan (Undo)"
        size="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-purple-900">
            <p className="font-bold">Batalkan perubahan berikut?</p>
            <p className="mt-1 text-slate-800 leading-snug font-medium">
              "{logToUndo?.description}"
            </p>
            <p className="mt-2 text-[11px] text-purple-700">
              Sistem akan mengembalikan keadaan atribut sesi/objek ini ke nilai sebelum perubahan dilakukan.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUndoModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmUndo}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Ya, Batalkan Perubahan</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
