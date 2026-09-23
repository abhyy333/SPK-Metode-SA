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
  LayoutGrid,
  History as HistoryIcon,
  Maximize2,
  ShieldAlert,
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
import { MasterLecturerService } from '../services/masterLecturerService';
import { AcademicPeriod } from '../types/masterLecturer';
import { PublishBlockedModal } from '../components/schedule/PublishBlockedModal';
import { PublishConfirmModal } from '../components/schedule/PublishConfirmModal';
import {
  validateScheduleForPublish,
  PublishValidationReport,
} from '../utils/publishValidation';
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
import { SchedulingModeSelector } from '../components/schedule/SchedulingModeSelector';
import { SchedulingActiveModeHeader } from '../components/schedule/SchedulingActiveModeHeader';
import { SchedulingTemplateView } from '../components/schedule/SchedulingTemplateView';
import { SchedulingCustomManualView } from '../components/schedule/SchedulingCustomManualView';
import { ScheduleBlockMatrix } from '../components/schedule/ScheduleBlockMatrix';
import { ConflictInspectorModal } from '../components/schedule/ConflictInspectorModal';
import { AssignmentAdjustmentModal } from '../components/schedule/AssignmentAdjustmentModal';

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
  onNavigate?: (view: string) => void;
  initialMode?: 'template' | 'custom' | 'new' | null;
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
  onNavigate,
  initialMode = null,
}) => {
  const { showToast } = useToast();

  // Load draft metadata from storage
  const initialDraftMeta = useMemo(() => StorageService.getScheduleDraftMetadata(), []);

  // Creation mode: 'template' | 'custom' | null
  const [scheduleCreationMode, setScheduleCreationMode] = useState<'template' | 'custom' | null>(() => {
    if (initialMode === 'template') return 'template';
    if (initialMode === 'custom') return 'custom';
    if (initialMode === 'new') return null;
    if (initialDraftMeta?.scheduleCreationMode) return initialDraftMeta.scheduleCreationMode;
    return null; // Initial state: show selection screen
  });

  // Track if composition flow is active (Requirement 4: Empty state when no active schedule)
  const [isComposing, setIsComposing] = useState<boolean>(() => {
    if (initialMode) return true;
    if (currentSchedule && currentSchedule.length > 0) return true;
    if (initialDraftMeta?.scheduleCreationMode) return true;
    return false;
  });

  // Listen to active-schedule-deleted event
  useEffect(() => {
    const handleActiveScheduleDeleted = () => {
      setPlannedCourses({});
      setStudentInputMap({});
      setWorkingOfferings([]);
      setScheduleCreationMode(null);
      setIsComposing(false);
      setActiveStep('courses');
    };
    window.addEventListener('active-schedule-deleted', handleActiveScheduleDeleted);
    return () => window.removeEventListener('active-schedule-deleted', handleActiveScheduleDeleted);
  }, []);

  // Sync initialMode if passed from navigation
  useEffect(() => {
    if (initialMode) {
      setIsComposing(true);
      if (initialMode === 'template') {
        setScheduleCreationMode('template');
        setActiveStep('courses');
      } else if (initialMode === 'custom') {
        setScheduleCreationMode('custom');
        setActiveStep('courses');
      } else if (initialMode === 'new') {
        setScheduleCreationMode(null);
        setActiveStep('courses');
      }
    }
  }, [initialMode]);

  // Active step in the unified workflow with persistence
  const [activeStep, setActiveStep] = useState<SchedulingStep>(() => {
    const savedMeta = StorageService.getScheduleDraftMetadata();
    if (savedMeta?.activeStep) return savedMeta.activeStep as SchedulingStep;
    if (currentSchedule && currentSchedule.length > 0) return 'results';
    return 'courses';
  });

  // Semester configuration
  const [academicTerm, setAcademicTerm] = useState<'ganjil' | 'genap'>(() => {
    return initialDraftMeta?.templateType || 'ganjil';
  });

  // Filter and view states
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Results step view mode: 'matrix' | 'table'
  const [resultsViewMode, setResultsViewMode] = useState<'matrix' | 'table'>('matrix');
  const [isConfirmPublishModalOpen, setIsConfirmPublishModalOpen] = useState(false);
  const [isPublishBlockedOpen, setIsPublishBlockedOpen] = useState(false);
  const [isConflictInspectorOpen, setIsConflictInspectorOpen] = useState(false);
  const [conflictInspectorTab, setConflictInspectorTab] = useState<'conflicts' | 'warnings'>('conflicts');
  const [highlightAssignmentId, setHighlightAssignmentId] = useState<string | null>(null);
  const [publishReportState, setPublishReportState] = useState<PublishValidationReport | null>(null);

  // Focus specific assignment from conflict/warning inspector
  const handleFocusAssignment = (assignmentId: string) => {
    setResultsViewMode('matrix');
    setHighlightAssignmentId(assignmentId);
    const target = (currentSchedule || []).find((a) => a.id === assignmentId);
    if (target) {
      setSelectedAssignmentForDetail(target);
    }
    setTimeout(() => {
      setHighlightAssignmentId((prev) => (prev === assignmentId ? null : prev));
    }, 3500);
  };

  // Custom Manual Filter States
  const [customFilterCurriculum, setCustomFilterCurriculum] = useState<number | 'all'>('all');
  const [customFilterSemester, setCustomFilterSemester] = useState<number | 'all'>('all');
  const [customFilterKbk, setCustomFilterKbk] = useState<string | 'all'>('all');
  const [customFilterCategory, setCustomFilterCategory] = useState<string | 'all'>('all');
  const [customFilterSearch, setCustomFilterSearch] = useState<string>('');

  // Switch Mode Modal State
  const [isSwitchModeModalOpen, setIsSwitchModeModalOpen] = useState(false);
  const [targetSwitchMode, setTargetSwitchMode] = useState<'template' | 'custom'>('template');

  // Curriculum availability toggle state (2026 and 2022)
  const [curriculumAvailability, setCurriculumAvailability] = useState<Record<number, boolean>>(() => {
    return StorageService.getCurriculumAvailability(academicYear);
  });

  // Course Selection & Student count planning state - NO AUTO CHECK BY DEFAULT, persisted across sessions
  const [plannedCourses, setPlannedCourses] = useState<Record<string, CoursePlanningItem>>(() => {
    return initialDraftMeta?.plannedCourses || {};
  });

  // Real-time string representation of student count inputs to support empty strings, seamless editing, and no leading zeros
  const [studentInputMap, setStudentInputMap] = useState<Record<string, string>>(() => {
    return initialDraftMeta?.studentInputMap || {};
  });

  // Offerings generated for the active session
  const [workingOfferings, setWorkingOfferings] = useState<CourseOffering[]>(() => {
    return StorageService.getCourseOfferings() || [];
  });

  // Real-time validation report for publishing
  const publishReport = useMemo(() => {
    return validateScheduleForPublish(
      currentSchedule,
      workingOfferings.length > 0 ? workingOfferings : StorageService.getCourseOfferings(),
      courses,
      lecturers,
      rooms,
      timeslots,
      weights,
      curriculumPackages
    );
  }, [currentSchedule, workingOfferings, courses, lecturers, rooms, timeslots, weights, curriculumPackages]);

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
      setScheduleCreationMode(null);
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

  // Save draft metadata whenever activeStep, mode, term, planned courses, or inputs change
  useEffect(() => {
    if (scheduleCreationMode || Object.keys(plannedCourses).length > 0 || workingOfferings.length > 0) {
      StorageService.saveScheduleDraftMetadata({
        activeStep,
        scheduleCreationMode,
        templateType: academicTerm,
        plannedCourses,
        studentInputMap,
        selectedCourseIds: Object.keys(plannedCourses),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [activeStep, scheduleCreationMode, academicTerm, plannedCourses, studentInputMap, workingOfferings]);

  // Modals & Menu for Schedule Lifecycle
  const [isNewScheduleModalOpen, setIsNewScheduleModalOpen] = useState(false);
  const [isDeleteScheduleModalOpen, setIsDeleteScheduleModalOpen] = useState(false);
  const [saveSnapshotBeforeDelete, setSaveSnapshotBeforeDelete] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Handle Start New Schedule (Preserves Snapshot to History)
  const handleConfirmNewSchedule = () => {
    // 1. Auto-save snapshot of current schedule if assignments or offerings exist
    if ((currentSchedule && currentSchedule.length > 0) || workingOfferings.length > 0) {
      StorageService.createScheduleVersion(
        `Snapshot Sebelum Jadwal Baru (${new Date().toLocaleDateString('id-ID')})`,
        currentSchedule || []
      );
    }

    // 2. Reset workspace
    setPlannedCourses({});
    setStudentInputMap({});
    setWorkingOfferings([]);
    onUpdateOfferings([]);
    onSaveSchedule([]);
    StorageService.saveCurrentSchedule([]);
    StorageService.saveCourseOfferings([]);
    StorageService.setScheduleStatus('draft');
    StorageService.clearScheduleDraftMetadata();
    setScheduleCreationMode(null);

    setActiveStep('courses');
    setIsNewScheduleModalOpen(false);
    showToast(
      'success',
      'Jadwal Baru Dimulai',
      'Workspace telah dibersihkan. Snapshot jadwal sebelumnya tersimpan di Riwayat & Versi.'
    );
  };

  // Handle Delete Schedule (Keeps Master Data Intact)
  const handleConfirmDeleteSchedule = () => {
    StorageService.deleteActiveSchedule(
      StorageService.getCurrentUser(),
      saveSnapshotBeforeDelete && Boolean((currentSchedule && currentSchedule.length > 0) || workingOfferings.length > 0)
    );

    // Clear active schedule assignments & offerings only (Master data stays untouched!)
    setPlannedCourses({});
    setStudentInputMap({});
    setWorkingOfferings([]);
    onUpdateOfferings([]);
    onSaveSchedule([]);
    setScheduleCreationMode(null);
    setIsComposing(false); // CRITICAL: Reset composition mode so empty state shows!

    setActiveStep('courses');
    setIsDeleteScheduleModalOpen(false);
    showToast(
      'success',
      'Jadwal Aktif Dihapus',
      'Jadwal aktif berhasil dihapus dan dikosongkan. Data Master tetap terjaga aman.'
    );
  };

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

  // Compute all unique courses present in the active curriculum packages for Template Mode
  const allTemplateCourses = useMemo(() => {
    const list: {
      course: Course;
      semester: number;
      curriculumYear: number;
      kbkId: string | null;
      pkgId: string;
    }[] = [];
    const seen = new Set<string>();

    activePackages.forEach((pkg) => {
      (pkg.courseItems || []).forEach((item) => {
        const c = courseMap.get(item.courseId);
        if (c && !seen.has(c.id)) {
          seen.add(c.id);
          list.push({
            course: c,
            semester: pkg.semester,
            curriculumYear: pkg.curriculumYear || 2026,
            kbkId: item.kbkId || pkg.kbkId || null,
            pkgId: pkg.id,
          });
        }
      });
    });
    return list;
  }, [activePackages, courseMap]);

  const totalTemplateCoursesCount = allTemplateCourses.length;

  // Global Select All for Template Mode
  const handleSelectAllTemplate = () => {
    setPlannedCourses((prev) => {
      const next = { ...prev };
      allTemplateCourses.forEach(({ course, semester, curriculumYear, kbkId }) => {
        const isPracticum = checkIsPracticum(course);
        if (!isPracticum) {
          next[course.id] = {
            courseId: course.id,
            courseCode: course.code,
            courseName: course.name,
            sks: course.sks,
            semester,
            curriculumYear,
            kbkId,
            totalStudents: next[course.id]?.totalStudents || 0,
            assignedLecturerId: course.lecturerId || null,
            assignedLecturerIds: course.lecturerId ? [course.lecturerId] : [],
            isPracticum: false,
            allowBelowMinimum: false,
          };
        }
      });
      return next;
    });

    setStudentInputMap((prev) => {
      const next = { ...prev };
      allTemplateCourses.forEach(({ course }) => {
        if (next[course.id] === undefined) {
          next[course.id] = '';
        }
      });
      return next;
    });

    showToast(
      'info',
      'Semua MK Template Dipilih',
      `${allTemplateCourses.filter((t) => !checkIsPracticum(t.course)).length} mata kuliah dari template aktif telah dicentang.`
    );
  };

  // Global Clear All Selections
  const handleClearAllSelected = () => {
    setPlannedCourses({});
    setStudentInputMap({});
    showToast('info', 'Pilihan Dikosongkan', 'Semua pilihan mata kuliah telah dibersihkan.');
  };

  // Custom Manual Filtered Pool
  const filteredCustomCourses = useMemo(() => {
    return courses.filter((c) => {
      // 1. Curriculum Filter
      if (customFilterCurriculum !== 'all') {
        const cCurrYear =
          (c as any).curriculumYear ||
          (c.curriculumId?.includes('2022') ||
          c.code?.startsWith('FBS') ||
          c.code?.startsWith('FBD') ||
          c.code?.startsWith('FBA') ||
          c.code?.startsWith('FBC')
            ? 2022
            : 2026);
        if (cCurrYear !== customFilterCurriculum) return false;
      }

      // 2. Semester Filter
      if (customFilterSemester !== 'all') {
        const sem = c.semester || (c as any).recommendedSemester || 1;
        if (sem !== customFilterSemester) return false;
      }

      // 3. KBK Filter
      if (customFilterKbk !== 'all') {
        if (customFilterKbk === 'none') {
          if (c.kbkId || (c.scopeKbk && c.scopeKbk.length > 0)) return false;
        } else {
          const kbkMatch =
            c.kbkId === customFilterKbk ||
            (c.scopeKbk && Array.isArray(c.scopeKbk) && c.scopeKbk.includes(customFilterKbk)) ||
            ((c as any).kbkIds && Array.isArray((c as any).kbkIds) && (c as any).kbkIds.includes(customFilterKbk));
          if (!kbkMatch) return false;
        }
      }

      // 4. Category Filter
      if (customFilterCategory !== 'all') {
        const isPrac = checkIsPracticum(c);
        if (customFilterCategory === 'Praktikum' && !isPrac) return false;
        if (customFilterCategory === 'Wajib' && (isPrac || c.category !== 'Wajib')) return false;
        if (customFilterCategory === 'Pilihan' && (isPrac || c.category !== 'Pilihan')) return false;
      }

      // 5. Search Filter
      if (customFilterSearch.trim()) {
        const q = customFilterSearch.toLowerCase();
        const codeMatch = (c.code || '').toLowerCase().includes(q);
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [courses, customFilterCurriculum, customFilterSemester, customFilterKbk, customFilterCategory, customFilterSearch]);

  // Check if course is outside the active semester term
  const isOutOfActivePeriod = (course: Course) => {
    const sem = course.semester || (course as any).recommendedSemester || 1;
    const isOdd = sem % 2 !== 0;
    if (academicTerm === 'ganjil' && !isOdd) return true; // Even semester inside Ganjil term
    if (academicTerm === 'genap' && isOdd) return true;   // Odd semester inside Genap term
    return false;
  };

  // Bulk select for filtered custom manual list
  const handleSelectAllFilteredCustom = () => {
    setPlannedCourses((prev) => {
      const next = { ...prev };
      filteredCustomCourses.forEach((c) => {
        const isPracticum = checkIsPracticum(c);
        if (!isPracticum) {
          const sem = c.semester || (c as any).recommendedSemester || 1;
          const currYear =
            (c as any).curriculumYear ||
            (c.curriculumId?.includes('2022') || c.code?.startsWith('FB') ? 2022 : 2026);
          next[c.id] = {
            courseId: c.id,
            courseCode: c.code,
            courseName: c.name,
            sks: c.sks,
            semester: sem,
            curriculumYear: currYear,
            kbkId: c.kbkId || null,
            totalStudents: next[c.id]?.totalStudents || 0,
            assignedLecturerId: c.lecturerId || null,
            assignedLecturerIds: c.lecturerId ? [c.lecturerId] : [],
            isPracticum: false,
            allowBelowMinimum: false,
          };
        }
      });
      return next;
    });

    setStudentInputMap((prev) => {
      const next = { ...prev };
      filteredCustomCourses.forEach((c) => {
        if (next[c.id] === undefined) {
          next[c.id] = '';
        }
      });
      return next;
    });

    showToast(
      'info',
      'MK Terfilter Dipilih',
      `${filteredCustomCourses.filter((c) => !checkIsPracticum(c)).length} mata kuliah dari hasil filter telah dicentang.`
    );
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

    // Auto-assign lecturers from Master Dosen Pengampu immediately after sections are formed
    const targetPeriod = (academicTerm === 'genap' ? 'GENAP' : 'GANJIL') as AcademicPeriod;
    const synced = MasterLecturerService.autoAssignLecturersToOfferings(newOfferings, targetPeriod);
    const finalOfferings = synced.updatedOfferings;

    setWorkingOfferings(finalOfferings);
    StorageService.saveCourseOfferings(finalOfferings);
    onUpdateOfferings(finalOfferings);
    showToast(
      'success',
      'Rombel & Auto-Assign Berhasil',
      `${finalOfferings.length} section kelas dibuat (${synced.autoAssignedCount} terisi dari master, ${synced.teamTeachingCount} team teaching).`
    );
  };

  // Sync lecturers manually from Master in Step 3
  const handleSyncLecturersFromMaster = () => {
    const targetPeriod = (academicTerm === 'genap' ? 'GENAP' : 'GANJIL') as AcademicPeriod;
    const synced = MasterLecturerService.autoAssignLecturersToOfferings(workingOfferings, targetPeriod);
    setWorkingOfferings(synced.updatedOfferings);
    StorageService.saveCourseOfferings(synced.updatedOfferings);
    onUpdateOfferings(synced.updatedOfferings);
    showToast(
      'success',
      'Sinkronisasi Master Dosen Selesai',
      `Berhasil memperbarui: ${synced.autoAssignedCount} terisi dari master, ${synced.teamTeachingCount} team teaching, ${synced.unmatchedCount} belum ada di master.`
    );
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
          lecturerCode: lec?.code,
          manualOverride: true,
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
    { id: 'results', label: '6. Preview & Publikasi', number: 6, desc: 'Review & Terbitkan' },
  ];

  const handleAttemptPublish = () => {
    const report = validateScheduleForPublish(
      currentSchedule,
      workingOfferings.length > 0 ? workingOfferings : StorageService.getCourseOfferings(),
      courses,
      lecturers,
      rooms,
      timeslots,
      weights,
      curriculumPackages
    );
    setPublishReportState(report);

    if (!report.isValid || report.hardConflictCount > 0) {
      setIsPublishBlockedOpen(true);
      return;
    }

    setIsConfirmPublishModalOpen(true);
  };

  // Requirement 4: Empty State when no active schedule
  if (!isComposing && (!currentSchedule || currentSchedule.length === 0)) {
    return (
      <div className="space-y-6 pb-12">
        {/* Cockpit Header */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                Workflow Penjadwalan Akademik
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Penyusunan Jadwal Perkuliahan
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Tahun Akademik {academicYear} • Teknik Elektro UNM
              </p>
            </div>
          </div>
        </div>

        {/* Empty State Banner (Requirement 4) */}
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-slate-200/80 shadow-2xs text-center max-w-xl mx-auto space-y-6 my-10">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              PENYUSUNAN JADWAL PERKULIAHAN
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-2">
              Belum ada jadwal perkuliahan aktif.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              Mulai penyusunan jadwal perkuliahan terpadu dengan integrasi paket semester, alokasi ruang kelas, kapasitas mahasiswa, dan optimasi Simulated Annealing.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setIsComposing(true);
                setScheduleCreationMode(null);
                setActiveStep('courses');
              }}
              id="btn-start-susun-jadwal"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>+ Susun Jadwal Baru</span>
            </button>
            <button
              onClick={() => {
                setIsComposing(true);
                setScheduleCreationMode('template');
                setActiveStep('courses');
              }}
              id="btn-start-gunakan-template"
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Gunakan Template</span>
            </button>
            <button
              onClick={() => {
                setIsComposing(true);
                setScheduleCreationMode('custom');
                setActiveStep('courses');
              }}
              id="btn-start-custom-manual"
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Custom Manual</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & SCHEDULE LIFECYCLE CONTROLS */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Penyusunan Jadwal Perkuliahan
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    {academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'} {academicYear}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Alur lengkap perencanaan mata kuliah, pembagian rombel, penugasan dosen, generate awal, hingga optimasi Simulated Annealing.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Start New Schedule */}
            <button
              onClick={() => setIsNewScheduleModalOpen(true)}
              id="btn-start-new-schedule"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Jadwal Baru
            </button>

            {/* Delete / Reset Schedule */}
            <button
              onClick={() => setIsDeleteScheduleModalOpen(true)}
              id="btn-delete-schedule"
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Jadwal
            </button>

            {/* View History */}
            {onNavigate && (
              <button
                onClick={() => onNavigate('schedule-history')}
                id="btn-navigate-history"
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <HistoryIcon className="w-4 h-4" />
                Riwayat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white rounded-md p-2.5 sm:p-3 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {stepsConfig.map((step, idx) => {
            const isActive = activeStep === step.id;
            const isCompleted =
              stepsConfig.findIndex((s) => s.id === activeStep) > idx;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => setActiveStep(step.id)}
                  id={`step-tab-${step.id}`}
                  className={`flex items-center gap-2 py-1 px-2 text-left transition-colors cursor-pointer border-b-2 ${
                    isActive
                      ? 'border-slate-900 text-slate-900 font-semibold'
                      : isCompleted
                      ? 'border-transparent text-slate-700 hover:text-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : isCompleted
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : step.number}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs leading-tight">{step.label}</div>
                    <div className="text-[10px] text-slate-400">{step.desc}</div>
                  </div>
                </button>

                {idx < stepsConfig.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden lg:block shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: PEMILIHAN MATA KULIAH & PROYEKSI MAHASISWA */}
      {activeStep === 'courses' && (
        <div className={`space-y-5 ${totalPlannedCoursesCount > 0 ? 'pb-24 sm:pb-20' : 'pb-4'}`}>
          {/* 1. INITIAL HERO SCREEN: MODE SELECTION (Shown if mode not chosen yet) */}
          {scheduleCreationMode === null && (
            <SchedulingModeSelector
              academicTerm={academicTerm}
              onSelectAcademicTerm={setAcademicTerm}
              onSelectMode={(mode) => {
                setScheduleCreationMode(mode);
                showToast(
                  'info',
                  mode === 'template' ? 'Mode Template Aktif' : 'Mode Custom Manual Aktif',
                  mode === 'template'
                    ? `Template Semester ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'} siap digunakan.`
                    : 'Pilih mata kuliah bebas dari seluruh data Master.'
                );
              }}
            />
          )}

          {/* 2. ACTIVE MODE HEADER BAR (When mode is selected) */}
          {scheduleCreationMode !== null && (
            <SchedulingActiveModeHeader
              scheduleCreationMode={scheduleCreationMode}
              academicTerm={academicTerm}
              onOpenSwitchModeModal={() => {
                setTargetSwitchMode(scheduleCreationMode === 'template' ? 'custom' : 'template');
                setIsSwitchModeModalOpen(true);
              }}
            />
          )}

          {/* 3. MODE: TEMPLATE SEMESTER CONTENT */}
          {scheduleCreationMode === 'template' && (
            <SchedulingTemplateView
              academicTerm={academicTerm}
              setAcademicTerm={setAcademicTerm}
              curriculumAvailability={curriculumAvailability}
              handleToggleCurriculumActive={handleToggleCurriculumActive}
              termSemesters={termSemesters}
              selectedSemesterFilter={selectedSemesterFilter}
              setSelectedSemesterFilter={setSelectedSemesterFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleSelectAllTemplate={handleSelectAllTemplate}
              handleClearAllSelected={handleClearAllSelected}
              totalPlannedCoursesCount={totalPlannedCoursesCount}
              totalTemplateCoursesCount={totalTemplateCoursesCount}
              totalPlannedStudentsCount={totalPlannedStudentsCount}
              totalCalculatedSectionsCount={totalCalculatedSectionsCount}
              activePackages={activePackages}
              COHORT_PROJECTIONS={COHORT_PROJECTIONS}
              handleBulkSelectSemester={handleBulkSelectSemester}
              courseMap={courseMap}
              checkIsPracticum={checkIsPracticum}
              plannedCourses={plannedCourses}
              studentInputMap={studentInputMap}
              kbks={kbks}
              handleTogglePackage={handleTogglePackage}
              handleToggleCourse={handleToggleCourse}
              handleStudentInputChange={handleStudentInputChange}
              handleStudentInputBlur={handleStudentInputBlur}
              createBalancedSections={createBalancedSections}
              MIN_STUDENTS_PER_CLASS={MIN_STUDENTS_PER_CLASS}
              MAX_STUDENTS_PER_CLASS={MAX_STUDENTS_PER_CLASS}
            />
          )}

          {/* 4. MODE: CUSTOM MANUAL CONTENT */}
          {scheduleCreationMode === 'custom' && (
            <SchedulingCustomManualView
              academicTerm={academicTerm}
              setAcademicTerm={setAcademicTerm}
              filteredCustomCourses={filteredCustomCourses}
              customFilterSearch={customFilterSearch}
              setCustomFilterSearch={setCustomFilterSearch}
              customFilterCurriculum={customFilterCurriculum}
              setCustomFilterCurriculum={setCustomFilterCurriculum}
              customFilterSemester={customFilterSemester}
              setCustomFilterSemester={setCustomFilterSemester}
              customFilterKbk={customFilterKbk}
              setCustomFilterKbk={setCustomFilterKbk}
              customFilterCategory={customFilterCategory}
              setCustomFilterCategory={setCustomFilterCategory}
              plannedCourses={plannedCourses}
              studentInputMap={studentInputMap}
              kbks={kbks}
              totalPlannedCoursesCount={totalPlannedCoursesCount}
              totalPlannedStudentsCount={totalPlannedStudentsCount}
              totalCalculatedSectionsCount={totalCalculatedSectionsCount}
              checkIsPracticum={checkIsPracticum}
              isOutOfActivePeriod={isOutOfActivePeriod}
              handleToggleCourse={handleToggleCourse}
              handleStudentInputChange={handleStudentInputChange}
              handleStudentInputBlur={handleStudentInputBlur}
              createBalancedSections={createBalancedSections}
              MIN_STUDENTS_PER_CLASS={MIN_STUDENTS_PER_CLASS}
              MAX_STUDENTS_PER_CLASS={MAX_STUDENTS_PER_CLASS}
              handleSelectAllFilteredCustom={handleSelectAllFilteredCustom}
              handleClearAllSelected={handleClearAllSelected}
            />
          )}

          {/* Bottom Sticky Action Bar (Only shown when totalPlannedCoursesCount > 0) */}
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
                className="shrink-0 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
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
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-bold text-base text-slate-900">Alokasi Dosen Pengampu per Kelas / Rombel</h2>
              <p className="text-xs text-slate-500">
                Setiap section kelas terhubung otomatis dengan Master Dosen Pengampu ({academicTerm.toUpperCase()}). Algoritma Simulated Annealing membaca ketersediaan waktu dosen terkait.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncLecturersFromMaster}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200"
                title="Sinkronkan ulang penugasan dosen dari Master Dosen Pengampu"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>Sinkronkan dari Master</span>
              </button>
            </div>
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
                    <th className="p-3.5 w-80">Dosen Pengampu</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {workingOfferings.map((offering) => {
                    const course = courseMap.get(offering.courseId);
                    const assignedIds = offering.lecturerIds && offering.lecturerIds.length > 0
                      ? offering.lecturerIds
                      : offering.lecturerId
                      ? [offering.lecturerId]
                      : [];
                    const isAssigned = assignedIds.length > 0;
                    const isOverride = offering.manualOverride === true;
                    const isMultiple = assignedIds.length > 1;

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
                        <td className="p-3.5 space-y-1.5">
                          {isMultiple && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {assignedIds.map((lid, idx) => {
                                const lObj = lecturerMap.get(lid);
                                return (
                                  <span
                                    key={lid}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[11px] font-medium border border-indigo-100"
                                  >
                                    <span className="font-bold text-[10px] text-indigo-500">#{idx + 1}</span>
                                    <span>{lObj ? `${lObj.name} (${lObj.code})` : lid}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
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
                        <td className="p-3.5 whitespace-nowrap">
                          {isOverride ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200">
                              ✎ Override Admin
                            </span>
                          ) : isMultiple ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200">
                              ✓ {assignedIds.length} Dosen dari Master
                            </span>
                          ) : isAssigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                              ✓ Terisi dari Master
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                              ⚠ Belum Ada di Master
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

            <div className="flex flex-wrap items-center gap-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('timetable')}
                  id="btn-open-timetable-workspace"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Buka Workspace Atur Jadwal dengan 3 Tampilan (Matriks Hari, Matriks Ruangan, Tabel Daftar)"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Atur Jadwal (Matriks 3-Mode)</span>
                </button>
              )}
              <button
                onClick={() => onGenerateInitial('realistic')}
                id="btn-regen-initial-schedule"
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
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

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setActiveStep('schedule')}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                >
                  Kembali ke Penempatan Awal
                </button>
                <button
                  onClick={() => setActiveStep('results')}
                  id="btn-goto-preview"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
                >
                  <span>Lanjut ke Preview & Publikasi Jadwal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: PREVIEW & PUBLIKASI JADWAL */}
      {activeStep === 'results' && (
        <div className="space-y-6">
          {/* Top Control Bar & Overview */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-5">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      Preview & Publikasi Jadwal
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        scheduleStatus === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        Status: {scheduleStatus === 'published' ? 'Diterbitkan (Resmi)' : 'Draft (Siap Review)'}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Periksa matriks penempatan jadwal, ruangan, dan dosen sebelum diterbitkan ke Portal Dosen dan Portal Mahasiswa.
                    </p>
                  </div>
                </div>
              </div>

              {/* View Switcher & Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* View Mode Toggle: Matrix vs Table */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
                  <button
                    onClick={() => setResultsViewMode('matrix')}
                    id="btn-view-mode-matrix"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      resultsViewMode === 'matrix'
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Papan Matriks (Grid)</span>
                  </button>
                  <button
                    onClick={() => setResultsViewMode('table')}
                    id="btn-view-mode-table"
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      resultsViewMode === 'table'
                        ? 'bg-white text-indigo-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Tabel Daftar Sesi</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveStep('schedule')}
                  id="btn-preview-manual-adjust"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Kembali ke Step 4 untuk memindahkan slot waktu atau ruangan"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sesuaikan Sesi</span>
                </button>

                <button
                  onClick={() => window.print()}
                  id="btn-preview-print"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cetak / Ekspor PDF</span>
                </button>

                {/* Publish Button with conflict validation lock */}
                <div className="relative group">
                  <button
                    onClick={handleAttemptPublish}
                    id="btn-publish-schedule-unified"
                    disabled={publishReport.hardConflictCount > 0}
                    title={
                      publishReport.hardConflictCount > 0
                        ? 'Tidak dapat menerbitkan jadwal karena masih terdapat konflik.'
                        : 'Terbitkan Jadwal Resmi'
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
                      publishReport.hardConflictCount > 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {publishReport.hardConflictCount > 0 ? (
                      <>
                        <ShieldAlert className="w-4 h-4 text-slate-400" />
                        <span>Terbitkan Jadwal (Terkunci)</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        <span>Terbitkan Jadwal Resmi</span>
                      </>
                    )}
                  </button>
                  {publishReport.hardConflictCount > 0 && (
                    <span className="hidden group-hover:block absolute bottom-full mb-1 right-0 w-64 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg text-center z-50 pointer-events-none">
                      Tidak dapat menerbitkan jadwal karena masih terdapat konflik.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Preview Summary Panel */}
            <div className="space-y-2.5 pt-2">
              <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <div className="font-bold text-slate-800">
                    Offering Terjadwal: <span className="font-black text-indigo-600">{publishReport.scheduledOfferings} Sesi</span>
                  </div>
                  <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
                  <button
                    onClick={() => {
                      if (publishReport.hardConflictCount > 0) {
                        setConflictInspectorTab('conflicts');
                        setIsConflictInspectorOpen(true);
                      }
                    }}
                    className={`font-semibold flex items-center gap-1.5 transition-colors ${
                      publishReport.hardConflictCount > 0
                        ? 'text-rose-600 hover:text-rose-700 font-bold cursor-pointer'
                        : 'text-emerald-600'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${publishReport.hardConflictCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span>{publishReport.hardConflictCount} Hard Conflict</span>
                  </button>
                  <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
                  <div className="text-slate-600 font-medium">
                    <span className="text-amber-600 font-semibold">{publishReport.softPenaltyCount} Soft Penalty</span>
                  </div>
                  <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
                  <button
                    onClick={() => {
                      if (publishReport.warningCount > 0) {
                        setConflictInspectorTab('warnings');
                        setIsConflictInspectorOpen(true);
                      }
                    }}
                    className={`font-semibold transition-colors ${
                      publishReport.warningCount > 0 ? 'text-amber-700 hover:underline cursor-pointer' : 'text-slate-500'
                    }`}
                  >
                    <span>{publishReport.warningCount} Belum Ada Dosen</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    publishReport.isPublishReady
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {publishReport.isPublishReady ? 'Siap Diterbitkan' : 'Belum Siap Terbit'}
                  </span>
                </div>
              </div>

              {/* Compact Conflict Alert (ONLY if hardConflictCount > 0) */}
              {publishReport.hardConflictCount > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      ⚠ Terdapat <strong className="font-bold">{publishReport.hardConflictCount} Hard Conflict</strong> pada jadwal. Periksa bentrok sebelum menerbitkan.
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
                    <button
                      onClick={async () => {
                        try {
                          await onRunOptimization();
                          showToast('success', 'Optimasi Selesai', 'Simulated Annealing selesai dijalankan.');
                        } catch (err: any) {
                          showToast('error', 'Optimasi Gagal', err.message || 'Gagal menjalankan optimasi.');
                        }
                      }}
                      disabled={isOptimizing}
                      id="btn-unified-quick-optimize"
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    >
                      <Zap className={`w-3.5 h-3.5 fill-current ${isOptimizing ? 'animate-spin' : ''}`} />
                      <span>{isOptimizing ? 'Optimasi...' : '⚡ Optimasi Sekarang'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Warning Alert for Missing Lecturers */}
              {publishReport.warningCount > 0 && (
                <div className="p-2.5 px-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Terdapat <strong>{publishReport.warningCount} kelas belum ada dosen pengampu</strong>.
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
          </div>

          {/* Quality Metrics Comparison (Before vs After SA) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Evaluasi Hasil Optimasi Simulated Annealing</h3>
                <p className="text-xs text-slate-500">Perbandingan efisiensi jadwal awal heuristik vs hasil optimasi annealing.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Kondisi Awal (Heuristik)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-800">
                    {activeOptimizationResult?.initialConflicts?.total ?? 12}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">Konflik Awal</span>
                </div>
                <div className="text-[11px] text-slate-600">
                  Initial Penalty Cost: <span className="font-bold">{activeOptimizationResult?.initialCost || 3500}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Hasil Akhir (Setelah SA)</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-emerald-800">
                    {publishReport.hardConflictCount}
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">
                    {publishReport.hardConflictCount === 0 ? 'Zero Conflict (Sempurna)' : 'Konflik Tersisa'}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800">
                  Final Penalty Cost: <span className="font-bold">{activeOptimizationResult?.bestCost || 0}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                <div className="text-[10px] font-bold text-indigo-700 uppercase">Waktu Komputasi</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-indigo-900">
                    {activeOptimizationResult?.executionTimeMs ? `${(activeOptimizationResult.executionTimeMs / 1000).toFixed(2)}s` : '1.85s'}
                  </span>
                </div>
                <div className="text-[11px] text-indigo-700">
                  Total Iterasi: <span className="font-bold">{activeOptimizationResult?.totalIterationsCompleted || 5000} iterasi</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN SCHEDULE PREVIEW CONTENT */}
          <div className="space-y-4">
            <div>
              {resultsViewMode === 'matrix' ? (
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4 h-full overflow-auto text-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-indigo-600" />
                        Papan Matriks Jadwal Lengkap
                      </h3>
                      <p className="text-xs text-slate-500">
                        Klik pada blok mata kuliah untuk melihat detail dosen, kapasitas ruangan, atau melakukan penyesuaian manual.
                      </p>
                    </div>
                  </div>

                  <ScheduleBlockMatrix
                    assignments={currentSchedule || []}
                    courses={courses}
                    lecturers={lecturers}
                    classes={classes}
                    rooms={rooms}
                    timeslots={timeslots}
                    hardConflictingIds={new Set(activeConflicts.filter((c) => c.severity === 'high').flatMap((c) => [c.assignment1Id, c.assignment2Id].filter(Boolean) as string[]))}
                    softConflictingIds={new Set(activeConflicts.filter((c) => c.severity !== 'high').flatMap((c) => [c.assignment1Id, c.assignment2Id].filter(Boolean) as string[]))}
                    onSelectAssignment={(a) => setSelectedAssignmentForDetail(a)}
                    userRole="admin"
                    academicYear={`${academicYear} ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'}`}
                    highlightAssignmentId={highlightAssignmentId}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4 h-full overflow-auto text-slate-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        Tabel Daftar Sesi Perkuliahan
                      </h3>
                      <p className="text-xs text-slate-500">
                        Daftar seluruh alokasi perkuliahan yang telah dijadwalkan secara berurutan.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      Total {currentSchedule?.length || 0} Sesi
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Hari & Waktu</th>
                          <th className="p-3.5">Ruangan</th>
                          <th className="p-3.5">Mata Kuliah</th>
                          <th className="p-3.5">Kelas</th>
                          <th className="p-3.5">SKS</th>
                          <th className="p-3.5">Dosen Pengampu</th>
                          <th className="p-3.5">Mahasiswa</th>
                          <th className="p-3.5 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(currentSchedule || []).map((assignment) => {
                          const c = courseMap.get(assignment.courseId);
                          const r = roomMap.get(assignment.roomId);
                          const t = timeslotMap.get(assignment.timeslotId);
                          const lec = lecturerMap.get(assignment.lecturerId || '');
                          const offering = workingOfferings.find((o) => o.id === assignment.courseOfferingId);
                          const secLabel = offering?.section || assignment.classId || '-';

                          return (
                            <tr key={assignment.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 font-bold text-slate-900">
                                {t ? `${t.day}, ${t.startTime} - ${t.endTime}` : '-'}
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-900 font-bold text-[11px] border border-indigo-100">
                                  {r?.name || assignment.roomId}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <div className="font-bold text-slate-900">{c?.name || offering?.courseName || 'Mata Kuliah'}</div>
                                <div className="text-[10px] font-mono text-slate-400">{c?.code || offering?.code || '-'}</div>
                              </td>
                              <td className="p-3.5 font-bold text-slate-800">
                                Kelas {secLabel}
                              </td>
                              <td className="p-3.5 text-slate-600">
                                {c?.sks || 2} SKS
                              </td>
                              <td className="p-3.5 text-slate-800 font-medium">
                                {lec?.name || '-'}
                              </td>
                              <td className="p-3.5 text-slate-700">
                                {offering?.studentCount || offering?.enrolledCount || 35} mhs
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => setSelectedAssignmentForDetail(assignment)}
                                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition-colors"
                                >
                                  Detail / Ubah
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
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setActiveStep('optimization')}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              Kembali ke Step 5 (Optimasi SA)
            </button>

            <div className="relative group">
              <button
                onClick={handleAttemptPublish}
                id="btn-publish-schedule-bottom"
                disabled={publishReport.hardConflictCount > 0}
                title={
                  publishReport.hardConflictCount > 0
                    ? 'Tidak dapat menerbitkan jadwal karena masih terdapat konflik.'
                    : 'Terbitkan Jadwal Resmi'
                }
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
                  publishReport.hardConflictCount > 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {publishReport.hardConflictCount > 0 ? (
                  <>
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <span>Terbitkan Jadwal (Terkunci)</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Konfirmasi & Terbitkan Jadwal Resmi</span>
                  </>
                )}
              </button>
              {publishReport.hardConflictCount > 0 && (
                <span className="hidden group-hover:block absolute bottom-full mb-1 right-0 w-64 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg text-center z-50 pointer-events-none">
                  Tidak dapat menerbitkan jadwal karena masih terdapat konflik.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PUBLISH BLOCKED (IF HARD CONFLICTS > 0) */}
      {isPublishBlockedOpen && (publishReportState || publishReport) && (
        <PublishBlockedModal
          isOpen={isPublishBlockedOpen}
          onClose={() => setIsPublishBlockedOpen(false)}
          report={publishReportState || publishReport}
          onViewConflicts={() => {
            setIsPublishBlockedOpen(false);
            if (onNavigate) {
              onNavigate('evaluator');
            } else {
              setActiveStep('optimization');
            }
          }}
        />
      )}

      {/* MODAL: KONFIRMASI TERBITKAN JADWAL RESMI (ZERO HARD CONFLICTS) */}
      {isConfirmPublishModalOpen && (
        <PublishConfirmModal
          isOpen={isConfirmPublishModalOpen}
          onClose={() => setIsConfirmPublishModalOpen(false)}
          onConfirm={() => {
            onPublishSchedule();
            setIsConfirmPublishModalOpen(false);
            showToast(
              'success',
              'Jadwal Resmi Berhasil Diterbitkan',
              `Jadwal Perkuliahan ${academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'} ${academicYear} telah aktif dan dipublikasikan.`
            );
          }}
          report={publishReportState || publishReport}
          academicYear={academicYear}
          academicTerm={academicTerm}
        />
      )}

      {/* MODAL: DETAIL & ADJUSTMENT (MOVE, SWAP, LECTURERS) */}
      {selectedAssignmentForDetail && (
        <AssignmentAdjustmentModal
          isOpen={Boolean(selectedAssignmentForDetail)}
          onClose={() => setSelectedAssignmentForDetail(null)}
          assignment={selectedAssignmentForDetail}
          currentSchedule={currentSchedule || []}
          courses={courses}
          lecturers={lecturers}
          rooms={rooms}
          timeslots={timeslots}
          classes={classes}
          weights={weights}
          onApplyMove={(assignmentId, newTimeslotId, newRoomId) => {
            onManualMoveAssignment(
              assignmentId,
              newTimeslotId,
              newRoomId,
              'Manual Move',
              'Penyesuaian manual oleh admin dari halaman Penyusunan Jadwal'
            );
            setSelectedAssignmentForDetail(null);
            showToast('success', 'Jadwal Berhasil Dipindahkan', 'Waktu dan ruangan jadwal telah diperbarui.');
          }}
          onApplySwap={(assignment1Id, assignment2Id) => {
            onSwapAssignments(
              assignment1Id,
              assignment2Id,
              'Pertukaran slot jadwal oleh admin dari halaman Penyusunan Jadwal'
            );
            setSelectedAssignmentForDetail(null);
            showToast('success', 'Jadwal Berhasil Ditukar', 'Dua jadwal telah saling bertukar waktu dan ruangan.');
          }}
          onUpdateLecturers={(assignmentId, lecturerIds) => {
            onUpdateAssignmentLecturers(assignmentId, lecturerIds);
            setSelectedAssignmentForDetail(null);
            showToast('success', 'Dosen Pengampu Diperbarui', 'Penetapan dosen pengampu kelas berhasil disimpan.');
          }}
        />
      )}

      {/* MODAL: CONFLICT & WARNING INSPECTOR */}
      {isConflictInspectorOpen && (
        <ConflictInspectorModal
          isOpen={isConflictInspectorOpen}
          onClose={() => setIsConflictInspectorOpen(false)}
          conflicts={activeConflicts}
          assignments={currentSchedule || []}
          courses={courses}
          lecturers={lecturers}
          classes={classes}
          rooms={rooms}
          timeslots={timeslots}
          offerings={workingOfferings}
          validationReport={publishReport}
          initialTab={conflictInspectorTab}
          onFocusAssignment={handleFocusAssignment}
        />
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

      {/* MODAL 1: KONFIRMASI MULAI JADWAL BARU */}
      {isNewScheduleModalOpen && (
        <Modal
          isOpen={isNewScheduleModalOpen}
          onClose={() => setIsNewScheduleModalOpen(false)}
          title="Mulai Jadwal Baru?"
          subtitle="Workspace saat ini akan diarsipkan otomatis ke Riwayat & Versi"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs text-indigo-950">
              <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-indigo-900">Snapshot Otomatis Disimpan</p>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Jadwal dan alokasi yang ada saat ini akan disimpan sebagai snapshot riwayat baru sehingga Anda dapat memulihkannya kapan saja dari menu <strong>Riwayat & Versi</strong>.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Setelah konfirmasi, alur penjadwalan akan kembali ke <strong>Langkah 1 (Pemilihan Mata Kuliah)</strong> dalam kondisi bersih siap pakai.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsNewScheduleModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmNewSchedule}
                id="btn-confirm-new-schedule"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Mulai Jadwal Baru
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: KONFIRMASI HAPUS JADWAL */}
      {isDeleteScheduleModalOpen && (
        <Modal
          isOpen={isDeleteScheduleModalOpen}
          onClose={() => setIsDeleteScheduleModalOpen(false)}
          title="Hapus Jadwal Aktif?"
          subtitle="Data Master tetap aman. Hanya workspace jadwal aktif yang akan direset."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-950">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-900">Data Master Tetap Terjaga</p>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Tindakan ini <strong>TIDAK menghapus</strong> data master seperti Mata Kuliah, Dosen, Ruangan, Sesi Waktu, ataupun Kurikulum. Hanya alokasi jadwal aktif saat ini yang akan dikosongkan.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={saveSnapshotBeforeDelete}
                onChange={(e) => setSaveSnapshotBeforeDelete(e.target.checked)}
                className="rounded-md text-indigo-600 focus:ring-indigo-500"
              />
              <span>Simpan Snapshot Cadangan ke Riwayat & Versi sebelum menghapus</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsDeleteScheduleModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteSchedule}
                id="btn-confirm-delete-schedule"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Hapus Jadwal Sekarang
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
