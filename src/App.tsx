import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useToast } from './components/ui/Toast';
import { StorageService } from './services/storageService';
import { AccessDenied } from './components/ui/AccessDenied';
import { PageSkeleton } from './components/ui/PageSkeleton';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Resilient Lazy Import Helper with Retry Mechanism
function lazyWithRetry<T extends React.ComponentType<any> = React.ComponentType<any>>(
  factory: () => Promise<any>,
  name?: string
): React.LazyExoticComponent<T> {
  return lazy<T>(async () => {
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const module = await factory();
        if (name && module[name]) {
          return { default: module[name] };
        }
        if (module.default) {
          return { default: module.default };
        }
        const firstExportKey = Object.keys(module)[0];
        if (firstExportKey && module[firstExportKey]) {
          return { default: module[firstExportKey] };
        }
        return { default: module };
      } catch (err) {
        lastError = err;
        console.warn(`Module load error (attempt ${attempt + 1}/3) for ${name || 'component'}:`, err);
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    throw lastError || new Error(`Failed to load module ${name || 'component'}`);
  });
}

// Pages - Admin & Shared (Lazy Loaded for Fast Startup)
const UnifiedSchedulingPage = lazyWithRetry(() => import('./pages/UnifiedSchedulingPage'), 'UnifiedSchedulingPage');
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'), 'DashboardPage');
const CoursesPage = lazyWithRetry(() => import('./pages/CoursesPage'), 'CoursesPage');
const LecturersPage = lazyWithRetry(() => import('./pages/LecturersPage'), 'LecturersPage');
const RoomsPage = lazyWithRetry(() => import('./pages/RoomsPage'), 'RoomsPage');
const TimeslotsPage = lazyWithRetry(() => import('./pages/TimeslotsPage'), 'TimeslotsPage');
const OptimizationPage = lazyWithRetry(() => import('./pages/OptimizationPage'), 'OptimizationPage');
const TimetablePage = lazyWithRetry(() => import('./pages/TimetablePage'), 'TimetablePage');
const ConflictAnalysisPage = lazyWithRetry(() => import('./pages/ConflictAnalysisPage'), 'ConflictAnalysisPage');
const WeightsConfigPage = lazyWithRetry(() => import('./pages/WeightsConfigPage'), 'WeightsConfigPage');
const ReportsPage = lazyWithRetry(() => import('./pages/ReportsPage'), 'ReportsPage');
const CurriculumStructurePage = lazyWithRetry(() => import('./pages/CurriculumStructurePage'), 'CurriculumStructurePage');
const CurriculumPackagesPage = lazyWithRetry(() => import('./pages/CurriculumPackagesPage'), 'CurriculumPackagesPage');
const CourseOfferingsPage = lazyWithRetry(() => import('./pages/CourseOfferingsPage'), 'CourseOfferingsPage');

// Pages - Lecturer Portal (Lazy Loaded)
const LecturerDashboardPage = lazyWithRetry(() => import('./pages/lecturer/LecturerDashboardPage'), 'LecturerDashboardPage');
const LecturerSchedulePage = lazyWithRetry(() => import('./pages/lecturer/LecturerSchedulePage'), 'LecturerSchedulePage');
const LecturerAvailabilityPage = lazyWithRetry(() => import('./pages/lecturer/LecturerAvailabilityPage'), 'LecturerAvailabilityPage');

// Pages - Student Portal (Lazy Loaded)
const StudentSchedulePage = lazyWithRetry(() => import('./pages/student/StudentSchedulePage'), 'StudentSchedulePage');

// Pages - History & Snapshots (Lazy Loaded)
const ScheduleHistoryPage = lazyWithRetry(() => import('./pages/ScheduleHistoryPage'), 'ScheduleHistoryPage');

// Algorithms
import { generateInitialSchedule } from './algorithms/initialSchedule';
import { detectConflicts } from './algorithms/conflictDetection';
import { SimulatedAnnealingEngine, SAProgressCallbackData } from './algorithms/simulatedAnnealing';
import { CourseOfferingGeneratorService } from './services/courseOfferingGeneratorService';
import { cleanLecturerReferences } from './utils/lecturerValidation';
import { sortAndReindexSessions } from './utils/sessionUtils';
import {
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ScheduleAssignment,
  SAParameters,
  ConstraintWeights,
  OptimizationResult,
  ConflictItem,
  ScheduleChangeRecord,
  CurrentUser,
  UserRole,
  RolePermissions,
  ROLE_PERMISSIONS,
  ScheduleStatus,
  CourseOffering,
  CurriculumPackage,
} from './types';

