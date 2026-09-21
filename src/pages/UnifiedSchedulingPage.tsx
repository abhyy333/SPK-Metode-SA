import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  Users,
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Sliders,
  ChevronRight,
  Layers,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Info,
  ShieldCheck,
  Award,
  Play,
  Square,
  DoorOpen,
  Clock,
  Printer,
  FileSpreadsheet,
  Globe,
  HelpCircle,
  TrendingDown,
  X,
  Filter,
  BarChart2,
  Lock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Course,
  CurriculumPackage,
  Lecturer,
  KBK,
  CourseOffering,
  ClassGroup,
  Room,
  Timeslot,
  ScheduleAssignment,
  OptimizationResult,
  SAParameters,
  ConstraintWeights,
  ConflictItem,
  DayOfWeek,
  ScheduleChangeRecord,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { StorageService } from '../services/storageService';
import {
  createBalancedSections,
  MIN_STUDENTS_PER_CLASS,
  MAX_STUDENTS_PER_CLASS,
} from '../utils/sectionSplitting';
import {
  CourseOfferingGeneratorService,
  CoursePlanningItem,
  GenerationReport,
  COHORT_PROJECTIONS,
} from '../services/courseOfferingGeneratorService';
import {
  getScheduleRecommendations,
  getSwapRecommendations,
  evaluateMove,
} from '../algorithms/recommendationEngine';
import { generateInitialSchedule } from '../algorithms/initialSchedule';

export type SchedulingStep = 'courses' | 'sections' | 'lecturers' | 'schedule' | 'optimization' | 'results';

interface UnifiedSchedulingPageProps {
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  curriculumPackages: CurriculumPackage[];
  kbks: KBK[];
  currentSchedule: ScheduleAssignment[] | null;
  initialSchedule: ScheduleAssignment[] | null;
  activeOptimizationResult: OptimizationResult | null;
  optimizationHistory: OptimizationResult[];
  parameters: SAParameters;
  weights: ConstraintWeights;
  activeConflicts: ConflictItem[];
  isOptimizing: boolean;
  liveProgressData: any;
  scheduleStatus: string;
  academicYear: string;
  onGenerateInitial: (mode?: 'realistic' | 'random') => void;
  onRunOptimization: () => void;
  onStopOptimization: () => void;
  onChangeParameters: (params: SAParameters) => void;
  onSaveSchedule: (schedule: ScheduleAssignment[]) => void;
  onPublishSchedule: () => void;
  onUpdateOfferings: (offerings: CourseOffering[]) => void;
  onManualMoveAssignment: (
    assignmentId: string,
    newTimeslotId: string,
    newRoomId: string,
    source?: 'Simulated Annealing' | 'Manual Recommendation' | 'Manual Move' | 'Swap Recommendation',
    reason?: string
  ) => void;
  onSwapAssignments: (assignment1Id: string, assignment2Id: string, reason?: string) => void;
  onUpdateAssignmentLecturers: (assignmentId: string, lecturerIds: string[]) => void;
}

