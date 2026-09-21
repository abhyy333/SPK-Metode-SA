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
  UserCheck,
  UserX,
  Edit,
  Sliders,
  Check,
  Zap,
  BookOpen,
  HelpCircle,
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
  CourseOffering,
  KBK,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { StorageService } from '../services/storageService';
import { getSessionShortLabel, calculateCourseTiming } from '../utils/sessionUtils';
import {
  getScheduleRecommendations,
  getSwapRecommendations,
  evaluateMove,
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
  onUpdateAssignmentLecturers?: (assignmentId: string, lecturerIds: string[]) => void;
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
  onUpdateAssignmentLecturers,
}) => {
  const { showToast } = useToast();

  // Search and Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('all');
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
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
  const [isEditingLecturerInModal, setIsEditingLecturerInModal] = useState<boolean>(false);

  // Lecturer Change State
  const [isLecturerModalOpen, setIsLecturerModalOpen] = useState<boolean>(false);
  const [lecturerTargetAssignment, setLecturerTargetAssignment] = useState<ScheduleAssignment | null>(null);
  const [selectedLecturerIds, setSelectedLecturerIds] = useState<string[]>([]);
  const [lecturerSearchQuery, setLecturerSearchQuery] = useState<string>('');
  const [allowLecturerCollision, setAllowLecturerCollision] = useState<boolean>(false);

  // Manual move selection state inside modal
  const [manualTargetTimeslotId, setManualTargetTimeslotId] = useState<string>('');
  const [manualTargetRoomId, setManualTargetRoomId] = useState<string>('');
  const [showHardConflictWarningConfirm, setShowHardConflictWarningConfirm] = useState<boolean>(false);

  // Course offerings for metadata lookup (semester, curriculum, KBK, etc.)
  const offerings = useMemo(() => StorageService.getCourseOfferings(), []);
  const offeringMap = useMemo(() => new Map<string, CourseOffering>(offerings.map((o) => [o.id, o])), [offerings]);

  // Maps for quick lookup
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>(courses.map((c) => [c.id, c]));
    courses.forEach((c) => {
      if (c.code) map.set(c.code, c);
    });
    return map;
  }, [courses]);

  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map((l) => [l.id, l])), [lecturers]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map((cl) => [cl.id, cl])), [classes]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map((t) => [t.id, t])), [timeslots]);

  // Conflict indexing
  const { hardConflictingIds, softConflictingIds, conflictItemMap } = useMemo(() => {
    const hard = new Set<string>();
    const soft = new Set<string>();
    const descMap = new Map<string, ConflictItem[]>();

    conflicts.forEach((c) => {
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

  // Helper to get all assigned lecturers
  const getAssignedLecturers = (assignment: ScheduleAssignment): Lecturer[] => {
    const ids = assignment.lecturerIds && assignment.lecturerIds.length > 0
      ? assignment.lecturerIds
      : assignment.lecturerId ? [assignment.lecturerId] : [];

    return ids.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];
  };

  // Helper to get Course Offering metadata
  const getAssignmentOfferingMeta = (assignment: ScheduleAssignment) => {
    const off = assignment.courseOfferingId ? offeringMap.get(assignment.courseOfferingId) : null;
    const course = courseMap.get(assignment.courseId);

    const semester = off?.semester || course?.semester || 1;
    const curriculumYear = off?.curriculumYear || course?.curriculumYear || 2026;
    const kbkId = off?.kbkId || (course?.kbkIds && course.kbkIds.length > 0 ? course.kbkIds[0] : null);
    const section = off?.sectionName || (off?.code?.includes('-') ? off.code.split('-').pop() : 'A');
    const studentCount = off?.studentCount || off?.enrolledCount || 35;
    const sks = Math.max(1, Math.round(assignment.sks || off?.sks || course?.sks || course?.credits || 2));
    const slot = timeslotMap.get(assignment.timeslotId);
    const timing = calculateCourseTiming(slot, sks, timeslots);

    return {
      semester,
      curriculumYear,
      kbkId,
      section,
      studentCount,
      sks,
      timing,
      isPracticum: off?.isPracticum || course?.type === 'Praktikum',
    };
  };

  // Filtered schedule
  const filteredAssignments = useMemo(() => {
    if (!currentSchedule) return [];

    return currentSchedule.filter((a) => {
      const course = courseMap.get(a.courseId);
      const room = roomMap.get(a.roomId);
      const cls = classMap.get(a.classId);
      const assignedLecs = getAssignedLecturers(a);
      const meta = getAssignmentOfferingMeta(a);

      if (!course) return false;

      // Exclude practicum from main timetable display
      if (meta.isPracticum) return false;

      // Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchCode = (course.code || '').toLowerCase().includes(q);
        const matchName = (course.name || '').toLowerCase().includes(q);
        const matchLec = assignedLecs.some((l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
        const matchRoom = (room?.code || '').toLowerCase().includes(q) || (room?.name || '').toLowerCase().includes(q);
        const matchCls = (cls?.code || '').toLowerCase().includes(q);

        if (!matchCode && !matchName && !matchLec && !matchRoom && !matchCls) {
          return false;
        }
      }

      // Dropdown filters
      if (selectedSemester !== 'all' && meta.semester.toString() !== selectedSemester) return false;
      if (selectedCurriculum !== 'all' && meta.curriculumYear.toString() !== selectedCurriculum) return false;

      if (selectedKbk !== 'all') {
        if (selectedKbk === 'common' && meta.kbkId) return false;
        if (selectedKbk !== 'common' && meta.kbkId !== selectedKbk) return false;
      }

      if (selectedClassId !== 'all' && a.classId !== selectedClassId) return false;
      if (selectedLecturerId !== 'all' && !assignedLecs.some((l) => l.id === selectedLecturerId)) return false;
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
    selectedCurriculum,
    selectedKbk,
    selectedClassId,
    selectedLecturerId,
    selectedRoomId,
    selectedConflictFilter,
    courseMap,
    lecturerMap,
    roomMap,
    classMap,
    offeringMap,
    hardConflictingIds,
    softConflictingIds,
  ]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const total = currentSchedule?.length || 0;
    let bentrokCount = 0;
    let perhatianCount = 0;
    let amanCount = 0;

    (currentSchedule || []).forEach((a) => {
      const status = getAssignmentStatus(a.id);
      if (status === 'bentrok') bentrokCount++;
      else if (status === 'perhatian') perhatianCount++;
      else amanCount++;
    });

    return { total, bentrokCount, perhatianCount, amanCount };
  }, [currentSchedule, hardConflictingIds, softConflictingIds]);

  // Active Days and Timeslots
  const activeDays = useMemo(() => {
    return ALL_DAYS.filter((day) => timeslots.some((t) => t.day === day && t.isActive));
  }, [timeslots]);

  // Handle open assignment dialog
  const handleOpenAssignment = (
    assignment: ScheduleAssignment,
    tab: 'detail' | 'recommendations' | 'manual' | 'swap' = 'detail'
  ) => {
    setSelectedAssignment(assignment);
    setDialogTab(tab);
    setManualTargetTimeslotId(assignment.timeslotId);
    setManualTargetRoomId(assignment.roomId);
    setShowHardConflictWarningConfirm(false);
    setIsEditingLecturerInModal(false);

    // Initialize lecturer selection for this assignment
    const initialLecIds = assignment.lecturerIds && assignment.lecturerIds.length > 0
      ? [...assignment.lecturerIds]
      : assignment.lecturerId ? [assignment.lecturerId] : [];
    setSelectedLecturerIds(initialLecIds);
    setLecturerSearchQuery('');
    setAllowLecturerCollision(false);
  };

  // Open Lecturer Change Dialog (direct modal fallback if needed)
  const handleOpenLecturerModal = (e: React.MouseEvent, assignment: ScheduleAssignment) => {
    e.stopPropagation();
    setLecturerTargetAssignment(assignment);
    const initialLecIds = assignment.lecturerIds && assignment.lecturerIds.length > 0
      ? [...assignment.lecturerIds]
      : assignment.lecturerId ? [assignment.lecturerId] : [];

    setSelectedLecturerIds(initialLecIds);
    setLecturerSearchQuery('');
    setAllowLecturerCollision(false);
    setIsLecturerModalOpen(true);
  };

  const toggleSelectedLecturer = (lecId: string) => {
    setSelectedLecturerIds((prev) =>
      prev.includes(lecId) ? prev.filter((id) => id !== lecId) : [...prev, lecId]
    );
  };

  // Check lecturer collisions at target timeslot
  const lecturerCollisions = useMemo(() => {
    const target = selectedAssignment || lecturerTargetAssignment;
    if (!target || !currentSchedule || selectedLecturerIds.length === 0) return [];

    const collisions: { lecturer: Lecturer; conflictingCourse: Course; conflictingTimeslot: Timeslot; conflictingRoom: Room }[] = [];

    const otherAssignments = currentSchedule.filter(
      (a) => a.timeslotId === target.timeslotId && a.id !== target.id
    );

    selectedLecturerIds.forEach((lecId) => {
      const clash = otherAssignments.find((a) => {
        const ids = a.lecturerIds && a.lecturerIds.length > 0
          ? a.lecturerIds
          : a.lecturerId ? [a.lecturerId] : [];
        return ids.includes(lecId);
      });

      if (clash) {
        const lec = lecturerMap.get(lecId);
        const course = courseMap.get(clash.courseId);
        const slot = timeslotMap.get(clash.timeslotId);
        const room = roomMap.get(clash.roomId);

        if (lec && course && slot && room) {
          collisions.push({
            lecturer: lec,
            conflictingCourse: course,
            conflictingTimeslot: slot,
            conflictingRoom: room,
          });
        }
      }
    });

    return collisions;
  }, [selectedAssignment, lecturerTargetAssignment, currentSchedule, selectedLecturerIds, lecturerMap, courseMap, timeslotMap, roomMap]);

  // Save lecturer assignment
  const handleSaveLecturer = (targetAssignment?: ScheduleAssignment) => {
    const target = targetAssignment || selectedAssignment || lecturerTargetAssignment;
    if (!target) return;

    if (lecturerCollisions.length > 0 && !allowLecturerCollision) {
      showToast(
        'warning',
        'Peringatan Bentrok Dosen',
        'Dosen yang dipilih sedang mengajar pada slot waktu yang sama. Centang izin bentrok atau pilih dosen lain.'
      );
      return;
    }

    const primaryLec = selectedLecturerIds[0] || null;
    const updatedAssignment: ScheduleAssignment = {
      ...target,
      lecturerIds: selectedLecturerIds,
      lecturerId: primaryLec || undefined,
    };

    if (onUpdateAssignmentLecturers) {
      onUpdateAssignmentLecturers(target.id, selectedLecturerIds);
    } else {
      // Fallback update in storage
      if (currentSchedule) {
        const updated = currentSchedule.map((a) =>
          a.id === target.id
            ? updatedAssignment
            : a
        );
        StorageService.saveCurrentSchedule(updated);
      }
    }

    // Also update CourseOfferings in storage if applicable
    if (target.courseOfferingId) {
      const storedOfferings = StorageService.getCourseOfferings();
      const updatedOfferings = storedOfferings.map((off) =>
        off.id === target.courseOfferingId
          ? { ...off, lecturerIds: selectedLecturerIds, lecturerId: primaryLec || undefined }
          : off
      );
      StorageService.saveCourseOfferings(updatedOfferings);
    }

    if (selectedAssignment && selectedAssignment.id === target.id) {
      setSelectedAssignment(updatedAssignment);
    }

    const course = courseMap.get(target.courseId);
    showToast(
      'success',
      'Dosen Pengampu Diperbarui',
      `Penugasan dosen untuk ${course?.name || course?.code || target.courseId} berhasil disimpan.`
    );

    setIsLecturerModalOpen(false);
    setIsEditingLecturerInModal(false);
  };

  // Switch from collision warning to recommendation engine
  const handleSwitchToRecommendationFromCollision = () => {
    if (!lecturerTargetAssignment) return;
    setIsLecturerModalOpen(false);
    handleOpenAssignment(lecturerTargetAssignment, 'recommendations');
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

    const headers = [
      'Hari',
      'Waktu',
      'Semester',
      'Kurikulum',
      'KBK',
      'Kode MK',
      'Nama Mata Kuliah',
      'SKS',
      'Kelas',
      'Dosen Pengampu',
      'Ruangan',
      'Status',
    ];
    const rows = filteredAssignments.map((a) => {
      const course = courseMap.get(a.courseId);
      const room = roomMap.get(a.roomId);
      const slot = timeslotMap.get(a.timeslotId);
      const cls = classMap.get(a.classId);
      const assignedLecs = getAssignedLecturers(a);
      const meta = getAssignmentOfferingMeta(a);
      const status = getAssignmentStatus(a.id).toUpperCase();

      return [
        slot?.day || '',
        slot?.label || '',
        `S${meta.semester}`,
        `Kur.${meta.curriculumYear}`,
        meta.kbkId ? (meta.kbkId === 'kbk-stl' ? 'STL' : meta.kbkId === 'kbk-komputer' ? 'KOM' : 'ELKOM') : 'Umum',
        course?.code || '',
        `"${course?.name || ''}"`,
        course?.sks || '',
        cls?.code || `Kelas ${meta.section}`,
        `"${assignedLecs.map((l) => l.name).join('; ') || 'Belum Ada Dosen'}"`,
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

  // Excluded practicums list
  const excludedPracticums = useMemo(() => {
    return courses.filter((c) => c.type === 'Praktikum' || (c.name || '').toLowerCase().includes('praktikum'));
  }, [courses]);

  return (
    <div className="space-y-6" id="timetable-page">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Matriks Jadwal Perkuliahan
            </h2>
            <Badge variant="indigo" size="sm">
              {filteredAssignments.length} / {summaryStats.total} Ditampilkan
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Menampilkan seluruh mata kuliah paket wajib (Semester 1–8). Praktikum dialokasikan pada jadwal terpisah laboratorium.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Riwayat Perubahan Jadwal"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Riwayat ({changeLogs.length})</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Ekspor</span> CSV
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Hari
            </button>
            <button
              onClick={() => setViewMode('room')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'room' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Ruangan
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
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
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500">Total Terjadwal</div>
            <div className="text-lg font-bold text-slate-900">{summaryStats.total} Rombel Teori</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500">Status AMAN</div>
            <div className="text-lg font-bold text-emerald-600">{summaryStats.amanCount} Bebas Konflik</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-slate-500">Perlu Perhatian</div>
            <div className="text-lg font-bold text-amber-600">{summaryStats.perhatianCount} Soft Conflict</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
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
        {/* Row 1: Search and Semester Pills */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode MK, nama mata kuliah, dosen pengampu, ruangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0">Semester:</span>
            {(['all', '1', '2', '3', '4', '5', '6', '7', '8'] as const).map((sem) => (
              <button
                key={sem}
                onClick={() => setSelectedSemester(sem)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                  selectedSemester === sem
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {sem === 'all' ? 'Semua' : `S${sem}`}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          {/* Kurikulum */}
          <div>
            <select
              value={selectedCurriculum}
              onChange={(e) => setSelectedCurriculum(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua Kurikulum</option>
              <option value="2026">Kurikulum 2026</option>
              <option value="2022">Kurikulum 2022</option>
            </select>
          </div>

          {/* KBK */}
          <div>
            <select
              value={selectedKbk}
              onChange={(e) => setSelectedKbk(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua KBK</option>
              <option value="common">Paket Umum (S1–S4)</option>
              <option value="kbk-stl">KBK STL</option>
              <option value="kbk-komputer">KBK KOM</option>
              <option value="kbk-elkom">KBK ELKOM</option>
            </select>
          </div>

          {/* Lecturer */}
          <div>
            <select
              value={selectedLecturerId}
              onChange={(e) => setSelectedLecturerId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white truncate"
            >
              <option value="all">Semua Dosen</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} ({r.name})
                </option>
              ))}
            </select>
          </div>

          {/* Class Group */}
          <div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">Semua Rombel</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={selectedConflictFilter}
              onChange={(e) => setSelectedConflictFilter(e.target.value as any)}
              className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold"
            >
              <option value="all">Semua Status</option>
              <option value="bentrok">Bentrok (Hard)</option>
              <option value="perhatian">Perlu Perhatian</option>
              <option value="aman">Aman</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: Matriks Hari (Grid View) */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {activeDays.map((day) => {
            const dayTimeslots = timeslots
              .filter((t) => t.day === day && t.isActive)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const dayAssignments = filteredAssignments.filter((a) => {
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
                  {dayTimeslots.map((ts) => {
                    const slotAssignments = dayAssignments.filter((a) => a.timeslotId === ts.id);
                    const continuingAssignments = dayAssignments.filter((a) => {
                      if (a.timeslotId === ts.id) return false;
                      const meta = getAssignmentOfferingMeta(a);
                      return meta.timing.occupiedSlotIds.includes(ts.id);
                    });

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
                          <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                            {getSessionShortLabel(ts)}
                          </span>
                        </div>

                        {/* Cards in this slot */}
                        <div className="space-y-2 flex-1">
                          {slotAssignments.length === 0 && continuingAssignments.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-slate-400 py-6 border border-dashed border-slate-200 rounded-lg">
                              Kosong (Tersedia)
                            </div>
                          ) : (
                            <>
                              {slotAssignments.map((a) => {
                                const course = courseMap.get(a.courseId);
                                const room = roomMap.get(a.roomId);
                                const cls = classMap.get(a.classId);
                                const status = getAssignmentStatus(a.id);
                                const assignedLecs = getAssignedLecturers(a);
                                const meta = getAssignmentOfferingMeta(a);
                                const specificConflicts = conflictItemMap.get(a.id) || [];

                                return (
                                  <div
                                    key={a.id}
                                    onClick={() => handleOpenAssignment(a, 'detail')}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative group ${
                                      status === 'bentrok'
                                        ? 'bg-rose-50/95 border-rose-300 hover:border-rose-400 shadow-2xs'
                                        : status === 'perhatian'
                                        ? 'bg-amber-50/95 border-amber-300 hover:border-amber-400 shadow-2xs'
                                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                                    }`}
                                  >
                                    {/* Badges Strip: Semester, Kurikulum, KBK, SKS, Status */}
                                    <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                          S{meta.semester}
                                        </span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                          Kur.{meta.curriculumYear}
                                        </span>
                                        {meta.kbkId && (
                                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                            {meta.kbkId === 'kbk-stl' ? 'STL' : meta.kbkId === 'kbk-komputer' ? 'KOM' : 'ELKOM'}
                                          </span>
                                        )}
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                          Kls {meta.section}
                                        </span>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                          {meta.sks} SKS
                                        </span>
                                      </div>

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

                                    {/* Course Name & Code */}
                                    <div className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">
                                      {course?.name || 'Mata Kuliah'}
                                    </div>
                                    <div className="text-[11px] font-mono font-medium text-slate-500 tracking-tight mt-0.5">
                                      {course?.code || a.courseId}
                                    </div>

                                    {/* SKS Duration & Sessions */}
                                    <div className="mt-1.5 text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-150 flex items-center justify-between">
                                      <span className="font-semibold text-slate-800">{meta.timing.sessionRangeLabel}</span>
                                      <span className="font-mono text-indigo-700 font-bold">{meta.timing.timeRangeLabel} ({meta.timing.durationMinutes} mnt)</span>
                                    </div>

                                    {/* Lecturer & Room Details */}
                                    <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                                      <div className="flex items-start gap-1">
                                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                        <div className="text-[11px] leading-tight line-clamp-1">
                                          {assignedLecs.length > 0 ? (
                                            <span className="font-medium text-slate-800">
                                              {assignedLecs.map((l) => l.name).join(', ')}
                                            </span>
                                          ) : (
                                            <span className="text-amber-700 font-semibold italic">
                                              Belum Ada Dosen
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                        <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {meta.studentCount} Mhs
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
                              })}

                              {/* Multi-Session Continuation Cards */}
                              {continuingAssignments.map((a) => {
                                const course = courseMap.get(a.courseId);
                                const room = roomMap.get(a.roomId);
                                const meta = getAssignmentOfferingMeta(a);
                                const status = getAssignmentStatus(a.id);
                                return (
                                  <div
                                    key={`cont-${a.id}-${ts.id}`}
                                    onClick={() => handleOpenAssignment(a, 'detail')}
                                    className={`p-2.5 rounded-xl border border-dashed transition-all cursor-pointer text-left ${
                                      status === 'bentrok'
                                        ? 'bg-rose-50/80 border-rose-300 hover:border-rose-400'
                                        : 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-100/60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                      <span className="font-semibold text-indigo-950 truncate">
                                        ↳ Lanjutan: {course?.name}
                                      </span>
                                      <span className="font-bold text-indigo-700 shrink-0">
                                        {meta.sks} SKS
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                                      <span>Mulai: {meta.timing.sessionRangeLabel}</span>
                                      <span className="font-mono font-bold text-slate-700 bg-white/80 px-1 py-0.5 rounded border border-slate-200">
                                        {room?.code}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </>
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
                {activeDays.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDayForRoomView(day)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
                    .filter((t) => t.day === selectedDayForRoomView && t.isActive)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((ts) => (
                      <th key={ts.id} className="p-3.5 text-center font-mono font-semibold">
                        <div>{ts.label}</div>
                        <div className="text-[10px] text-indigo-600 font-semibold">{getSessionShortLabel(ts)}</div>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {rooms
                  .filter((r) => (selectedRoomId === 'all' ? r.isActive : r.id === selectedRoomId))
                  .map((room) => (
                    <tr key={room.id} className="hover:bg-slate-50/50">
                      <td className="p-3.5 bg-slate-50/30">
                        <div className="font-bold text-slate-900">{room.code}</div>
                        <div className="text-[11px] text-slate-500">{room.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Kap: {room.capacity} ({room.type})</div>
                      </td>

                      {timeslots
                        .filter((t) => t.day === selectedDayForRoomView && t.isActive)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((ts) => {
                          const primaryAssignment = filteredAssignments.find(
                            (a) => a.roomId === room.id && a.timeslotId === ts.id
                          );
                          const continuingAssignment = !primaryAssignment ? filteredAssignments.find(
                            (a) => {
                              if (a.roomId !== room.id) return false;
                              const meta = getAssignmentOfferingMeta(a);
                              return meta.timing.occupiedSlotIds.includes(ts.id);
                            }
                          ) : null;

                          if (!primaryAssignment && !continuingAssignment) {
                            return (
                              <td key={ts.id} className="p-2 text-center text-slate-300 font-light">
                                -
                              </td>
                            );
                          }

                          if (continuingAssignment) {
                            const course = courseMap.get(continuingAssignment.courseId);
                            const meta = getAssignmentOfferingMeta(continuingAssignment);
                            const status = getAssignmentStatus(continuingAssignment.id);
                            return (
                              <td key={ts.id} className="p-2">
                                <div
                                  onClick={() => handleOpenAssignment(continuingAssignment, 'detail')}
                                  className={`p-2 rounded-xl border border-dashed cursor-pointer transition-all ${
                                    status === 'bentrok'
                                      ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                                      : 'bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100/70 text-indigo-950'
                                  }`}
                                >
                                  <div className="text-[10px] font-bold text-indigo-900 line-clamp-1">
                                    ↳ Lanjutan: {course?.name}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                    {meta.sks} SKS ({meta.timing.sessionRangeLabel})
                                  </div>
                                </div>
                              </td>
                            );
                          }

                          const course = courseMap.get(primaryAssignment.courseId);
                          const assignedLecs = getAssignedLecturers(primaryAssignment);
                          const meta = getAssignmentOfferingMeta(primaryAssignment);
                          const status = getAssignmentStatus(primaryAssignment.id);

                          return (
                            <td key={ts.id} className="p-2">
                              <div
                                onClick={() => handleOpenAssignment(primaryAssignment, 'detail')}
                                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                                  status === 'bentrok'
                                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                                    : status === 'perhatian'
                                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                                    : 'bg-white border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold text-[11px] text-slate-900 line-clamp-1 leading-tight">
                                      {course?.name || primaryAssignment.courseId}
                                    </div>
                                    <div className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">
                                      {course?.code}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <span className="text-[9px] font-bold px-1 rounded bg-indigo-100 text-indigo-800">
                                      S{meta.semester}
                                    </span>
                                    <span className="text-[9px] font-bold px-1 rounded bg-emerald-100 text-emerald-800">
                                      {meta.sks} SKS
                                    </span>
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-700 line-clamp-1 font-medium mt-1">
                                  Kelas {meta.section} • {assignedLecs.map((l) => l.name).join(', ') || 'Belum Ada Dosen'}
                                </div>
                                <div className="text-[9px] text-indigo-600 font-medium mt-0.5 font-mono">
                                  {meta.timing.sessionRangeLabel} ({meta.timing.timeRangeLabel})
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
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="px-4 py-3">Hari &amp; Waktu</th>
                  <th className="px-4 py-3">Semester &amp; Jalur</th>
                  <th className="px-4 py-3">Mata Kuliah &amp; Kelas</th>
                  <th className="px-3 py-3">Dosen Pengampu</th>
                  <th className="px-3 py-3">Ruangan</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.map((assign) => {
                  const course = courseMap.get(assign.courseId);
                  const room = roomMap.get(assign.roomId);
                  const slot = timeslotMap.get(assign.timeslotId);
                  const status = getAssignmentStatus(assign.id);
                  const assignedLecs = getAssignedLecturers(assign);
                  const meta = getAssignmentOfferingMeta(assign);

                  return (
                    <tr key={assign.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        {slot ? (
                          <div>
                            <div className="font-bold text-slate-900">{slot.day}, {slot.startTime} - {meta.timing.endTime}</div>
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5">{meta.timing.sessionRangeLabel} • {meta.sks} SKS ({meta.timing.durationMinutes} mnt)</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                            S{meta.semester}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            Kur. {meta.curriculumYear}
                          </span>
                          {meta.kbkId && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                              {meta.kbkId === 'kbk-stl' ? 'STL' : meta.kbkId === 'kbk-komputer' ? 'KOM' : 'ELKOM'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs">{course?.name}</div>
                        <div className="text-[11px] font-mono font-medium text-slate-500 mt-0.5">{course?.code}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Kelas {meta.section} • {course?.sks} SKS • {meta.studentCount} Mahasiswa
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-800">
                        {assignedLecs.length > 0 ? (
                          <div className="font-medium text-slate-900">
                            {assignedLecs.map((l) => l.name).join(', ')}
                          </div>
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
                            BENTROK
                          </Badge>
                        ) : status === 'perhatian' ? (
                          <Badge variant="warning" size="sm">
                            Perhatian
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            AMAN
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAssignment(assign, 'detail')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Detail &amp; Aksi
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

      {/* EXCLUDED PRACTICUM NOTICE & ACCORDION */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 text-amber-950 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-700" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Praktikum — Jadwal Terpisah (Laboratorium)</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Sesuai regulasi akademik Teknik Elektro UNRAM, mata kuliah praktikum dikelola di luar jadwal perkuliahan kelas teori.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            {excludedPracticums.length} Praktikum Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
          {excludedPracticums.map((p) => (
            <div key={p.id} className="bg-white/80 p-3 rounded-xl border border-amber-200/70 text-xs flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">{p.name}</div>
                <div className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">{p.code}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Semester {p.semester} • {p.sks} SKS • Kur. {p.curriculumYear}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Lab Jadwal Khusus
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* GANTI DOSEN MODAL WITH REALTIME COLLISION DETECTION */}
      {lecturerTargetAssignment && (
        <Modal
          isOpen={isLecturerModalOpen}
          onClose={() => setIsLecturerModalOpen(false)}
          title={`Ganti Dosen Pengampu — ${courseMap.get(lecturerTargetAssignment.courseId)?.code || ''}`}
          subtitle={`Waktu: ${timeslotMap.get(lecturerTargetAssignment.timeslotId)?.day || '-'}, ${timeslotMap.get(lecturerTargetAssignment.timeslotId)?.label || '-'} (${roomMap.get(lecturerTargetAssignment.roomId)?.code || 'N/A'})`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs" id="ganti-dosen-modal">
            {/* Lecturer Collision Alert Banner */}
            {lecturerCollisions.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Peringatan Bentrokan Jadwal Dosen (Collision Detected):</span>
                </div>
                <div className="space-y-1.5">
                  {lecturerCollisions.map((c, i) => (
                    <div key={i} className="bg-white/80 p-2 rounded-lg border border-rose-200 text-[11px]">
                      <span className="font-bold text-rose-900">{c.lecturer?.name || 'Dosen'}</span> sedang memiliki jadwal mengajar lain pada waktu yang sama:{' '}
                      <span className="font-semibold text-slate-800">
                        {c.conflictingCourse?.code || ''} — {c.conflictingCourse?.name || ''} ({c.conflictingRoom?.code || '-'})
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowLecturerCollision}
                      onChange={(e) => setAllowLecturerCollision(e.target.checked)}
                      className="w-3.5 h-3.5 text-rose-600 rounded"
                    />
                    <span>Tetap gunakan (izinkan potensi bentrok)</span>
                  </label>

                  <button
                    onClick={handleSwitchToRecommendationFromCollision}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Cari Sesi Waktu Alternatif (SPK)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Lecturer Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari dosen berdasarkan nama atau kode (e.g. SNR, Arya)..."
                value={lecturerSearchQuery}
                onChange={(e) => setLecturerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Lecturer List */}
            <div className="border border-slate-200 rounded-xl p-2 max-h-60 overflow-y-auto space-y-1">
              {lecturers
                .filter((l) => {
                  if (!lecturerSearchQuery) return true;
                  const q = lecturerSearchQuery.toLowerCase();
                  return (
                    (l.name || '').toLowerCase().includes(q) ||
                    (l.code || '').toLowerCase().includes(q) ||
                    (l.nip || '').includes(q)
                  );
                })
                .map((lec) => {
                  const isSelected = selectedLecturerIds.includes(lec.id);
                  return (
                    <button
                      key={lec.id}
                      onClick={() => toggleSelectedLecturer(lec.id)}
                      className={`w-full p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-xs ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div>
                          <div className="font-semibold">{lec.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Kode: {lec.code || '-'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">{lec.expertise || ''}</span>
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedLecturerIds([])}
                className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
              >
                Kosongkan Dosen
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLecturerModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleSaveLecturer()}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Dosen
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* COMPREHENSIVE ACTION & DECISION SUPPORT MODAL */}
      <Modal
        isOpen={Boolean(selectedAssignment)}
        onClose={() => {
          setSelectedAssignment(null);
          setIsEditingLecturerInModal(false);
        }}
        title={
          selectedAssignment
            ? `${courseMap.get(selectedAssignment.courseId)?.name || 'Mata Kuliah'} (${courseMap.get(selectedAssignment.courseId)?.code || selectedAssignment.courseId})`
            : 'Detail Jadwal'
        }
        subtitle={
          selectedAssignment
            ? `Semester ${getAssignmentOfferingMeta(selectedAssignment).semester} • Kurikulum ${getAssignmentOfferingMeta(selectedAssignment).curriculumYear} • Kelas ${getAssignmentOfferingMeta(selectedAssignment).section} (${getAssignmentOfferingMeta(selectedAssignment).studentCount} Mahasiswa)`
            : 'Keputusan Penjadwalan, Analisis Konflik, dan Rekomendasi Optimalisasi'
        }
        maxWidth="2xl"
      >
        {selectedAssignment && (
          <div className="space-y-4">
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setDialogTab('detail')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dialogTab === 'detail'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Informasi &amp; Dosen
              </button>
              <button
                onClick={() => setDialogTab('recommendations')}
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
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
                className={`px-4 py-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
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
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  dialogTab === 'manual'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Pindah Manual
              </button>
            </div>

            {/* TAB 1: Detail & Conflicts & Lecturer Management */}
            {dialogTab === 'detail' && (
              <div className="space-y-4 pt-1">
                {/* Current Placement Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Hari &amp; Jam:</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {timeslotMap.get(selectedAssignment.timeslotId)?.day || '-'},{' '}
                      {timeslotMap.get(selectedAssignment.timeslotId)?.label || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Ruangan:</span>
                    <div className="text-xs font-bold text-indigo-700 mt-0.5">
                      {roomMap.get(selectedAssignment.roomId)?.code || '-'} (Kap:{' '}
                      {roomMap.get(selectedAssignment.roomId)?.capacity || '-'})
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Kelas &amp; SKS:</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      Kelas {getAssignmentOfferingMeta(selectedAssignment).section} • {courseMap.get(selectedAssignment.courseId)?.sks || 0} SKS
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Jumlah Mahasiswa:</span>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {getAssignmentOfferingMeta(selectedAssignment).studentCount} Mhs
                    </div>
                  </div>
                </div>

                {/* INTEGRATED LECTURER MANAGEMENT SECTION */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">Dosen Pengampu Mata Kuliah</span>
                    </div>
                    {!isEditingLecturerInModal && (
                      <button
                        onClick={() => {
                          const currentIds = selectedAssignment.lecturerIds && selectedAssignment.lecturerIds.length > 0
                            ? [...selectedAssignment.lecturerIds]
                            : selectedAssignment.lecturerId ? [selectedAssignment.lecturerId] : [];
                          setSelectedLecturerIds(currentIds);
                          setLecturerSearchQuery('');
                          setAllowLecturerCollision(false);
                          setIsEditingLecturerInModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{getAssignedLecturers(selectedAssignment).length > 0 ? 'Ganti Dosen' : 'Pilih Dosen'}</span>
                      </button>
                    )}
                  </div>

                  {!isEditingLecturerInModal ? (
                    <div>
                      {getAssignedLecturers(selectedAssignment).length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {getAssignedLecturers(selectedAssignment).map((lec) => (
                            <div
                              key={lec.id}
                              className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 flex items-center gap-2"
                            >
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>{lec.name}</span>
                              {lec.code && (
                                <span className="text-[10px] text-slate-500 font-mono">({lec.code})</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                          <span className="italic font-medium">Belum ada dosen pengampu yang ditugaskan untuk kelas ini.</span>
                          <button
                            onClick={() => {
                              setSelectedLecturerIds([]);
                              setLecturerSearchQuery('');
                              setAllowLecturerCollision(false);
                              setIsEditingLecturerInModal(true);
                            }}
                            className="text-xs font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                          >
                            Tugaskan Sekarang
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* In-Modal Lecturer Selection Form */
                    <div className="space-y-3 pt-1 border-t border-slate-100">
                      {/* Collision Alert Banner */}
                      {lecturerCollisions.length > 0 && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Peringatan Bentrokan Jadwal Dosen (Collision Detected):</span>
                          </div>
                          <div className="space-y-1">
                            {lecturerCollisions.map((c, i) => (
                              <div key={i} className="bg-white/80 p-2 rounded-lg border border-rose-200 text-[11px]">
                                <span className="font-bold text-rose-900">{c.lecturer?.name || 'Dosen'}</span> sedang mengajar pada waktu yang sama:{' '}
                                <span className="font-semibold text-slate-800">
                                  {c.conflictingCourse?.name || c.conflictingCourse?.code} ({c.conflictingRoom?.code || '-'})
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-900">
                              <input
                                type="checkbox"
                                checked={allowLecturerCollision}
                                onChange={(e) => setAllowLecturerCollision(e.target.checked)}
                                className="w-3.5 h-3.5 text-rose-600 rounded"
                              />
                              <span>Izinkan tetap simpan (abaikan bentrok pengajar)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setDialogTab('recommendations')}
                              className="text-xs text-indigo-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Pindah Sesi Bebas Bentrok
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Search box */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={lecturerSearchQuery}
                          onChange={(e) => setLecturerSearchQuery(e.target.value)}
                          placeholder="Cari nama atau kode dosen pengampu..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      {/* Lecturers checkable list */}
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                        {lecturers
                          .filter((l) =>
                            l.name.toLowerCase().includes(lecturerSearchQuery.toLowerCase()) ||
                            (l.code && l.code.toLowerCase().includes(lecturerSearchQuery.toLowerCase()))
                          )
                          .map((lec) => {
                            const isSelected = selectedLecturerIds.includes(lec.id);
                            return (
                              <button
                                key={lec.id}
                                type="button"
                                onClick={() => toggleSelectedLecturer(lec.id)}
                                className={`w-full p-2 rounded-lg text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                                    : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    className="w-3.5 h-3.5 text-indigo-600 rounded pointer-events-none"
                                  />
                                  <span>{lec.name}</span>
                                </div>
                                <span className="text-[10px] text-slate-500">{lec.expertise || ''}</span>
                              </button>
                            );
                          })}
                      </div>

                      {/* In-Modal Lecturer Edit Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedLecturerIds([])}
                          className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                        >
                          Kosongkan Dosen
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingLecturerInModal(false)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveLecturer(selectedAssignment)}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                          >
                            Simpan Dosen
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.isHardConstraint ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                            }`}
                          >
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
                      <div className="text-xs font-bold">Penjadwalan Valid &amp; Optimal (Bebas Konflik)</div>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Alokasi dosen, ruangan, kapasitas kelas, dan preferensi waktu telah memenuhi seluruh batasan SPK.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setDialogTab('recommendations')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lihat Rekomendasi Sesi Terbaik</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SPK Recommendations */}
            {dialogTab === 'recommendations' && (
              <div className="space-y-3 pt-1">
                <div className="text-xs text-slate-600">
                  Sistem mengevaluasi seluruh kombinasi sesi dan ruangan yang memenuhi kriteria tanpa menimbulkan konflik bentrok baru:
                </div>

                {moveRecommendations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-semibold">Tidak ditemukan alternatif sesi yang lebih baik.</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Coba opsi &apos;Tukar Jadwal (Swap)&apos; atau pindahkan manual ke sesi lain.
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
                                {rec.timeslot?.day || '-'} • {rec.timeslot?.label || '-'}
                              </span>
                              <span className="text-xs font-mono font-semibold text-indigo-700">
                                Ruang {rec.room?.code || '-'}
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
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              Terapkan Sesi Ini
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
                  Sistem mendeteksi kemungkinan pertukaran jadwal (slot &amp; ruangan) dengan mata kuliah lain untuk mengurangi bentrokan:
                </div>

                {swapRecommendations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-semibold">Tidak ada skenario pertukaran yang menghasilkan penalti lebih rendah.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {swapRecommendations.map((swap, index) => (
                      <div
                        key={index}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 shadow-2xs transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">
                                Pertukaran #{index + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                Tukar dengan {swap.course2?.code || 'Mata Kuliah'} ({swap.course2?.name || ''})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Jadwal Target: {swap.timeslot2?.day || '-'} ({swap.timeslot2?.label || '-'}) di {swap.room2?.code || '-'}
                            </div>
                            <div className="text-[11px] text-emerald-700 font-medium">
                              {swap.reasons.join(' • ')}
                            </div>
                          </div>

                          <button
                            onClick={() => handleApplySwap(swap)}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                          >
                            Tukar Sekarang
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Manual Placement */}
            {dialogTab === 'manual' && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Hari &amp; Sesi Waktu:
                    </label>
                    <select
                      value={manualTargetTimeslotId}
                      onChange={(e) => setManualTargetTimeslotId(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {timeslots
                        .filter((t) => t.isActive)
                        .map((ts) => (
                          <option key={ts.id} value={ts.id}>
                            {ts.day} • {ts.label} ({getSessionShortLabel(ts)})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Ruangan Kuliah:
                    </label>
                    <select
                      value={manualTargetRoomId}
                      onChange={(e) => setManualTargetRoomId(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {rooms
                        .filter((r) => r.isActive)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.code} ({r.name}) - Kap: {r.capacity}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Live Manual Evaluation Feedback */}
                {manualMoveEvaluation && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${
                      manualMoveEvaluation.isValidWithoutHardConflict
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="font-bold mb-1 flex items-center gap-1.5">
                      {manualMoveEvaluation.isValidWithoutHardConflict ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                      )}
                      <span>
                        {manualMoveEvaluation.isValidWithoutHardConflict
                          ? 'Alokasi Valid: Bebas Bentrokan Hard Constraint'
                          : 'Peringatan: Alokasi Menimbulkan Bentrokan Baru'}
                      </span>
                    </div>
                    <ul className="space-y-1 text-[11px]">
                      {manualMoveEvaluation.reasons.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hard Conflict Force Confirmation */}
                {showHardConflictWarningConfirm && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Konfirmasi Paksa Alokasi dengan Bentrokan</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Sesi atau ruangan yang Anda pilih akan menyebabkan dosen atau ruangan bertabrakan. Tetap ingin memindahkan?
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleApplyManualMove(true)}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
                      >
                        Ya, Tetap Pindahkan
                      </button>
                      <button
                        onClick={() => setShowHardConflictWarningConfirm(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleApplyManualMove(false)}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* HISTORY & AUDIT LOG MODAL */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Riwayat Perubahan &amp; Audit Trail Jadwal"
        subtitle="Merekam setiap pergerakan manual, eksekusi SPK, dan iterasi Simulated Annealing"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Total {changeLogs.length} aktivitas terekam
            </span>
            {changeLogs.length > 0 && (
              <button
                onClick={onClearLogs}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Hapus Riwayat
              </button>
            )}
          </div>

          {changeLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">Belum ada riwayat modifikasi jadwal.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {changeLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span className="font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      {log.method}
                    </span>
                    <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                  </div>

                  <div className="font-bold text-slate-900 mt-1">
                    {log.courseCode} — {log.courseName}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <span className="line-through text-slate-400">
                      {log.before.day} ({log.before.timeslotLabel}) • {log.before.roomCode}
                    </span>
                    <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="font-semibold text-indigo-700">
                      {log.after.day} ({log.after.timeslotLabel}) • {log.after.roomCode}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 italic mt-0.5">
                    Alasan: {log.reason}
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

export default TimetablePage;
