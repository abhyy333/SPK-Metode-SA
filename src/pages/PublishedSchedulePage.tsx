import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
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
  ExamOffering,
  ScheduleVersion,
  ExamVersion,
} from '../types';
import { StorageService } from '../services/storageService';
import { DownloadScheduleButton } from '../components/schedule/DownloadScheduleButton';
import { ScheduleVersionSelector, VersionOption } from '../components/schedule/ScheduleVersionSelector';
import { ScheduleExportItem, ScheduleExportOptions } from '../utils/scheduleExport';
import { calculateCourseTiming } from '../utils/sessionUtils';
import { useToast } from '../components/ui/Toast';

interface PublishedSchedulePageProps {
  currentUser: CurrentUser;
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  academicYear: string;
  onRefreshSchedule?: () => void;
}

const WEEKDAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export const PublishedSchedulePage: React.FC<PublishedSchedulePageProps> = ({
  currentUser,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  academicYear,
  onRefreshSchedule,
}) => {
  const { showToast } = useToast();
  const canManage = currentUser.role === 'admin';

  // 1. Primary Tabs: [ Jadwal Perkuliahan ] vs [ Jadwal Ujian ]
  const [activeMainTab, setActiveMainTab] = useState<'kuliah' | 'ujian'>('kuliah');
  // Sub-Tabs inside Jadwal Ujian: [ UTS ] vs [ UAS ]
  const [activeExamSubTab, setActiveExamSubTab] = useState<'UTS' | 'UAS'>('UTS');

  // 2. Version States
  const [lectureVersions, setLectureVersions] = useState<ScheduleVersion[]>(() => {
    return StorageService.getScheduleVersions();
  });
  const [selectedLectureVersionId, setSelectedLectureVersionId] = useState<string>(() => {
    const active = StorageService.getActiveScheduleVersion();
    return active?.id || lectureVersions[0]?.id || '';
  });

  // Admin "Ganti Jadwal" Modal State
  const [isReplaceScheduleModalOpen, setIsReplaceScheduleModalOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [newVersionStatus, setNewVersionStatus] = useState<'Draft' | 'Diterbitkan'>('Diterbitkan');
  const [newVersionSource, setNewVersionSource] = useState<'simulation' | 'current_version'>('simulation');
  const [isKknDetailOpen, setIsKknDetailOpen] = useState(false);

  const [utsVersions, setUtsVersions] = useState<ExamVersion[]>(() => {
    return StorageService.getExamVersions('UTS');
  });
  const [selectedUtsVersionId, setSelectedUtsVersionId] = useState<string>(() => {
    const active = StorageService.getActiveExamVersion('UTS');
    return active?.id || utsVersions[0]?.id || '';
  });

  const [uasVersions, setUasVersions] = useState<ExamVersion[]>(() => {
    return StorageService.getExamVersions('UAS');
  });
  const [selectedUasVersionId, setSelectedUasVersionId] = useState<string>(() => {
    const active = StorageService.getActiveExamVersion('UAS');
    return active?.id || uasVersions[0]?.id || '';
  });

  // 3. Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>('all');
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('all');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Master Data Lookups
  const courseMap = useMemo(() => new Map<string, Course>(courses.map((c) => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map((l) => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map((t) => [t.id, t])), [timeslots]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map((cl) => [cl.id, cl])), [classes]);
  const offerings = useMemo(() => StorageService.getCourseOfferings(), []);
  const offeringMap = useMemo(() => new Map(offerings.map((o) => [o.id, o])), [offerings]);
  const kbks = useMemo(() => StorageService.getKbks(), []);

  // Handlers for Publishing Versions
  const handlePublishLectureVersion = (verId: string) => {
    const updated = StorageService.publishScheduleVersion(verId, currentUser.name || 'Administrator');
    if (updated) {
      setLectureVersions(StorageService.getScheduleVersions());
      setSelectedLectureVersionId(verId);
      if (onRefreshSchedule) onRefreshSchedule();
      showToast('success', 'Jadwal Perkuliahan Diterbitkan', `${updated.name} kini resmi aktif sebagai jadwal perkuliahan.`);
    }
  };

  const handlePublishExamVersion = (examType: 'UTS' | 'UAS', verId: string) => {
    const updated = StorageService.publishExamVersion(examType, verId, currentUser.name || 'Administrator');
    if (updated) {
      if (examType === 'UTS') {
        setUtsVersions(StorageService.getExamVersions('UTS'));
        setSelectedUtsVersionId(verId);
      } else {
        setUasVersions(StorageService.getExamVersions('UAS'));
        setSelectedUasVersionId(verId);
      }
      showToast('success', `Jadwal ${examType} Diterbitkan`, `${updated.versionName} kini resmi aktif.`);
    }
  };

  // Handlers for Admin "Ganti Jadwal" / Buat Versi Baru
  const handleOpenReplaceModal = () => {
    const nextNum = lectureVersions.length + 1;
    setNewVersionName(`Versi ${nextNum}.0 (Revisi Semester ${academicYear.split('/')[0] || '2026'})`);
    setNewVersionNotes('Pembaruan alokasi ruang dan sinkronisasi jadwal.');
    setNewVersionStatus('Diterbitkan');
    setNewVersionSource('simulation');
    setIsReplaceScheduleModalOpen(true);
  };

  const handleConfirmCreateVersion = () => {
    let sourceAssignments: ScheduleAssignment[] = [];
    if (newVersionSource === 'simulation') {
      sourceAssignments = StorageService.getCurrentSchedule() || [];
    } else {
      sourceAssignments = currentLectureVersion?.scheduleAssignments || StorageService.getCurrentSchedule() || [];
    }

    if (!sourceAssignments || sourceAssignments.length === 0) {
      showToast('error', 'Gagal Membuat Versi', 'Tidak ada data jadwal yang tersedia untuk disimpan.');
      return;
    }

    const created = StorageService.createScheduleVersion(
      newVersionName.trim() || `Versi ${lectureVersions.length + 1}.0`,
      sourceAssignments,
      newVersionStatus,
      currentUser.name || 'Administrator',
      newVersionNotes.trim()
    );

    const reloaded = StorageService.getScheduleVersions();
    setLectureVersions(reloaded);
    setSelectedLectureVersionId(created.id);
    setIsReplaceScheduleModalOpen(false);
    if (onRefreshSchedule) onRefreshSchedule();

    showToast(
      'success',
      newVersionStatus === 'Diterbitkan' ? 'Jadwal Baru Resmi Diterbitkan' : 'Versi Draf Berhasil Dibuat',
      `"${created.name}" kini telah disimpan dengan status ${newVersionStatus}.${
        newVersionStatus === 'Diterbitkan' ? ' Versi aktif sebelumnya telah dialihkan statusnya menjadi Digantikan.' : ''
      }`
    );
  };

  // Convert versions to standard VersionOption
  const currentLectureVersion = lectureVersions.find((v) => v.id === selectedLectureVersionId) || lectureVersions[0];
  const lectureVersionOptions: VersionOption[] = lectureVersions.map((v) => ({
    id: v.id,
    name: v.name,
    versionNumber: v.versionNumber || 1,
    status: StorageService.normalizeStatus(v.status),
    createdAt: v.createdAt,
    publishedAt: v.publishedAt,
    publishedBy: v.publishedBy,
    notes: v.notes,
  }));

  const currentUtsVersion = utsVersions.find((v) => v.id === selectedUtsVersionId) || utsVersions[0];
  const utsVersionOptions: VersionOption[] = utsVersions.map((v) => ({
    id: v.id,
    name: v.versionName,
    versionNumber: v.versionNumber || 1,
    status: StorageService.normalizeStatus(v.status),
    createdAt: v.createdAt,
    publishedAt: v.publishedAt,
    publishedBy: v.publishedBy,
    notes: v.notes,
  }));

  const currentUasVersion = uasVersions.find((v) => v.id === selectedUasVersionId) || uasVersions[0];
  const uasVersionOptions: VersionOption[] = uasVersions.map((v) => ({
    id: v.id,
    name: v.versionName,
    versionNumber: v.versionNumber || 1,
    status: StorageService.normalizeStatus(v.status),
    createdAt: v.createdAt,
    publishedAt: v.publishedAt,
    publishedBy: v.publishedBy,
    notes: v.notes,
  }));

  // Assignments to preview based on selected lecture version
  const displayedLectureAssignments = useMemo(() => {
    const raw = currentLectureVersion?.scheduleAssignments || StorageService.getCurrentSchedule() || [];
    return raw;
  }, [currentLectureVersion]);

  // Exam offerings to preview based on selected exam version
  const displayedExamOfferings = useMemo(() => {
    if (activeExamSubTab === 'UTS') {
      return currentUtsVersion?.offerings || StorageService.getExamOfferings('UTS');
    } else {
      return currentUasVersion?.offerings || StorageService.getExamOfferings('UAS');
    }
  }, [activeExamSubTab, currentUtsVersion, currentUasVersion]);

  // Filtered Lecture Assignments
  const filteredLectureAssignments = useMemo(() => {
    return displayedLectureAssignments
      .filter((assign) => {
        const course = courseMap.get(assign.courseId);
        if (!course) return false;

        // Skip practicum
        if (course.type === 'Praktikum' || (course.name || '').toLowerCase().includes('praktikum')) {
          return false;
        }

        const off = assign.courseOfferingId ? offeringMap.get(assign.courseOfferingId) : null;
        const sem = off?.semester || course.semester || 1;
        const kbkId = off?.kbkId || (course.kbkIds && course.kbkIds.length > 0 ? course.kbkIds[0] : null);

        if (selectedSemester !== 'all' && sem !== Number(selectedSemester)) {
          return false;
        }

        if (selectedKbk !== 'all' && kbkId && kbkId !== selectedKbk && course.category === 'Pilihan') {
          return false;
        }

        const ts = timeslotMap.get(assign.timeslotId);
        if (selectedDay !== 'all' && ts?.day !== selectedDay) {
          return false;
        }

        if (selectedLecturerId !== 'all') {
          const lecIds = assign.lecturerIds && assign.lecturerIds.length > 0 ? assign.lecturerIds : [assign.lecturerId];
          if (!lecIds.includes(selectedLecturerId)) {
            return false;
          }
        }

        if (selectedRoomId !== 'all' && assign.roomId !== selectedRoomId) {
          return false;
        }

        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const cName = course.name.toLowerCase();
          const cCode = course.code.toLowerCase();
          const rCode = roomMap.get(assign.roomId)?.code.toLowerCase() || '';
          const lecNames = (assign.lecturerIds || [assign.lecturerId])
            .map((id) => (id ? lecturerMap.get(id)?.name.toLowerCase() : ''))
            .join(' ');

          if (!cName.includes(q) && !cCode.includes(q) && !rCode.includes(q) && !lecNames.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const tsA = timeslotMap.get(a.timeslotId);
        const tsB = timeslotMap.get(b.timeslotId);
        if (!tsA || !tsB) return 0;
        const dayOrder = WEEKDAYS.indexOf(tsA.day) - WEEKDAYS.indexOf(tsB.day);
        if (dayOrder !== 0) return dayOrder;
        return tsA.startTime.localeCompare(tsB.startTime);
      });
  }, [
    displayedLectureAssignments,
    courseMap,
    offeringMap,
    timeslotMap,
    roomMap,
    lecturerMap,
    selectedSemester,
    selectedKbk,
    selectedDay,
    selectedLecturerId,
    selectedRoomId,
    searchQuery,
  ]);

  // Filtered Exam Offerings
  const filteredExamOfferings = useMemo(() => {
    return displayedExamOfferings.filter((ex) => {
      const course = courseMap.get(ex.courseId);
      const sem = ex.semester || course?.semester || 1;

      if (selectedSemester !== 'all' && sem !== Number(selectedSemester)) {
        return false;
      }

      if (selectedKbk !== 'all' && ex.kbkId && ex.kbkId !== selectedKbk && course?.category === 'Pilihan') {
        return false;
      }

      if (selectedLecturerId !== 'all') {
        const supIds = ex.supervisorLecturerIds || [];
        const lecIds = ex.lecturerIds || [];
        if (!supIds.includes(selectedLecturerId) && !lecIds.includes(selectedLecturerId)) {
          return false;
        }
      }

      if (selectedRoomId !== 'all') {
        const rIds = ex.roomIds || [];
        if (!rIds.includes(selectedRoomId)) {
          return false;
        }
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const cName = (ex.courseName || course?.name || '').toLowerCase();
        const cCode = (ex.courseCode || course?.code || '').toLowerCase();
        const supNames = (ex.supervisorLecturerIds || [])
          .map((id) => lecturerMap.get(id)?.name.toLowerCase() || '')
          .join(' ');
        const rNames = (ex.roomIds || [])
          .map((id) => roomMap.get(id)?.name.toLowerCase() || '')
          .join(' ');

        if (!cName.includes(q) && !cCode.includes(q) && !supNames.includes(q) && !rNames.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [
    displayedExamOfferings,
    courseMap,
    lecturerMap,
    roomMap,
    selectedSemester,
    selectedKbk,
    selectedLecturerId,
    selectedRoomId,
    searchQuery,
  ]);

  // Is KKN relevant
  const isKknRelevant = selectedSemester === 'all' || selectedSemester === '7';

  // Export Data Builder (Requirement #18)
  const exportOptions: ScheduleExportOptions = useMemo(() => {
    const semLabel = selectedSemester === 'all' ? 'Semua Semester' : `Semester ${selectedSemester}`;
    const kbkLabel =
      selectedKbk === 'all' ? 'Semua KBK' : kbks.find((k) => k.id === selectedKbk)?.name || selectedKbk;
    const lecLabel =
      selectedLecturerId === 'all' ? '' : ` • Dosen: ${lecturerMap.get(selectedLecturerId)?.name}`;
    const roomLabel =
      selectedRoomId === 'all' ? '' : ` • Ruang: ${roomMap.get(selectedRoomId)?.code}`;

    const filterSubtitle = `${semLabel} • ${kbkLabel}${lecLabel}${roomLabel}${
      searchQuery ? ` • "${searchQuery}"` : ''
    }`;

    if (activeMainTab === 'kuliah') {
      const items: ScheduleExportItem[] = filteredLectureAssignments.map((assign, idx) => {
        const course = courseMap.get(assign.courseId);
        const timeslot = timeslotMap.get(assign.timeslotId);
        const room = roomMap.get(assign.roomId);
        const off = assign.courseOfferingId ? offeringMap.get(assign.courseOfferingId) : null;
        const cls = classMap.get(assign.classId);
        const lecIds =
          assign.lecturerIds && assign.lecturerIds.length > 0 ? assign.lecturerIds : [assign.lecturerId];
        const lecturerNames =
          lecIds
            .map((id) => (id ? lecturerMap.get(id)?.name : ''))
            .filter(Boolean)
            .join(', ') || '-';

        const courseSks = Math.max(1, Math.round(assign.sks || off?.sks || course?.sks || course?.credits || 2));
        const timing = calculateCourseTiming(timeslot, courseSks, timeslots);

        return {
          no: idx + 1,
          dayOrDate: timeslot?.day || '-',
          time: timeslot ? `${timeslot.startTime} - ${timing.endTime} (${timing.sessionRangeLabel})` : '-',
          courseCode: course?.code || '-',
          courseName: course?.name || '-',
          sks: courseSks,
          sectionOrClass: off?.sectionName || cls?.name || 'A',
          room: room?.name || room?.code || '-',
          lecturerOrSupervisor: lecturerNames,
          semester: off?.semester || course?.semester,
        };
      });

      // Include KKN as a recognized field course in official export when applicable
      if (isKknRelevant && selectedDay === 'all' && selectedRoomId === 'all') {
        items.push({
          no: items.length + 1,
          dayOrDate: 'Periode Lapangan',
          time: 'Non-Tatap Muka (LPPM)',
          courseCode: 'MPK1077101',
          courseName: 'Kuliah Kerja Nyata (KKN)',
          sks: 4,
          sectionOrClass: 'Semua',
          room: 'Desa Binaan (LPPM)',
          lecturerOrSupervisor: 'Dosen Pembimbing Lapangan (DPL) LPPM',
          semester: 7,
        });
      }

      return {
        title: 'JADWAL PERKULIAHAN RESMI',
        academicYear,
        academicTerm: 'Ganjil',
        filterSubtitle,
        items,
        isExam: false,
        filename: `jadwal_kuliah_jurusan_${academicYear.replace('/', '-')}.pdf`,
      };
    } else {
      const examTitle =
        activeExamSubTab === 'UTS'
          ? 'JADWAL UJIAN TENGAH SEMESTER (UTS)'
          : 'JADWAL UJIAN AKHIR SEMESTER (UAS)';

      const items: ScheduleExportItem[] = filteredExamOfferings.map((ex, idx) => {
        const course = courseMap.get(ex.courseId);
        const supNames =
          (ex.supervisorLecturerIds || [])
            .map((id) => lecturerMap.get(id)?.name)
            .filter(Boolean)
            .join(', ') || '-';
        const roomNames =
          (ex.roomIds || [])
            .map((id) => roomMap.get(id)?.name || roomMap.get(id)?.code)
            .filter(Boolean)
            .join(', ') || '-';

        return {
          no: idx + 1,
          dayOrDate: ex.examDate
            ? new Date(ex.examDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
              })
            : 'Belum Ditentukan',
          time: ex.examSessionId || 'Sesi 1 (08:00 - 09:30)',
          courseCode: ex.courseCode || course?.code || '-',
          courseName: ex.courseName || course?.name || '-',
          sectionOrClass: ex.sectionName || 'A',
          room: roomNames,
          lecturerOrSupervisor: supNames,
          semester: ex.semester || course?.semester,
          participantCount: ex.studentCount,
        };
      });

      return {
        title: examTitle,
        academicYear,
        academicTerm: 'Ganjil',
        filterSubtitle,
        items,
        isExam: true,
        filename: `jadwal_${activeExamSubTab.toLowerCase()}_jurusan_${academicYear.replace('/', '-')}.pdf`,
      };
    }
  }, [
    activeMainTab,
    activeExamSubTab,
    filteredLectureAssignments,
    filteredExamOfferings,
    selectedSemester,
    selectedKbk,
    selectedLecturerId,
    selectedRoomId,
    searchQuery,
    academicYear,
    courseMap,
    timeslotMap,
    roomMap,
    offeringMap,
    classMap,
    lecturerMap,
    kbks,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div className="bg-white rounded-md border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Jadwal Diterbitkan (Resmi)
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 font-medium">Tahun Akademik {academicYear}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Jadwal Diterbitkan Jurusan Teknik Elektro
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Portal publikasi resmi jadwal perkuliahan dan ujian untuk civitas akademika UNRAM.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <DownloadScheduleButton
              options={exportOptions}
              variant="primary"
              label={`Download Jadwal ${activeMainTab === 'kuliah' ? 'Kuliah' : activeExamSubTab}`}
            />
          </div>
        </div>

        {/* Primary Tabs: [ Jadwal Perkuliahan ] vs [ Jadwal Ujian ] */}
        <div className="mt-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex space-x-6">
            <button
              type="button"
              id="tab-published-kuliah"
              onClick={() => setActiveMainTab('kuliah')}
              className={`pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer ${
                activeMainTab === 'kuliah'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwal Perkuliahan</span>
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-medium rounded bg-slate-100 text-slate-700">
                  {filteredLectureAssignments.length} Sesi
                </span>
              </div>
            </button>

            <button
              type="button"
              id="tab-published-ujian"
              onClick={() => setActiveMainTab('ujian')}
              className={`pb-2.5 text-xs font-semibold transition-colors relative cursor-pointer ${
                activeMainTab === 'ujian'
                  ? 'text-slate-900 border-b-2 border-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Jadwal Ujian</span>
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-medium rounded bg-slate-100 text-slate-700">
                  UTS &amp; UAS
                </span>
              </div>
            </button>
          </div>

          {/* Sub-Tabs when in Jadwal Ujian: [ UTS ] [ UAS ] */}
          {activeMainTab === 'ujian' && (
            <div className="flex items-center gap-1 pb-1.5">
              <button
                type="button"
                id="btn-published-subtab-uts"
                onClick={() => setActiveExamSubTab('UTS')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeExamSubTab === 'UTS'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                UTS
              </button>
              <button
                type="button"
                id="btn-published-subtab-uas"
                onClick={() => setActiveExamSubTab('UAS')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeExamSubTab === 'UAS'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                UAS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Version Selector Toolbar */}
      <div className="bg-white rounded-md border border-slate-200 p-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1">
            {activeMainTab === 'kuliah' ? (
              <ScheduleVersionSelector
                scheduleType="perkuliahan"
                versions={lectureVersionOptions}
                selectedVersionId={selectedLectureVersionId}
                onSelectVersion={setSelectedLectureVersionId}
                onPublishVersion={handlePublishLectureVersion}
                canManage={canManage}
              />
            ) : activeExamSubTab === 'UTS' ? (
              <ScheduleVersionSelector
                scheduleType="UTS"
                versions={utsVersionOptions}
                selectedVersionId={selectedUtsVersionId}
                onSelectVersion={setSelectedUtsVersionId}
                onPublishVersion={(vId) => handlePublishExamVersion('UTS', vId)}
                canManage={canManage}
              />
            ) : (
              <ScheduleVersionSelector
                scheduleType="UAS"
                versions={uasVersionOptions}
                selectedVersionId={selectedUasVersionId}
                onSelectVersion={setSelectedUasVersionId}
                onPublishVersion={(vId) => handlePublishExamVersion('UAS', vId)}
                canManage={canManage}
              />
            )}
          </div>

          {canManage && activeMainTab === 'kuliah' && (
            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                id="btn-replace-schedule"
                onClick={handleOpenReplaceModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer"
                title="Ganti atau buat versi baru jadwal perkuliahan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ganti / Buat Versi Baru</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Comprehensive Filters */}
      <div className="bg-white rounded-md border border-slate-200 p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Semester */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-400"
            >
              <option value="all">Semua Semester</option>
              <option value="1">Semester 1 (2026)</option>
              <option value="3">Semester 3 (2025)</option>
              <option value="5">Semester 5 (2024)</option>
              <option value="7">Semester 7 (2023)</option>
            </select>
          </div>

          {/* KBK */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              KBK
            </label>
            <select
              value={selectedKbk}
              onChange={(e) => setSelectedKbk(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-400"
            >
              <option value="all">Semua KBK &amp; Wajib</option>
              {kbks.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dosen */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Dosen Pengampu
            </label>
            <select
              value={selectedLecturerId}
              onChange={(e) => setSelectedLecturerId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-400 truncate"
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
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Ruangan
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-400"
            >
              <option value="all">Semua Ruangan</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cari Cepat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kode, MK, dosen, ruang..."
                className="w-full bg-white border border-slate-200 rounded-md pl-8 pr-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Special KKN Callout & Policy Detail */}
      {isKknRelevant && (
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 text-slate-800 space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded bg-slate-200/70 text-slate-700 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xs font-semibold text-slate-900">
                    Perlakuan Khusus: Kuliah Kerja Nyata (KKN)
                  </h2>
                  <span className="text-[10px] font-medium bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-mono">
                    4 SKS • Semester 7
                  </span>
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                    Non-Tatap Muka Jurusan
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Mata kuliah KKN (MPK1077101 / FBS4142) diatur secara terpusat oleh <strong>LPPM Universitas Mataram</strong>. Pelaksanaan dilakukan di lapangan (desa binaan) dan tidak menggunakan slot ruangan kelas reguler.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsKknDetailOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2 py-1 rounded transition-colors shrink-0"
            >
              <span>{isKknDetailOpen ? 'Tutup Panduan' : 'Panduan'}</span>
              {isKknDetailOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isKknDetailOpen && (
            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-slate-700">
              <div className="bg-white rounded p-2.5 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-0.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pengelola &amp; Lokasi</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Dikelola penuh oleh LPPM UNRAM di lokasi desa penempatan KKN Tematik NTB.
                </p>
              </div>
              <div className="bg-white rounded p-2.5 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-0.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Beban SKS &amp; KRS</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Bobot 4 SKS dihitung otomatis dalam beban KRS mahasiswa semester 7 tanpa membebani kuota ruang perkuliahan.
                </p>
              </div>
              <div className="bg-white rounded p-2.5 border border-slate-200">
                <div className="font-semibold text-slate-900 mb-0.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Dosen Pembimbing Lapangan</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Bimbingan dilakukan oleh DPL LPPM dengan supervisi lapangan fleksibel di luar jam tatap muka kuliah.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Content View */}
      {activeMainTab === 'kuliah' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-900">
              Daftar Sesi Jadwal Perkuliahan ({currentLectureVersion?.name})
            </div>
            <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              {filteredLectureAssignments.length} Sesi Terjadwal
            </span>
          </div>

          {filteredLectureAssignments.length === 0 ? (
            <div className="bg-white rounded-md border border-slate-200 p-8 text-center text-slate-500 space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-700 text-sm">Tidak ada jadwal kuliah yang sesuai filter</p>
              <p className="text-xs text-slate-400">Silakan sesuaikan filter semester, KBK, atau pencarian.</p>
            </div>
          ) : (
            <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-12">No</th>
                      <th className="py-2.5 px-3 w-24">Hari</th>
                      <th className="py-2.5 px-3 w-32">Jam Kuliah</th>
                      <th className="py-3 px-3.5 w-24">Kode MK</th>
                      <th className="py-3 px-3.5">Mata Kuliah</th>
                      <th className="py-3 px-3.5 text-center w-14">SKS</th>
                      <th className="py-3 px-3.5 text-center w-16">Kelas</th>
                      <th className="py-3 px-3.5 w-28">Ruangan</th>
                      <th className="py-3 px-3.5">Dosen Pengampu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredLectureAssignments.map((assign, idx) => {
                      const course = courseMap.get(assign.courseId);
                      const ts = timeslotMap.get(assign.timeslotId);
                      const room = roomMap.get(assign.roomId);
                      const off = assign.courseOfferingId ? offeringMap.get(assign.courseOfferingId) : null;
                      const cls = classMap.get(assign.classId);
                      const lecIds =
                        assign.lecturerIds && assign.lecturerIds.length > 0 ? assign.lecturerIds : [assign.lecturerId];
                      const lecturersList = lecIds.map((id) => (id ? lecturerMap.get(id) : null)).filter(Boolean);

                      const courseSks = Math.max(1, Math.round(assign.sks || off?.sks || course?.sks || course?.credits || 2));
                      const timing = calculateCourseTiming(ts, courseSks, timeslots);

                      return (
                        <tr key={assign.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3.5 font-semibold text-slate-800">{ts?.day || '-'}</td>
                          <td className="py-3 px-3.5">
                            {ts ? (
                              <div>
                                <span className="font-mono font-bold text-slate-900">{ts.startTime} - {timing.endTime}</span>
                                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                  {timing.sessionRangeLabel} • {timing.durationMinutes} mnt
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600 font-medium">{course?.code || '-'}</td>
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-900">{course?.name || '-'}</div>
                            {course?.category === 'Pilihan' && (
                              <span className="inline-block mt-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                MK Pilihan
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center font-semibold text-slate-800">{courseSks}</td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                              {off?.sectionName || cls?.name || 'A'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1 font-medium text-slate-800">
                              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                              <span>{room?.name || room?.code || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="space-y-0.5">
                              {lecturersList.map((lec, i) => (
                                <div key={lec?.id || i} className="font-medium text-slate-800">
                                  {lec?.name}
                                </div>
                              ))}
                              {lecturersList.length === 0 && <span className="text-slate-400">-</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {/* KKN Special Handling Row in Table View */}
                    {isKknRelevant && selectedDay === 'all' && selectedRoomId === 'all' && (
                      <tr className="bg-sky-50/60 hover:bg-sky-50/90 border-t-2 border-sky-300 transition-colors">
                        <td className="py-3 px-3.5 text-center font-bold text-sky-800">★</td>
                        <td className="py-3 px-3.5 font-bold text-sky-900">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-sky-100 text-sky-800 border border-sky-300">
                            Periode Lapangan
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-semibold text-sky-950">Non-Tatap Muka</span>
                          <div className="text-[10px] text-sky-700 font-sans mt-0.5">Dikelola Mandiri LPPM UNRAM</div>
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-sky-900">MPK1077101</td>
                        <td className="py-3 px-3.5 font-bold text-sky-950">
                          <div className="flex items-center gap-1.5">
                            <span>Kuliah Kerja Nyata (KKN)</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-200 text-sky-900 font-bold">
                              Wajib Univ
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            Mahasiswa Semester 7 (Semua KBK) • Dilaksanakan di Desa Binaan
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center font-bold text-sky-900">4</td>
                        <td className="py-3 px-3.5 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-xs">
                            Semua
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-medium text-sky-900">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-sky-600" />
                            <span>Desa Binaan (LPPM)</span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-sky-900 font-medium">
                          Dosen Pembimbing Lapangan (DPL) LPPM
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* JADWAL UJIAN */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-800">
              Daftar Ujian {activeExamSubTab} ({activeExamSubTab === 'UTS' ? currentUtsVersion?.versionName : currentUasVersion?.versionName})
            </div>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filteredExamOfferings.length} Mata Ujian
            </span>
          </div>

          {filteredExamOfferings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Tidak ada jadwal ujian {activeExamSubTab} yang sesuai filter</p>
              <p className="text-xs text-slate-400">Silakan sesuaikan filter atau pilih versi ujian lain.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
                      <th className="py-3 px-3.5 text-center w-12">No</th>
                      <th className="py-3 px-3.5 w-32">Hari / Tanggal</th>
                      <th className="py-3 px-3.5 w-28">Sesi / Jam</th>
                      <th className="py-3 px-3.5 w-24">Kode MK</th>
                      <th className="py-3 px-3.5">Mata Kuliah</th>
                      <th className="py-3 px-3.5 text-center w-14">Smt</th>
                      <th className="py-3 px-3.5 text-center w-16">Kelas</th>
                      <th className="py-3 px-3.5 w-28">Ruang Ujian</th>
                      <th className="py-3 px-3.5">Dosen Pengawas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredExamOfferings.map((ex, idx) => {
                      const course = courseMap.get(ex.courseId);
                      const supervisors = (ex.supervisorLecturerIds || [])
                        .map((id) => lecturerMap.get(id))
                        .filter(Boolean);
                      const roomNames = (ex.roomIds || [])
                        .map((id) => roomMap.get(id)?.name || roomMap.get(id)?.code)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <tr key={ex.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3.5 font-semibold text-slate-900">
                            {ex.examDate
                              ? new Date(ex.examDate).toLocaleDateString('id-ID', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Belum Ditentukan'}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-700">
                            {ex.examSessionId === 'ex-ses-1'
                              ? '08:00 - 09:30'
                              : ex.examSessionId === 'ex-ses-2'
                              ? '10:00 - 11:30'
                              : ex.examSessionId === 'ex-ses-3'
                              ? '13:00 - 14:30'
                              : '08:00 - 09:30'}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600 font-medium">
                            {ex.courseCode || course?.code || '-'}
                          </td>
                          <td className="py-3 px-3.5 font-semibold text-slate-900">
                            {ex.courseName || course?.name || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center font-semibold text-slate-700">
                            {ex.semester || course?.semester || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                              {ex.sectionName || 'A'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-medium text-slate-800">
                            <div className="flex items-center gap-1">
                              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                              <span>{roomNames || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="space-y-0.5">
                              {supervisors.map((sup, sIdx) => (
                                <div key={sup?.id || sIdx} className="font-medium text-slate-800">
                                  {sup?.name}
                                </div>
                              ))}
                              {supervisors.length === 0 && <span className="text-slate-400">-</span>}
                            </div>
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
      )}

      {/* 6. Modal Ganti / Perbarui Jadwal Perkuliahan (Admin Workflow) */}
      <Modal
        isOpen={isReplaceScheduleModalOpen}
        onClose={() => setIsReplaceScheduleModalOpen(false)}
        title="Ganti / Perbarui Jadwal Perkuliahan"
        subtitle="Buat versi jadwal baru dengan riwayat status resmi (Draft, Diterbitkan, Digantikan)"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Sumber Jadwal */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Sumber Data Jadwal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  newVersionSource === 'simulation'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 text-emerald-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="versionSource"
                  value="simulation"
                  checked={newVersionSource === 'simulation'}
                  onChange={() => setNewVersionSource('simulation')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-slate-900">Jadwal Simulasi / Terkini</div>
                  <div className="text-[11px] text-slate-500 leading-normal mt-0.5">
                    Gunakan hasil penjadwalan terbaru dari modul Timetable / Algoritma
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                  newVersionSource === 'current_version'
                    ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 text-emerald-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="versionSource"
                  value="current_version"
                  checked={newVersionSource === 'current_version'}
                  onChange={() => setNewVersionSource('current_version')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-slate-900">Kloning Versi Terpilih</div>
                  <div className="text-[11px] text-slate-500 leading-normal mt-0.5 truncate">
                    Salin dari: {currentLectureVersion?.name || 'Versi Aktif'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Nama Versi */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama / Kode Versi Jadwal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="Contoh: Versi 4.0 (Penyesuaian Ruang & Dosen)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Status Versi */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Status Versi Awal
            </label>
            <select
              value={newVersionStatus}
              onChange={(e) => setNewVersionStatus(e.target.value as 'Draft' | 'Diterbitkan')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="Diterbitkan">Diterbitkan (Langsung Aktif Resmi untuk Mahasiswa & Dosen)</option>
              <option value="Draft">Draft (Simpan sebagai Draf, belum dipublikasikan)</option>
            </select>
          </div>

          {/* Catatan Perubahan */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Catatan Revisi / Alasan Perubahan (Opsional)
            </label>
            <textarea
              rows={3}
              value={newVersionNotes}
              onChange={(e) => setNewVersionNotes(e.target.value)}
              placeholder="Contoh: Penyesuaian jadwal laboratorium dan ketersediaan waktu dosen pengampu."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-normal text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          {/* Informational Policy Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-[11px] text-amber-900">
                Integritas Riwayat Versi (Versioning Policy)
              </div>
              <p className="text-[10px] text-amber-800 leading-normal">
                Jika status dipilih <strong>Diterbitkan</strong>, jadwal versi aktif sebelumnya akan otomatis dialihkan statusnya menjadi <strong>Digantikan</strong>. Riwayat tidak akan terhapus dan dapat dilihat kembali sewaktu-waktu.
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsReplaceScheduleModalOpen(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-confirm-save-version"
              onClick={handleConfirmCreateVersion}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-colors cursor-pointer"
            >
              Simpan & Terapkan Versi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