export default function App() {
  const { showToast } = useToast();

  // User Role & Session
  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => StorageService.getCurrentUser());
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>(() => StorageService.getScheduleStatus());
  const [academicYear, setAcademicYear] = useState<string>(() => StorageService.getAcademicYear());

  // Computed Permissions based on Current Role
  const permissions: RolePermissions = ROLE_PERMISSIONS[currentUser.role] || ROLE_PERMISSIONS.admin;

  // Navigation & Layout State
  const [activeView, setActiveView] = useState<string>(() => {
    if (currentUser.role === 'lecturer') return 'lecturer-dashboard';
    if (currentUser.role === 'student') return 'schedule';
    return 'dashboard';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Master Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);
  const [curriculumPackages, setCurriculumPackages] = useState<CurriculumPackage[]>([]);

  const [currentSchedule, setCurrentSchedule] = useState<ScheduleAssignment[] | null>(null);
  const [initialSchedule, setInitialSchedule] = useState<ScheduleAssignment[] | null>(null);
  const [parameters, setParameters] = useState<SAParameters>(StorageService.getParameters());
  const [weights, setWeights] = useState<ConstraintWeights>(StorageService.getWeights());
  const [activeOptimizationResult, setActiveOptimizationResult] = useState<OptimizationResult | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationResult[]>([]);
  const [changeLogs, setChangeLogs] = useState<ScheduleChangeRecord[]>([]);

  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [liveProgressData, setLiveProgressData] = useState<SAProgressCallbackData | null>(null);
  const engineRef = useRef<SimulatedAnnealingEngine | null>(null);

  // Initial Data Load
  useEffect(() => {
    const loadedCourses = StorageService.getCourses();
    const loadedLecturers = StorageService.getLecturers();
    const loadedClasses = StorageService.getClasses();
    const loadedRooms = StorageService.getRooms();
    const loadedTimeslots = StorageService.getTimeslots();
    let loadedOfferings = StorageService.getCourseOfferings();
    const loadedPackages = StorageService.getCurriculumPackages();

    // If offerings empty, auto generate from packages
    if (!loadedOfferings || loadedOfferings.length === 0) {
      const genReport = CourseOfferingGeneratorService.generateOfferings({ academicTerm: 'ganjil' });
      loadedOfferings = genReport.generatedOfferings;
      StorageService.saveCourseOfferings(loadedOfferings);
    }

    setCourses(loadedCourses);
    setLecturers(loadedLecturers);
    setClasses(loadedClasses);
    setRooms(loadedRooms);
    setTimeslots(loadedTimeslots);
    setOfferings(loadedOfferings);
    setCurriculumPackages(loadedPackages);

    const savedCurrent = StorageService.getCurrentSchedule();
    const savedInitial = StorageService.getInitialSchedule();
    const savedHistory = StorageService.getOptimizationHistory();
    const savedLogs = StorageService.getScheduleChangeRecords();

    if (savedCurrent) setCurrentSchedule(savedCurrent);
    if (savedInitial) setInitialSchedule(savedInitial);
    if (savedHistory) {
      setOptimizationHistory(savedHistory);
      if (savedHistory.length > 0) {
        setActiveOptimizationResult(savedHistory[savedHistory.length - 1]);
      }
    }
    if (savedLogs) setChangeLogs(savedLogs);
  }, []);

  // Compute live conflicts for active schedule
  const activeConflicts: ConflictItem[] = React.useMemo(() => {
    if (!currentSchedule || currentSchedule.length === 0) return [];
    return detectConflicts(
      currentSchedule,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights,
      [],
      [],
      curriculumPackages,
      offerings
    ).items;
  }, [currentSchedule, courses, lecturers, classes, rooms, timeslots, weights, curriculumPackages, offerings]);

  // Role Switcher Handler
  const handleSwitchRole = (role: UserRole, targetId?: string) => {
    const updatedUser = StorageService.switchRole(role, targetId);
    setCurrentUser(updatedUser);

    if (role === 'lecturer') {
      setActiveView('lecturer-dashboard');
      showToast('info', 'Beralih ke Portal Dosen', `Mode Dosen: ${updatedUser.name}`);
    } else if (role === 'student') {
      setActiveView('schedule');
      showToast('info', 'Beralih ke Portal Mahasiswa', `Mode Mahasiswa: ${updatedUser.name}`);
    } else {
      setActiveView('dashboard');
      showToast('info', 'Beralih ke Administrator', 'Mode Administrator Penjadwalan aktif.');
    }
  };

  const handlePublishSchedule = () => {
    if (scheduleStatus === 'published') {
      StorageService.setScheduleStatus('draft');
      setScheduleStatus('draft');
      showToast('info', 'Status Jadwal Diubah ke Draft', 'Jadwal kini dalam tahap revisi internal.');
    } else {
      StorageService.setScheduleStatus('published');
      setScheduleStatus('published');
      showToast('success', 'Jadwal Resmi Dipublikasikan', 'Jadwal perkuliahan telah diterbitkan untuk dosen dan jurusan.');
    }
  };

  // Generate Initial Schedule
  const handleGenerateInitial = () => {
    try {
      const activeOfferings = StorageService.getCourseOfferings();
      const newInitial = generateInitialSchedule(
        courses,
        rooms,
        timeslots,
        'realistic',
        activeOfferings
      );

      setCurrentSchedule(newInitial);
      setInitialSchedule(newInitial);
      setActiveOptimizationResult(null);

      StorageService.saveCurrentSchedule(newInitial);
      StorageService.saveInitialSchedule(newInitial);

      const conflictRes = detectConflicts(
        newInitial,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights,
        [],
        [],
        curriculumPackages,
        activeOfferings
      );

      showToast(
        'info',
        'Jadwal Awal Berhasil Dibuat',
        `Alokasi awal dibuat (${newInitial.length} kelas). Terdeteksi ${conflictRes.totalConflictsCount} konflik yang siap dioptimasi.`
      );
    } catch (err: any) {
      showToast('error', 'Gagal Membuat Jadwal Awal', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  // Run Simulated Annealing Optimization
  const handleRunOptimization = useCallback(async () => {
    if (!permissions.canOptimize) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang memiliki hak akses menjalankan optimasi.');
      return;
    }

    let initial = currentSchedule;
    if (!initial || initial.length === 0) {
      const activeOfferings = StorageService.getCourseOfferings();
      initial = generateInitialSchedule(courses, rooms, timeslots, 'realistic', activeOfferings);
      setInitialSchedule(initial);
      StorageService.saveInitialSchedule(initial);
    }

    setIsOptimizing(true);
    setLiveProgressData(null);

    const activeOfferings = StorageService.getCourseOfferings();

    const engine = new SimulatedAnnealingEngine();
    engineRef.current = engine;

    try {
      const result = await engine.runOptimization(
        initial,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        parameters,
        weights,
        (progress) => {
          setLiveProgressData({ ...progress });
        },
        [],
        [],
        curriculumPackages,
        activeOfferings
      );

      setCurrentSchedule(result.bestSchedule);
      setActiveOptimizationResult(result);
      StorageService.saveCurrentSchedule(result.bestSchedule);

      StorageService.addOptimizationResult(result);
      setOptimizationHistory(StorageService.getOptimizationHistory());

      const hardCount = result.bestConflicts.hard;
      const softCount = result.bestConflicts.soft;

      if (hardCount === 0) {
        showToast(
          'success',
          'Optimasi Selesai Sempurna! (0 Hard Conflict)',
          `Selesai dalam ${result.executionTimeMs} ms (${result.totalIterationsCompleted.toLocaleString()} iterasi). Seluruh kendala hard terpenuhi.`
        );
      } else {
        showToast(
          'warning',
          'Optimasi Selesai dengan Catatan',
          `Tersisa ${hardCount} hard conflict dan ${softCount} soft penalty. Periksa rekomendasi slot alternatif.`
        );
      }
    } catch (err: any) {
      showToast('error', 'Optimasi Terhenti', err.message || 'Terjadi kesalahan komputasi.');
    } finally {
      setIsOptimizing(false);
      engineRef.current = null;
    }
  }, [currentSchedule, courses, lecturers, classes, rooms, timeslots, weights, parameters, curriculumPackages, permissions]);

  const handleStopOptimization = () => {
    if (engineRef.current) {
      engineRef.current.abort();
      showToast('info', 'Optimasi Dihentikan', 'Algoritma Simulated Annealing dihentikan oleh pengguna.');
    }
  };

  // Reset Demo / Simulation Data
  const handleResetDemo = () => {
    if (engineRef.current && isOptimizing) {
      engineRef.current.abort();
      setIsOptimizing(false);
    }

    const resetResult = StorageService.resetSimulationData();

    // Immediate state updates without page refresh
    setCourses(resetResult.courses);
    setLecturers(resetResult.lecturers);
    setRooms(resetResult.rooms);
    setTimeslots(resetResult.timeslots);
    setCurriculumPackages(resetResult.packages);
    setOfferings([]);
    setCurrentSchedule(null);
    setInitialSchedule(null);
    setActiveOptimizationResult(null);
    setOptimizationHistory([]);
    setChangeLogs([]);
    setLiveProgressData(null);
    setScheduleStatus('draft');

    showToast('success', 'Data Simulasi Berhasil Direset', 'Data hasil generate dan optimasi telah dikembalikan ke kondisi awal.');
  };

  // CRUD Handlers
  const handleSaveCourse = (c: Course) => {
    const updated = courses.some((item) => item.id === c.id)
      ? courses.map((item) => (item.id === c.id ? c : item))
      : [...courses, c];
    setCourses(updated);
    StorageService.saveCourses(updated);
  };

  const handleDeleteCourse = (id: string) => {
    const updated = courses.filter((c) => c.id !== id);
    setCourses(updated);
    StorageService.saveCourses(updated);
    if (currentSchedule) {
      const updatedSched = currentSchedule.filter((a) => a.courseId !== id);
      setCurrentSchedule(updatedSched);
      StorageService.saveCurrentSchedule(updatedSched);
    }
  };

  const handleSaveLecturer = (l: Lecturer) => {
    const updated = lecturers.some((item) => item.id === l.id)
      ? lecturers.map((item) => (item.id === l.id ? l : item))
      : [...lecturers, l];
    setLecturers(updated);
    StorageService.saveLecturers(updated);
  };

  const handleDeleteLecturer = (id: string) => {
    const updated = lecturers.filter((l) => l.id !== id);
    setLecturers(updated);
    StorageService.saveLecturers(updated);

    const activeOfferings = StorageService.getCourseOfferings();
    const activeSchedule = StorageService.getCurrentSchedule() || [];
    const cleaned = cleanLecturerReferences(id, activeOfferings, activeSchedule);

    if (cleaned.affectedOfferingCount > 0) {
      setOfferings(cleaned.updatedOfferings);
      StorageService.saveCourseOfferings(cleaned.updatedOfferings);
      if (activeSchedule.length > 0) {
        setCurrentSchedule(cleaned.updatedAssignments);
        StorageService.saveCurrentSchedule(cleaned.updatedAssignments);
      }
    }
  };

  const handleSaveLecturerAvailability = (updatedLecturer: Lecturer) => {
    handleSaveLecturer(updatedLecturer);
    showToast(
      'success',
      'Preferensi Ketersediaan Tersimpan',
      'Preferensi waktu dan ketersediaan hari dosen telah diperbarui.'
    );
  };

  const handleSaveClass = (cl: ClassGroup) => {
    const updated = classes.some((item) => item.id === cl.id)
      ? classes.map((item) => (item.id === cl.id ? cl : item))
      : [...classes, cl];
    setClasses(updated);
    StorageService.saveClasses(updated);
  };

  const handleDeleteClass = (id: string) => {
    const updated = classes.filter((cl) => cl.id !== id);
    setClasses(updated);
    StorageService.saveClasses(updated);
  };

  const handleSaveRoom = (r: Room) => {
    const updated = rooms.some((item) => item.id === r.id)
      ? rooms.map((item) => (item.id === r.id ? r : item))
      : [...rooms, r];
    setRooms(updated);
    StorageService.saveRooms(updated);
  };

  const handleDeleteRoom = (id: string) => {
    const updated = rooms.filter((r) => r.id !== id);
    setRooms(updated);
    StorageService.saveRooms(updated);
  };

  const handleSaveTimeslot = (ts: Timeslot) => {
    const updated = timeslots.some((item) => item.id === ts.id)
      ? timeslots.map((item) => (item.id === ts.id ? ts : item))
      : [...timeslots, ts];
    const reindexed = sortAndReindexSessions(updated);
    setTimeslots(reindexed);
    StorageService.saveTimeslots(reindexed);
  };

  const handleDeleteTimeslot = (id: string) => {
    const updated = timeslots.filter((ts) => ts.id !== id);
    const reindexed = sortAndReindexSessions(updated);
    setTimeslots(reindexed);
    StorageService.saveTimeslots(reindexed);
  };

  const handleToggleTimeslot = (id: string) => {
    const updated = timeslots.map((ts) =>
      ts.id === id ? { ...ts, isActive: !ts.isActive } : ts
    );
    const reindexed = sortAndReindexSessions(updated);
    setTimeslots(reindexed);
    StorageService.saveTimeslots(reindexed);
  };

  const handleResetDefaultTimeslots = () => {
    const defaultSlots = StorageService.resetTimeslotsToDefault();
    setTimeslots(defaultSlots);
  };

  const handleManualMoveAssignment = (
    assignmentId: string,
    newTimeslotId: string,
    newRoomId: string,
    method: ScheduleChangeRecord['method'] = 'Manual Move',
    reason: string = 'Penyesuaian alokasi jadwal oleh panitia'
  ) => {
    if (!permissions.canManageSchedule) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat memodifikasi penempatan jadwal.');
      return;
    }

    if (!currentSchedule) return;
    const oldAssign = currentSchedule.find((a) => a.id === assignmentId);
    if (!oldAssign) return;

    const course = courses.find((c) => c.id === oldAssign.courseId);
    const lecturer = lecturers.find((l) => l.id === oldAssign.lecturerId);
    const oldSlot = timeslots.find((t) => t.id === oldAssign.timeslotId);
    const oldRoom = rooms.find((r) => r.id === oldAssign.roomId);
    const newSlot = timeslots.find((t) => t.id === newTimeslotId);
    const newRoom = rooms.find((r) => r.id === newRoomId);

    const prevConflicts = activeConflicts.length;

    const updated = currentSchedule.map((a) =>
      a.id === assignmentId ? { ...a, timeslotId: newTimeslotId, roomId: newRoomId } : a
    );
    setCurrentSchedule(updated);
    StorageService.saveCurrentSchedule(updated);

    const nextConflicts = detectConflicts(
      updated,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights,
      [],
      [],
      curriculumPackages,
      offerings
    ).totalConflictsCount;

    if (course && oldSlot && oldRoom && newSlot && newRoom) {
      const record: ScheduleChangeRecord = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        lecturerName: lecturer?.name || '-',
        className: 'S1 Elektro',
        before: {
          day: oldSlot.day,
          timeslotLabel: oldSlot.label,
          roomCode: oldRoom.code,
        },
        after: {
          day: newSlot.day,
          timeslotLabel: newSlot.label,
          roomCode: newRoom.code,
        },
        method,
        reason,
        conflictChange: {
          beforeTotal: prevConflicts,
          afterTotal: nextConflicts,
        },
      };

      StorageService.addScheduleChangeLog(record, currentUser);
      setChangeLogs(StorageService.getScheduleChangeRecords());
    }
  };

  const handleSwapAssignments = (
    assignment1Id: string,
    assignment2Id: string,
    reason: string = 'Pertukaran slot jadwal oleh panitia'
  ) => {
    if (!permissions.canManageSchedule) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat menukar slot jadwal.');
      return;
    }

    if (!currentSchedule) return;

    const a1 = currentSchedule.find((a) => a.id === assignment1Id);
    const a2 = currentSchedule.find((a) => a.id === assignment2Id);
    if (!a1 || !a2) return;

    const course1 = courses.find((c) => c.id === a1.courseId);
    const course2 = courses.find((c) => c.id === a2.courseId);
    const prevConflicts = activeConflicts.length;

    const updated = currentSchedule.map((a) => {
      if (a.id === assignment1Id) {
        return { ...a, timeslotId: a2.timeslotId, roomId: a2.roomId };
      }
      if (a.id === assignment2Id) {
        return { ...a, timeslotId: a1.timeslotId, roomId: a1.roomId };
      }
      return a;
    });

    setCurrentSchedule(updated);
    StorageService.saveCurrentSchedule(updated);

    const nextConflicts = detectConflicts(
      updated,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights,
      [],
      [],
      curriculumPackages,
      offerings
    ).totalConflictsCount;

    const record: ScheduleChangeRecord = {
      id: `log-swap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      courseId: course1?.id || 'swap',
      courseCode: `${course1?.code || ''} ↔ ${course2?.code || ''}`,
      courseName: `Swap: ${course1?.name || ''} dengan ${course2?.name || ''}`,
      lecturerName: 'Pertukaran Jadwal',
      className: 'S1 Elektro',
      before: {
        day: timeslots.find((t) => t.id === a1.timeslotId)?.day || 'Senin',
        timeslotLabel: timeslots.find((t) => t.id === a1.timeslotId)?.label || '',
        roomCode: rooms.find((r) => r.id === a1.roomId)?.code || '',
      },
      after: {
        day: timeslots.find((t) => t.id === a2.timeslotId)?.day || 'Senin',
        timeslotLabel: timeslots.find((t) => t.id === a2.timeslotId)?.label || '',
        roomCode: rooms.find((r) => r.id === a2.roomId)?.code || '',
      },
      method: 'Swap Recommendation',
      reason,
      conflictChange: {
        beforeTotal: prevConflicts,
        afterTotal: nextConflicts,
      },
    };

    StorageService.addScheduleChangeLog(record, currentUser);
    setChangeLogs(StorageService.getScheduleChangeRecords());
  };

  const handleUpdateAssignmentLecturers = (assignmentId: string, newLecturerIds: string[]) => {
    if (!currentSchedule) return;
    const primaryLecturerId = newLecturerIds.length > 0 ? newLecturerIds[0] : null;
    const targetAssignment = currentSchedule.find((a) => a.id === assignmentId);

    const updated = currentSchedule.map((a) =>
      a.id === assignmentId ? { ...a, lecturerIds: newLecturerIds, lecturerId: primaryLecturerId } : a
    );
    setCurrentSchedule(updated);
    StorageService.saveCurrentSchedule(updated);

    if (targetAssignment?.courseOfferingId) {
      const activeOfferings = StorageService.getCourseOfferings();
      const updatedOfferings = activeOfferings.map((o) => {
        if (o.id === targetAssignment.courseOfferingId) {
          const assignedLecs = newLecturerIds
            .map((id) => lecturers.find((l) => l.id === id))
            .filter(Boolean) as Lecturer[];

          return {
            ...o,
            lecturerIds: newLecturerIds,
            lecturerId: primaryLecturerId,
            lecturerName: assignedLecs[0]?.name || null,
            lecturerCode: assignedLecs[0]?.code || null,
            lecturerNames: assignedLecs.map((l) => l.name),
            lecturerCodes: assignedLecs.map((l) => l.code),
          };
        }
        return o;
      });
      StorageService.saveCourseOfferings(updatedOfferings);
      setOfferings(updatedOfferings);
    }
  };

  const handleClearLogs = () => {
    StorageService.clearScheduleChangeLogs();
    setChangeLogs([]);
  };

  const handleSaveParameters = (p: SAParameters) => {
    setParameters(p);
    StorageService.saveParameters(p);
  };

  const handleSaveWeights = (w: ConstraintWeights) => {
    setWeights(w);
    StorageService.saveWeights(w);
  };

  const activeLecturerEntity =
    currentUser.role === 'lecturer'
      ? lecturers.find((l) => l.id === currentUser.lecturerId) || lecturers[0]
      : null;

  const viewTitles: Record<string, string> = {
    dashboard: 'Dashboard Sistem Penjadwalan',
    'lecturer-dashboard': 'Portal Dosen Teknik Elektro',
    'lecturer-schedule': 'Jadwal Mengajar Saya',
    'lecturer-availability': 'Ketersediaan & Preferensi Dosen',
    scheduling: 'Penyusunan & Optimasi Jadwal Terpadu',
    optimization: 'Optimasi Jadwal Simulated Annealing',
    schedule: currentUser.role === 'student' ? 'Jadwal Saya' : 'Hasil Jadwal Perkuliahan & Rekomendasi',
    conflicts: 'Analisis & Audit Konflik Jadwal',
    courses: 'Master Data Mata Kuliah',
    lecturers: 'Master Data Dosen & Ketersediaan',
    rooms: 'Master Data Ruangan & Laboratorium',
    timeslots: 'Tahun Akademik & Sesi Waktu Perkuliahan',
    packages: 'Kurikulum, KBK & Paket Semester',
    curriculum: 'Struktur Kurikulum & Klasifikasi KBK',
    offerings: 'Penyusunan MK & Course Offering',
    weights: 'Constraint & Preferensi Bobot SA',
    settings: 'Constraint & Preferensi Bobot SA',
    reports: 'Rekapitulasi Laporan Jadwal',
    'report-schedule': 'Rekap Jadwal Perkuliahan',
    'report-lecturer-load': 'Rekap Beban Mengajar Dosen',
    'report-room-usage': 'Rekap Penggunaan Ruangan',
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Persistent Academic Sidebar (Fixed / Sticky on Desktop, Drawer on Mobile) */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        conflictCount={activeConflicts.length}
        onResetDemo={handleResetDemo}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        hasSchedule={Boolean(currentSchedule && currentSchedule.length > 0)}
        currentUser={currentUser}
        permissions={permissions}
        scheduleStatus={scheduleStatus}
      />

      {/* Main Layout Area (Single Natural Scroll) */}
      <div className="flex-1 min-h-[100dvh] flex flex-col min-w-0">
        <Header
          activeViewTitle={viewTitles[activeView] || 'ELEKTRO-SCHEDULER'}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          hasSchedule={Boolean(currentSchedule && currentSchedule.length > 0)}
          isOptimized={Boolean(activeOptimizationResult)}
          totalConflicts={activeConflicts.length}
          onQuickGenerate={handleGenerateInitial}
          onQuickOptimize={handleRunOptimization}
          isOptimizing={isOptimizing}
          currentUser={currentUser}
          lecturers={lecturers}
          classes={classes}
          scheduleStatus={scheduleStatus}
          academicYear={academicYear}
          onSwitchRole={handleSwitchRole}
          onPublishSchedule={handlePublishSchedule}
        />

        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto min-w-0 overscroll-contain">
          <ErrorBoundary key={activeView} onReset={() => window.location.reload()}>
            <Suspense fallback={<PageSkeleton />}>
              {/* UNIFIED SCHEDULING WORKFLOW */}
              {activeView === 'scheduling' && (
                currentUser.role === 'admin' ? (
                  <UnifiedSchedulingPage
                    courses={courses}
                    lecturers={lecturers}
                    classes={classes}
                    rooms={rooms}
                    timeslots={timeslots}
                    curriculumPackages={curriculumPackages}
                    kbks={StorageService.getKbks()}
                    currentSchedule={currentSchedule}
                    initialSchedule={initialSchedule}
                    activeOptimizationResult={activeOptimizationResult}
                    optimizationHistory={optimizationHistory}
                    parameters={parameters}
                    weights={weights}
                    activeConflicts={activeConflicts}
                    isOptimizing={isOptimizing}
                    liveProgressData={liveProgressData}
                    scheduleStatus={scheduleStatus}
                    academicYear={academicYear}
                    onGenerateInitial={handleGenerateInitial}
                    onRunOptimization={handleRunOptimization}
                    onStopOptimization={handleStopOptimization}
                    onChangeParameters={handleSaveParameters}
                    onSaveSchedule={(sch) => {
                      setCurrentSchedule(sch);
                      StorageService.saveCurrentSchedule(sch);
                    }}
                    onPublishSchedule={handlePublishSchedule}
                    onUpdateOfferings={(offs) => {
                      setOfferings(offs);
                      StorageService.saveCourseOfferings(offs);
                    }}
                    onManualMoveAssignment={handleManualMoveAssignment}
                    onSwapAssignments={handleSwapAssignments}
                    onUpdateAssignmentLecturers={handleUpdateAssignmentLecturers}
                  />
                ) : (
                  <AccessDenied
                    currentUser={currentUser}
                    requiredRole="Administrator"
                    onNavigateHome={() => setActiveView('lecturer-dashboard')}
                    onSwitchToAdmin={() => handleSwitchRole('admin')}
                  />
                )
              )}
              {/* LECTURER PORTAL ROUTES */}
              {activeView === 'lecturer-dashboard' && activeLecturerEntity && (
                <LecturerDashboardPage
                  currentUser={currentUser}
                  lecturer={activeLecturerEntity}
                  courses={courses}
                  schedule={currentSchedule || []}
                  timeslots={timeslots}
                  rooms={rooms}
                  classes={classes}
                  scheduleStatus={scheduleStatus}
                  onNavigate={setActiveView}
                />
              )}

              {activeView === 'lecturer-schedule' && activeLecturerEntity && (
                <LecturerSchedulePage
                  lecturer={activeLecturerEntity}
                  courses={courses}
                  schedule={currentSchedule || []}
                  timeslots={timeslots}
                  rooms={rooms}
                  classes={classes}
                  scheduleStatus={scheduleStatus}
                  academicYear={academicYear}
                />
              )}

              {activeView === 'lecturer-availability' && activeLecturerEntity && (
                <LecturerAvailabilityPage
                  lecturer={activeLecturerEntity}
                  timeslots={timeslots}
                  onSaveAvailability={handleSaveLecturerAvailability}
                />
              )}

              {/* 1. ADMIN DASHBOARD */}
              {activeView === 'dashboard' && (
                currentUser.role === 'admin' ? (
                  <DashboardPage
                    courses={courses}
                    lecturers={lecturers}
                    rooms={rooms}
                    timeslots={timeslots}
                    currentSchedule={currentSchedule}
                    initialSchedule={initialSchedule}
                    activeOptimizationResult={activeOptimizationResult}
                    offerings={offerings}
                    packages={curriculumPackages}
                    onNavigate={setActiveView}
                    onRunOptimization={() => {
                      setActiveView('optimization');
                      handleRunOptimization();
                    }}
                    onGenerateInitial={handleGenerateInitial}
                    isOptimizing={isOptimizing}
                  />
                ) : (
                  <AccessDenied
                    currentUser={currentUser}
                    requiredRole="Administrator"
                    onNavigateHome={() => setActiveView('lecturer-dashboard')}
                    onSwitchToAdmin={() => handleSwitchRole('admin')}
                  />
                )
              )}

              {/* 2. OPTIMIZATION PAGE */}
              {activeView === 'optimization' && (
                permissions.canOptimize ? (
                  <OptimizationPage
                    parameters={parameters}
                    onChangeParameters={handleSaveParameters}
                    weights={weights}
                    courses={courses}
                    lecturers={lecturers}
                    classes={classes}
                    rooms={rooms}
                    timeslots={timeslots}
                    currentSchedule={currentSchedule}
                    initialSchedule={initialSchedule}
                    activeOptimizationResult={activeOptimizationResult}
                    onGenerateInitial={handleGenerateInitial}
                    onRunOptimization={handleRunOptimization}
                    onStopOptimization={handleStopOptimization}
                    isOptimizing={isOptimizing}
                    liveProgressData={liveProgressData}
                    onNavigate={setActiveView}
                  />
                ) : (
                  <AccessDenied
                    currentUser={currentUser}
                    requiredRole="Administrator"
                    onNavigateHome={() => setActiveView('lecturer-dashboard')}
                    onSwitchToAdmin={() => handleSwitchRole('admin')}
                  />
                )
              )}

              {/* 3. TIMETABLE SCHEDULE & RECOMMENDATIONS */}
              {activeView === 'schedule' && (
                currentUser.role === 'student' ? (
                  <StudentSchedulePage
                    currentUser={currentUser}
                    currentSchedule={currentSchedule}
                    courses={courses}
                    lecturers={lecturers}
                    classes={classes}
                    rooms={rooms}
                    timeslots={timeslots}
                    scheduleStatus={scheduleStatus}
                    academicYear={academicYear}
                  />
                ) : (
                  <TimetablePage
                    currentSchedule={currentSchedule}
                    courses={courses}
                    lecturers={lecturers}
                    classes={classes}
                    rooms={rooms}
                    timeslots={timeslots}
                    conflicts={activeConflicts}
                    weights={weights}
                    onManualMoveAssignment={handleManualMoveAssignment}
                    onSwapAssignments={handleSwapAssignments}
                    changeLogs={changeLogs}
                    onClearLogs={handleClearLogs}
                    onUpdateAssignmentLecturers={handleUpdateAssignmentLecturers}
                  />
                )
              )}

              {/* 4. CONFLICT ANALYSIS */}
              {activeView === 'conflicts' && (
                <ConflictAnalysisPage
                  conflicts={activeConflicts}
                  courses={courses}
                  lecturers={lecturers}
                  classes={classes}
                  rooms={rooms}
                  timeslots={timeslots}
                  currentSchedule={currentSchedule}
                  onNavigate={setActiveView}
                />
              )}

              {/* MASTER DATA */}
              {activeView === 'timeslots' && (
                <TimeslotsPage
                  timeslots={timeslots}
                  schedule={currentSchedule || []}
                  permissions={permissions}
                  onSaveTimeslot={handleSaveTimeslot}
                  onDeleteTimeslot={handleDeleteTimeslot}
                  onToggleTimeslot={handleToggleTimeslot}
                  onResetDefaultTimeslots={handleResetDefaultTimeslots}
                />
              )}

              {activeView === 'packages' && (
                <CurriculumPackagesPage />
              )}

              {activeView === 'curriculum' && (
                <CurriculumStructurePage />
              )}

              {activeView === 'courses' && (
                <CoursesPage
                  courses={courses}
                  lecturers={lecturers}
                  classes={classes}
                  schedule={currentSchedule || []}
                  permissions={permissions}
                  onSaveCourse={handleSaveCourse}
                  onDeleteCourse={handleDeleteCourse}
                />
              )}

              {activeView === 'lecturers' && (
                <LecturersPage
                  lecturers={lecturers}
                  courses={courses}
                  schedule={currentSchedule || []}
                  permissions={permissions}
                  onSaveLecturer={handleSaveLecturer}
                  onDeleteLecturer={handleDeleteLecturer}
                />
              )}

              {activeView === 'rooms' && (
                <RoomsPage
                  rooms={rooms}
                  schedule={currentSchedule || []}
                  permissions={permissions}
                  onSaveRoom={handleSaveRoom}
                  onDeleteRoom={handleDeleteRoom}
                />
              )}

              {activeView === 'offerings' && (
                <CourseOfferingsPage />
              )}

              {/* CONSTRAINT & SETTINGS */}
              {(activeView === 'weights' || activeView === 'settings') && (
                permissions.canAccessResearchMode ? (
                  <WeightsConfigPage
                    weights={weights}
                    onSaveWeights={handleSaveWeights}
                  />
                ) : (
                  <AccessDenied
                    currentUser={currentUser}
                    requiredRole="Administrator"
                    onNavigateHome={() => setActiveView('lecturer-dashboard')}
                    onSwitchToAdmin={() => handleSwitchRole('admin')}
                  />
                )
              )}

              {/* REPORTS & RECAPS */}
              {(activeView === 'reports' || activeView === 'report-schedule') && (
                <ReportsPage
                  initialTab="schedule"
                  activeOptimizationResult={activeOptimizationResult}
                  currentSchedule={currentSchedule}
                  courses={courses}
                  lecturers={lecturers}
                  classes={classes}
                  rooms={rooms}
                  timeslots={timeslots}
                  conflicts={activeConflicts}
                  offerings={offerings}
                />
              )}

              {activeView === 'report-lecturer-load' && (
                <ReportsPage
                  initialTab="lecturer-load"
                  activeOptimizationResult={activeOptimizationResult}
                  currentSchedule={currentSchedule}
                  courses={courses}
                  lecturers={lecturers}
                  classes={classes}
                  rooms={rooms}
                  timeslots={timeslots}
                  conflicts={activeConflicts}
                  offerings={offerings}
                />
              )}

              {activeView === 'report-room-usage' && (
                <ReportsPage
                  initialTab="room-usage"
                  activeOptimizationResult={activeOptimizationResult}
                  currentSchedule={currentSchedule}
                  courses={courses}
                  lecturers={lecturers}
                  classes={classes}
                  rooms={rooms}
                  timeslots={timeslots}
                  conflicts={activeConflicts}
                  offerings={offerings}
                />
              )}

              {/* SCHEDULE HISTORY & AUDIT LOGS */}
              {activeView === 'schedule-history' && (
                currentUser.role === 'admin' ? (
                  <ScheduleHistoryPage
                    currentUser={currentUser}
                    onNavigateToSchedule={() => setActiveView('schedule')}
                    onRefreshScheduleState={() => {
                      setCurrentSchedule(StorageService.getCurrentSchedule());
                      setOfferings(StorageService.getCourseOfferings());
                      setScheduleStatus(StorageService.getScheduleStatus());
                      setAcademicYear(StorageService.getAcademicYear());
                    }}
                  />
                ) : (
                  <AccessDenied
                    currentUser={currentUser}
                    requiredRole="Administrator"
                    onNavigateHome={() => setActiveView('lecturer-dashboard')}
                    onSwitchToAdmin={() => handleSwitchRole('admin')}
                  />
                )
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
