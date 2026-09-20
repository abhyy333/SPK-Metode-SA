import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  Users,
  Sliders,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Search,
  Filter,
  Layers,
  Info,
  CalendarDays,
  ListTodo,
  Check,
  X,
  RotateCcw,
  ArrowRight,
  GraduationCap,
  Building2,
  CalendarCheck,
  AlertCircle,
  HelpCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  DayOfWeek,
  CourseOffering,
  CurrentUser,
  StudentSchedulePreference,
  ScheduleStatus,
} from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { StorageService } from '../../services/storageService';

interface StudentSchedulePageProps {
  currentUser: CurrentUser;
  currentSchedule: ScheduleAssignment[] | null;
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  scheduleStatus: ScheduleStatus;
  academicYear: string;
}

const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Day mapping helper from standard JS Date
const DAY_INDEX_MAP: Record<number, DayOfWeek> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  0: 'Minggu',
};

export const StudentSchedulePage: React.FC<StudentSchedulePageProps> = ({
  currentUser,
  currentSchedule,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  scheduleStatus,
  academicYear,
}) => {
  const { showToast } = useToast();
  const studentId = currentUser.studentId || currentUser.id || 'student-demo';

  // State: Preferences for Student Schedule
  const [preferences, setPreferences] = useState<StudentSchedulePreference[]>(() => {
    return StorageService.getStudentSchedulePreferences(studentId);
  });

  // State: View Mode ('today' | 'weekly')
  const [viewMode, setViewMode] = useState<'today' | 'weekly'>('today');

  // State: Selected Day for Agenda View (Default to current day of week if weekday, else 'Senin')
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const todayIndex = new Date().getDay();
    const mappedDay = DAY_INDEX_MAP[todayIndex];
    return mappedDay && mappedDay !== 'Minggu' ? mappedDay : 'Senin';
  });

  // State: Filter within student schedule
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPracticumNotice, setShowPracticumNotice] = useState<boolean>(true);
  const [isPracticumListOpen, setIsPracticumListOpen] = useState<boolean>(false);

  // State: Modal "Atur Jadwal Saya"
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);
  const [configModalSemester, setConfigModalSemester] = useState<number | 'all'>(
    currentUser.semester || 3
  );
  const [configSearchTerm, setConfigSearchTerm] = useState<string>('');
  // Temp draft state inside modal
  const [draftPreferences, setDraftPreferences] = useState<Record<string, string>>({});

  // Offerings lookup
  const offerings = useMemo(() => StorageService.getCourseOfferings(), []);
  const offeringMap = useMemo(() => new Map<string, CourseOffering>(offerings.map((o) => [o.id, o])), [offerings]);

  // Master lookup maps
  const courseMap = useMemo(() => new Map<string, Course>(courses.map((c) => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map((l) => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map((t) => [t.id, t])), [timeslots]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map((cl) => [cl.id, cl])), [classes]);

  // Preference map for quick lookup: courseId -> sectionName ('A', 'B', 'C', etc.)
  const preferenceMap = useMemo(() => {
    const map = new Map<string, string>();
    preferences.forEach((p) => {
      if (p.courseId && p.sectionName) {
        map.set(p.courseId, p.sectionName.toUpperCase());
      }
    });
    return map;
  }, [preferences]);

  // Helper to extract offering metadata from an assignment
  const getAssignmentMeta = (assignment: ScheduleAssignment) => {
    const off = assignment.courseOfferingId ? offeringMap.get(assignment.courseOfferingId) : null;
    const course = courseMap.get(assignment.courseId);

    const semester = off?.semester || course?.semester || 1;
    const curriculumYear = off?.curriculumYear || course?.curriculumYear || 2026;
    const kbkId = off?.kbkId || (course?.kbkIds && course.kbkIds.length > 0 ? course.kbkIds[0] : null);
    const section = off?.sectionName || (off?.code?.includes('-') ? off.code.split('-').pop() : 'A');
    const isPracticum = off?.isPracticum || course?.type === 'Praktikum';

    const assignedLecIds = assignment.lecturerIds && assignment.lecturerIds.length > 0
      ? assignment.lecturerIds
      : assignment.lecturerId ? [assignment.lecturerId] : [];
    const assignedLecturers = assignedLecIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];

    const room = roomMap.get(assignment.roomId);
    const timeslot = timeslotMap.get(assignment.timeslotId);

    return {
      offering: off,
      course,
      semester,
      curriculumYear,
      kbkId,
      section: (section || 'A').toUpperCase(),
      isPracticum,
      lecturers: assignedLecturers,
      room,
      timeslot,
    };
  };

  // Excluded Practicums for this student/semester
  const excludedPracticums = useMemo(() => {
    return courses.filter((c) => c.type === 'Praktikum');
  }, [courses]);

  // Filtered Schedule Assignments for Student (ONLY matching chosen preferences!)
  const studentAssignments = useMemo(() => {
    if (!currentSchedule || currentSchedule.length === 0) return [];
    if (preferenceMap.size === 0) return [];

    return currentSchedule.filter((assign) => {
      const meta = getAssignmentMeta(assign);
      if (meta.isPracticum) return false;

      // Check if this course is in student preference AND section matches
      const preferredSection = preferenceMap.get(assign.courseId);
      if (!preferredSection) return false;

      return meta.section === preferredSection;
    });
  }, [currentSchedule, preferenceMap, courseMap, offeringMap, lecturerMap, roomMap, timeslotMap]);

  // Active Filtered Assignments (by semester and search term)
  const displayAssignments = useMemo(() => {
    return studentAssignments.filter((assign) => {
      const meta = getAssignmentMeta(assign);

      // Semester filter
      if (selectedSemesterFilter !== 'all' && meta.semester !== Number(selectedSemesterFilter)) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const cName = meta.course?.name?.toLowerCase() || '';
        const cCode = meta.course?.code?.toLowerCase() || '';
        const lecNames = meta.lecturers.map((l) => l.name.toLowerCase()).join(' ');
        const rCode = meta.room?.code?.toLowerCase() || '';
        if (!cName.includes(query) && !cCode.includes(query) && !lecNames.includes(query) && !rCode.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [studentAssignments, selectedSemesterFilter, searchTerm]);

  // Assignments for the selected day in Agenda View (Sorted by start time)
  const todayAssignments = useMemo(() => {
    return displayAssignments
      .filter((assign) => {
        const meta = getAssignmentMeta(assign);
        return meta.timeslot?.day === selectedDay;
      })
      .sort((a, b) => {
        const timeA = timeslotMap.get(a.timeslotId)?.startTime || '00:00';
        const timeB = timeslotMap.get(b.timeslotId)?.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
  }, [displayAssignments, selectedDay, timeslotMap]);

  // Summary statistics for Student Header
  const summaryStats = useMemo(() => {
    const totalWeeklyMeetings = displayAssignments.length;
    const totalSks = displayAssignments.reduce((sum, a) => {
      const c = courseMap.get(a.courseId);
      return sum + (c?.sks || 0);
    }, 0);

    const todayCount = displayAssignments.filter((a) => {
      const slot = timeslotMap.get(a.timeslotId);
      return slot?.day === selectedDay;
    }).length;

    // Next upcoming meeting (first one today or upcoming)
    const upcomingToday = todayAssignments[0];
    let nextMeetingText = 'Tidak ada jadwal lagi hari ini';
    if (upcomingToday) {
      const meta = getAssignmentMeta(upcomingToday);
      const startTime = meta.timeslot?.startTime || '-';
      const cName = meta.course?.name || 'Mata Kuliah';
      const rCode = meta.room?.code || '';
      nextMeetingText = `${startTime} — ${cName} (${rCode})`;
    }

    return {
      totalCourses: preferenceMap.size,
      totalWeeklyMeetings,
      totalSks,
      todayCount,
      nextMeetingText,
    };
  }, [displayAssignments, preferenceMap, todayAssignments, selectedDay, courseMap, timeslotMap]);

  // Available courses grouped with all their available sections for the Config Modal
  const availableCoursesWithSections = useMemo(() => {
    // Collect all offerings for theory courses
    const courseSectionMap = new Map<
      string,
      {
        course: Course;
        semester: number;
        curriculumYear: number;
        kbkId: string | null;
        sections: {
          sectionName: string;
          offeringId: string;
          timeslot?: Timeslot;
          room?: Room;
          lecturers: Lecturer[];
          studentCount: number;
        }[];
      }
    >();

    // Scan through currentSchedule or offerings
    offerings.forEach((off) => {
      if (off.isPracticum) return;
      const course = courseMap.get(off.courseId);
      if (!course || course.type === 'Praktikum') return;

      const sem = off.semester || course.semester || 1;
      const curYear = off.curriculumYear || course.curriculumYear || 2026;
      const kbkId = off.kbkId || (course.kbkIds && course.kbkIds.length > 0 ? course.kbkIds[0] : null);
      const sectionName = (off.sectionName || (off.code?.includes('-') ? off.code.split('-').pop() : 'A') || 'A').toUpperCase();

      if (!courseSectionMap.has(course.id)) {
        courseSectionMap.set(course.id, {
          course,
          semester: sem,
          curriculumYear: curYear,
          kbkId,
          sections: [],
        });
      }

      // Find if this offering is scheduled
      const scheduledAssign = currentSchedule?.find(
        (a) => a.courseOfferingId === off.id || (a.courseId === off.courseId && a.classId === off.classId)
      );

      const timeslot = scheduledAssign ? timeslotMap.get(scheduledAssign.timeslotId) : undefined;
      const room = scheduledAssign ? roomMap.get(scheduledAssign.roomId) : undefined;
      const lecIds = scheduledAssign?.lecturerIds && scheduledAssign.lecturerIds.length > 0
        ? scheduledAssign.lecturerIds
        : (off.lecturerIds && off.lecturerIds.length > 0 ? off.lecturerIds : off.lecturerId ? [off.lecturerId] : []);
      const assignedLecs = lecIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];

      const entry = courseSectionMap.get(course.id)!;
      // Prevent duplicate section entries
      if (!entry.sections.some((s) => s.sectionName === sectionName)) {
        entry.sections.push({
          sectionName,
          offeringId: off.id,
          timeslot,
          room,
          lecturers: assignedLecs,
          studentCount: off.studentCount || off.enrolledCount || 35,
        });
      }
    });

    // Sort sections alphabetically (A, B, C)
    const list = Array.from(courseSectionMap.values()).map((item) => ({
      ...item,
      sections: item.sections.sort((a, b) => a.sectionName.localeCompare(b.sectionName)),
    }));

    // Sort courses by semester then course name
    return list.sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.course.name.localeCompare(b.course.name);
    });
  }, [offerings, courses, currentSchedule, courseMap, timeslotMap, roomMap, lecturerMap]);

  // Filtered courses for the Config Modal
  const modalFilteredCourses = useMemo(() => {
    return availableCoursesWithSections.filter((item) => {
      if (configModalSemester !== 'all' && item.semester !== Number(configModalSemester)) {
        return false;
      }
      if (configSearchTerm.trim() !== '') {
        const query = configSearchTerm.toLowerCase();
        const cName = item.course.name.toLowerCase();
        const cCode = item.course.code.toLowerCase();
        return cName.includes(query) || cCode.includes(query);
      }
      return true;
    });
  }, [availableCoursesWithSections, configModalSemester, configSearchTerm]);

  // Open "Atur Jadwal Saya" Modal
  const handleOpenConfigModal = () => {
    // Populate draft state from current preferences
    const draft: Record<string, string> = {};
    preferences.forEach((p) => {
      if (p.courseId && p.sectionName) {
        draft[p.courseId] = p.sectionName.toUpperCase();
      }
    });
    setDraftPreferences(draft);
    setIsConfigModalOpen(true);
  };

  // Select section for a course inside modal
  const handleSelectSection = (courseId: string, sectionName: string) => {
    setDraftPreferences((prev) => {
      const next = { ...prev };
      if (prev[courseId] === sectionName) {
        // Toggle off if already selected
        delete next[courseId];
      } else {
        next[courseId] = sectionName;
      }
      return next;
    });
  };

  // Quick Preset: Select all Section A (or B) for current filtered semester
  const handleApplyPreset = (targetSection: string, targetSem?: number) => {
    const sem: number | 'all' = targetSem !== undefined ? targetSem : configModalSemester;
    const targetCourses = availableCoursesWithSections.filter((c) => (sem === 'all' ? true : c.semester === sem));

    setDraftPreferences((prev) => {
      const next = { ...prev };
      targetCourses.forEach((c) => {
        const hasSection = c.sections.some((s) => s.sectionName === targetSection);
        if (hasSection) {
          next[c.course.id] = targetSection;
        } else if (c.sections.length > 0) {
          next[c.course.id] = c.sections[0].sectionName;
        }
      });
      return next;
    });

    showToast('info', 'Preset Diterapkan di Form', `Semua mata kuliah semester ${sem} dipilih Kelas ${targetSection}. Klik 'Simpan Jadwal Saya' untuk menyimpan.`);
  };

  // Reset/Clear all selections in modal draft
  const handleResetDraft = () => {
    setDraftPreferences({});
  };

  // Prompt confirmation to clear all personal schedule preferences
  const handlePromptClearPreferences = () => {
    setIsClearConfirmOpen(true);
  };

  // Execute clearing preferences upon confirmation
  const handleConfirmClearPreferences = () => {
    StorageService.clearStudentSchedulePreferences(studentId);
    setPreferences([]);
    setDraftPreferences({});
    setIsClearConfirmOpen(false);
    setIsConfigModalOpen(false);
    showToast(
      'success',
      'Pilihan Jadwal Dikosongkan',
      'Seluruh pilihan jadwal pribadi Anda telah berhasil dikosongkan.'
    );
  };

  // Save Preferences to StorageService
  const handleSavePreferences = () => {
    const newPreferences: StudentSchedulePreference[] = Object.entries(draftPreferences).map(([courseId, sectionName]) => {
      const courseInfo = availableCoursesWithSections.find((c) => c.course.id === courseId);
      const sectionInfo = courseInfo?.sections.find((s) => s.sectionName === sectionName);
      return {
        studentId,
        courseId,
        sectionName,
        offeringId: sectionInfo?.offeringId,
        semester: courseInfo?.semester,
        curriculumYear: courseInfo?.curriculumYear,
        updatedAt: new Date().toISOString(),
      };
    });

    StorageService.saveStudentSchedulePreferences(newPreferences, studentId);
    setPreferences(newPreferences);
    setIsConfigModalOpen(false);

    showToast(
      'success',
      'Jadwal Saya Berhasil Disimpan',
      `${newPreferences.length} mata kuliah telah dipilih untuk tampilan jadwal pribadi Anda.`
    );
  };

  // Quick One-Click Setup from Empty State
  const handleQuickSetupFromEmpty = (targetSem: number, targetSection: string = 'A') => {
    const targetCourses = availableCoursesWithSections.filter((c) => c.semester === targetSem);
    const newPreferences: StudentSchedulePreference[] = [];

    targetCourses.forEach((c) => {
      const sectionInfo = c.sections.find((s) => s.sectionName === targetSection) || c.sections[0];
      if (sectionInfo) {
        newPreferences.push({
          studentId,
          courseId: c.course.id,
          sectionName: sectionInfo.sectionName,
          offeringId: sectionInfo.offeringId,
          semester: c.semester,
          curriculumYear: c.curriculumYear,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    StorageService.saveStudentSchedulePreferences(newPreferences, studentId);
    setPreferences(newPreferences);

    showToast(
      'success',
      'Paket Jadwal Terpasang',
      `Berhasil memasang ${newPreferences.length} mata kuliah Semester ${targetSem} (Kelas ${targetSection}) ke Jadwal Saya.`
    );
  };

  // Days list for weekly timetable view
  const activeDays = ALL_DAYS.filter((d) => d !== 'Minggu');

  // Sorted timeslots for weekly rows
  const sortedTimeslots = useMemo(() => {
    const slots = [...timeslots].filter((t) => t.isActive !== false);
    return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timeslots]);

  // Unique session times for weekly timetable rows
  const uniqueTimeLabels = useMemo(() => {
    const times = new Map<string, { startTime: string; endTime: string; label: string }>();
    sortedTimeslots.forEach((t) => {
      const key = `${t.startTime}-${t.endTime}`;
      if (!times.has(key)) {
        times.set(key, {
          startTime: t.startTime,
          endTime: t.endTime,
          label: t.label || `${t.startTime} - ${t.endTime}`,
        });
      }
    });
    return Array.from(times.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [sortedTimeslots]);

  return (
    <div className="space-y-6">
      {/* 1. STUDENT HEADER & SUMMARY BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <GraduationCap className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Jadwal Saya
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Semester {currentUser.semester || 3} • Kurikulum 2026
              </span>
              {scheduleStatus === 'published' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Resmi Terbit
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Draf Akademik
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              T.A. {academicYear} • Jurusan Teknik Elektro Universitas Mataram
            </p>
          </div>

          {/* Action Buttons: Atur Jadwal Saya & Kosongkan Pilihan */}
          <div className="flex items-center gap-2 flex-wrap">
            {preferenceMap.size > 0 && (
              <button
                type="button"
                onClick={handlePromptClearPreferences}
                id="btn-kosongkan-pilihan-header"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Kosongkan seluruh pilihan jadwal pribadi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Pilihan</span>
              </button>
            )}

            <button
              onClick={handleOpenConfigModal}
              id="btn-atur-jadwal-saya"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Atur Jadwal Saya</span>
              {preferenceMap.size > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-white/20 rounded-md text-white">
                  {preferenceMap.size} MK
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Highlights / Metrics Bar */}
        {preferenceMap.size > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">Hari Ini ({selectedDay})</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {summaryStats.todayCount} Mata Kuliah
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">Minggu Ini</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {summaryStats.totalWeeklyMeetings} Pertemuan ({summaryStats.totalSks} SKS)
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500">Pertemuan Berikutnya</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 truncate" title={summaryStats.nextMeetingText}>
                  {summaryStats.nextMeetingText}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {preferenceMap.size === 0 ? (
        /* 2A. EMPTY STATE (When student hasn't chosen sections yet) */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xs space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center">
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Jadwal Pribadi Belum Diatur</h3>
            <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
              Pilih kelas dan section mata kuliah yang Anda ikuti untuk menampilkan jadwal perkuliahan yang ringkas, bersih, dan bebas dari informasi administratif.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenConfigModal}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Atur Jadwal Saya</span>
            </button>
            <button
              onClick={() => handleQuickSetupFromEmpty(currentUser.semester || 3, 'A')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Gunakan Paket Semester {currentUser.semester || 3} (Kelas A)</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Pilihan section hanya digunakan untuk personalisasi tampilan Anda dan tidak mengubah alokasi sistem KRS.
          </div>
        </div>
      ) : (
        /* 2B. ACTIVE STUDENT SCHEDULE */
        <div className="space-y-4">
          {/* Controls Bar: Switch View & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* View Mode Switcher: [ Hari Ini ] [ Mingguan ] */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto shrink-0">
              <button
                onClick={() => setViewMode('today')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === 'today'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Hari Ini</span>
              </button>
              <button
                onClick={() => setViewMode('weekly')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  viewMode === 'weekly'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Mingguan</span>
              </button>
            </div>

            {/* Filters: Day Switcher (in Today mode) or Search & Semester */}
            <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
              {viewMode === 'today' && (
                /* Day Navigation Pills */
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 max-w-full">
                  {activeDays.map((day) => {
                    const isSelected = selectedDay === day;
                    const dayCount = displayAssignments.filter((a) => timeslotMap.get(a.timeslotId)?.day === day).length;
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                        }`}
                      >
                        <span>{day}</span>
                        {dayCount > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {dayCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Semester Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedSemesterFilter}
                  onChange={(e) => setSelectedSemesterFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Semua Semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Search */}
              <div className="relative min-w-[160px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari MK, dosen, ruang..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* VIEW A: AGENDA HARI INI (Default View) */}
          {viewMode === 'today' && (
            <div className="space-y-3">
              {/* Day Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Jadwal Hari {selectedDay}
                  </h2>
                  <span className="text-xs text-slate-500 font-medium">
                    ({todayAssignments.length} perkuliahan)
                  </span>
                </div>
              </div>

              {todayAssignments.length === 0 ? (
                /* No classes today */
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Tidak Ada Perkuliahan Hari {selectedDay}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Anda tidak memiliki jadwal kelas teori pada hari ini. Gunakan waktu luang untuk belajar mandiri atau praktikum.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-1">
                    <button
                      onClick={() => setViewMode('weekly')}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      Lihat Jadwal Mingguan
                    </button>
                  </div>
                </div>
              ) : (
                /* Today's Horizontal Clean Class Cards */
                <div className="space-y-2.5">
                  {todayAssignments.map((assign) => {
                    const meta = getAssignmentMeta(assign);
                    const course = meta.course;
                    const timeslot = meta.timeslot;
                    const room = meta.room;
                    const lecs = meta.lecturers;

                    return (
                      <div
                        key={assign.id}
                        className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-300 p-4 sm:p-5 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Left: Time badge */}
                        <div className="flex items-center sm:flex-col sm:items-start sm:w-36 shrink-0 gap-2 sm:gap-1 border-b sm:border-b-0 sm:border-r border-slate-100 pb-2.5 sm:pb-0 sm:pr-4">
                          <div className="flex items-center gap-1.5 text-indigo-950 font-extrabold text-sm sm:text-base">
                            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{timeslot ? `${timeslot.startTime} – ${timeslot.endTime}` : '-'}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {timeslot?.durationMinutes ? `${timeslot.durationMinutes} menit` : 'Sesi Perkuliahan'}
                          </span>
                        </div>

                        {/* Center: Course & Class Info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                              {course?.name || assign.courseId}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/70">
                              Kelas {meta.section}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              {course?.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                            <span className="font-semibold text-slate-700">
                              {course?.sks || 0} SKS • Semester {meta.semester}
                            </span>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                Dosen: <strong className="text-slate-900">{lecs.map((l) => l.name).join(', ') || 'Belum Ada Dosen'}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Room location badge */}
                        <div className="flex items-center sm:flex-col sm:items-end sm:justify-center shrink-0 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 flex items-center gap-1.5">
                            <DoorOpen className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold font-mono">{room?.code || '-'}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium mt-1">
                            {room?.name || 'Ruang Kuliah'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW B: TIMETABLE MINGGUAN (Compact Weekly Grid) */}
          {viewMode === 'weekly' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="p-3 w-28 text-center border-r border-slate-200">Waktu</th>
                      {activeDays.map((day) => (
                        <th key={day} className="p-3 text-center border-r border-slate-200 last:border-r-0 min-w-[130px]">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {uniqueTimeLabels.map((slot) => {
                      return (
                        <tr key={`${slot.startTime}-${slot.endTime}`} className="hover:bg-slate-50/50">
                          {/* Time label column */}
                          <td className="p-2.5 text-center font-bold text-slate-700 bg-slate-50/40 border-r border-slate-200 align-top">
                            <div className="text-xs text-indigo-950 font-mono font-bold">
                              {slot.startTime}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {slot.endTime}
                            </div>
                          </td>

                          {/* Day Columns */}
                          {activeDays.map((day) => {
                            // Find assignments matching this day and time slot
                            const cellAssignments = displayAssignments.filter((assign) => {
                              const meta = getAssignmentMeta(assign);
                              const ts = meta.timeslot;
                              return ts?.day === day && ts.startTime === slot.startTime;
                            });

                            return (
                              <td
                                key={day}
                                className="p-2 border-r border-slate-200 last:border-r-0 align-top h-24"
                              >
                                {cellAssignments.length === 0 ? (
                                  <div className="h-full flex items-center justify-center text-slate-200 text-[10px]">
                                    —
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {cellAssignments.map((assign) => {
                                      const meta = getAssignmentMeta(assign);
                                      const course = meta.course;
                                      const room = meta.room;
                                      const lecs = meta.lecturers;

                                      return (
                                        <div
                                          key={assign.id}
                                          className="p-2.5 rounded-xl bg-white border border-indigo-200/90 shadow-2xs hover:shadow-xs hover:border-indigo-400 transition-all space-y-1"
                                        >
                                          {/* Course Name (Bold) */}
                                          <div className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight">
                                            {course?.name || assign.courseId}
                                          </div>

                                          {/* Section & SKS */}
                                          <div className="flex items-center justify-between gap-1 text-[10px]">
                                            <span className="font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.2 rounded">
                                              Kelas {meta.section}
                                            </span>
                                            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                                              {room?.code || '-'}
                                            </span>
                                          </div>

                                          {/* Lecturer */}
                                          <div className="text-[10px] text-slate-600 line-clamp-1 pt-0.5 border-t border-slate-100">
                                            Dosen: <span className="font-medium text-slate-800">{lecs[0]?.name || 'Dosen'}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SEPARATE PRAKTIKUM INFORMATION CARD */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-amber-950">Informasi Jadwal Praktikum Laboratorium</h4>
              <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                Jadwal praktikum ditentukan secara terpisah oleh masing-masing koordinator laboratorium teknik elektro dan tidak dimasukkan ke dalam timetable perkuliahan teori utama.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPracticumListOpen(!isPracticumListOpen)}
            className="text-xs font-semibold text-amber-900 hover:text-amber-950 underline shrink-0 cursor-pointer"
          >
            {isPracticumListOpen ? 'Sembunyikan Daftar' : 'Lihat Mata Kuliah Praktikum'}
          </button>
        </div>

        {isPracticumListOpen && (
          <div className="pt-3 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {excludedPracticums.map((p) => (
              <div
                key={p.id}
                className="bg-white/90 p-2.5 rounded-xl border border-amber-200/80 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 text-[11px] line-clamp-1">{p.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">{p.code}</div>
                </div>
                <div className="text-[10px] font-semibold text-amber-800 mt-1">
                  Semester {p.semester} • {p.sks} SKS Praktikum
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. MODAL: "ATUR JADWAL SAYA" */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title="Atur Jadwal Saya"
        subtitle="Pilih kelas (section) mata kuliah yang Anda ikuti untuk menyusun tampilan jadwal pribadi."
        maxWidth="3xl"
      >
        <div className="space-y-4 pt-1">
          {/* Preset Quick Actions & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {/* Semester Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setConfigModalSemester('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  configModalSemester === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Semua
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setConfigModalSemester(sem)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    configModalSemester === sem
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Sem {sem}
                </button>
              ))}
            </div>

            {/* Modal Search */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={configSearchTerm}
                onChange={(e) => setConfigSearchTerm(e.target.value)}
                placeholder="Cari mata kuliah..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center justify-between text-xs px-1 flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">Aksi Cepat:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('A')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                Pilih Semua Kelas A
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('B')}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
              >
                Pilih Semua Kelas B
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDraft}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Kosongkan Pilihan</span>
            </button>
          </div>

          {/* Course List & Section Radio Options */}
          <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
            {modalFilteredCourses.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Tidak ada mata kuliah yang cocok dengan filter atau kata kunci.
              </div>
            ) : (
              modalFilteredCourses.map((item) => {
                const course = item.course;
                const currentChosen = draftPreferences[course.id];

                return (
                  <div
                    key={course.id}
                    className={`p-4 rounded-xl border transition-all ${
                      currentChosen
                        ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div>
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {course.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {course.code} • {course.sks} SKS • Semester {item.semester} • Kurikulum {item.curriculumYear}
                        </div>
                      </div>

                      {currentChosen ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-900 self-start sm:self-auto shrink-0">
                          <Check className="w-3.5 h-3.5" />
                          <span>Kelas {currentChosen} Terpilih</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium self-start sm:self-auto">
                          Belum dipilih
                        </span>
                      )}
                    </div>

                    {/* Section Choices */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {item.sections.map((sec) => {
                        const isSelected = currentChosen === sec.sectionName;
                        const timeStr = sec.timeslot ? `${sec.timeslot.day}, ${sec.timeslot.startTime}-${sec.timeslot.endTime}` : 'Belum Dijadwalkan';
                        const roomStr = sec.room?.code || '-';

                        return (
                          <button
                            key={sec.sectionName}
                            type="button"
                            onClick={() => handleSelectSection(course.id, sec.sectionName)}
                            className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-slate-900">
                                Kelas {sec.sectionName}
                              </span>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-600 font-medium mt-1">
                              {timeStr}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              Ruang: <strong className="text-slate-700">{roomStr}</strong> • {sec.lecturers[0]?.name || 'Dosen'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-xs font-semibold text-slate-600">
              Total Dipilih: <strong className="text-indigo-900">{Object.keys(draftPreferences).length} Mata Kuliah</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Jadwal Saya</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmation Modal: Kosongkan Pilihan Jadwal Pribadi */}
      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        title="Kosongkan Pilihan Jadwal Pribadi"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 rounded-xl border border-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900">
              <p className="font-bold mb-1">Kosongkan seluruh pilihan jadwal pribadi?</p>
              <p className="text-rose-700/90 leading-relaxed">
                Tindakan ini hanya menghapus preferensi tampilan jadwal kelas Anda. Data jadwal akademik utama, alokasi ruang, dan penawaran mata kuliah tidak akan terpengaruh.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClearConfirmOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmClearPreferences}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Ya, Kosongkan</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
