import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  Users,
  Search,
  AlertTriangle,
  Layers,
  Info,
  CheckCircle2,
  ShieldAlert,
  BookOpen,
  X,
  Filter,
  User,
  AlertCircle,
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
  CourseOffering,
} from '../../types';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { StorageService } from '../../services/storageService';
import { calculateCourseTiming } from '../../utils/sessionUtils';
import { formatCourseSectionTitle, extractCleanSectionLetter } from '../../utils/sectionUtils';

export interface ScheduleBlockMatrixProps {
  assignments: ScheduleAssignment[];
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  hardConflictingIds?: Set<string>;
  softConflictingIds?: Set<string>;
  conflictItemMap?: Map<string, ConflictItem[]>;
  onSelectAssignment?: (assignment: ScheduleAssignment) => void;
  readOnly?: boolean;
  userRole?: 'admin' | 'lecturer' | 'student';
  academicYear?: string;
  defaultSemester?: string;
  defaultLecturerId?: string;
  defaultDay?: DayOfWeek | 'all';
  hideFilterToolbar?: boolean;
  onFilterChangeNotification?: (stats: { filteredCount: number; totalCount: number }) => void;
  highlightAssignmentId?: string | null;
  filterOnlyNoLecturer?: boolean;
}

const ALL_ACTIVE_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

// Semester accent colors for subtle visual identity
const SEMESTER_COLOR_MAP: Record<number, { border: string; bg: string; badge: string; text: string }> = {
  1: { border: 'border-l-indigo-600', bg: 'bg-indigo-50/30', badge: 'bg-indigo-100 text-indigo-900', text: 'text-indigo-950' },
  2: { border: 'border-l-sky-600', bg: 'bg-sky-50/30', badge: 'bg-sky-100 text-sky-900', text: 'text-sky-950' },
  3: { border: 'border-l-emerald-600', bg: 'bg-emerald-50/30', badge: 'bg-emerald-100 text-emerald-900', text: 'text-emerald-950' },
  4: { border: 'border-l-teal-600', bg: 'bg-teal-50/30', badge: 'bg-teal-100 text-teal-900', text: 'text-teal-950' },
  5: { border: 'border-l-amber-600', bg: 'bg-amber-50/30', badge: 'bg-amber-100 text-amber-900', text: 'text-amber-950' },
  6: { border: 'border-l-orange-600', bg: 'bg-orange-50/30', badge: 'bg-orange-100 text-orange-900', text: 'text-orange-950' },
  7: { border: 'border-l-purple-600', bg: 'bg-purple-50/30', badge: 'bg-purple-100 text-purple-900', text: 'text-purple-950' },
  8: { border: 'border-l-rose-600', bg: 'bg-rose-50/30', badge: 'bg-rose-100 text-rose-900', text: 'text-rose-950' },
};

interface BlockItem {
  id: string;
  assignment: ScheduleAssignment;
  course: Course;
  formattedCourseTitle: string;
  day: DayOfWeek;
  startSession: number; // 1-indexed (e.g. 1)
  endSession: number;   // 1-indexed inclusive (e.g. 3)
  durationSessions: number; // sks
  startTime: string;
  endTime: string;
  timeRangeLabel: string;
  semester: number;
  semesterLabel: string; // "Sem 1", "Sem 3", etc.
  sks: number;
  section: string;
  sectionLabel: string; // "Kelas A"
  primaryLecturerName: string | null;
  roomCode: string;
  roomName: string;
  studentCount: number;
  studentCountLabel: string; // e.g. "33 Mhs"
  curriculumYear: number;
  kbkLabel?: string;
  status: 'bentrok' | 'perhatian' | 'aman';
  specificConflicts: ConflictItem[];
  lane: number;
  hasOverlap: boolean;
}

