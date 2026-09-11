import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Users,
  DoorOpen,
  Clock,
  AlertTriangle,
  Layers,
  ArrowLeftRight,
  Maximize2,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Search,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  History,
  Info,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  DayOfWeek,
  ConflictItem,
  ConstraintWeights,
  ScheduleChangeRecord,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import {
  getScheduleRecommendations,
  getSwapRecommendations,
  evaluateMove,
  evaluateSwap,
  MoveEvaluation,
  SwapEvaluation,
} from '../algorithms/recommendationEngine';

interface TimetablePageProps {
  currentSchedule: ScheduleAssignment[] | null;
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  conflicts: ConflictItem[];
  weights: ConstraintWeights;
  onManualMoveAssignment: (
    assignmentId: string,
    newTimeslotId: string,
    newRoomId: string,
    method?: ScheduleChangeRecord['method'],
    reason?: string
  ) => void;
  onSwapAssignments: (
    assignment1Id: string,
    assignment2Id: string,
    reason?: string
  ) => void;
  changeLogs: ScheduleChangeRecord[];
  onClearLogs: () => void;
}

const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const TimetablePage: React.FC<TimetablePageProps> = ({
  currentSchedule,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  conflicts,
  weights,
  onManualMoveAssignment,
  onSwapAssignments,
  changeLogs,
  onClearLogs,
}) => {
  const { showToast } = useToast();

  // Search and Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedConflictFilter, setSelectedConflictFilter] = useState<'all' | 'bentrok' | 'perhatian' | 'aman'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'room' | 'list'>('grid');
  const [selectedDayForRoomView, setSelectedDayForRoomView] = useState<DayOfWeek>('Senin');

  // Action Dialog State
  const [selectedAssignment, setSelectedAssignment] = useState<ScheduleAssignment | null>(null);
  const [dialogTab, setDialogTab] = useState<'detail' | 'recommendations' | 'manual' | 'swap'>('detail');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Manual move selection state inside modal
  const [manualTargetTimeslotId, setManualTargetTimeslotId] = useState<string>('');
  const [manualTargetRoomId, setManualTargetRoomId] = useState<string>('');
  const [showHardConflictWarningConfirm, setShowHardConflictWarningConfirm] = useState<boolean>(false);

  // Maps for quick lookup
  const courseMap = useMemo(() => new Map<string, Course>(courses.map(c => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map(l => [l.id, l])), [lecturers]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map(cl => [cl.id, cl])), [classes]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map(r => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map(t => [t.id, t])), [timeslots]);

  // Conflict indexing
  const { hardConflictingIds, softConflictingIds, conflictItemMap } = useMemo(() => {
    const hard = new Set<string>();
    const soft = new Set<string>();
    const descMap = new Map<string, ConflictItem[]>();

    conflicts.forEach(c => {
      if (c.isHardConstraint) {
        hard.add(c.assignment1Id);
        if (c.assignment2Id) hard.add(c.assignment2Id);
      } else {
        soft.add(c.assignment1Id);
        if (c.assignment2Id) soft.add(c.assignment2Id);
      }

      const list1 = descMap.get(c.assignment1Id) || [];
      list1.push(c);
      descMap.set(c.assignment1Id, list1);

      if (c.assignment2Id) {
        const list2 = descMap.get(c.assignment2Id) || [];
        list2.push(c);
        descMap.set(c.assignment2Id, list2);
      }
    });

    return { hardConflictingIds: hard, softConflictingIds: soft, conflictItemMap: descMap };
  }, [conflicts]);

  // Helper to determine status for each assignment
  const getAssignmentStatus = (id: string): 'bentrok' | 'perhatian' | 'aman' => {
    if (hardConflictingIds.has(id)) return 'bentrok';
    if (softConflictingIds.has(id)) return 'perhatian';
    return 'aman';
  };

  // Filtered schedule
  const filteredAssignments = useMemo(() => {
    if (!currentSchedule) return [];

    return currentSchedule.filter(a => {
      const course = courseMap.get(a.courseId);
      const lecturer = lecturerMap.get(a.lecturerId);
      const room = roomMap.get(a.roomId);
      const cls = classMap.get(a.classId);

      if (!course) return false;

      // Search query
      if (searchTerm.trim()) {
        const q = (searchTerm || '').toLowerCase();
        const matchCode = (course?.code || '').toLowerCase().includes(q);
        const matchName = (course?.name || '').toLowerCase().includes(q);
        const matchLec = (lecturer?.name || '').toLowerCase().includes(q);
        const matchRoom =
          (room?.code || '').toLowerCase().includes(q) ||
          (room?.name || '').toLowerCase().includes(q);
        const matchCls = (cls?.code || '').toLowerCase().includes(q);

        if (!matchCode && !matchName && !matchLec && !matchRoom && !matchCls) {
          return false;
        }
      }

      // Dropdown filters
      if (selectedSemester !== 'all' && course.semester.toString() !== selectedSemester) return false;
      if (selectedClassId !== 'all' && a.classId !== selectedClassId) return false;
      if (selectedLecturerId !== 'all' && a.lecturerId !== selectedLecturerId) return false;
      if (selectedRoomId !== 'all' && a.roomId !== selectedRoomId) return false;

      // Status filter
      if (selectedConflictFilter !== 'all') {
        const status = getAssignmentStatus(a.id);
        if (status !== selectedConflictFilter) return false;
      }

      return true;
    });
  }, [
    currentSchedule,
    searchTerm,
    selectedSemester,
    selectedClassId,
    selectedLecturerId,
    selectedRoomId,
    selectedConflictFilter,
    courseMap,
    lecturerMap,
    roomMap,
    classMap,
    hardConflictingIds,
    softConflictingIds,
  ]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = currentSchedule?.length || 0;
    let bentrokCount = 0;
    let perhatianCount = 0;
    let amanCount = 0;

    (currentSchedule || []).forEach(a => {
      const status = getAssignmentStatus(a.id);
      if (status === 'bentrok') bentrokCount++;
      else if (status === 'perhatian') perhatianCount++;
      else amanCount++;
    });

    return { total, bentrokCount, perhatianCount, amanCount };
  }, [currentSchedule, hardConflictingIds, softConflictingIds]);

  // Active Days and Timeslots
  const activeDays = useMemo(() => {
    return ALL_DAYS.filter(day => timeslots.some(t => t.day === day && t.isActive));
  }, [timeslots]);

  // Handle open assignment dialog
  const handleOpenAssignment = (assignment: ScheduleAssignment, tab: 'detail' | 'recommendations' | 'manual' | 'swap' = 'detail') => {
    setSelectedAssignment(assignment);
    setDialogTab(tab);
    setManualTargetTimeslotId(assignment.timeslotId);
    setManualTargetRoomId(assignment.roomId);
    setShowHardConflictWarningConfirm(false);
  };

  // Get recommendations for selected assignment
  const moveRecommendations: MoveEvaluation[] = useMemo(() => {
    if (!selectedAssignment || !currentSchedule) return [];
    return getScheduleRecommendations(
      selectedAssignment.id,
      currentSchedule,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights,
      5
    );
  }, [selectedAssignment, currentSchedule, courses, lecturers, classes, rooms, timeslots, weights]);

  // Get swap recommendations for selected assignment
  const swapRecommendations: SwapEvaluation[] = useMemo(() => {
    if (!selectedAssignment || !currentSchedule) return [];
    return getSwapRecommendations(
      selectedAssignment.id,
      currentSchedule,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights,
      4
    );
  }, [selectedAssignment, currentSchedule, courses, lecturers, classes, rooms, timeslots, weights]);

  // Real-time evaluation of manual move in modal
  const manualMoveEvaluation: MoveEvaluation | null = useMemo(() => {
    if (!selectedAssignment || !currentSchedule || !manualTargetTimeslotId || !manualTargetRoomId) {
      return null;
    }
    if (
      manualTargetTimeslotId === selectedAssignment.timeslotId &&
      manualTargetRoomId === selectedAssignment.roomId
    ) {
      return null;
    }

    try {
      return evaluateMove(
        selectedAssignment.id,
        manualTargetTimeslotId,
        manualTargetRoomId,
        currentSchedule,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights
      );
    } catch {
      return null;
    }
  }, [
    selectedAssignment,
    currentSchedule,
    manualTargetTimeslotId,
    manualTargetRoomId,
    courses,
    lecturers,
    classes,
    rooms,
    timeslots,
    weights,
  ]);

  // Apply move recommendation
  const handleApplyRecommendation = (rec: MoveEvaluation) => {
    if (!selectedAssignment) return;
    const course = courseMap.get(selectedAssignment.courseId);
    onManualMoveAssignment(
      selectedAssignment.id,
      rec.targetTimeslotId,
      rec.targetRoomId,
      'Manual Recommendation',
      `Rekomendasi SPK: Dipindahkan ke ${rec.timeslot.day} (${rec.timeslot.label}) di ruang ${rec.room.code}`
    );
    showToast(
      'success',
      'Rekomendasi Diterapkan',
      `Jadwal ${course?.code} berhasil dipindahkan ke ${rec.timeslot.day} ${rec.timeslot.label} di ${rec.room.code}.`
    );
    setSelectedAssignment(null);
  };

  // Apply swap recommendation
  const handleApplySwap = (swap: SwapEvaluation) => {
    onSwapAssignments(
      swap.assignment1Id,
      swap.assignment2Id,
      `Pertukaran SPK: ${swap.course1.code} ↔ ${swap.course2.code}`
    );
    showToast(
      'success',
      'Pertukaran Berhasil',
      `Jadwal ${swap.course1.code} berhasil ditukar dengan ${swap.course2.code}.`
    );
    setSelectedAssignment(null);
  };

  // Apply manual move
  const handleApplyManualMove = (force: boolean = false) => {
    if (!selectedAssignment || !manualTargetTimeslotId || !manualTargetRoomId) return;

    if (!force && manualMoveEvaluation && !manualMoveEvaluation.isValidWithoutHardConflict) {
      setShowHardConflictWarningConfirm(true);
      return;
    }

    const course = courseMap.get(selectedAssignment.courseId);
    const targetSlot = timeslotMap.get(manualTargetTimeslotId);
    const targetRoom = roomMap.get(manualTargetRoomId);

    onManualMoveAssignment(
      selectedAssignment.id,
      manualTargetTimeslotId,
      manualTargetRoomId,
      'Manual Move',
      `Pemindahan Manual: Ke ${targetSlot?.day} ${targetSlot?.label} (${targetRoom?.code})`
    );

    showToast(
      manualMoveEvaluation && !manualMoveEvaluation.isValidWithoutHardConflict ? 'warning' : 'success',
      'Alokasi Jadwal Diperbarui',
      `Jadwal ${course?.code} dialokasikan ke ${targetSlot?.day} ${targetSlot?.label} di ${targetRoom?.code}.`
    );

    setSelectedAssignment(null);
    setShowHardConflictWarningConfirm(false);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!currentSchedule || currentSchedule.length === 0) {
      showToast('error', 'Ekspor Gagal', 'Tidak ada jadwal yang dapat diekspor.');
      return;
    }

    const headers = ['Hari', 'Waktu', 'Kode MK', 'Nama Mata Kuliah', 'SKS', 'Kelas', 'Dosen Pengampu', 'Ruangan', 'Status'];
    const rows = filteredAssignments.map(a => {
      const course = courseMap.get(a.courseId);
      const lecturer = lecturerMap.get(a.lecturerId);
      const room = roomMap.get(a.roomId);
      const slot = timeslotMap.get(a.timeslotId);
      const cls = classMap.get(a.classId);
      const status = getAssignmentStatus(a.id).toUpperCase();

      return [
        slot?.day || '',
        slot?.label || '',
        course?.code || '',
        `"${course?.name || ''}"`,
        course?.sks || '',
        cls?.code || '',
        `"${lecturer?.name || ''}"`,
        room?.code || '',
        status,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jadwal_Teknik_Elektro_UNRAM_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Ekspor Selesai', 'File CSV jadwal perkuliahan berhasil diunduh.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Matriks Jadwal Perkuliahan (Timetable Matrix)
            </h2>
            <Badge variant="indigo" size="sm">
              {filteredAssignments.length} / {summaryStats.total} Ditampilkan
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Sistem Pendukung Keputusan: Klik setiap kartu jadwal untuk melihat analisis konflik, rekomendasi pindah slot, atau swap antar jadwal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            title="Riwayat Perubahan Jadwal"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Riwayat ({changeLogs.length})</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Ekspor</span> CSV
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Hari
            </button>
            <button
              onClick={() => setViewMode('room')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'room' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Ruangan
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === 'list' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tabel Daftar
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500">Total Terjadwal</div>
            <div className="text-lg font-bold text-slate-900">{summaryStats.total} Mata Kuliah</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500">Status AMAN</div>
            <div className="text-lg font-bold text-emerald-600">{summaryStats.amanCount} Slot Valid</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500">Perlu Perhatian</div>
            <div className="text-lg font-bold text-amber-600">{summaryStats.perhatianCount} Soft Conflict</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500">BENTROK (Hard)</div>
            <div className="text-lg font-bold text-rose-600">{summaryStats.bentrokCount} Bentrokan</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Search bar */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari mata kuliah, dosen, kode, ruang..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Semester Filter */}
          <div>
            <select
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s.toString()}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua Rombel / Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Lecturer Filter */}
          <div>
            <select
              value={selectedLecturerId}
              onChange={e => setSelectedLecturerId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white truncate"
            >
              <option value="all">Semua Dosen</option>
              {lecturers.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Filter */}
          <div>
            <select
              value={selectedRoomId}
              onChange={e => setSelectedRoomId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua Ruangan</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.code} ({r.name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Status Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Filter Status:</span>
            <button
              onClick={() => setSelectedConflictFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedConflictFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({summaryStats.total})
            </button>
            <button
              onClick={() => setSelectedConflictFilter('bentrok')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedConflictFilter === 'bentrok'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Bentrok / Hard ({summaryStats.bentrokCount})
            </button>
            <button
              onClick={() => setSelectedConflictFilter('perhatian')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedConflictFilter === 'perhatian'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Perlu Perhatian ({summaryStats.perhatianCount})
            </button>
            <button
              onClick={() => setSelectedConflictFilter('aman')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                selectedConflictFilter === 'aman'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Aman ({summaryStats.amanCount})
            </button>
          </div>

          {(searchTerm ||
            selectedSemester !== 'all' ||
            selectedClassId !== 'all' ||
            selectedLecturerId !== 'all' ||
            selectedRoomId !== 'all' ||
            selectedConflictFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSemester('all');
                setSelectedClassId('all');
                setSelectedLecturerId('all');
                setSelectedRoomId('all');
                setSelectedConflictFilter('all');
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: Matriks Hari (Grid View) */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {activeDays.map(day => {
            const dayTimeslots = timeslots
              .filter(t => t.day === day && t.isActive)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const dayAssignments = filteredAssignments.filter(a => {
              const ts = timeslotMap.get(a.timeslotId);
              return ts?.day === day;
            });

            return (
              <div
                key={day}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
              >
                {/* Day Header Banner */}
                <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{day}</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg">
                    {dayAssignments.length} Mata Kuliah Terjadwal
                  </span>
                </div>

                {/* Timeslots Columns */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3.5">
                  {dayTimeslots.map(ts => {
                    const slotAssignments = dayAssignments.filter(a => a.timeslotId === ts.id);

                    return (
                      <div
                        key={ts.id}
                        className="bg-slate-50/50 rounded-xl border border-slate-200/80 p-2.5 flex flex-col min-h-[220px]"
                      >
                        {/* Slot Header */}
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-xs font-bold text-slate-800 font-mono">{ts.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Slot #{ts.slotIndex}
                          </span>
                        </div>

                        {/* Cards in this slot */}
                        <div className="space-y-2 flex-1">
                          {slotAssignments.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg">
                              Kosong (Tersedia)
                            </div>
                          ) : (
                            slotAssignments.map(a => {
                              const course = courseMap.get(a.courseId);
                              const lecturer = lecturerMap.get(a.lecturerId);
                              const room = roomMap.get(a.roomId);
                              const cls = classMap.get(a.classId);
                              const status = getAssignmentStatus(a.id);
                              const specificConflicts = conflictItemMap.get(a.id) || [];

                              return (
                                <div
                                  key={a.id}
                                  onClick={() => handleOpenAssignment(a, 'detail')}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left relative group ${
                                    status === 'bentrok'
                                      ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400 shadow-2xs'
                                      : status === 'perhatian'
                                      ? 'bg-amber-50/90 border-amber-300 hover:border-amber-400 shadow-2xs'
                                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                                  }`}
                                >
                                  {/* Status indicator pill */}
                                  <div className="flex items-start justify-between gap-1 mb-1.5">
                                    <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                                      {course?.code}
                                    </span>
                                    {status === 'bentrok' ? (
                                      <Badge variant="danger" size="sm">
                                        <ShieldAlert className="w-2.5 h-2.5 animate-pulse" />
                                        BENTROK
                                      </Badge>
                                    ) : status === 'perhatian' ? (
                                      <Badge variant="warning" size="sm">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        Perhatian
                                      </Badge>
                                    ) : (
                                      <Badge variant="success" size="sm">
                                        AMAN
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                                    {course?.name}
                                  </div>

                                  <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span className={`truncate ${!lecturer ? 'text-amber-700 font-medium' : ''}`}>
                                        {lecturer?.name || 'Belum Ada Dosen'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                      <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {cls?.code}
                                      </span>
                                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                        {room?.code}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Conflict warning preview badge */}
                                  {specificConflicts.length > 0 && (
                                    <div className="mt-2 text-[10px] text-rose-700 font-medium bg-rose-100/80 px-2 py-1 rounded-md line-clamp-1">
                                      {specificConflicts[0].description}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Matriks Ruangan (Room Matrix) */}
      {viewMode === 'room' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Pilih Hari Perkuliahan:</span>
              <div className="flex flex-wrap gap-1">
                {activeDays.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDayForRoomView(day)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedDayForRoomView === day
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  <th className="p-3.5 w-44">Ruangan</th>
                  {timeslots
                    .filter(t => t.day === selectedDayForRoomView && t.isActive)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map(ts => (
                      <th key={ts.id} className="p-3.5 text-center font-mono font-semibold">
                        <div>{ts.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">Slot #{ts.slotIndex}</div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rooms
                  .filter(r => (selectedRoomId === 'all' ? r.isActive : r.id === selectedRoomId))
                  .map(room => (
                    <tr key={room.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 bg-slate-50/30">
                        <div className="font-bold text-slate-900">{room.code}</div>
                        <div className="text-[11px] text-slate-500">{room.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Kap: {room.capacity} ({room.type})</div>
                      </td>

                      {timeslots
                        .filter(t => t.day === selectedDayForRoomView && t.isActive)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map(ts => {
                          const assignment = filteredAssignments.find(
                            a => a.roomId === room.id && a.timeslotId === ts.id
                          );

                          if (!assignment) {
                            return (
                              <td key={ts.id} className="p-2 text-center text-slate-300 font-light">
                                -
                              </td>
                            );
                          }

                          const course = courseMap.get(assignment.courseId);
                          const lecturer = lecturerMap.get(assignment.lecturerId);
                          const cls = classMap.get(assignment.classId);
                          const status = getAssignmentStatus(assignment.id);

                          return (
                            <td key={ts.id} className="p-2">
                              <div
                                onClick={() => handleOpenAssignment(assignment, 'detail')}
                                className={`p-2 rounded-xl border cursor-pointer transition-all ${
                                  status === 'bentrok'
                                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                                    : status === 'perhatian'
                                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                <div className="font-bold text-[11px]">{course?.code}</div>
                                <div className="text-[10px] text-slate-600 line-clamp-1">
                                  {cls?.code} • {lecturer?.name || 'Belum Ada Dosen'}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Hari & Waktu</th>
                  <th className="px-4 py-3">Mata Kuliah</th>
                  <th className="px-3 py-3">Kelas</th>
                  <th className="px-3 py-3">Dosen Pengampu</th>
                  <th className="px-3 py-3">Ruangan</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi SPK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map(assign => {
                  const course = courseMap.get(assign.courseId);
                  const lecturer = lecturerMap.get(assign.lecturerId);
                  const cls = classMap.get(assign.classId);
                  const room = roomMap.get(assign.roomId);
                  const slot = timeslotMap.get(assign.timeslotId);
                  const status = getAssignmentStatus(assign.id);

                  return (
                    <tr key={assign.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        {slot ? `${slot.day}, ${slot.label}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{course?.code}</div>
                        <div className="text-[11px] text-slate-600">{course?.name} ({course?.sks} SKS)</div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{cls?.code}</td>
                      <td className="px-3 py-3 text-slate-800 font-medium">
                        {lecturer ? (
                          lecturer.name
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                            Belum Ada Dosen
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-indigo-700">
                        {room?.code} ({room?.capacity} kursi)
                      </td>
                      <td className="px-3 py-3 text-center">
                        {status === 'bentrok' ? (
                          <Badge variant="danger" size="sm">
                            BENTROK (Hard)
                          </Badge>
                        ) : status === 'perhatian' ? (
                          <Badge variant="warning" size="sm">
                            Perlu Perhatian
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            AMAN
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => handleOpenAssignment(assign, 'recommendations')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Rekomendasi SPK
                        </button>
                        <button
                          onClick={() => handleOpenAssignment(assign, 'detail')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE ACTION & DECISION SUPPORT MODAL */}
      <Modal
        isOpen={Boolean(selectedAssignment)}
        onClose={() => setSelectedAssignment(null)}
        title={
          selectedAssignment
            ? `${courseMap.get(selectedAssignment.courseId)?.code} - ${courseMap.get(selectedAssignment.courseId)?.name}`
            : 'Detail Jadwal'
        }
        subtitle="Keputusan Penjadwalan, Analisis Konflik, dan Rekomendasi Optimalisasi"
        maxWidth="2xl"
      >
        {selectedAssignment && (
          <div className="space-y-4">
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setDialogTab('detail')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  dialogTab === 'detail'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Informasi & Konflik
              </button>
              <button
                onClick={() => setDialogTab('recommendations')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                  dialogTab === 'recommendations'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Rekomendasi Pindah (SPK)
              </button>
              <button
                onClick={() => setDialogTab('swap')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                  dialogTab === 'swap'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Tukar Jadwal (Swap)
              </button>
              <button
                onClick={() => setDialogTab('manual')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                  dialogTab === 'manual'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Pindah Manual
              </button>
            </div>

            {/* TAB 1: Detail & Conflicts */}
            {dialogTab === 'detail' && (
              <div className="space-y-4 pt-1">
                {/* Current Placement Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Hari & Jam:</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {timeslotMap.get(selectedAssignment.timeslotId)?.day},{' '}
                      {timeslotMap.get(selectedAssignment.timeslotId)?.label}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Ruangan:</span>
                    <div className="text-xs font-bold text-indigo-700 mt-0.5">
                      {roomMap.get(selectedAssignment.roomId)?.code} (Kap:{' '}
                      {roomMap.get(selectedAssignment.roomId)?.capacity})
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Dosen:</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                      {selectedAssignment.lecturerId
                        ? lecturerMap.get(selectedAssignment.lecturerId)?.name || 'Dosen Tidak Ditemukan'
                        : 'Belum Ada Dosen Pengampu'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Kelas:</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {classMap.get(selectedAssignment.classId)?.code} (
                      {courseMap.get(selectedAssignment.courseId)?.studentCount} Mhs)
                    </div>
                  </div>
                </div>

                {/* Conflict Status Banner */}
                {conflictItemMap.get(selectedAssignment.id)?.length ? (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>
                        Ditemukan {conflictItemMap.get(selectedAssignment.id)?.length} Konflik pada Penugasan Ini
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-xs text-rose-800">
                      {conflictItemMap.get(selectedAssignment.id)?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-white/70 p-2 rounded-lg border border-rose-100">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.isHardConstraint ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {item.isHardConstraint ? 'HARD' : 'SOFT'}
                          </span>
                          <span className="flex-1">{item.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Penjadwalan Valid & Optimal (Bebas Konflik)</div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Alokasi dosen, ruangan, kapasitas kelas, dan preferensi waktu telah memenuhi seluruh batasan SPK.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDialogTab('recommendations')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lihat Rekomendasi Slot Terbaik</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SPK Recommendations */}
            {dialogTab === 'recommendations' && (
              <div className="space-y-3 pt-1">
                <div className="text-xs text-slate-600">
                  Sistem mengevaluasi seluruh kombinasi slot dan ruangan yang memenuhi kriteria tanpa menimbulkan konflik bentrok baru:
                </div>

                {moveRecommendations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-semibold">Tidak ditemukan alternatif slot yang lebih baik.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Coba opsi 'Tukar Jadwal (Swap)' atau pindahkan manual ke slot lain.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {moveRecommendations.map((rec, index) => (
                      <div
                        key={index}
                        className={`p-3.5 rounded-xl border transition-all ${
                          rec.isValidWithoutHardConflict
                            ? 'bg-white border-slate-200 hover:border-indigo-400 shadow-2xs'
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">
                                Opsi #{index + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {rec.timeslot.day} • {rec.timeslot.label}
                              </span>
                              <span className="text-xs font-mono font-semibold text-indigo-700">
                                Ruang {rec.room.code}
                              </span>
                            </div>

                            {/* Reasons list */}
                            <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                              {rec.reasons.map((r, rIdx) => (
                                <div
                                  key={rIdx}
                                  className={r.startsWith('⚠') ? 'text-amber-700' : 'text-emerald-700'}
                                >
                                  {r}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center sm:flex-col items-end gap-2 shrink-0">
                            {rec.conflictDiff > 0 && (
                              <Badge variant="success" size="sm">
                                Mengurangi {rec.conflictDiff} Konflik
                              </Badge>
                            )}
                            <button
                              onClick={() => handleApplyRecommendation(rec)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                            >
                              Terapkan Slot Ini
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Swap Recommendations */}
            {dialogTab === 'swap' && (
              <div className="space-y-3 pt-1">
                <div className="text-xs text-slate-600">
                  Sistem mendeteksi kemungkinan pertukaran jadwal (slot & ruangan) dengan mata kuliah lain untuk mengurangi bentrokan:
                </div>

                {swapRecommendations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-semibold">Tidak ada skenario pertukaran (swap) yang menguntungkan.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {swapRecommendations.map((swap, index) => (
                      <div
                        key={index}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 shadow-2xs space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <span>Tukar dengan:</span>
                              <span className="text-indigo-700">{swap.course2.code} - {swap.course2.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Saat ini di: {swap.timeslot2.day} ({swap.timeslot2.label}) - {swap.room2.code}
                            </div>
                            <div className="text-[11px] text-emerald-700">
                              {swap.reasons.join(' • ')}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {swap.conflictDiff > 0 && (
                              <Badge variant="success" size="sm">
                                -{swap.conflictDiff} Konflik
                              </Badge>
                            )}
                            <button
                              onClick={() => handleApplySwap(swap)}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                            >
                              Terapkan Swap
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Manual Selection with Live Preview */}
            {dialogTab === 'manual' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Slot Waktu Tujuan:
                    </label>
                    <select
                      value={manualTargetTimeslotId}
                      onChange={e => setManualTargetTimeslotId(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {timeslots
                        .filter(t => t.isActive)
                        .map(ts => (
                          <option key={ts.id} value={ts.id}>
                            {ts.day} • {ts.label} (Slot #{ts.slotIndex})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Ruangan Tujuan:
                    </label>
                    <select
                      value={manualTargetRoomId}
                      onChange={e => setManualTargetRoomId(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                    >
                      {rooms
                        .filter(r => r.isActive)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            {r.code} - {r.name} (Kap: {r.capacity})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Live Preview Result of Manual Selection */}
                {manualMoveEvaluation && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Pratinjau Hasil Pemindahan:
                      </span>
                      {manualMoveEvaluation.isValidWithoutHardConflict ? (
                        <Badge variant="success" size="sm">
                          Valid (Bebas Hard Conflict)
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          Berpotensi Bentrok (Hard Conflict)
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px]">
                      {manualMoveEvaluation.reasons.map((r, i) => (
                        <div
                          key={i}
                          className={r.startsWith('⚠') ? 'text-rose-700 font-medium' : 'text-emerald-700'}
                        >
                          {r}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                      <span>Total konflik setelah dipindah:</span>
                      <span className="font-bold">{manualMoveEvaluation.simulatedTotalConflicts} konflik</span>
                    </div>
                  </div>
                )}

                {/* Warning Confirm Dialog if hard conflict */}
                {showHardConflictWarningConfirm && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Konfirmasi Penyimpanan Jadwal Bentrok</span>
                    </div>
                    <p className="text-xs text-rose-800">
                      Pemindahan ini melanggar hard constraint (dosen/ruangan/kelas bentrok). Apakah Anda yakin ingin tetap menyimpan dengan status <strong>BENTROK</strong>?
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowHardConflictWarningConfirm(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyManualMove(true)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
                      >
                        Ya, Simpan Jadwal Bentrok
                      </button>
                    </div>
                  </div>
                )}

                {!showHardConflictWarningConfirm && (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAssignment(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyManualMove(false)}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                    >
                      Terapkan Pemindahan Manual
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* CHANGE HISTORY MODAL */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Riwayat Perubahan & Penyesuaian Jadwal"
        subtitle="Log perubahan manual, rekomendasi sistem, dan optimasi Simulated Annealing"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {changeLogs.length} penyesuaian terakhir
            </span>
            {changeLogs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Bersihkan seluruh catatan riwayat perubahan?')) {
                    onClearLogs();
                    showToast('info', 'Riwayat Dibersihkan', 'Catatan log perubahan telah dikosongkan.');
                  }
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800"
              >
                Hapus Semua Log
              </button>
            )}
          </div>

          {changeLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">Belum ada riwayat perubahan jadwal</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Setiap kali Anda memindahkan slot atau menerapkan rekomendasi, sistem akan mencatat jejak auditnya di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
              {changeLogs.map((log, i) => (
                <div key={log.id || i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{log.courseCode} - {log.courseName}</span>
                    <Badge variant={log.method === 'Simulated Annealing' ? 'indigo' : 'neutral'} size="sm">
                      {log.method}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Dosen: {log.lecturerName} • Rombel: {log.className}
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-[11px]">
                    <div className="text-slate-500">
                      {log.before.day} ({log.before.timeslotLabel}) - {log.before.roomCode}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                    <div className="font-bold text-indigo-700">
                      {log.after.day} ({log.after.timeslotLabel}) - {log.after.roomCode}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                    <span>{log.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