export const UnifiedSchedulingPage: React.FC<UnifiedSchedulingPageProps> = ({
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  curriculumPackages,
  kbks,
  currentSchedule,
  initialSchedule,
  activeOptimizationResult,
  optimizationHistory,
  parameters,
  weights,
  activeConflicts,
  isOptimizing,
  liveProgressData,
  scheduleStatus,
  academicYear,
  onGenerateInitial,
  onRunOptimization,
  onStopOptimization,
  onChangeParameters,
  onSaveSchedule,
  onPublishSchedule,
  onUpdateOfferings,
  onManualMoveAssignment,
  onSwapAssignments,
  onUpdateAssignmentLecturers,
}) => {
  const { showToast } = useToast();

  // Active step in the unified workflow
  const [activeStep, setActiveStep] = useState<SchedulingStep>('courses');

  // Semester configuration
  const [academicTerm, setAcademicTerm] = useState<'ganjil' | 'genap'>('ganjil');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Curriculum availability toggle state (2026 and 2022)
  const [curriculumAvailability, setCurriculumAvailability] = useState<Record<number, boolean>>(() => {
    return StorageService.getCurriculumAvailability(academicYear);
  });

  // Course Selection & Student count planning state - NO AUTO CHECK BY DEFAULT
  const [plannedCourses, setPlannedCourses] = useState<Record<string, CoursePlanningItem>>({});

  // Real-time string representation of student count inputs to support empty strings, seamless editing, and no leading zeros
  const [studentInputMap, setStudentInputMap] = useState<Record<string, string>>({});

  // Offerings generated for the active session
  const [workingOfferings, setWorkingOfferings] = useState<CourseOffering[]>(() => {
    return StorageService.getCourseOfferings() || [];
  });

  // Modal State for custom course adding
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);
  const [customCourseSearch, setCustomCourseSearch] = useState('');
  const [customCourseSemester, setCustomCourseSemester] = useState<number>(1);
  const [customCourseStudents, setCustomCourseStudents] = useState<string>('');
  const [customCourseKbk, setCustomCourseKbk] = useState<string>('');
  const [customCourseCurriculum, setCustomCourseCurriculum] = useState<number>(2026);

  // Conflict and manual adjustment state
  const [selectedAssignmentForDetail, setSelectedAssignmentForDetail] = useState<ScheduleAssignment | null>(null);

  // Maps for rapid lookup
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map(timeslots.map((t) => [t.id, t])), [timeslots]);

  const checkIsPracticum = (c: Course) => {
    return (
      c.type === 'Praktikum' ||
      (c.name || '').toLowerCase().includes('praktikum') ||
      (c.code || '').toLowerCase().includes('lab')
    );
  };

  // Synchronize working offerings with storage and listen for reset/availability events
  useEffect(() => {
    const saved = StorageService.getCourseOfferings();
    if (saved && saved.length > 0) {
      setWorkingOfferings(saved);
    }

    const handleResetEvent = () => {
      setPlannedCourses({});
      setStudentInputMap({});
      setWorkingOfferings([]);
      setActiveStep('courses');
    };

    const handleCurrChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ availability: Record<number, boolean> }>;
      if (customEvent.detail?.availability) {
        setCurriculumAvailability(customEvent.detail.availability);
      }
    };

    window.addEventListener('simulation-reset', handleResetEvent);
    window.addEventListener('curriculum-availability-changed', handleCurrChange);

    return () => {
      window.removeEventListener('simulation-reset', handleResetEvent);
      window.removeEventListener('curriculum-availability-changed', handleCurrChange);
    };
  }, []);

  // Toggle curriculum active status
  const handleToggleCurriculumActive = (year: 2022 | 2026) => {
    const nextVal = !curriculumAvailability[year];
    const updated = StorageService.setCurriculumAvailability(year, nextVal, academicYear);
    setCurriculumAvailability(updated);

    // If turned off, remove courses of that curriculum from plannedCourses and studentInputMap
    if (!nextVal) {
      setPlannedCourses((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((cId) => {
          if (next[cId].curriculumYear === year) {
            delete next[cId];
          }
        });
        return next;
      });

      setStudentInputMap((prev) => {
        const next = { ...prev };
        Object.keys(plannedCourses).forEach((cId) => {
          if (plannedCourses[cId]?.curriculumYear === year) {
            delete next[cId];
          }
        });
        return next;
      });
    }

    showToast(
      'info',
      `Kurikulum ${year} ${nextVal ? 'Diaktifkan' : 'Dinonaktifkan'}`,
      nextVal
        ? `Paket mata kuliah Kurikulum ${year} kini aktif untuk penjadwalan.`
        : `Mata kuliah Kurikulum ${year} disembunyikan dari penjadwalan.`
    );
  };

  // Relevant packages based on academic term (Ganjil vs Genap) and Active Curricula
  const termSemesters = useMemo(() => {
    return academicTerm === 'ganjil' ? [1, 3, 5, 7] : [2, 4, 6, 8];
  }, [academicTerm]);

  const activePackages = useMemo(() => {
    return curriculumPackages.filter((pkg) => {
      const isTermMatch =
        academicTerm === 'ganjil' ? pkg.semester % 2 !== 0 : pkg.semester % 2 === 0;
      const isCurrActive = curriculumAvailability[pkg.curriculumYear] !== false;
      return isTermMatch && isCurrActive;
    });
  }, [curriculumPackages, academicTerm, curriculumAvailability]);

  // Handle Student Count Input Change with numeric validation & leading zero prevention
  const handleStudentInputChange = (courseId: string, rawVal: string) => {
    // Only allow positive integers: strip everything else (letters, decimals, negative signs, symbols)
    let cleaned = rawVal.replace(/[^0-9]/g, '');

    // Normalize leading zeros: if "00110" -> "110", "05" -> "5", but keep single "0" or empty ""
    if (cleaned.length > 1 && cleaned.startsWith('0')) {
      cleaned = cleaned.replace(/^0+/, '');
      if (cleaned === '') cleaned = '0';
    }

    setStudentInputMap((prev) => ({
      ...prev,
      [courseId]: cleaned,
    }));

    const parsed = cleaned.trim() === '' ? 0 : parseInt(cleaned, 10);
    setPlannedCourses((prev) => {
      if (!prev[courseId]) return prev;
      return {
        ...prev,
        [courseId]: {
          ...prev[courseId],
          totalStudents: isNaN(parsed) ? 0 : parsed,
        },
      };
    });
  };

  // Handle Input Blur: clean normalization
  const handleStudentInputBlur = (courseId: string) => {
    setStudentInputMap((prev) => {
      const current = prev[courseId];
      if (!current || current.trim() === '') return prev;
      const num = parseInt(current, 10);
      if (isNaN(num)) return { ...prev, [courseId]: '' };
      return { ...prev, [courseId]: String(num) };
    });
  };

  // Toggle individual course selection: DEFAULT INPUT IS EMPTY ""
  const handleToggleCourse = (
    course: Course,
    semester: number,
    currYear: number,
    kbkId: string | null
  ) => {
    setPlannedCourses((prev) => {
      const next = { ...prev };
      if (next[course.id]) {
        delete next[course.id];
      } else {
        const isPracticum = checkIsPracticum(course);
        next[course.id] = {
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          sks: course.sks,
          semester,
          curriculumYear: currYear,
          kbkId: kbkId || null,
          totalStudents: 0, // Starts at 0 until user fills input
          assignedLecturerId: course.lecturerId || null,
          assignedLecturerIds: course.lecturerId ? [course.lecturerId] : [],
          isPracticum: Boolean(isPracticum),
          allowBelowMinimum: false,
        };
      }
      return next;
    });

    setStudentInputMap((prev) => {
      const next = { ...prev };
      if (next[course.id] !== undefined) {
        delete next[course.id];
      } else {
        next[course.id] = ''; // Starts completely empty
      }
      return next;
    });
  };

  // Toggle entire package (checks/unchecks all theory courses in package)
  const handleTogglePackage = (pkg: CurriculumPackage) => {
    const pkgItems = (pkg.courseItems || [])
      .map((item) => {
        const c = courseMap.get(item.courseId);
        return c ? { course: c, kbkId: item.kbkId || pkg.kbkId || null } : null;
      })
      .filter((item): item is { course: Course; kbkId: string | null } => Boolean(item));

    // Consider all theory courses in this package
    const theoryItems = pkgItems.filter((item) => !checkIsPracticum(item.course));
    const targetItems = theoryItems.length > 0 ? theoryItems : pkgItems;

    // Check if all are currently selected
    const allSelected = targetItems.every((item) => Boolean(plannedCourses[item.course.id]));

    setPlannedCourses((prev) => {
      const next = { ...prev };
      if (allSelected) {
        targetItems.forEach((item) => {
          delete next[item.course.id];
        });
      } else {
        targetItems.forEach((item) => {
          const c = item.course;
          const isPracticum = checkIsPracticum(c);
          next[c.id] = {
            courseId: c.id,
            courseCode: c.code,
            courseName: c.name,
            sks: c.sks,
            semester: pkg.semester,
            curriculumYear: pkg.curriculumYear,
            kbkId: item.kbkId,
            totalStudents: 0, // Starts at 0, input empty
            assignedLecturerId: c.lecturerId || null,
            assignedLecturerIds: c.lecturerId ? [c.lecturerId] : [],
            isPracticum: Boolean(isPracticum),
            allowBelowMinimum: false,
          };
        });
      }
      return next;
    });

    setStudentInputMap((prev) => {
      const next = { ...prev };
      if (allSelected) {
        targetItems.forEach((item) => {
          delete next[item.course.id];
        });
      } else {
        targetItems.forEach((item) => {
          if (next[item.course.id] === undefined) {
            next[item.course.id] = ''; // Starts empty
          }
        });
      }
      return next;
    });
  };

  // Quick action: Select or Deselect All Packages for a Semester
  const handleBulkSelectSemester = (semester: number, select: boolean) => {
    const pkgsForSem = activePackages.filter((p) => p.semester === semester);
    setPlannedCourses((prev) => {
      const next = { ...prev };
      pkgsForSem.forEach((pkg) => {
        const items = pkg.courseItems || [];
        items.forEach((item) => {
          const c = courseMap.get(item.courseId);
          if (!c) return;
          if (!select) {
            delete next[c.id];
          } else {
            const isPracticum = checkIsPracticum(c);
            if (!isPracticum) {
              next[c.id] = {
                courseId: c.id,
                courseCode: c.code,
                courseName: c.name,
                sks: c.sks,
                semester: pkg.semester,
                curriculumYear: pkg.curriculumYear,
                kbkId: item.kbkId || pkg.kbkId || null,
                totalStudents: 0,
                assignedLecturerId: c.lecturerId || null,
                assignedLecturerIds: c.lecturerId ? [c.lecturerId] : [],
                isPracticum: false,
                allowBelowMinimum: false,
              };
            }
          }
        });
      });
      return next;
    });

    setStudentInputMap((prev) => {
      const next = { ...prev };
      pkgsForSem.forEach((pkg) => {
        const items = pkg.courseItems || [];
        items.forEach((item) => {
          const c = courseMap.get(item.courseId);
          if (!c) return;
          if (!select) {
            delete next[c.id];
          } else {
            if (next[c.id] === undefined) {
              next[c.id] = '';
            }
          }
        });
      });
      return next;
    });
  };

  const handleUpdateStudentCount = (courseId: string, count: number) => {
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
    setStudentInputMap((prev) => ({
      ...prev,
      [courseId]: count > 0 ? String(count) : '',
    }));
  };

  // Add Custom Course Modal Handler
  const handleAddCustomCourse = (course: Course) => {
    const parsedStudents = customCourseStudents.trim() === '' ? 0 : parseInt(customCourseStudents, 10) || 0;
    setPlannedCourses((prev) => ({
      ...prev,
      [course.id]: {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        sks: course.sks,
        semester: customCourseSemester,
        curriculumYear: customCourseCurriculum,
        kbkId: customCourseKbk || null,
        totalStudents: parsedStudents,
        assignedLecturerId: course.lecturerId || null,
        assignedLecturerIds: course.lecturerId ? [course.lecturerId] : [],
        isPracticum: checkIsPracticum(course),
        allowBelowMinimum: false,
      },
    }));
    setStudentInputMap((prev) => ({
      ...prev,
      [course.id]: customCourseStudents,
    }));
    setIsAddCustomModalOpen(false);
    setCustomCourseStudents('');
    showToast('success', 'Mata Kuliah Ditambahkan', `${course.name} berhasil ditambahkan ke daftar penjadwalan.`);
  };

  // Step 2 & 3: Generation & Section Calculations
  const calculatedSectionsBreakdown = useMemo(() => {
    const list: {
      planningItem: CoursePlanningItem;
      course: Course | null;
      sections: { section: string; studentCount: number }[];
      warning?: string;
    }[] = [];

    Object.values(plannedCourses).forEach((p) => {
      const c = courseMap.get(p.courseId) || null;
      if (p.isPracticum) {
        list.push({
          planningItem: p,
          course: c,
          sections: [{ section: 'P1', studentCount: p.totalStudents }],
        });
        return;
      }

      if (p.totalStudents <= 0) {
        list.push({
          planningItem: p,
          course: c,
          sections: [],
          warning: 'Jumlah mahasiswa 0 (kelas tidak dibuka)',
        });
        return;
      }

      if (p.totalStudents < MIN_STUDENTS_PER_CLASS && !p.allowBelowMinimum) {
        list.push({
          planningItem: p,
          course: c,
          sections: [],
          warning: `Kurang dari minimum ${MIN_STUDENTS_PER_CLASS} mahasiswa (Ditutup / Perlu Izin Khusus)`,
        });
        return;
      }

      const sections = createBalancedSections(p.totalStudents, MAX_STUDENTS_PER_CLASS);
      list.push({
        planningItem: p,
        course: c,
        sections,
      });
    });

    return list.sort((a, b) => a.planningItem.semester - b.planningItem.semester);
  }, [plannedCourses, courseMap]);

  // Total Summary Stats
  const totalPlannedCoursesCount = Object.keys(plannedCourses).length;
  const totalCalculatedSectionsCount = calculatedSectionsBreakdown.reduce(
    (acc, cur) => acc + cur.sections.length,
    0
  );
  const totalPlannedStudentsCount = Object.values(plannedCourses).reduce(
    (acc, cur) => acc + cur.totalStudents,
    0
  );

  // Generate Actual Course Offerings
  const handleGenerateSections = () => {
    const newOfferings: CourseOffering[] = [];

    calculatedSectionsBreakdown.forEach(({ planningItem, course, sections }) => {
      if (sections.length === 0 || planningItem.isPracticum) return;

      sections.forEach((sec) => {
        const assignedLecId = planningItem.assignedLecturerId || course?.lecturerId || null;
        const assignedLecIds = assignedLecId ? [assignedLecId] : [];

        const off: CourseOffering = {
          id: `off-${planningItem.courseId}-${sec.section}-${Date.now().toString(36).slice(-4)}`,
          code: `${planningItem.courseCode || ''}-${sec.section}`,
          courseId: planningItem.courseId,
          courseName: planningItem.courseName || course?.name || '',
          sks: planningItem.sks || course?.sks || 2,
          semester: planningItem.semester,
          academicYear: `${academicYear} ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'}`,
          section: sec.section,
          classId: `cls-${planningItem.semester}${sec.section.toLowerCase()}`,
          capacity: MAX_STUDENTS_PER_CLASS,
          enrolledCount: sec.studentCount,
          studentCount: sec.studentCount,
          lecturerId: assignedLecId || undefined,
          lecturerIds: assignedLecIds,
          curriculumYear: planningItem.curriculumYear,
          kbkId: planningItem.kbkId || undefined,
          category: course?.category || 'Wajib',
          isPracticum: false,
          status: 'draft',
        };

        newOfferings.push(off);
      });
    });

    setWorkingOfferings(newOfferings);
    StorageService.saveCourseOfferings(newOfferings);
    onUpdateOfferings(newOfferings);
    showToast('success', 'Rombel Kelas Terbentuk', `${newOfferings.length} section kelas berhasil digenerate.`);
  };

  // Proceed from Step 1 to Step 2 with strict empty input and validation checks
  const handleProceedToSections = () => {
    if (totalPlannedCoursesCount === 0) {
      showToast('warning', 'Pilih Mata Kuliah', 'Centang minimal 1 mata kuliah sebelum melanjutkan.');
      return;
    }

    const unfilledCourses: { courseId: string; courseName: string }[] = [];
    const belowMinCourses: { courseId: string; courseName: string; count: number }[] = [];

    Object.values(plannedCourses).forEach((p) => {
      if (p.isPracticum) return;
      const rawStr = (studentInputMap[p.courseId] ?? '').trim();
      if (rawStr === '') {
        unfilledCourses.push({ courseId: p.courseId, courseName: p.courseName });
      } else {
        const val = Number(rawStr);
        if (isNaN(val) || val <= 0) {
          unfilledCourses.push({ courseId: p.courseId, courseName: p.courseName });
        } else if (val < MIN_STUDENTS_PER_CLASS && !p.allowBelowMinimum) {
          belowMinCourses.push({ courseId: p.courseId, courseName: p.courseName, count: val });
        }
      }
    });

    if (unfilledCourses.length > 0) {
      showToast(
        'warning',
        'Jumlah Mahasiswa Belum Lengkap',
        `Silakan isi jumlah mahasiswa untuk semua mata kuliah yang dipilih (${unfilledCourses[0].courseName}).`
      );
      const firstInput = document.getElementById(`input-students-${unfilledCourses[0].courseId}`);
      if (firstInput) {
        firstInput.focus();
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (belowMinCourses.length > 0) {
      showToast(
        'warning',
        'Jumlah Mahasiswa Kurang Dari Minimum',
        `${belowMinCourses.length} mata kuliah memiliki < ${MIN_STUDENTS_PER_CLASS} mahasiswa. Kelas untuk MK tersebut tidak dibuka.`
      );
    }

    handleGenerateSections();
    setActiveStep('sections');
  };

  // Lecturer Assignment In-Place Handlers
  const handleAssignLecturer = (offeringId: string, lecturerId: string) => {
    const updated = workingOfferings.map((off) => {
      if (off.id === offeringId) {
        const lec = lecturerMap.get(lecturerId);
        return {
          ...off,
          lecturerId: lecturerId || undefined,
          lecturerIds: lecturerId ? [lecturerId] : [],
          lecturerName: lec?.name,
        };
      }
      return off;
    });
    setWorkingOfferings(updated);
    StorageService.saveCourseOfferings(updated);
    onUpdateOfferings(updated);
  };

  // Step 4: Generate Schedule
  const handleExecuteGenerateSchedule = () => {
    if (workingOfferings.length === 0) {
      handleGenerateSections();
    }
    onGenerateInitial('realistic');
    showToast('success', 'Jadwal Awal Berhasil Digenerate', 'Draft jadwal awal telah terisi ke slot waktu dan ruangan.');
  };

  // Step navigation helper
  const stepsConfig: { id: SchedulingStep; label: string; number: number; desc: string }[] = [
    { id: 'courses', label: '1. Pemilihan Mata Kuliah', number: 1, desc: 'Pilih MK & Mahasiswa' },
    { id: 'sections', label: '2. Pembagian Rombel', number: 2, desc: 'Auto-split A, B, C' },
    { id: 'lecturers', label: '3. Penugasan Dosen', number: 3, desc: 'Alokasi Dosen Pengampu' },
    { id: 'schedule', label: '4. Generate Jadwal Awal', number: 4, desc: 'Ruangan & Sesi Waktu' },
    { id: 'optimization', label: '5. Optimasi Simulated Annealing', number: 5, desc: 'Eliminasi Bentrok' },
    { id: 'results', label: '6. Evaluasi & Terbit', number: 6, desc: 'Jadwal Final' },
  ];

  return (
    <div className="space-y-6">
      {/* Stepper Progress Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {stepsConfig.map((step, idx) => {
            const isActive = activeStep === step.id;
            const isCompleted =
              stepsConfig.findIndex((s) => s.id === activeStep) > idx;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveStep(step.id)}
                  id={`step-tab-${step.id}`}
                  className={`flex items-center gap-2.5 py-1.5 px-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs'
                      : isCompleted
                      ? 'text-slate-700 hover:bg-slate-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold leading-tight">{step.label}</div>
                    <div className="text-[10px] text-slate-500">{step.desc}</div>
                  </div>
                </button>

                {idx < stepsConfig.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 hidden lg:block shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: PEMILIHAN MATA KULIAH & PROYEKSI MAHASISWA */}
      {activeStep === 'courses' && (
        <div className={`space-y-5 ${totalPlannedCoursesCount > 0 ? 'pb-24 sm:pb-20' : 'pb-4'}`}>
          {/* Top Filter & Curriculum Activation Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            {/* Row 1: Academic Term & Curriculum Active Switches */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-slate-100">
              {/* Term Switcher */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Periode:</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setAcademicTerm('ganjil')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      academicTerm === 'ganjil'
                        ? 'bg-white text-indigo-900 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semester Ganjil (1, 3, 5, 7)
                  </button>
                  <button
                    onClick={() => setAcademicTerm('genap')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      academicTerm === 'genap'
                        ? 'bg-white text-indigo-900 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semester Genap (2, 4, 6, 8)
                  </button>
                </div>
              </div>

              {/* Curriculum Active/Inactive Toggles */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Kurikulum:</span>
                
                {/* Kurikulum 2026 Toggle */}
                <button
                  onClick={() => handleToggleCurriculumActive(2026)}
                  id="toggle-curr-2026"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                    curriculumAvailability[2026] !== false
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                      : 'bg-slate-50 border-slate-300 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-white ${
                      curriculumAvailability[2026] !== false ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    {curriculumAvailability[2026] !== false ? '✓' : '✕'}
                  </div>
                  <span>Kurikulum 2026 (OBE)</span>
                  <span className="text-[10px] uppercase font-bold opacity-80">
                    {curriculumAvailability[2026] !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </button>

                {/* Kurikulum 2022 Toggle */}
                <button
                  onClick={() => handleToggleCurriculumActive(2022)}
                  id="toggle-curr-2022"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
                    curriculumAvailability[2022] !== false
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900 hover:bg-indigo-100'
                      : 'bg-slate-50 border-slate-300 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] text-white ${
                      curriculumAvailability[2022] !== false ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    {curriculumAvailability[2022] !== false ? '✓' : '✕'}
                  </div>
                  <span>Kurikulum 2022</span>
                  <span className="text-[10px] uppercase font-bold opacity-80">
                    {curriculumAvailability[2022] !== false ? 'Aktif' : 'Nonaktif'}
                  </span>
                </button>
              </div>
            </div>

            {/* Row 2: Semester Filter, Search, and Add Custom Course */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Semester Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <button
                  onClick={() => setSelectedSemesterFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedSemesterFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Semester
                </button>
                {termSemesters.map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemesterFilter(sem)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedSemesterFilter === sem
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semester {sem}
                  </button>
                ))}
              </div>

              {/* Search and Add Course */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari kode/nama MK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
                  />
                </div>

                <button
                  onClick={() => setIsAddCustomModalOpen(true)}
                  id="btn-add-custom-course"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tambah MK Luar Paket</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Summary Top Pill */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>
                Status Pemilihan: <strong>{totalPlannedCoursesCount} Mata Kuliah Terpilih</strong> ({totalPlannedStudentsCount} Total Mahasiswa • {totalCalculatedSectionsCount} Estimasi Rombel)
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              * Centang checkbox di header paket untuk memilih seluruh MK teori sekaligus.
            </div>
          </div>

          {/* Grouped Semester & Package Cards */}
          <div className="space-y-6">
            {termSemesters
              .filter((sem) => selectedSemesterFilter === 'all' || selectedSemesterFilter === sem)
              .map((sem) => {
                const packagesForSem = activePackages.filter((p) => p.semester === sem);
                const cohortProjection = COHORT_PROJECTIONS[sem] || 40;

                // Check if all packages for this semester are empty or disabled
                if (packagesForSem.length === 0) {
                  return (
                    <div
                      key={sem}
                      className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-2"
                    >
                      <h3 className="font-bold text-sm text-slate-800">SEMESTER {sem}</h3>
                      <p className="text-xs text-slate-400">
                        Tidak ada paket aktif untuk semester {sem} (kurikulum terkait dinonaktifkan).
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={sem} className="space-y-3">
                    {/* Semester Section Header with Quick Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-2.5">
                        <div className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-black text-xs shadow-2xs">
                          SEMESTER {sem}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          Proyeksi Kuota Angkatan: <strong>{cohortProjection} Mahasiswa</strong>
                        </span>
                      </div>

                      {/* Quick Bulk Actions for this semester */}
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          onClick={() => handleBulkSelectSemester(sem, true)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                        >
                          + Pilih Semua Paket Sem {sem}
                        </button>
                        <button
                          onClick={() => handleBulkSelectSemester(sem, false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] transition-colors"
                        >
                          ✕ Kosongkan Sem {sem}
                        </button>
                      </div>
                    </div>

                    {/* Render Packages for this semester */}
                    <div className="grid grid-cols-1 gap-4">
                      {packagesForSem.map((pkg) => {
                        const rawItems = pkg.courseItems || [];
                        const validCourses = rawItems
                          .map((item) => {
                            const c = courseMap.get(item.courseId);
                            return c
                              ? {
                                  course: c,
                                  kbkId: item.kbkId || pkg.kbkId || null,
                                }
                              : null;
                          })
                          .filter((item): item is { course: Course; kbkId: string | null } => Boolean(item))
                          .filter(({ course }) => {
                            if (!searchQuery) return true;
                            return (
                              course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              course.code.toLowerCase().includes(searchQuery.toLowerCase())
                            );
                          });

                        if (validCourses.length === 0 && searchQuery) {
                          return null;
                        }

                        const theoryCourses = validCourses.filter((v) => !checkIsPracticum(v.course));
                        const selectedCountInPkg = validCourses.filter((v) =>
                          Boolean(plannedCourses[v.course.id])
                        ).length;
                        const isAllPkgSelected =
                          theoryCourses.length > 0 &&
                          theoryCourses.every((v) => Boolean(plannedCourses[v.course.id]));
                        const totalPkgSks = validCourses.reduce((acc, v) => acc + (v.course.sks || 0), 0);

                        const kbkObj = pkg.kbkId ? kbks.find((k) => k.id === pkg.kbkId) : null;
                        const kbkLabel = kbkObj ? `KBK ${kbkObj.code} (${kbkObj.name})` : pkg.kbkId ? `KBK ${pkg.kbkId}` : 'Paket Bersama';

                        return (
                          <div
                            key={pkg.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                          >
                            {/* Package Header Card */}
                            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isAllPkgSelected}
                                    onChange={() => handleTogglePackage(pkg)}
                                    className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                  />
                                  <div className="font-bold text-xs text-slate-900">
                                    Pilih Paket Semester {pkg.semester} — Kurikulum {pkg.curriculumYear}
                                  </div>
                                </label>

                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    pkg.kbkId
                                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                      : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                  }`}
                                >
                                  {kbkLabel}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-slate-500">
                                  {validCourses.length} MK ({totalPkgSks} SKS)
                                </span>
                                <span className="text-slate-300">•</span>
                                <span
                                  className={`font-bold ${
                                    selectedCountInPkg > 0 ? 'text-indigo-600' : 'text-slate-400'
                                  }`}
                                >
                                  {selectedCountInPkg}/{validCourses.length} Terpilih
                                </span>
                              </div>
                            </div>

                            {/* Course Table for Desktop / Tablet */}
                            <div className="hidden md:block overflow-x-auto">
                              <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-50/60 text-slate-500 font-bold border-b border-slate-100">
                                  <tr>
                                    <th className="p-3 w-12 text-center">Pilih</th>
                                    <th className="p-3">Kode & Mata Kuliah</th>
                                    <th className="p-3 w-20">SKS</th>
                                    <th className="p-3 w-32">Kategori</th>
                                    <th className="p-3 w-48">Jumlah Mahasiswa</th>
                                    <th className="p-3">Estimasi Rombel & Section</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                   {validCourses.map(({ course, kbkId }) => {
                                    const isSelected = Boolean(plannedCourses[course.id]);
                                    const rawInput = studentInputMap[course.id] ?? '';
                                    const isPracticum = checkIsPracticum(course);
                                    const isRawEmpty = isSelected && !isPracticum && rawInput.trim() === '';
                                    const parsedNum = rawInput.trim() === '' ? null : parseInt(rawInput, 10);
                                    const isBelowMin = isSelected && !isPracticum && parsedNum !== null && parsedNum >= 1 && parsedNum < MIN_STUDENTS_PER_CLASS;
                                    const isValidCount = isSelected && !isPracticum && parsedNum !== null && parsedNum >= MIN_STUDENTS_PER_CLASS;
                                    const balanced = isValidCount ? createBalancedSections(parsedNum, MAX_STUDENTS_PER_CLASS) : [];

                                    return (
                                      <tr
                                        key={course.id}
                                        className={`transition-colors ${
                                          isSelected
                                            ? 'bg-indigo-50/30 font-medium'
                                            : 'hover:bg-slate-50/80 text-slate-700'
                                        }`}
                                      >
                                        {/* Checkbox */}
                                        <td className="p-3 text-center align-top">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() =>
                                              handleToggleCourse(
                                                course,
                                                pkg.semester,
                                                pkg.curriculumYear,
                                                kbkId
                                              )
                                            }
                                            className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer mt-1"
                                          />
                                        </td>

                                        {/* Course Details */}
                                        <td className="p-3 align-top">
                                          <div className="font-bold text-slate-900 leading-snug">
                                            {course.name}
                                          </div>
                                          <div className="text-[11px] text-slate-500 font-mono">
                                            {course.code}
                                          </div>
                                        </td>

                                        {/* SKS */}
                                        <td className="p-3 align-top">
                                          <span className="font-bold text-slate-800">
                                            {course.sks} SKS
                                          </span>
                                        </td>

                                        {/* Category Badge */}
                                        <td className="p-3 align-top">
                                          {isPracticum ? (
                                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px] whitespace-nowrap">
                                              Praktikum Lab
                                            </span>
                                          ) : course.category === 'Pilihan' ? (
                                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] whitespace-nowrap">
                                              MK Pilihan
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] whitespace-nowrap">
                                              MK Wajib
                                            </span>
                                          )}
                                        </td>

                                        {/* Student Count Input */}
                                        <td className="p-3 align-top">
                                          {isSelected ? (
                                            isPracticum ? (
                                              <span className="text-purple-700 font-semibold text-[11px] block py-1.5">
                                                Praktikum Lab
                                              </span>
                                            ) : (
                                              <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                  <input
                                                    id={`input-students-${course.id}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="Isi jumlah"
                                                    value={rawInput}
                                                    onChange={(e) =>
                                                      handleStudentInputChange(course.id, e.target.value)
                                                    }
                                                    onBlur={() =>
                                                      handleStudentInputBlur(course.id)
                                                    }
                                                    className={`w-28 px-2.5 py-1.5 text-xs rounded-xl border font-bold text-slate-900 transition-all ${
                                                      isRawEmpty
                                                        ? 'border-rose-400 focus:ring-2 focus:ring-rose-400 bg-rose-50/20'
                                                        : isBelowMin
                                                        ? 'border-amber-400 focus:ring-2 focus:ring-amber-400 bg-amber-50/20'
                                                        : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white'
                                                    }`}
                                                  />
                                                  <span className="text-[11px] text-slate-500 font-semibold">mhs</span>
                                                </div>

                                                {isRawEmpty && (
                                                  <div className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                                    <span className="text-rose-500 font-bold">⚠</span>
                                                    <span>Jumlah mahasiswa wajib diisi</span>
                                                  </div>
                                                )}

                                                {isBelowMin && (
                                                  <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                                    <span className="text-amber-500 font-bold">⚠</span>
                                                    <span>Minimal 10 mahasiswa untuk membuka kelas</span>
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          ) : (
                                            <div className="flex items-center gap-1.5 opacity-40">
                                              <input
                                                type="text"
                                                disabled
                                                placeholder="Isi jumlah"
                                                value=""
                                                className="w-28 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                                              />
                                              <span className="text-[11px] text-slate-400">mhs</span>
                                            </div>
                                          )}
                                        </td>

                                        {/* Section Breakdown Preview */}
                                        <td className="p-3 align-top">
                                          {isSelected ? (
                                            isPracticum ? (
                                              <span className="text-purple-700 font-semibold text-[11px] block py-1.5">
                                                Jadwal Khusus Lab
                                              </span>
                                            ) : isRawEmpty ? (
                                              <span className="text-slate-400 italic text-[11px] block py-1.5">
                                                Jumlah mahasiswa belum diisi
                                              </span>
                                            ) : isBelowMin ? (
                                              <span className="text-rose-600 font-bold text-[11px] block py-1.5">
                                                &lt; 10 mhs (Kelas Tidak Dibuka)
                                              </span>
                                            ) : isValidCount ? (
                                              <div className="py-1">
                                                <span className="text-indigo-700 font-bold text-xs">
                                                  {balanced.length} Rombel Kelas
                                                </span>
                                                <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                                                  {balanced.map((b) => `${b.section}: ${b.studentCount} mhs`).join(', ')}
                                                </div>
                                              </div>
                                            ) : (
                                              <span className="text-slate-400 block py-1.5">-</span>
                                            )
                                          ) : (
                                            <span className="text-slate-400 block py-1.5">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Mobile Stacked Cards for Course Selection (Screen < md) */}
                            <div className="md:hidden divide-y divide-slate-100">
                              {validCourses.map(({ course, kbkId }) => {
                                const isSelected = Boolean(plannedCourses[course.id]);
                                const rawInput = studentInputMap[course.id] ?? '';
                                const isPracticum = checkIsPracticum(course);
                                const isRawEmpty = isSelected && !isPracticum && rawInput.trim() === '';
                                const parsedNum = rawInput.trim() === '' ? null : parseInt(rawInput, 10);
                                const isBelowMin = isSelected && !isPracticum && parsedNum !== null && parsedNum >= 1 && parsedNum < MIN_STUDENTS_PER_CLASS;
                                const isValidCount = isSelected && !isPracticum && parsedNum !== null && parsedNum >= MIN_STUDENTS_PER_CLASS;
                                const balanced = isValidCount ? createBalancedSections(parsedNum, MAX_STUDENTS_PER_CLASS) : [];

                                return (
                                  <div
                                    key={`mob-${course.id}`}
                                    className={`p-3.5 space-y-2.5 transition-colors ${
                                      isSelected ? 'bg-indigo-50/40' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="pt-0.5 shrink-0">
                                        <input
                                          id={`cb-mob-${course.id}`}
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() =>
                                            handleToggleCourse(
                                              course,
                                              pkg.semester,
                                              pkg.curriculumYear,
                                              kbkId
                                            )
                                          }
                                          className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                        />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <label
                                          htmlFor={`cb-mob-${course.id}`}
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
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                              Praktikum
                                            </span>
                                          ) : course.category === 'Pilihan' ? (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                              Pilihan
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                              Wajib
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Mobile Input & Status (when selected) */}
                                    {isSelected && (
                                      <div className="pl-8 pt-1.5 space-y-2 border-t border-indigo-100/60 mt-1">
                                        {isPracticum ? (
                                          <div className="text-[11px] text-purple-700 font-semibold flex items-center gap-1">
                                            <span>🧪 Jadwal Khusus Praktikum Laboratorium</span>
                                          </div>
                                        ) : (
                                          <div className="space-y-1.5">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                              <span className="text-xs text-slate-700 font-semibold">
                                                Jumlah Mahasiswa:
                                              </span>
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  id={`input-mob-${course.id}`}
                                                  type="text"
                                                  inputMode="numeric"
                                                  placeholder="Jumlah"
                                                  value={rawInput}
                                                  onChange={(e) =>
                                                    handleStudentInputChange(course.id, e.target.value)
                                                  }
                                                  onBlur={() =>
                                                    handleStudentInputBlur(course.id)
                                                  }
                                                  className={`w-24 px-2.5 py-1 text-xs rounded-xl border font-bold text-slate-900 transition-all ${
                                                    isRawEmpty
                                                      ? 'border-rose-400 focus:ring-2 focus:ring-rose-400 bg-rose-50/20'
                                                      : isBelowMin
                                                      ? 'border-amber-400 focus:ring-2 focus:ring-amber-400 bg-amber-50/20'
                                                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white'
                                                  }`}
                                                />
                                                <span className="text-xs text-slate-500 font-medium">mhs</span>
                                              </div>
                                            </div>

                                            {isRawEmpty && (
                                              <div className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                                <span className="text-rose-500 font-bold">⚠</span>
                                                <span>Jumlah mahasiswa wajib diisi</span>
                                              </div>
                                            )}

                                            {isBelowMin && (
                                              <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                                <span className="text-amber-500 font-bold">⚠</span>
                                                <span>Minimal 10 mhs untuk membuka rombel</span>
                                              </div>
                                            )}

                                            {isValidCount && (
                                              <div className="p-2 rounded-xl bg-indigo-50/80 border border-indigo-100 text-[11px] text-indigo-950 space-y-0.5">
                                                <div className="font-bold text-indigo-900">
                                                  Status: {balanced.length} Rombel Kelas
                                                </div>
                                                <div className="text-slate-600 font-medium">
                                                  {balanced.map((b) => `${b.section}: ${b.studentCount} mhs`).join(', ')}
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
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Bottom Sticky Action Bar (Only shown when selectedCourseIds > 0) */}
          {totalPlannedCoursesCount > 0 && (
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-xl sticky bottom-4 z-20 animate-in fade-in slide-in-from-bottom-4 duration-200 border border-slate-800">
              <div className="min-w-0 flex-1">
                {/* Desktop Display */}
                <div className="hidden sm:block">
                  <div className="font-bold text-xs text-white">
                    {totalPlannedCoursesCount} Mata Kuliah Terpilih ({totalPlannedStudentsCount} Total Mahasiswa Terencana)
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {totalCalculatedSectionsCount} section rombel siap digenerate dan dialokasikan dosen.
                  </div>
                </div>
                {/* Mobile Compact Display */}
                <div className="sm:hidden">
                  <div className="font-bold text-xs text-white truncate">
                    {totalPlannedCoursesCount} MK • {totalPlannedStudentsCount} Mahasiswa
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {totalCalculatedSectionsCount} Rombel Siap
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToSections}
                id="btn-next-to-sections"
                className="shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs transition-all active:scale-95"
              >
                <span className="hidden xs:inline">Lanjut ke Pembagian Rombel</span>
                <span className="xs:hidden">Lanjut</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PEMBAGIAN KELAS / ROMBEL */}
      {activeStep === 'sections' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-slate-900">Hasil Pembagian Rombel Kelas Otomatis</h2>
                <p className="text-xs text-slate-500">
                  Kapasitas maksimum per kelas adalah {MAX_STUDENTS_PER_CLASS} mahasiswa (minimum {MIN_STUDENTS_PER_CLASS} mahasiswa).
                </p>
              </div>

              <button
                onClick={handleGenerateSections}
                id="btn-regenerate-sections"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all self-start"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Kalkulasi Ulang Rombel</span>
              </button>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="text-[10px] font-bold text-indigo-600 uppercase">Mata Kuliah Aktif</div>
                <div className="text-xl font-black text-indigo-950 mt-0.5">{totalPlannedCoursesCount} MK</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Total Rombel Kelas</div>
                <div className="text-xl font-black text-emerald-950 mt-0.5">{totalCalculatedSectionsCount} Section</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">Total Mahasiswa Terlayani</div>
                <div className="text-xl font-black text-slate-900 mt-0.5">{totalPlannedStudentsCount} Mahasiswa</div>
              </div>
            </div>
          </div>

          {/* Sections breakdown table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Mata Kuliah</th>
                    <th className="p-3.5">Sem & SKS</th>
                    <th className="p-3.5">Total Mahasiswa</th>
                    <th className="p-3.5">Jumlah Kelas</th>
                    <th className="p-3.5">Rincian Section & Kuota</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {calculatedSectionsBreakdown.map(({ planningItem, course, sections, warning }) => {
                    return (
                      <tr key={planningItem.courseId} className="hover:bg-slate-50/60">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{planningItem.courseName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{planningItem.courseCode}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-800">Sem {planningItem.semester}</span>
                          <span className="text-slate-400"> • </span>
                          <span className="text-slate-600">{planningItem.sks} SKS</span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {planningItem.totalStudents} mhs
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-bold text-xs">
                            {sections.length} Kelas
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {sections.map((sec) => (
                              <span
                                key={sec.section}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-[11px]"
                              >
                                Kelas <strong>{sec.section}</strong>: {sec.studentCount} mhs
                              </span>
                            ))}
                            {warning && (
                              <span className="text-rose-600 font-semibold text-[11px]">
                                ⚠️ {warning}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          {sections.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Siap Dosen
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              Tidak Terjadwal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setActiveStep('courses')}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
            >
              Kembali ke Pilih MK
            </button>

            <button
              onClick={() => setActiveStep('lecturers')}
              id="btn-next-to-lecturers"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
            >
              <span>Lanjut ke Penugasan Dosen</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PENUGASAN DOSEN */}
      {activeStep === 'lecturers' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <h2 className="font-bold text-base text-slate-900">Alokasi Dosen Pengampu per Kelas / Rombel</h2>
            <p className="text-xs text-slate-500">
              Setiap section kelas wajib ditugaskan ke dosen pengampu. Algoritma Simulated Annealing akan membaca ketersediaan waktu dosen tersebut.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Kode & Rombel</th>
                    <th className="p-3.5">Mata Kuliah</th>
                    <th className="p-3.5">Semester & SKS</th>
                    <th className="p-3.5">Peserta</th>
                    <th className="p-3.5 w-72">Dosen Pengampu</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {workingOfferings.map((offering) => {
                    const course = courseMap.get(offering.courseId);
                    const isAssigned = Boolean(offering.lecturerId || (offering.lecturerIds && offering.lecturerIds.length > 0));

                    return (
                      <tr key={offering.id} className="hover:bg-slate-50/60">
                        <td className="p-3.5">
                          <span className="font-bold text-indigo-900 font-mono">{offering.code}</span>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                            Kelas {offering.section}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{offering.courseName}</div>
                        </td>
                        <td className="p-3.5">
                          Sem {offering.semester} • {offering.sks} SKS
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          {offering.studentCount || offering.enrolledCount} mhs
                        </td>
                        <td className="p-3.5">
                          <select
                            value={offering.lecturerId || ''}
                            onChange={(e) => handleAssignLecturer(offering.id, e.target.value)}
                            className={`w-full px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                              isAssigned
                                ? 'border-slate-300 bg-white text-slate-900'
                                : 'border-amber-300 bg-amber-50/60 text-amber-900 font-bold'
                            }`}
                          >
                            <option value="">-- Pilih Dosen Pengampu --</option>
                            {lecturers.map((lec) => (
                              <option key={lec.id} value={lec.id}>
                                {lec.name} ({lec.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3.5">
                          {isAssigned ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Terisi
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Wajib Dipilih
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setActiveStep('sections')}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold"
            >
              Kembali ke Rombel
            </button>

            <button
              onClick={() => {
                handleExecuteGenerateSchedule();
                setActiveStep('schedule');
              }}
              id="btn-next-to-schedule"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
            >
              <span>Lanjut Generate Jadwal Awal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: GENERATE JADWAL AWAL & EDIT MANUAL */}
      {activeStep === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-base text-slate-900">Jadwal Awal (Initial Schedule) & Alokasi Ruangan</h2>
              <p className="text-xs text-slate-500">
                Draft jadwal telah ditempatkan pada slot waktu dan ruangan. Anda dapat memindahkan jadwal manual atau langsung optimasi.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onGenerateInitial('realistic')}
                id="btn-regen-initial-schedule"
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate Ulang Penempatan</span>
              </button>
              <button
                onClick={() => {
                  onRunOptimization();
                  setActiveStep('optimization');
                }}
                id="btn-start-sa-optimization"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Jalankan Optimasi SA</span>
              </button>
            </div>
          </div>

          {/* Quick Conflict Banner */}
          {activeConflicts.length > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Ditemukan <strong>{activeConflicts.length} potensi bentrok</strong> pada jadwal awal. Klik 'Jalankan Optimasi SA' untuk mengeliminasi bentrok secara otomatis.
                </span>
              </div>
              <button
                onClick={() => {
                  onRunOptimization();
                  setActiveStep('optimization');
                }}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700"
              >
                Optimasi Sekarang
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Jadwal saat ini berada dalam kondisi bebas bentrok (Zero Conflict).</span>
            </div>
          )}

          {/* Timetable List Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="font-bold text-xs text-slate-800">
                Daftar Sesi Penjadwalan Terisi ({currentSchedule?.length || 0} Sesi)
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Klik 'Detail & Pindah' untuk mengedit sesi atau ruangan secara manual
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Hari & Sesi Waktu</th>
                    <th className="p-3.5">Ruangan</th>
                    <th className="p-3.5">Mata Kuliah & Rombel</th>
                    <th className="p-3.5">Dosen Pengampu</th>
                    <th className="p-3.5 text-center">Status Audit</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {!currentSchedule || currentSchedule.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Belum ada jadwal yang digenerate. Klik 'Generate Ulang Penempatan' di atas.
                      </td>
                    </tr>
                  ) : (
                    currentSchedule.map((assignment) => {
                      const course = courseMap.get(assignment.courseId);
                      const room = roomMap.get(assignment.roomId);
                      const timeslot = timeslotMap.get(assignment.timeslotId);
                      const assignedLecs = (assignment.lecturerIds || (assignment.lecturerId ? [assignment.lecturerId] : []))
                        .map((id) => lecturerMap.get(id)?.name)
                        .filter(Boolean);

                      const itemConflicts = activeConflicts.filter(
                        (c) => c.assignment1Id === assignment.id || c.assignment2Id === assignment.id
                      );

                      const offering = workingOfferings.find((o) => o.id === assignment.courseOfferingId);
                      const secLabel = offering?.section || assignment.classId || '';

                      return (
                        <tr key={assignment.id} className="hover:bg-slate-50/60">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{timeslot?.day}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {timeslot?.startTime} - {timeslot?.endTime}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800">{room?.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {room?.code} • Kapasitas {room?.capacity}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{course?.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {secLabel ? `Kelas ${secLabel}` : ''} • Sem {course?.semester} • {course?.sks} SKS
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="text-slate-800 font-semibold">
                              {assignedLecs.length > 0 ? assignedLecs.join(', ') : (
                                <span className="text-amber-600 italic">Belum Ditentukan</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            {itemConflicts.length > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                                ⚠️ {itemConflicts[0].description || 'Konflik'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Valid
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => setSelectedAssignmentForDetail(assignment)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-semibold"
                            >
                              Detail & Pindah
                            </button>
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

      {/* STEP 5: OPTIMASI SIMULATED ANNEALING */}
      {activeStep === 'optimization' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-base text-slate-900">Engine Optimasi Simulated Annealing</h2>
                <p className="text-xs text-slate-500">
                  Algoritma SA mengeksplorasi neighborhood move untuk mengeliminasi bentrok ruang, waktu dosen, dan paket semester.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isOptimizing ? (
                  <button
                    onClick={onStopOptimization}
                    id="btn-stop-sa-live"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    <span>Hentikan Optimasi</span>
                  </button>
                ) : (
                  <button
                    onClick={onRunOptimization}
                    id="btn-run-sa-live"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Mulai Optimasi Simulated Annealing</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Progress Metrics */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Progress Penjadwalan SA</span>
                <span>{liveProgressData ? `${Math.round(liveProgressData.progressPercent)}%` : isOptimizing ? 'Berjalan...' : 'Siap'}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${liveProgressData?.progressPercent || (activeOptimizationResult ? 100 : 0)}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Current Temp</div>
                  <div className="text-base font-black text-indigo-900 mt-0.5">
                    {liveProgressData?.currentTemperature ? liveProgressData.currentTemperature.toFixed(2) : '1000.00'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Hard Conflicts</div>
                  <div className="text-base font-black text-rose-600 mt-0.5">
                    {liveProgressData?.hardConflicts ?? activeConflicts.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Best Cost</div>
                  <div className="text-base font-black text-emerald-600 mt-0.5">
                    {liveProgressData?.bestCost ? Math.round(liveProgressData.bestCost) : (activeOptimizationResult?.bestCost || 0)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Iterasi</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {liveProgressData?.iteration ?? (activeOptimizationResult?.totalIterationsCompleted || 0)}
                  </div>
                </div>
              </div>

              {/* Convergence Line Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      activeOptimizationResult?.convergenceHistory && activeOptimizationResult.convergenceHistory.length > 0
                        ? activeOptimizationResult.convergenceHistory
                        : [
                            {
                              iteration: 0,
                              currentCost: 2500,
                              bestCost: 2500,
                              temperature: 1000,
                              currentConflicts: 12,
                              bestConflicts: 12,
                              hardConflicts: 6,
                              softConflicts: 6,
                            },
                          ]
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="iteration" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="bestCost"
                      name="Best Penalty / Cost"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Temperature (T)"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setActiveStep('results')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <span>Lihat Evaluasi & Hasil Akhir</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: HASIL, PERBANDINGAN & TERBITKAN */}
      {activeStep === 'results' && (
        <div className="space-y-6">
          {/* Before vs After Comparison Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-base text-slate-900">Perbandingan Kualitas Jadwal (Sebelum vs Sesudah)</h2>
                <p className="text-xs text-slate-500">
                  Evaluasi peningkatan kualitas jadwal hasil optimasi Simulated Annealing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cetak Jadwal</span>
                </button>
                <button
                  onClick={onPublishSchedule}
                  id="btn-publish-schedule-unified"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>Terbitkan Jadwal Resmi</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Kondisi Awal (Heuristik)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-800">
                    {activeOptimizationResult?.initialConflicts?.total ?? 12}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">Konflik Terdeteksi</span>
                </div>
                <div className="text-xs text-slate-600">
                  Initial Cost: <span className="font-bold">{activeOptimizationResult?.initialCost || 3500}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="text-[11px] font-bold text-emerald-700 uppercase">Hasil Akhir (Setelah SA)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-800">
                    {activeConflicts.length}
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">
                    {activeConflicts.length === 0 ? '0 Konflik (Zero Hard Conflict!)' : 'Konflik Tersisa'}
                  </span>
                </div>
                <div className="text-xs text-emerald-800">
                  Final Cost: <span className="font-bold">{activeOptimizationResult?.bestCost || 0}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                <div className="text-[11px] font-bold text-indigo-700 uppercase">Efisiensi Eksekusi</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-900">
                    {activeOptimizationResult?.executionTimeMs ? `${(activeOptimizationResult.executionTimeMs / 1000).toFixed(2)}s` : '1.85s'}
                  </span>
                </div>
                <div className="text-xs text-indigo-700">
                  Total Iterasi: <span className="font-bold">{activeOptimizationResult?.totalIterationsCompleted || 5000} iterasi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Timetable Summary */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-slate-900">Ringkasan Jadwal Terpublikasi</h2>
              <span className="text-xs font-semibold text-slate-600">
                {currentSchedule?.length || 0} Sesi Kuliah Terjadwal
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-bold text-slate-900">Status Publikasi: {scheduleStatus.toUpperCase()}</div>
                <div className="text-slate-500">
                  Jadwal dapat diakses oleh dosen dan mahasiswa melalui Portal Dosen dan Portal Mahasiswa.
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveStep('courses');
                  showToast('info', 'Mulai Siklus Baru', 'Silakan pilih mata kuliah untuk penjadwalan semester berikutnya.');
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition-colors"
              >
                Susun Jadwal Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL & MOVE ASSIGNMENT */}
      {selectedAssignmentForDetail && (
        <Modal
          isOpen={Boolean(selectedAssignmentForDetail)}
          onClose={() => setSelectedAssignmentForDetail(null)}
          title="Detail & Pemindahan Jadwal"
        >
          <div className="space-y-4 text-xs">
            {(() => {
              const c = courseMap.get(selectedAssignmentForDetail.courseId);
              const r = roomMap.get(selectedAssignmentForDetail.roomId);
              const t = timeslotMap.get(selectedAssignmentForDetail.timeslotId);
              const offering = workingOfferings.find((o) => o.id === selectedAssignmentForDetail.courseOfferingId);
              const secLabel = offering?.section || selectedAssignmentForDetail.classId || '';

              return (
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 border border-slate-200">
                  <div className="font-bold text-sm text-slate-900">{c?.name}</div>
                  <div className="text-slate-600">
                    Kode: <span className="font-mono font-bold">{c?.code}</span> • SKS: {c?.sks} • Kelas {secLabel}
                  </div>
                  <div className="text-slate-600">
                    Posisi Saat Ini: <span className="font-bold text-indigo-900">{t?.day}, {t?.startTime}-{t?.endTime}</span> di <span className="font-bold text-indigo-900">{r?.name}</span>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block font-bold text-slate-600 mb-1">Pindahkan ke Ruangan:</label>
              <select
                id="select-move-room"
                defaultValue={selectedAssignmentForDetail.roomId}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
                onChange={(e) => {
                  const newRoomId = e.target.value;
                  onManualMoveAssignment(
                    selectedAssignmentForDetail.id,
                    selectedAssignmentForDetail.timeslotId,
                    newRoomId,
                    'Manual Move',
                    'Pemindahan ruangan manual oleh Admin'
                  );
                  setSelectedAssignmentForDetail(null);
                  showToast('success', 'Ruangan Diperbarui', 'Ruangan berhasil dipindahkan.');
                }}
              >
                {rooms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name} ({rm.code}) - Kap: {rm.capacity}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Pindahkan ke Sesi Waktu:</label>
              <select
                id="select-move-timeslot"
                defaultValue={selectedAssignmentForDetail.timeslotId}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white"
                onChange={(e) => {
                  const newTimeslotId = e.target.value;
                  onManualMoveAssignment(
                    selectedAssignmentForDetail.id,
                    newTimeslotId,
                    selectedAssignmentForDetail.roomId,
                    'Manual Move',
                    'Pemindahan waktu manual oleh Admin'
                  );
                  setSelectedAssignmentForDetail(null);
                  showToast('success', 'Sesi Waktu Diperbarui', 'Waktu perkuliahan berhasil dipindahkan.');
                }}
              >
                {timeslots.map((ts) => (
                  <option key={ts.id} value={ts.id}>
                    {ts.day} ({ts.startTime} - {ts.endTime})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: TAMBAH MATA KULIAH LUAR PAKET */}
      {isAddCustomModalOpen && (
        <Modal
          isOpen={isAddCustomModalOpen}
          onClose={() => {
            setIsAddCustomModalOpen(false);
            setCustomCourseSearch('');
          }}
          title="Tambah Mata Kuliah Luar Paket"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600">
              Pilih mata kuliah dari Master Data untuk dimasukkan ke dalam rencana penjadwalan periode ini secara manual.
            </p>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Cari & Pilih Mata Kuliah:</label>
              <input
                type="text"
                placeholder="Ketik nama atau kode mata kuliah..."
                value={customCourseSearch}
                onChange={(e) => setCustomCourseSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs mb-2 focus:ring-2 focus:ring-indigo-500"
              />
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                {courses
                  .filter((c) => {
                    if (!customCourseSearch) return true;
                    return (
                      c.name.toLowerCase().includes(customCourseSearch.toLowerCase()) ||
                      c.code.toLowerCase().includes(customCourseSearch.toLowerCase())
                    );
                  })
                  .slice(0, 20)
                  .map((c) => {
                    const isAlreadyPlanned = Boolean(plannedCourses[c.id]);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAddCustomCourse(c)}
                        className="w-full text-left p-2.5 hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                      >
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-indigo-900">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {c.code} • {c.sks} SKS • {c.category || 'Wajib'}
                          </div>
                        </div>
                        <div>
                          {isAlreadyPlanned ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Sudah Dipilih
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[11px] group-hover:bg-indigo-700">
                              + Pilih
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Semester:</label>
                <select
                  value={customCourseSemester}
                  onChange={(e) => setCustomCourseSemester(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kurikulum:</label>
                <select
                  value={customCourseCurriculum}
                  onChange={(e) => setCustomCourseCurriculum(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value={2026}>Kurikulum 2026</option>
                  <option value={2022}>Kurikulum 2022</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">KBK (Opsional):</label>
                <select
                  value={customCourseKbk}
                  onChange={(e) => setCustomCourseKbk(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">(Bersama / Umum)</option>
                  {kbks.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.code} - {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Est. Mahasiswa:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Isi jumlah"
                  value={customCourseStudents}
                  onChange={(e) => setCustomCourseStudents(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-bold"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