export const ScheduleBlockMatrix: React.FC<ScheduleBlockMatrixProps> = ({
  assignments,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  hardConflictingIds = new Set<string>(),
  softConflictingIds = new Set<string>(),
  conflictItemMap = new Map<string, ConflictItem[]>(),
  onSelectAssignment,
  readOnly = false,
  userRole = 'admin',
  academicYear = '2026/2027 Ganjil',
  defaultSemester = 'all',
  defaultLecturerId = 'all',
  defaultDay = 'all',
  hideFilterToolbar = false,
  highlightAssignmentId = null,
  filterOnlyNoLecturer = false,
}) => {
  // Container ref for smooth horizontal scrolling
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Mobile active day tab (Senin - Jumat)
  const [mobileActiveDay, setMobileActiveDay] = useState<DayOfWeek>('Senin');

  // Filter toolbar state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>(defaultSemester);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('all');
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>(defaultDay);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>(defaultLecturerId);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedConflictFilter, setSelectedConflictFilter] = useState<'all' | 'bentrok' | 'perhatian' | 'aman'>('all');

  // Detail Modal for View-Only roles (student / lecturer)
  const [viewOnlyModalItem, setViewOnlyModalItem] = useState<BlockItem | null>(null);

  // Lookups
  const courseMap = useMemo(() => new Map<string, Course>(courses.map((c) => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map((l) => [l.id, l])), [lecturers]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map((cl) => [cl.id, cl])), [classes]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map((t) => [t.id, t])), [timeslots]);
  const offerings = useMemo(() => StorageService.getCourseOfferings(), []);
  const offeringMap = useMemo(() => new Map<string, CourseOffering>(offerings.map((o) => [o.id, o])), [offerings]);

  // Determine active days
  const activeDays = useMemo(() => {
    return ALL_ACTIVE_DAYS.filter((day) => timeslots.some((t) => t.day === day && t.isActive));
  }, [timeslots]);

  // Master sorted list of session rows (Sesi 1, 2, ..., N with full start-end times)
  const sessionRows = useMemo(() => {
    const sessionMap = new Map<number, { sessionNumber: number; startTime: string; endTime: string }>();

    timeslots.filter((t) => t.isActive).forEach((t) => {
      const num = t.sessionNumber || t.slotIndex || 1;
      if (!sessionMap.has(num)) {
        sessionMap.set(num, {
          sessionNumber: num,
          startTime: t.startTime,
          endTime: t.endTime,
        });
      }
    });

    const list = Array.from(sessionMap.values()).sort((a, b) => a.sessionNumber - b.sessionNumber);
    // Fallback to 12 standard periods if timeslots empty
    if (list.length === 0) {
      return [
        { sessionNumber: 1, startTime: '07:50', endTime: '08:40' },
        { sessionNumber: 2, startTime: '08:40', endTime: '09:30' },
        { sessionNumber: 3, startTime: '09:30', endTime: '10:20' },
        { sessionNumber: 4, startTime: '10:20', endTime: '11:10' },
        { sessionNumber: 5, startTime: '11:10', endTime: '12:00' },
        { sessionNumber: 6, startTime: '12:00', endTime: '12:50' },
        { sessionNumber: 7, startTime: '12:50', endTime: '13:40' },
        { sessionNumber: 8, startTime: '13:40', endTime: '14:30' },
        { sessionNumber: 9, startTime: '14:30', endTime: '15:20' },
        { sessionNumber: 10, startTime: '15:20', endTime: '16:10' },
        { sessionNumber: 11, startTime: '16:10', endTime: '17:00' },
        { sessionNumber: 12, startTime: '17:00', endTime: '17:50' },
      ];
    }
    return list;
  }, [timeslots]);

  // Session index lookup: maps sessionNumber (e.g. 1..12) to 0-based row index
  const sessionIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    sessionRows.forEach((row, idx) => {
      map.set(row.sessionNumber, idx);
    });
    return map;
  }, [sessionRows]);

  // Build raw block items from assignments
  const allBlockItems = useMemo<BlockItem[]>(() => {
    return assignments
      .map((a) => {
        const course = courseMap.get(a.courseId);
        if (!course) return null;

        // Skip separate practicum lab courses from main classroom matrix
        if (course.type === 'Praktikum' || (course.name || '').toLowerCase().includes('praktikum')) {
          return null;
        }

        const slot = timeslotMap.get(a.timeslotId);
        if (!slot) return null;

        const off = a.courseOfferingId ? offeringMap.get(a.courseOfferingId) : null;
        const cls = classMap.get(a.classId);
        const rm = roomMap.get(a.roomId);

        // Calculate accurate SKS & duration
        const sks = Math.max(1, Math.round(a.sks || off?.sks || course.sks || course.credits || 2));
        const timing = calculateCourseTiming(slot, sks, timeslots);

        const startSession = slot.sessionNumber || slot.slotIndex || 1;
        const endSession = startSession + sks - 1;

        // Lecturers: only take the primary / first lecturer name
        const lecIds = a.lecturerIds && a.lecturerIds.length > 0 ? a.lecturerIds : a.lecturerId ? [a.lecturerId] : [];
        const assignedLecs = lecIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];
        const primaryLecturerName = assignedLecs.length > 0 ? assignedLecs[0].name : null;

        // Semester: strictly "Sem 1", "Sem 3", etc. NEVER "S1", "S3"
        const semester = off?.semester || course.semester || 1;
        const semesterLabel = `Sem ${semester}`;

        // Section: Clean section letter (A, B, C) and Title (e.g. Probabilitas dan Statistik-A)
        const cleanSection = extractCleanSectionLetter(off?.sectionName, cls?.code, cls?.name, a.classId);
        const section = cleanSection;
        const sectionLabel = `Kelas ${section}`;
        const formattedCourseTitle = formatCourseSectionTitle(course.name, cleanSection, cls?.code, cls?.name, a.classId);

        // Room
        const roomCode = rm?.code || rm?.name || '-';
        const roomName = rm?.name || rm?.code || '-';

        // Student count: strictly capitalized "Mhs"
        const studentCount = off?.studentCount || off?.enrolledCount || cls?.studentCount || 35;
        const studentCountLabel = `${studentCount} Mhs`;

        // Curriculum & KBK
        const curriculumYear = off?.curriculumYear || course.curriculumYear || 2026;
        const kbkId = off?.kbkId || (course.kbkIds && course.kbkIds.length > 0 ? course.kbkIds[0] : null);
        let kbkLabel: string | undefined = undefined;
        if (kbkId) {
          if (kbkId === 'kbk-stl') kbkLabel = 'KBK STL';
          else if (kbkId === 'kbk-komputer') kbkLabel = 'KBK KOM';
          else if (kbkId === 'kbk-elkom' || kbkId.includes('telekomunikasi')) kbkLabel = 'KBK ELKOM';
          else kbkLabel = 'Pilihan';
        }

        // Status: Strictly only "bentrok" if in hardConflictingIds
        let status: 'bentrok' | 'perhatian' | 'aman' = 'aman';
        if (hardConflictingIds.has(a.id)) {
          status = 'bentrok';
        } else if (softConflictingIds.has(a.id)) {
          status = 'perhatian';
        }

        const specificConflicts = conflictItemMap.get(a.id) || [];

        return {
          id: a.id,
          assignment: a,
          course,
          formattedCourseTitle,
          day: slot.day,
          startSession,
          endSession,
          durationSessions: sks,
          startTime: slot.startTime,
          endTime: timing.endTime,
          timeRangeLabel: `${slot.startTime} - ${timing.endTime}`,
          semester,
          semesterLabel,
          sks,
          section,
          sectionLabel,
          primaryLecturerName,
          roomCode,
          roomName,
          studentCount,
          studentCountLabel,
          curriculumYear,
          kbkLabel,
          status,
          specificConflicts,
          lane: 0,
          hasOverlap: false,
        };
      })
      .filter(Boolean) as BlockItem[];
  }, [
    assignments,
    courseMap,
    timeslotMap,
    offeringMap,
    classMap,
    roomMap,
    lecturerMap,
    timeslots,
    hardConflictingIds,
    softConflictingIds,
    conflictItemMap,
  ]);

  // Filter block items based on search and dropdown filters
  const filteredBlockItems = useMemo(() => {
    return allBlockItems.filter((item) => {
      // Filter warning only (no lecturer)
      if (filterOnlyNoLecturer && item.primaryLecturerName) {
        return false;
      }

      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = item.course.name.toLowerCase().includes(q);
        const matchCode = (item.course.code || '').toLowerCase().includes(q);
        const matchLec = (item.primaryLecturerName || '').toLowerCase().includes(q);
        const matchRoom = item.roomCode.toLowerCase().includes(q) || item.roomName.toLowerCase().includes(q);
        const matchClass = item.sectionLabel.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchLec && !matchRoom && !matchClass) {
          return false;
        }
      }

      // Semester
      if (selectedSemester !== 'all' && item.semester.toString() !== selectedSemester) {
        return false;
      }

      // Curriculum
      if (selectedCurriculum !== 'all' && item.curriculumYear.toString() !== selectedCurriculum) {
        return false;
      }

      // KBK
      if (selectedKbk !== 'all') {
        if (selectedKbk === 'common' && item.kbkLabel) return false;
        if (selectedKbk === 'kbk-stl' && item.kbkLabel !== 'KBK STL') return false;
        if (selectedKbk === 'kbk-komputer' && item.kbkLabel !== 'KBK KOM') return false;
        if (selectedKbk === 'kbk-elkom' && item.kbkLabel !== 'KBK ELKOM') return false;
      }

      // Day
      if (selectedDay !== 'all' && item.day !== selectedDay) {
        return false;
      }

      // Lecturer
      if (selectedLecturerId !== 'all') {
        const ids = item.assignment.lecturerIds && item.assignment.lecturerIds.length > 0
          ? item.assignment.lecturerIds
          : item.assignment.lecturerId ? [item.assignment.lecturerId] : [];
        if (!ids.includes(selectedLecturerId)) {
          return false;
        }
      }

      // Room
      if (selectedRoomId !== 'all' && item.assignment.roomId !== selectedRoomId) {
        return false;
      }

      // Class Group
      if (selectedClassId !== 'all' && item.assignment.classId !== selectedClassId) {
        return false;
      }

      // Status
      if (selectedConflictFilter !== 'all' && item.status !== selectedConflictFilter) {
        return false;
      }

      return true;
    });
  }, [
    allBlockItems,
    searchTerm,
    selectedSemester,
    selectedCurriculum,
    selectedKbk,
    selectedDay,
    selectedLecturerId,
    selectedRoomId,
    selectedClassId,
    selectedConflictFilter,
  ]);

  // Organize blocks per day and compute concurrent lanes
  const dayLanesData = useMemo(() => {
    const result = new Map<
      DayOfWeek,
      {
        items: BlockItem[];
        totalLanes: number;
      }
    >();

    activeDays.forEach((day) => {
      const dayItems = filteredBlockItems.filter((b) => b.day === day);

      // Sort by startSession ascending, then sks descending
      dayItems.sort((a, b) => {
        if (a.startSession !== b.startSession) {
          return a.startSession - b.startSession;
        }
        return b.durationSessions - a.durationSessions;
      });

      // Track lane end sessions to assign lanes without collisions
      const laneEndSessions: number[] = [];
      const placedItems: BlockItem[] = [];

      dayItems.forEach((item) => {
        // Find first lane that has ended before or at item.startSession
        let assignedLane = -1;
        for (let l = 0; l < laneEndSessions.length; l++) {
          if (laneEndSessions[l] < item.startSession) {
            assignedLane = l;
            laneEndSessions[l] = item.endSession;
            break;
          }
        }

        if (assignedLane === -1) {
          assignedLane = laneEndSessions.length;
          laneEndSessions.push(item.endSession);
        }

        placedItems.push({
          ...item,
          lane: assignedLane,
        });
      });

      const totalLanes = Math.max(1, laneEndSessions.length);

      // Check whether each item actually overlaps with any other item in this day
      const finalItems = placedItems.map((item) => {
        const hasOverlap = placedItems.some(
          (other) =>
            other.id !== item.id &&
            !(other.endSession < item.startSession || other.startSession > item.endSession)
        );
        return {
          ...item,
          hasOverlap,
        };
      });

      result.set(day, {
        items: finalItems,
        totalLanes,
      });
    });

    return result;
  }, [activeDays, filteredBlockItems]);

  // Dynamic grid template columns: 140px for session column + dynamic width per day based on parallel lanes
  const gridColumnsCSS = useMemo(() => {
    const dayCols = activeDays.map((day) => {
      const lanes = dayLanesData.get(day)?.totalLanes || 1;
      // Minimum 240px per day, or 230px per parallel lane so cards never shrink!
      const widthPx = Math.max(240, lanes * 235);
      return `${widthPx}px`;
    });
    return `140px ${dayCols.join(' ')}`;
  }, [activeDays, dayLanesData]);

  // Overall Statistics
  const stats = useMemo(() => {
    let bentrok = 0;
    let perhatian = 0;
    let aman = 0;
    filteredBlockItems.forEach((b) => {
      if (b.status === 'bentrok') bentrok++;
      else if (b.status === 'perhatian') perhatian++;
      else aman++;
    });
    return {
      totalFiltered: filteredBlockItems.length,
      totalAll: allBlockItems.length,
      bentrok,
      perhatian,
      aman,
    };
  }, [filteredBlockItems, allBlockItems]);

  // Auto-scroll to highlighted card when set
  React.useEffect(() => {
    if (highlightAssignmentId) {
      const el = document.getElementById(`schedule-block-${highlightAssignmentId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  }, [highlightAssignmentId]);

  // Horizontal scroll helpers
  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Is KKN relevant (Semester 7 or 'all')
  const isKknRelevant = selectedSemester === 'all' || selectedSemester === '7';

  // Handle block click
  const handleBlockClick = (item: BlockItem) => {
    if (onSelectAssignment && userRole === 'admin') {
      onSelectAssignment(item.assignment);
    } else {
      // For student & lecturer (or read-only), open clean detail view modal
      setViewOnlyModalItem(item);
    }
  };

  // Row height in pixels for each session (consistent across all columns)
  const ROW_HEIGHT = 105; // px

  return (
    <div className="space-y-4" id="schedule-block-matrix-container">
      {/* 1. FILTER TOOLBAR (Clean, Academic, Functional) */}
      {!hideFilterToolbar && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
          {/* Row 1: Search Input & Quick Semester Buttons */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari mata kuliah, dosen, ruangan, kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Semester selector with strict "Sem" format */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Semester:</span>
              </span>
              <button
                onClick={() => setSelectedSemester('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                  selectedSemester === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              {(['1', '2', '3', '4', '5', '6', '7', '8'] as const).map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSelectedSemester(sem)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                    selectedSemester === sem
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Secondary Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2.5 border-t border-slate-100 text-xs">
            {/* Kurikulum */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Kurikulum
              </label>
              <select
                value={selectedCurriculum}
                onChange={(e) => setSelectedCurriculum(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
              >
                <option value="all">Semua Kurikulum</option>
                <option value="2026">Kurikulum 2026</option>
                <option value="2022">Kurikulum 2022</option>
              </select>
            </div>

            {/* KBK */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                KBK / Konsentrasi
              </label>
              <select
                value={selectedKbk}
                onChange={(e) => setSelectedKbk(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
              >
                <option value="all">Semua KBK &amp; Wajib</option>
                <option value="common">Paket Umum (Sem 1–4)</option>
                <option value="kbk-stl">KBK STL</option>
                <option value="kbk-komputer">KBK KOM</option>
                <option value="kbk-elkom">KBK ELKOM</option>
              </select>
            </div>

            {/* Hari */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Hari Kuliah
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
              >
                <option value="all">Semua Hari (Senin–Jumat)</option>
                {activeDays.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Dosen */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Dosen Pengampu
              </label>
              <select
                value={selectedLecturerId}
                onChange={(e) => setSelectedLecturerId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 truncate"
              >
                <option value="all">Semua Dosen</option>
                {lecturers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ruangan */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Ruangan
              </label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
              >
                <option value="all">Semua Ruangan</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} ({r.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Konflik */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status Validasi
              </label>
              <select
                value={selectedConflictFilter}
                onChange={(e) => setSelectedConflictFilter(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="all">Semua Status</option>
                <option value="aman">Aman ({stats.aman})</option>
                <option value="perhatian">Perlu Perhatian ({stats.perhatian})</option>
                <option value="bentrok">BENTROK ({stats.bentrok})</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 2. SPECIAL KKN NOTICE CALLOUT */}
      {isKknRelevant && (
        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 text-sky-950 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700 shrink-0 mt-0.5 sm:mt-0">
              <Info className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-sky-950">
                  Kuliah Kerja Nyata (KKN)
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-200 text-sky-900">
                  KKN — Dikelola LPPM
                </span>
                <span className="text-[11px] font-semibold text-sky-800">
                  4 SKS • Semester 7 (Semua KBK)
                </span>
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                Mata kuliah KKN berbobot 4 SKS dikelola terpusat oleh Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) UNRAM di lokasi desa penempatan. Tidak menggunakan slot waktu dan ruangan kelas mingguan di kampus.
              </p>
            </div>
          </div>
          <span className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-[11px] font-bold text-sky-800 shrink-0">
            Terpusat LPPM
          </span>
        </div>
      )}

      {/* 3. MOBILE DAY TAB SWITCHER */}
      <div className="sm:hidden flex items-center gap-1 overflow-x-auto pb-1 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <span className="text-xs font-bold text-slate-500 px-2 shrink-0">Pilih Hari:</span>
        {activeDays.map((day) => {
          const count = filteredBlockItems.filter((b) => b.day === day).length;
          const isSelected = mobileActiveDay === day;
          return (
            <button
              key={day}
              onClick={() => setMobileActiveDay(day)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{day}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. MAIN SCHEDULE BLOCK MATRIX (Dynamic Expandable Canvas with Sticky Headers) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        {/* Matrix Canvas Navigation Bar */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white tracking-wide flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Papan Jadwal Perkuliahan</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              ({filteredBlockItems.length} MK ditampilkan • Kolom melebar otomatis saat jadwal paralel)
            </span>
          </div>

          {/* Horizontal Scroll Navigation Arrows */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
              Navigasi Geser:
            </span>
            <button
              onClick={handleScrollLeft}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="Geser ke Kiri (Hari Sebelumnya)"
            >
              <span>←</span>
              <span className="hidden xs:inline">Kiri</span>
            </button>
            <button
              onClick={handleScrollRight}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="Geser ke Kanan (Hari Berikutnya)"
            >
              <span className="hidden xs:inline">Kanan</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Horizontal scroll container */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto max-w-full overflow-y-auto max-h-[75vh]"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridColumnsCSS,
              minWidth: '100%',
              width: 'max-content',
            }}
          >
            {/* ==================================================== */}
            {/* HEADER ROW: [ Sesi / Hari ] [ Senin ] [ Selasa ] ... */}
            {/* ==================================================== */}
            <div className="bg-slate-950 text-white px-3 py-3 font-bold text-xs flex flex-col justify-center items-center text-center border-b border-r border-slate-800 sticky left-0 top-0 z-40 shadow-sm">
              <span className="uppercase tracking-wider text-[11px] text-slate-200">Sesi / Hari</span>
              <span className="text-[10px] font-normal text-slate-400 font-mono">Waktu Kuliah</span>
            </div>

            {activeDays.map((day) => {
              const dayData = dayLanesData.get(day);
              const count = dayData?.items.length || 0;
              const lanes = dayData?.totalLanes || 1;
              return (
                <div
                  key={`hdr-${day}`}
                  className="bg-slate-900 text-white px-4 py-3 font-bold text-xs flex items-center justify-between border-b border-r border-slate-700 last:border-r-0 sticky top-0 z-30 shadow-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-sm font-extrabold uppercase tracking-wide">{day}</span>
                    {lanes > 1 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                        {lanes} Paralel
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {count} MK
                  </span>
                </div>
              );
            })}

            {/* ==================================================== */}
            {/* MATRIX BODY: LEFT SESSIONS COLUMN + DAY COLUMNS      */}
            {/* ==================================================== */}

            {/* LEFT COLUMN: Vertical list of all sessions with exact hours (STICKY ON LEFT) */}
            <div
              className="bg-slate-50 border-r border-slate-200 sticky left-0 z-20 shadow-sm"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${sessionRows.length}, ${ROW_HEIGHT}px)`,
              }}
            >
              {sessionRows.map((sess) => (
                <div
                  key={`sess-left-${sess.sessionNumber}`}
                  className="p-2 border-b border-slate-200 flex flex-col justify-center items-center text-center select-none bg-slate-50"
                >
                  <span className="font-extrabold text-slate-900 text-xs tracking-tight">
                    Sesi {sess.sessionNumber}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-indigo-700 mt-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                    {sess.startTime} - {sess.endTime}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    50 menit
                  </span>
                </div>
              ))}
            </div>

            {/* DAY COLUMNS: One column per day, containing the vertical blocks */}
            {activeDays.map((day) => {
              const dayData = dayLanesData.get(day);
              const items = dayData?.items || [];
              const totalLanes = dayData?.totalLanes || 1;

              return (
                <div
                  key={`col-${day}`}
                  className="relative border-r border-slate-200 last:border-r-0 bg-white"
                  style={{
                    display: 'grid',
                    gridTemplateRows: `repeat(${sessionRows.length}, ${ROW_HEIGHT}px)`,
                    gridTemplateColumns: `repeat(${totalLanes}, minmax(220px, 1fr))`,
                  }}
                >
                  {/* Background grid guidelines for each session row */}
                  {sessionRows.map((sess, rIdx) => (
                    <div
                      key={`bg-slot-${day}-${sess.sessionNumber}`}
                      className="border-b border-slate-100 flex items-center justify-center pointer-events-none"
                      style={{
                        gridRow: `${rIdx + 1} / span 1`,
                        gridColumn: `1 / -1`,
                      }}
                    >
                      {/* Subtle watermark */}
                      <span className="text-[10px] text-slate-200 font-mono select-none">
                        {sess.startTime}
                      </span>
                    </div>
                  ))}

                  {/* COURSE BLOCKS: Rendered at their exact startSession & spanning duration */}
                  {items.map((item) => {
                    // Calculate 1-indexed row start & span
                    const rowStartIdx = sessionIndexMap.has(item.startSession)
                      ? (sessionIndexMap.get(item.startSession) || 0) + 1
                      : 1;
                    const rowSpan = Math.max(1, Math.min(item.durationSessions, sessionRows.length - rowStartIdx + 1));

                    // Multi-lane placement: if overlapping with other courses, place in specific lane; else span full width
                    const colStart = item.hasOverlap ? item.lane + 1 : 1;
                    const colSpan = item.hasOverlap ? 1 : totalLanes;

                    // Semester visual theme
                    const semTheme = SEMESTER_COLOR_MAP[item.semester] || SEMESTER_COLOR_MAP[1];

                    const isHighlighted = highlightAssignmentId === item.id;

                    return (
                      <div
                        key={item.id}
                        id={`schedule-block-${item.id}`}
                        onClick={() => handleBlockClick(item)}
                        style={{
                          gridRow: `${rowStartIdx} / span ${rowSpan}`,
                          gridColumn: `${colStart} / span ${colSpan}`,
                          minWidth: '215px',
                        }}
                        className={`m-1 p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between group relative z-10 ${
                          isHighlighted
                            ? 'ring-4 ring-rose-500 shadow-2xl scale-[1.03] z-30 animate-pulse bg-rose-50 border-rose-600'
                            : item.status === 'bentrok'
                            ? 'bg-rose-50/95 border-2 border-rose-500 shadow-xs hover:border-rose-600'
                            : item.status === 'perhatian'
                            ? 'bg-amber-50/95 border-2 border-amber-400 shadow-2xs hover:border-amber-500'
                            : `bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-md ${semTheme.border} border-l-4`
                        }`}
                        title={`Klik untuk melihat detail jadwal: ${item.formattedCourseTitle}`}
                      >
                        {/* TOP SECTION: Course Name & Info */}
                        <div>
                          {/* 1. Nama Mata Kuliah + Section (e.g. Probabilitas dan Statistik-A) */}
                          <div className="font-black text-slate-900 text-xs sm:text-sm leading-snug line-clamp-2 tracking-tight group-hover:text-indigo-900 transition-colors">
                            {item.formattedCourseTitle}
                          </div>

                          {/* 2. Info: Sem [X] • [Y] SKS */}
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${semTheme.badge}`}>
                              {item.semesterLabel}
                            </span>
                            <span>•</span>
                            <span>{item.sks} SKS</span>
                            {item.kbkLabel && (
                              <>
                                <span>•</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                  {item.kbkLabel}
                                </span>
                              </>
                            )}
                          </div>

                          {/* 3. Rentang waktu: 09:30 - 11:10 */}
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono font-bold text-slate-800">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{item.timeRangeLabel}</span>
                          </div>

                          {/* 4. Dosen Pengampu: Nama Dosen atau "Belum Ada Dosen" */}
                          <div className="mt-1 text-[11px]">
                            {item.primaryLecturerName ? (
                              <div className="font-semibold text-slate-800 truncate flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{item.primaryLecturerName}</span>
                              </div>
                            ) : (
                              <div className="font-bold text-amber-700 italic flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Belum Ada Dosen</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* BOTTOM SECTION: Ruangan & Jumlah Mahasiswa (e.g. C2-09 | 40 Mhs) */}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                          {/* Ruangan */}
                          <div className="flex items-center gap-1 text-slate-800">
                            <DoorOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{item.roomCode}</span>
                          </div>

                          {/* Jumlah mahasiswa */}
                          <div className="text-slate-600 font-semibold">
                            {item.studentCountLabel}
                          </div>
                        </div>

                        {/* Conflict warning banner if applicable */}
                        {item.status === 'bentrok' && (
                          <div className="mt-1.5 text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0 animate-pulse text-rose-600" />
                            <span className="truncate">BENTROK JADWAL</span>
                          </div>
                        )}
                        {item.status === 'perhatian' && (
                          <div className="mt-1.5 text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0 text-amber-600" />
                            <span className="truncate">Perlu Perhatian</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. VIEW-ONLY DETAIL MODAL (For Student & Lecturer roles without action buttons) */}
      {viewOnlyModalItem && (
        <Modal
          isOpen={Boolean(viewOnlyModalItem)}
          onClose={() => setViewOnlyModalItem(null)}
          title={viewOnlyModalItem.course.name}
          subtitle={`${viewOnlyModalItem.course.code || '-'} • ${viewOnlyModalItem.semesterLabel} • ${viewOnlyModalItem.sks} SKS`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Key Schedule Information Grid */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Hari &amp; Jam Kuliah
                </span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {viewOnlyModalItem.day}, {viewOnlyModalItem.timeRangeLabel}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Sesi {viewOnlyModalItem.startSession}–{viewOnlyModalItem.endSession} ({viewOnlyModalItem.durationSessions * 50} menit)
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ruangan Kelas
                </span>
                <div className="text-xs font-bold text-indigo-700 mt-0.5">
                  {viewOnlyModalItem.roomCode}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {viewOnlyModalItem.roomName}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Kelas &amp; Beban SKS
                </span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {viewOnlyModalItem.sectionLabel} • {viewOnlyModalItem.sks} SKS
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Kurikulum {viewOnlyModalItem.curriculumYear}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Jumlah Mahasiswa
                </span>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {viewOnlyModalItem.studentCountLabel}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Mahasiswa Terdaftar
                </div>
              </div>
            </div>

            {/* Dosen Pengampu */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Dosen Pengampu
              </span>
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span>{viewOnlyModalItem.primaryLecturerName || 'Belum Ada Dosen'}</span>
              </div>
            </div>

            {/* Conflict details if any */}
            {viewOnlyModalItem.specificConflicts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 space-y-1.5">
                <div className="font-bold text-rose-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Catatan Konflik Jadwal:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-1 text-rose-800">
                  {viewOnlyModalItem.specificConflicts.map((c, i) => (
                    <li key={i}>{c.description}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Modal */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewOnlyModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

