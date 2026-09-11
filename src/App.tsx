import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useToast } from './components/ui/Toast';
import { StorageService } from './services/storageService';
import { AccessDenied } from './components/ui/AccessDenied';
import { PageSkeleton } from './components/ui/PageSkeleton';

// Pages - Admin & Shared (Lazy Loaded for Instant Routing & Code Splitting)
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CoursesPage = lazy(() => import('./pages/CoursesPage').then(m => ({ default: m.CoursesPage })));
const LecturersPage = lazy(() => import('./pages/LecturersPage').then(m => ({ default: m.LecturersPage })));
const StudentsPage = lazy(() => import('./pages/StudentsPage').then(m => ({ default: m.StudentsPage })));
const ClassesPage = lazy(() => import('./pages/ClassesPage').then(m => ({ default: m.ClassesPage })));
const RoomsPage = lazy(() => import('./pages/RoomsPage').then(m => ({ default: m.RoomsPage })));
const TimeslotsPage = lazy(() => import('./pages/TimeslotsPage').then(m => ({ default: m.TimeslotsPage })));
const OptimizationPage = lazy(() => import('./pages/OptimizationPage').then(m => ({ default: m.OptimizationPage })));
const TimetablePage = lazy(() => import('./pages/TimetablePage').then(m => ({ default: m.TimetablePage })));
const ConflictAnalysisPage = lazy(() => import('./pages/ConflictAnalysisPage').then(m => ({ default: m.ConflictAnalysisPage })));
const WeightsConfigPage = lazy(() => import('./pages/WeightsConfigPage').then(m => ({ default: m.WeightsConfigPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ResearchModePage = lazy(() => import('./pages/ResearchModePage').then(m => ({ default: m.ResearchModePage })));
const CurriculumStructurePage = lazy(() => import('./pages/CurriculumStructurePage').then(m => ({ default: m.CurriculumStructurePage })));
const CurriculumPackagesPage = lazy(() => import('./pages/CurriculumPackagesPage').then(m => ({ default: m.CurriculumPackagesPage })));
const CurriculumAnalysisPage = lazy(() => import('./pages/CurriculumAnalysisPage').then(m => ({ default: m.CurriculumAnalysisPage })));
const CourseOfferingsPage = lazy(() => import('./pages/CourseOfferingsPage').then(m => ({ default: m.CourseOfferingsPage })));

// Pages - Lecturer Portal (Lazy Loaded)
const LecturerDashboardPage = lazy(() => import('./pages/lecturer/LecturerDashboardPage').then(m => ({ default: m.LecturerDashboardPage })));
const LecturerSchedulePage = lazy(() => import('./pages/lecturer/LecturerSchedulePage').then(m => ({ default: m.LecturerSchedulePage })));
const LecturerAvailabilityPage = lazy(() => import('./pages/lecturer/LecturerAvailabilityPage').then(m => ({ default: m.LecturerAvailabilityPage })));

// Pages - Student Portal (Lazy Loaded)
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage').then(m => ({ default: m.StudentDashboardPage })));
const StudentSchedulePage = lazy(() => import('./pages/student/StudentSchedulePage').then(m => ({ default: m.StudentSchedulePage })));

// Algorithms
import { generateInitialSchedule } from './algorithms/initialSchedule';
import { detectConflicts } from './algorithms/conflictDetection';
import { SimulatedAnnealingEngine, SAProgressCallbackData } from './algorithms/simulatedAnnealing';
import {
  Course,
  Lecturer,
  Student,
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
    if (currentUser.role === 'student') return 'student-dashboard';
    return 'dashboard';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Master Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [currentSchedule, setCurrentSchedule] = useState<ScheduleAssignment[] | null>(null);
  const [initialSchedule, setInitialSchedule] = useState<ScheduleAssignment[] | null>(null);
  const [parameters, setParameters] = useState<SAParameters>(StorageService.getParameters());
  const [weights, setWeights] = useState<ConstraintWeights>(StorageService.getWeights());
  const [activeOptimizationResult, setActiveOptimizationResult] =
    useState<OptimizationResult | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationResult[]>([]);
  const [changeLogs, setChangeLogs] = useState<ScheduleChangeRecord[]>([]);

  // Live Optimization States
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [liveProgressData, setLiveProgressData] = useState<SAProgressCallbackData | null>(null);
  const saEngineRef = useRef<SimulatedAnnealingEngine | null>(null);

  // Load Initial Data from Storage
  useEffect(() => {
    StorageService.init();
    const c = StorageService.getCourses();
    const l = StorageService.getLecturers();
    const std = StorageService.getStudents();
    const cl = StorageService.getClasses();
    const r = StorageService.getRooms();
    const t = StorageService.getTimeslots();
    const s = StorageService.getCurrentSchedule();
    const initS = StorageService.getInitialSchedule();
    const optRes = StorageService.getActiveOptimizationResult();
    const logs = StorageService.getScheduleChangeLogs();

    setCourses(c);
    setLecturers(l);
    setStudents(std);
    setClasses(cl);
    setRooms(r);
    setTimeslots(t);
    setCurrentSchedule(s);
    setInitialSchedule(initS);
    setActiveOptimizationResult(optRes);
    setChangeLogs(logs);

    // If no schedule exists yet, auto-generate one
    if (!s || s.length === 0) {
      if (c.length > 0 && r.length > 0 && t.length > 0) {
        const off = StorageService.getCourseOfferings();
        const generated = generateInitialSchedule(c, r, t, 'realistic', off);
        setCurrentSchedule(generated);
        setInitialSchedule(generated);
        StorageService.saveCurrentSchedule(generated);
        StorageService.saveInitialSchedule(generated);
      }
    }
  }, []);

  // Compute Conflicts on the fly
  const activeConflicts: ConflictItem[] = React.useMemo(() => {
    if (!currentSchedule || currentSchedule.length === 0) return [];
    const enrollments = StorageService.getStudentEnrollments();
    const curriculumPackages = StorageService.getCurriculumPackages();
    const result = detectConflicts(
      currentSchedule,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights,
      students,
      enrollments,
      curriculumPackages
    );
    return result.items;
  }, [currentSchedule, courses, lecturers, classes, rooms, timeslots, weights, students]);

  // Role Switcher Handler
  const handleSwitchRole = (newRole: UserRole, targetId?: string) => {
    let newUser: CurrentUser;

    if (newRole === 'lecturer') {
      const targetLecturer = targetId
        ? lecturers.find(l => l.id === targetId)
        : lecturers[0];
      const lecturerObj = targetLecturer || lecturers[0] || {
        id: 'lec-1',
        name: 'Dr. Ir. I Made Arya, M.T.',
        nip: '197508122000031001',
      };

      newUser = {
        id: lecturerObj.id,
        name: lecturerObj.name || 'Dosen',
        role: 'lecturer',
        nip: lecturerObj.nip,
        email: `${(lecturerObj.name || 'dosen').toLowerCase().replace(/[^a-z]/g, '')}@unram.ac.id`,
        lecturerId: lecturerObj.id,
      };
      setActiveView('lecturer-dashboard');
      showToast('info', 'Beralih ke Portal Dosen', `Simulasi login sebagai ${newUser.name}`);
    } else if (newRole === 'student') {
      const targetClass = targetId
        ? classes.find(c => c.id === targetId)
        : classes[0];
      const classObj = targetClass || classes[0] || {
        id: 'cls-elk-a-sm3',
        code: 'ELK-A (Sm.3)',
        name: 'Teknik Elektro Kelas A - Semester 3',
        semester: 3,
      };

      newUser = {
        id: `std-${classObj.id}`,
        name: `Mahasiswa ${classObj.code}`,
        role: 'student',
        classId: classObj.id,
        className: classObj.code,
        semester: classObj.semester,
        nim: `F1D0220${Math.floor(10 + Math.random() * 80)}`,
      };
      setActiveView('student-dashboard');
      showToast('info', 'Beralih ke Portal Mahasiswa', `Simulasi login sebagai ${newUser.name} (${classObj.code})`);
    } else {
      newUser = {
        id: 'admin-001',
        name: 'Administrator',
        role: 'admin',
        email: 'admin.elektro@unram.ac.id',
      };
      setActiveView('dashboard');
      showToast('info', 'Beralih ke Akun Administrator', 'Memiliki hak akses penuh untuk konfigurasi dan optimasi.');
    }

    setCurrentUser(newUser);
    StorageService.saveCurrentUser(newUser);
  };

  // Schedule Publication Workflow
  const handlePublishSchedule = () => {
    if (currentUser.role !== 'admin') {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat mempublikasikan jadwal resmi.');
      return;
    }

    const nextStatus: ScheduleStatus = scheduleStatus === 'published' ? 'draft' : 'published';
    setScheduleStatus(nextStatus);
    StorageService.saveScheduleStatus(nextStatus);

    if (nextStatus === 'published') {
      showToast(
        'success',
        'Jadwal Kuliah Resmi Dipublikasikan!',
        'Jadwal perkuliahan kini berstatus RESMI dan dapat diakses penuh oleh seluruh Dosen & Mahasiswa.'
      );
    } else {
      showToast(
        'info',
        'Status Jadwal Dikembalikan ke Draft',
        'Jadwal telah diubah ke mode draft perbaikan.'
      );
    }
  };

  // Handler: Generate Initial Schedule
  const handleGenerateInitial = () => {
    if (!permissions.canManageSchedule) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat membangkitkan jadwal.');
      return;
    }

    if (courses.length === 0 || rooms.length === 0 || timeslots.length === 0) {
      showToast('warning', 'Data Belum Lengkap', 'Pastikan data mata kuliah, ruangan, dan slot waktu tersedia.');
      return;
    }

    const offerings = StorageService.getCourseOfferings();
    const newInitial = generateInitialSchedule(courses, rooms, timeslots, 'realistic', offerings);
    setCurrentSchedule(newInitial);
    setInitialSchedule(newInitial);
    setActiveOptimizationResult(null);
    setScheduleStatus('draft');
    StorageService.saveScheduleStatus('draft');
    StorageService.saveCurrentSchedule(newInitial);
    StorageService.saveInitialSchedule(newInitial);

    const initialResult = detectConflicts(
      newInitial,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights
    );

    showToast(
      'info',
      'Draft Jadwal Awal Dibuat',
      `Jadwal awal dibangkitkan dari ${offerings.length || courses.length} rombel mata kuliah dengan ${initialResult.totalConflictsCount} konflik.`
    );
  };

  // Handler: Run Simulated Annealing Engine
  const handleRunOptimization = () => {
    if (!permissions.canOptimize) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat menjalankan optimasi Simulated Annealing.');
      return;
    }

    const offerings = StorageService.getCourseOfferings();
    const prereq = StorageService.validatePrerequisites(
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      offerings
    );

    if (!prereq.isValid) {
      showToast('error', 'Validasi Gagal', prereq.errors.join(' '));
      return;
    }

    if (prereq.warnings && prereq.warnings.length > 0) {
      showToast('warning', 'Peringatan Data', prereq.warnings[0]);
    }

    let startingSchedule = currentSchedule;
    if (!startingSchedule || startingSchedule.length === 0) {
      startingSchedule = generateInitialSchedule(courses, rooms, timeslots, 'realistic', offerings);
      setInitialSchedule(startingSchedule);
      setCurrentSchedule(startingSchedule);
    }

    setIsOptimizing(true);
    setLiveProgressData(null);

    const engine = new SimulatedAnnealingEngine();
    saEngineRef.current = engine;

    const enrollments = StorageService.getStudentEnrollments();
    const curriculumPackages = StorageService.getCurriculumPackages();

    engine
      .runOptimization(
        startingSchedule,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        parameters,
        weights,
        progress => {
          setLiveProgressData({ ...progress });
        },
        students,
        enrollments,
        curriculumPackages
      )
      .then(result => {
        setIsOptimizing(false);
        setActiveOptimizationResult(result);
        setCurrentSchedule(result.bestSchedule);
        setOptimizationHistory(prev => [result, ...prev]);
        setScheduleStatus('optimized');
        StorageService.saveScheduleStatus('optimized');

        StorageService.saveActiveOptimizationResult(result);
        StorageService.saveCurrentSchedule(result.bestSchedule);

        // Record change log
        const logEntry: ScheduleChangeRecord = {
          id: `log-sa-${Date.now()}`,
          timestamp: new Date().toISOString(),
          courseId: 'all',
          courseCode: 'GLOBAL',
          courseName: 'Optimasi Keseluruhan Sistem',
          lecturerName: 'Simulated Annealing Engine',
          className: 'Semua Rombel',
          before: {
            day: 'Senin',
            timeslotLabel: `${result.initialConflicts.total} Konflik`,
            roomCode: `Cost: ${result.initialCost}`,
          },
          after: {
            day: 'Senin',
            timeslotLabel: `${result.bestConflicts.total} Konflik`,
            roomCode: `Cost: ${result.bestCost}`,
          },
          method: 'Simulated Annealing',
          reason: `Konvergensi pada iterasi ke-${result.bestIteration} (${result.executionTimeMs} ms)`,
          conflictChange: {
            beforeTotal: result.initialConflicts.total,
            afterTotal: result.bestConflicts.total,
          },
        };
        StorageService.addScheduleChangeLog(logEntry);
        setChangeLogs(StorageService.getScheduleChangeLogs());

        showToast(
          'success',
          'Optimasi SA Selesai!',
          `Berhasil menurunkan konflik dari ${result.initialConflicts.total} menjadi ${result.bestConflicts.total} (Iterasi ke-${result.bestIteration}).`
        );
      })
      .catch(err => {
        setIsOptimizing(false);
        showToast('error', 'Optimasi Gagal', err?.message || 'Terjadi kesalahan saat menjalankan algoritma.');
      });
  };

  const handleStopOptimization = () => {
    if (saEngineRef.current) {
      saEngineRef.current.stop();
      setIsOptimizing(false);
      showToast('warning', 'Optimasi Dihentikan', 'Proses Simulated Annealing dihentikan oleh pengguna.');
    }
  };

  // Reset Demo
  const handleResetDemo = () => {
    if (window.confirm('Reset seluruh data ke kondisi awal penelitian Teknik Elektro UNRAM?')) {
      StorageService.resetDemoData();
      setCourses(StorageService.getCourses());
      setLecturers(StorageService.getLecturers());
      setStudents(StorageService.getStudents());
      setClasses(StorageService.getClasses());
      setRooms(StorageService.getRooms());
      setTimeslots(StorageService.getTimeslots());
      setParameters(StorageService.getParameters());
      setWeights(StorageService.getWeights());
      setActiveOptimizationResult(null);
      setChangeLogs([]);
      setScheduleStatus('draft');

      const newGen = generateInitialSchedule(
        StorageService.getCourses(),
        StorageService.getRooms(),
        StorageService.getTimeslots()
      );
      setCurrentSchedule(newGen);
      setInitialSchedule(newGen);
      StorageService.saveCurrentSchedule(newGen);
      StorageService.saveInitialSchedule(newGen);

      showToast('info', 'Dataset Direset', 'Seluruh data penelitian telah dikembalikan ke kondisi default.');
    }
  };

  // CRUD Handlers for Courses
  const handleSaveCourse = (c: Course) => {
    const updated = courses.some(item => item.id === c.id)
      ? courses.map(item => (item.id === c.id ? c : item))
      : [...courses, c];
    setCourses(updated);
    StorageService.saveCourses(updated);
  };

  const handleDeleteCourse = (id: string) => {
    const updated = courses.filter(c => c.id !== id);
    setCourses(updated);
    StorageService.saveCourses(updated);
    if (currentSchedule) {
      const updatedSched = currentSchedule.filter(a => a.courseId !== id);
      setCurrentSchedule(updatedSched);
      StorageService.saveCurrentSchedule(updatedSched);
    }
  };

  // CRUD Handlers for Lecturers
  const handleSaveLecturer = (l: Lecturer) => {
    const updated = lecturers.some(item => item.id === l.id)
      ? lecturers.map(item => (item.id === l.id ? l : item))
      : [...lecturers, l];
    setLecturers(updated);
    StorageService.saveLecturers(updated);
  };

  const handleDeleteLecturer = (id: string) => {
    const updated = lecturers.filter(l => l.id !== id);
    setLecturers(updated);
    StorageService.saveLecturers(updated);
  };

  // CRUD Handlers for Students
  const handleSaveStudent = (st: Student) => {
    const updated = students.some(item => item.id === st.id)
      ? students.map(item => (item.id === st.id ? st : item))
      : [...students, st];
    setStudents(updated);
    StorageService.saveStudents(updated);
    showToast('success', 'Data Mahasiswa Tersimpan', `${st.name} (${st.nim}) berhasil disimpan.`);
  };

  const handleDeleteStudent = (id: string) => {
    const target = students.find(s => s.id === id);
    const updated = students.filter(st => st.id !== id);
    setStudents(updated);
    StorageService.saveStudents(updated);
    if (target) {
      showToast('info', 'Mahasiswa Dihapus', `${target.name} (${target.nim}) telah dihapus.`);
    }
  };

  // Lecturer Availability Update
  const handleSaveLecturerAvailability = (updatedLecturer: Lecturer) => {
    handleSaveLecturer(updatedLecturer);
    showToast(
      'success',
      'Preferensi Ketersediaan Tersimpan',
      'Preferensi waktu dan ketersediaan hari Anda telah diperbarui untuk optimasi jadwal berikutnya.'
    );
  };

  // CRUD Handlers for Classes
  const handleSaveClass = (cl: ClassGroup) => {
    const updated = classes.some(item => item.id === cl.id)
      ? classes.map(item => (item.id === cl.id ? cl : item))
      : [...classes, cl];
    setClasses(updated);
    StorageService.saveClasses(updated);
  };

  const handleDeleteClass = (id: string) => {
    const updated = classes.filter(cl => cl.id !== id);
    setClasses(updated);
    StorageService.saveClasses(updated);
  };

  // CRUD Handlers for Rooms
  const handleSaveRoom = (r: Room) => {
    const updated = rooms.some(item => item.id === r.id)
      ? rooms.map(item => (item.id === r.id ? r : item))
      : [...rooms, r];
    setRooms(updated);
    StorageService.saveRooms(updated);
  };

  const handleDeleteRoom = (id: string) => {
    const updated = rooms.filter(r => r.id !== id);
    setRooms(updated);
    StorageService.saveRooms(updated);
  };

  // CRUD Handlers for Timeslots
  const handleSaveTimeslot = (ts: Timeslot) => {
    const updated = timeslots.some(item => item.id === ts.id)
      ? timeslots.map(item => (item.id === ts.id ? ts : item))
      : [...timeslots, ts];
    setTimeslots(updated);
    StorageService.saveTimeslots(updated);
  };

  const handleDeleteTimeslot = (id: string) => {
    const updated = timeslots.filter(ts => ts.id !== id);
    setTimeslots(updated);
    StorageService.saveTimeslots(updated);
  };

  const handleToggleTimeslot = (id: string) => {
    const updated = timeslots.map(ts =>
      ts.id === id ? { ...ts, isActive: !ts.isActive } : ts
    );
    setTimeslots(updated);
    StorageService.saveTimeslots(updated);
  };

  const handleResetDefaultTimeslots = () => {
    const defaultSlots = StorageService.resetTimeslotsToDefault();
    setTimeslots(defaultSlots);
  };

  // Handler for Manual Move Schedule with Audit Logging
  const handleManualMoveAssignment = (
    assignmentId: string,
    newTimeslotId: string,
    newRoomId: string,
    method: ScheduleChangeRecord['method'] = 'Manual Move',
    reason: string = 'Penyesuaian alokasi jadwal oleh pengguna'
  ) => {
    if (!permissions.canManageSchedule) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat memodifikasi penempatan jadwal.');
      return;
    }

    if (!currentSchedule) return;

    const oldAssign = currentSchedule.find(a => a.id === assignmentId);
    if (!oldAssign) return;

    const course = courses.find(c => c.id === oldAssign.courseId);
    const lecturer = lecturers.find(l => l.id === oldAssign.lecturerId);
    const cls = classes.find(cl => cl.id === oldAssign.classId);
    const oldSlot = timeslots.find(t => t.id === oldAssign.timeslotId);
    const oldRoom = rooms.find(r => r.id === oldAssign.roomId);
    const newSlot = timeslots.find(t => t.id === newTimeslotId);
    const newRoom = rooms.find(r => r.id === newRoomId);

    const prevConflicts = activeConflicts.length;

    const updated = currentSchedule.map(a =>
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
      weights
    ).totalConflictsCount;

    if (course && oldSlot && oldRoom && newSlot && newRoom) {
      const record: ScheduleChangeRecord = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        lecturerName: lecturer?.name || '-',
        className: cls?.code || '-',
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

      StorageService.addScheduleChangeLog(record);
      setChangeLogs(StorageService.getScheduleChangeLogs());
    }
  };

  // Handler for Swap Assignments with Audit Logging
  const handleSwapAssignments = (
    assignment1Id: string,
    assignment2Id: string,
    reason: string = 'Pertukaran slot jadwal oleh pengguna'
  ) => {
    if (!permissions.canManageSchedule) {
      showToast('error', 'Akses Ditolak', 'Hanya administrator yang dapat menukar slot jadwal.');
      return;
    }

    if (!currentSchedule) return;

    const a1 = currentSchedule.find(a => a.id === assignment1Id);
    const a2 = currentSchedule.find(a => a.id === assignment2Id);
    if (!a1 || !a2) return;

    const course1 = courses.find(c => c.id === a1.courseId);
    const course2 = courses.find(c => c.id === a2.courseId);
    const prevConflicts = activeConflicts.length;

    const updated = currentSchedule.map(a => {
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
      weights
    ).totalConflictsCount;

    const record: ScheduleChangeRecord = {
      id: `log-swap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      courseId: course1?.id || 'swap',
      courseCode: `${course1?.code || ''} ↔ ${course2?.code || ''}`,
      courseName: `Swap: ${course1?.name || ''} dengan ${course2?.name || ''}`,
      lecturerName: 'Pertukaran Jadwal',
      className: 'Multi Kelas',
      before: {
        day: timeslots.find(t => t.id === a1.timeslotId)?.day || 'Senin',
        timeslotLabel: timeslots.find(t => t.id === a1.timeslotId)?.label || '',
        roomCode: rooms.find(r => r.id === a1.roomId)?.code || '',
      },
      after: {
        day: timeslots.find(t => t.id === a2.timeslotId)?.day || 'Senin',
        timeslotLabel: timeslots.find(t => t.id === a2.timeslotId)?.label || '',
        roomCode: rooms.find(r => r.id === a2.roomId)?.code || '',
      },
      method: 'Swap Recommendation',
      reason,
      conflictChange: {
        beforeTotal: prevConflicts,
        afterTotal: nextConflicts,
      },
    };

    StorageService.addScheduleChangeLog(record);
    setChangeLogs(StorageService.getScheduleChangeLogs());
  };

  const handleClearLogs = () => {
    StorageService.clearScheduleChangeLogs();
    setChangeLogs([]);
  };

  // Handler for Parameters & Weights
  const handleSaveParameters = (p: SAParameters) => {
    setParameters(p);
    StorageService.saveParameters(p);
  };

  const handleSaveWeights = (w: ConstraintWeights) => {
    setWeights(w);
    StorageService.saveWeights(w);
  };

  // Active Lecturer & Student Class Entity
  const activeLecturerEntity =
    currentUser.role === 'lecturer'
      ? lecturers.find(l => l.id === currentUser.lecturerId) || lecturers[0]
      : null;

  // Dynamic View Titles
  const viewTitles: Record<string, string> = {
    dashboard: 'Dashboard SPK Penjadwalan',
    'lecturer-dashboard': 'Portal Dosen Teknik Elektro',
    'lecturer-schedule': 'Jadwal Mengajar Saya',
    'lecturer-availability': 'Ketersediaan & Preferensi Dosen',
    'student-dashboard': 'Portal Mahasiswa Teknik Elektro',
    'student-schedule': 'Jadwal Kuliah Mahasiswa',
    optimization: 'Optimasi Simulated Annealing',
    schedule: 'Jadwal Kuliah (Timetable Matrix)',
    conflicts: 'Analisis & Audit Konflik',
    courses: 'Data Master Mata Kuliah',
    lecturers: 'Data Master Dosen Pengampu',
    students: 'Data Master Mahasiswa',
    classes: 'Data Master Kelas Rombel',
    rooms: 'Data Master Ruangan & Lab',
    timeslots: 'Manajemen Slot Waktu Perkuliahan',
    weights: 'Pengaturan Bobot & Penalti SPK',
    settings: 'Pengaturan Bobot & Penalti SPK',
    reports: 'Laporan Hasil Penelitian & Ekspor',
    research: 'Mode Penelitian & Evaluasi TA',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans antialiased overflow-x-hidden">
      {/* Persistent Academic Sidebar */}
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

      {/* Main Content Area with desktop sidebar offset */}
      <div className="md:pl-64 flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto min-w-0">
          <Suspense fallback={<PageSkeleton />}>
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

            {/* STUDENT PORTAL ROUTES */}
            {activeView === 'student-dashboard' && (
              <StudentDashboardPage
                currentUser={currentUser}
                classes={classes}
                courses={courses}
                schedule={currentSchedule || []}
                timeslots={timeslots}
                rooms={rooms}
                lecturers={lecturers}
                scheduleStatus={scheduleStatus}
                academicYear={academicYear}
                onNavigate={setActiveView}
              />
            )}

            {activeView === 'student-schedule' && (
              <StudentSchedulePage
                currentUser={currentUser}
                classes={classes}
                courses={courses}
                schedule={currentSchedule || []}
                timeslots={timeslots}
                rooms={rooms}
                lecturers={lecturers}
                scheduleStatus={scheduleStatus}
                academicYear={academicYear}
              />
            )}

            {/* 1. ADMIN DASHBOARD */}
            {activeView === 'dashboard' && (
              currentUser.role === 'admin' ? (
                <DashboardPage
                  courses={courses}
                  lecturers={lecturers}
                  students={students}
                  classes={classes}
                  rooms={rooms}
                  timeslots={timeslots}
                  currentSchedule={currentSchedule}
                  initialSchedule={initialSchedule}
                  activeOptimizationResult={activeOptimizationResult}
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
                  onNavigateHome={() => setActiveView(currentUser.role === 'lecturer' ? 'lecturer-dashboard' : 'student-dashboard')}
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
                  onNavigateHome={() => setActiveView(currentUser.role === 'lecturer' ? 'lecturer-dashboard' : 'student-dashboard')}
                  onSwitchToAdmin={() => handleSwitchRole('admin')}
                />
              )
            )}

            {/* 3. TIMETABLE SCHEDULE (ALL ROLES CAN VIEW, BUT EDITING RESTRICTED) */}
            {activeView === 'schedule' && (
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
              />
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

            {/* ACADEMIC DATA & CURRICULUM */}
            {activeView === 'curriculum' && (
              <CurriculumStructurePage />
            )}

            {activeView === 'packages' && (
              <CurriculumPackagesPage />
            )}

            {activeView === 'curriculum-analysis' && (
              <CurriculumAnalysisPage />
            )}

            {activeView === 'offerings' && (
              <CourseOfferingsPage />
            )}

            {/* 5. COURSES CRUD */}
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

            {/* 6. LECTURERS CRUD */}
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

            {/* 6B. STUDENTS CRUD */}
            {activeView === 'students' && (
              <StudentsPage
                students={students}
                classes={classes}
                academicYear={academicYear}
                onAddStudent={handleSaveStudent}
                onEditStudent={handleSaveStudent}
                onDeleteStudent={handleDeleteStudent}
              />
            )}

            {/* 7. CLASSES CRUD */}
            {activeView === 'classes' && (
              <ClassesPage
                classes={classes}
                courses={courses}
                schedule={currentSchedule || []}
                permissions={permissions}
                onSaveClass={handleSaveClass}
                onDeleteClass={handleDeleteClass}
              />
            )}

            {/* 8. ROOMS CRUD */}
            {activeView === 'rooms' && (
              <RoomsPage
                rooms={rooms}
                schedule={currentSchedule || []}
                permissions={permissions}
                onSaveRoom={handleSaveRoom}
                onDeleteRoom={handleDeleteRoom}
              />
            )}

            {/* 9. TIMESLOTS MATRIX CRUD */}
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

            {/* 10. WEIGHTS CONFIGURATION */}
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
                  onNavigateHome={() => setActiveView(currentUser.role === 'lecturer' ? 'lecturer-dashboard' : 'student-dashboard')}
                  onSwitchToAdmin={() => handleSwitchRole('admin')}
                />
              )
            )}

            {/* 11. REPORTS & EXPORT */}
            {activeView === 'reports' && (
              <ReportsPage
                activeOptimizationResult={activeOptimizationResult}
                currentSchedule={currentSchedule}
                courses={courses}
                lecturers={lecturers}
                classes={classes}
                rooms={rooms}
                timeslots={timeslots}
                conflicts={activeConflicts}
              />
            )}

            {/* 12. RESEARCH MODE & TA EVALUATION */}
            {activeView === 'research' && (
              permissions.canAccessResearchMode ? (
                <ResearchModePage
                  activeResult={activeOptimizationResult}
                  history={optimizationHistory}
                  parameters={parameters}
                  weights={weights}
                  courses={courses}
                  lecturers={lecturers}
                  rooms={rooms}
                  timeslots={timeslots}
                  classes={classes}
                  onNavigateToOptimization={() => setActiveView('optimization')}
                />
              ) : (
                <AccessDenied
                  currentUser={currentUser}
                  requiredRole="Administrator / Tim Peneliti"
                  onNavigateHome={() => setActiveView(currentUser.role === 'lecturer' ? 'lecturer-dashboard' : 'student-dashboard')}
                  onSwitchToAdmin={() => handleSwitchRole('admin')}
                />
              )
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

