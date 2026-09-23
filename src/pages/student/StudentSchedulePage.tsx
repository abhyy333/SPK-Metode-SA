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
  CalendarDays,
  ListFilter,
  FileText,
  AlertCircle,
  Tag,
  MapPin,
} from 'lucide-react';
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
} from '../../types';
import { StorageService } from '../../services/storageService';
import { DownloadScheduleButton } from '../../components/schedule/DownloadScheduleButton';
import { ScheduleExportItem, ScheduleExportOptions } from '../../utils/scheduleExport';
import { calculateCourseTiming } from '../../utils/sessionUtils';
import { ScheduleBlockMatrix } from '../../components/schedule/ScheduleBlockMatrix';

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

const WEEKDAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

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
  // Main Tab: Jadwal Kuliah vs Jadwal Ujian
  const [activeMainTab, setActiveMainTab] = useState<'kuliah' | 'ujian'>('kuliah');
  // Sub Tab inside Jadwal Ujian: UTS vs UAS
  const [activeExamSubTab, setActiveExamSubTab] = useState<'UTS' | 'UAS'>('UTS');

  // Filters for Student Portal
  const [selectedSemester, setSelectedSemester] = useState<string>(
    currentUser.semester ? currentUser.semester.toString() : '3'
  );
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'all'>('all');
  const [viewLayout, setViewLayout] = useState<'block' | 'table' | 'cards'>('block');

  // Master Data Lookups
  const courseMap = useMemo(() => new Map<string, Course>(courses.map((c) => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map((l) => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map((r) => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map((t) => [t.id, t])), [timeslots]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map((cl) => [cl.id, cl])), [classes]);
  const offerings = useMemo(() => StorageService.getCourseOfferings(), []);
  const offeringMap = useMemo(() => new Map(offerings.map((o) => [o.id, o])), [offerings]);
  const kbks = useMemo(() => StorageService.getKbks(), []);

  // Retrieve active published schedule assignments
  const publishedLectureAssignments = useMemo(() => {
    if (scheduleStatus !== 'published' || !StorageService.hasActiveSchedule()) {
      return [];
    }
    const activeVer = StorageService.getActiveScheduleVersion();
    if (activeVer && activeVer.scheduleAssignments && activeVer.scheduleAssignments.length > 0) {
      return activeVer.scheduleAssignments;
    }
    return currentSchedule || [];
  }, [currentSchedule, scheduleStatus]);

  // Retrieve active published exam offerings
  const examOfferings = useMemo(() => {
    return StorageService.getExamOfferings(activeExamSubTab);
  }, [activeExamSubTab]);

  // Filtered Lecture Assignments
  const filteredLectureAssignments = useMemo(() => {
    return publishedLectureAssignments
      .filter((assign) => {
        const course = courseMap.get(assign.courseId);
        if (!course) return false;

        // Skip practicum (lab scheduled separately)
        if (course.type === 'Praktikum' || (course.name || '').toLowerCase().includes('praktikum')) {
          return false;
        }

        const off = assign.courseOfferingId ? offeringMap.get(assign.courseOfferingId) : null;
        const sem = off?.semester || course.semester || 1;
        const kbkId = off?.kbkId || (course.kbkIds && course.kbkIds.length > 0 ? course.kbkIds[0] : null);

        // Filter by Semester
        if (selectedSemester !== 'all' && sem !== Number(selectedSemester)) {
          return false;
        }

        // Filter by KBK (Common courses belong to all KBKs)
        if (selectedKbk !== 'all' && kbkId && kbkId !== selectedKbk && course.category === 'Pilihan') {
          return false;
        }

        // Filter by Day
        const ts = timeslotMap.get(assign.timeslotId);
        if (selectedDay !== 'all' && ts?.day !== selectedDay) {
          return false;
        }

        // Search Query (Course Name, Code, Lecturer, Room)
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
    publishedLectureAssignments,
    courseMap,
    offeringMap,
    timeslotMap,
    roomMap,
    lecturerMap,
    selectedSemester,
    selectedKbk,
    selectedDay,
    searchQuery,
  ]);

  // Filtered Exam Offerings
  const filteredExamOfferings = useMemo(() => {
    return examOfferings.filter((ex) => {
      const course = courseMap.get(ex.courseId);
      const sem = ex.semester || course?.semester || 1;

      if (selectedSemester !== 'all' && sem !== Number(selectedSemester)) {
        return false;
      }

      if (selectedKbk !== 'all' && ex.kbkId && ex.kbkId !== selectedKbk && course?.category === 'Pilihan') {
        return false;
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
  }, [examOfferings, courseMap, lecturerMap, roomMap, selectedSemester, selectedKbk, searchQuery]);

  // Check whether KKN should be displayed in callout (when viewing Semester 7 or Semua)
  const isKknRelevant = selectedSemester === 'all' || selectedSemester === '7';

  // Export Data Builder for PDF & Excel
  const exportOptions: ScheduleExportOptions = useMemo(() => {
    const semLabel = selectedSemester === 'all' ? 'Semua Semester' : `Semester ${selectedSemester}`;
    const kbkLabel =
      selectedKbk === 'all' ? 'Semua KBK' : kbks.find((k) => k.id === selectedKbk)?.name || selectedKbk;
    const filterSubtitle = `${semLabel} • ${kbkLabel}${searchQuery ? ` • Pencarian: "${searchQuery}"` : ''}`;

    if (activeMainTab === 'kuliah') {
      const items: ScheduleExportItem[] = filteredLectureAssignments.map((assign, idx) => {
        const course = courseMap.get(assign.courseId);
        const timeslot = timeslotMap.get(assign.timeslotId);
        const room = roomMap.get(assign.roomId);
        const off = assign.courseOfferingId ? offeringMap.get(assign.courseOfferingId) : null;
        const cls = classMap.get(assign.classId);
        const lecIds = assign.lecturerIds && assign.lecturerIds.length > 0 ? assign.lecturerIds : [assign.lecturerId];
        const lecturerNames = lecIds
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

      // Include KKN if applicable
      if (isKknRelevant && selectedDay === 'all') {
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
        title: 'JADWAL PERKULIAHAN MAHASISWA',
        academicYear,
        academicTerm: 'Ganjil',
        filterSubtitle,
        items,
        isExam: false,
        filename: `jadwal_kuliah_elektro_${selectedSemester}_${academicYear.replace('/', '-')}.pdf`,
      };
    } else {
      const examTitle = activeExamSubTab === 'UTS' ? 'JADWAL UJIAN TENGAH SEMESTER (UTS)' : 'JADWAL UJIAN AKHIR SEMESTER (UAS)';
      const items: ScheduleExportItem[] = filteredExamOfferings.map((ex, idx) => {
        const course = courseMap.get(ex.courseId);
        const supNames = (ex.supervisorLecturerIds || [])
          .map((id) => lecturerMap.get(id)?.name)
          .filter(Boolean)
          .join(', ') || '-';
        const roomNames = (ex.roomIds || [])
          .map((id) => roomMap.get(id)?.name || roomMap.get(id)?.code)
          .filter(Boolean)
          .join(', ') || '-';

        return {
          no: idx + 1,
          dayOrDate: ex.examDate ? new Date(ex.examDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Belum Ditentukan',
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
        filename: `jadwal_${activeExamSubTab.toLowerCase()}_elektro_${selectedSemester}_${academicYear.replace('/', '-')}.pdf`,
      };
    }
  }, [
    activeMainTab,
    activeExamSubTab,
    filteredLectureAssignments,
    filteredExamOfferings,
    selectedSemester,
    selectedKbk,
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
      {/* 1. Official Header Portal Mahasiswa (Clean, No administrative clutter) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Jadwal Diterbitkan (Resmi)
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Tahun Akademik {academicYear}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Jadwal Perkuliahan Mahasiswa
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Program Studi S1 Teknik Elektro — Fakultas Teknik Universitas Mataram
            </p>
          </div>

          {/* Download Button Component */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <DownloadScheduleButton
              options={exportOptions}
              variant="primary"
              label={`Download Jadwal ${activeMainTab === 'kuliah' ? 'Kuliah' : activeExamSubTab}`}
            />
          </div>
        </div>

        {/* Primary Tabs: [ Jadwal Perkuliahan ] vs [ Jadwal Ujian ] */}
        <div className="mt-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex space-x-6">
            <button
              type="button"
              id="tab-student-kuliah"
              onClick={() => setActiveMainTab('kuliah')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeMainTab === 'kuliah'
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Jadwal Perkuliahan</span>
                <span className="ml-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">
                  {filteredLectureAssignments.length} Sesi
                </span>
              </div>
            </button>

            <button
              type="button"
              id="tab-student-ujian"
              onClick={() => setActiveMainTab('ujian')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeMainTab === 'ujian'
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span>Jadwal Ujian</span>
                <span className="ml-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">
                  UTS & UAS
                </span>
              </div>
            </button>
          </div>

          {/* Sub-Tabs for Ujian: [ UTS ] [ UAS ] */}
          {activeMainTab === 'ujian' && (
            <div className="flex items-center gap-1 pb-2">
              <button
                type="button"
                id="btn-subtab-uts"
                onClick={() => setActiveExamSubTab('UTS')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeExamSubTab === 'UTS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                UTS
              </button>
              <button
                type="button"
                id="btn-subtab-uas"
                onClick={() => setActiveExamSubTab('UAS')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeExamSubTab === 'UAS'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                UAS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Filters for Mahasiswa */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Semester Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Pilih Angkatan / Semester
            </label>
            <select
              id="filter-student-semester"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Semua Semester</option>
              <option value="1">Semester 1 (Angkatan 2026)</option>
              <option value="3">Semester 3 (Angkatan 2025)</option>
              <option value="5">Semester 5 (Angkatan 2024)</option>
              <option value="7">Semester 7 (Angkatan 2023)</option>
            </select>
          </div>

          {/* KBK Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Kelompok Bidang Keahlian (KBK)
            </label>
            <select
              id="filter-student-kbk"
              value={selectedKbk}
              onChange={(e) => setSelectedKbk(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Semua KBK & Wajib Umum</option>
              {kbks.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Cari Mata Kuliah / Dosen / Ruang
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="filter-student-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik kode, nama MK, dosen..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Day Filter (Only for Kuliah) or View Layout Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {activeMainTab === 'kuliah' ? 'Filter Hari Kuliah' : 'Tampilan'}
            </label>
            {activeMainTab === 'kuliah' ? (
              <select
                id="filter-student-day"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Semua Hari (Senin - Jumat)</option>
                {WEEKDAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-1 h-[34px] px-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewLayout('block')}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded text-center transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    viewLayout === 'block' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Matriks Blok</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 font-extrabold">
                    Utama
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded text-center transition-colors cursor-pointer ${
                    viewLayout === 'table' ? 'bg-white text-slate-800 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tabel Data
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('cards')}
                  className={`flex-1 py-1 px-2 text-xs font-semibold rounded text-center transition-colors cursor-pointer ${
                    viewLayout === 'cards' ? 'bg-white text-slate-800 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Kartu Agenda
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. KKN Special Notice Callout (Requirement #11) */}
      {isKknRelevant && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4.5 text-sky-950 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-sky-950">
                  Informasi Khusus: Kuliah Kerja Nyata (KKN)
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-200/80 text-sky-800">
                  4 SKS • Semester 7 • Seluruh KBK
                </span>
              </div>
              <p className="text-xs text-sky-800 leading-relaxed">
                Mata kuliah <strong>Kuliah Kerja Nyata (KKN)</strong> tidak memiliki jadwal tatap muka mingguan di jurusan. Pelaksanaan, alokasi kelompok, dan pembimbingan diatur secara terpusat oleh <strong>Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM) Universitas Mataram</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab Content: JADWAL PERKULIAHAN */}
      {activeMainTab === 'kuliah' && (
        <div className="space-y-4">
          {filteredLectureAssignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Tidak ada jadwal kuliah yang cocok</p>
              <p className="text-xs text-slate-400">
                Silakan ubah filter semester, KBK, hari, atau kata kunci pencarian Anda.
              </p>
            </div>
          ) : viewLayout === 'block' ? (
            <ScheduleBlockMatrix
              assignments={filteredLectureAssignments}
              courses={courses}
              lecturers={lecturers}
              classes={classes}
              rooms={rooms}
              timeslots={timeslots}
              userRole="student"
              readOnly={true}
              hideFilterToolbar={true}
              academicYear={academicYear}
            />
          ) : viewLayout === 'table' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
                      <th className="py-3 px-3.5 text-center w-12">No</th>
                      <th className="py-3 px-3.5 w-24">Hari</th>
                      <th className="py-3 px-3.5 w-36">Jam Kuliah</th>
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
                          <td className="py-3 px-3.5">
                            <span className="font-semibold text-slate-800">{ts?.day || '-'}</span>
                          </td>
                          <td className="py-3 px-3.5">
                            {ts ? (
                              <div>
                                <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800">
                                  <Clock className="w-3 h-3 text-indigo-600" />
                                  {ts.startTime} - {timing.endTime}
                                </span>
                                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                  {timing.sessionRangeLabel} ({timing.durationMinutes} menit)
                                </div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-600 font-medium">
                            {course?.code || '-'}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-900">{course?.name || '-'}</div>
                            {course?.category === 'Pilihan' && (
                              <span className="inline-block mt-0.5 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                MK Pilihan
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-center font-semibold text-slate-800">
                            {courseSks}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                              {off?.sectionName || cls?.name || 'A'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                              <span>{room?.name || room?.code || '-'}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{room?.building || 'Gedung FT'}</span>
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

                    {/* KKN Row for Students in Table View */}
                    {isKknRelevant && selectedDay === 'all' && (
                      <tr className="bg-sky-50/60 hover:bg-sky-50/90 border-t-2 border-sky-300 transition-colors">
                        <td className="py-3 px-3.5 text-center font-bold text-sky-800">★</td>
                        <td className="py-3 px-3.5 font-bold text-sky-900">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-sky-100 text-sky-800 border border-sky-300">
                            Periode Lapangan
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <span className="font-semibold text-sky-950">Non-Tatap Muka</span>
                          <div className="text-[10px] text-sky-700 font-sans mt-0.5">Dikelola Terpusat LPPM</div>
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
                            Semester 7 • Semua KBK • Penempatan Desa Binaan
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
          ) : (
            /* Cards View for Students */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredLectureAssignments.map((assign) => {
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
                  <div
                    key={assign.id}
                    className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs hover:border-indigo-300 transition-all text-left flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {ts?.day || '-'} • {timing.sessionRangeLabel}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {courseSks} SKS ({timing.durationMinutes} mnt)
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        {course?.name || '-'}
                      </div>
                      <div className="text-xs font-mono font-medium text-slate-500 mt-0.5">
                        {course?.code} • Kelas {off?.sectionName || cls?.name || 'A'}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-mono font-semibold text-slate-800">
                            {ts ? `${ts.startTime} - ${timing.endTime}` : '-'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DoorOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">
                            {room?.name || room?.code || '-'}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-slate-700 line-clamp-2">
                            {lecturersList.map((l) => l?.name).join(', ') || 'Belum Ada Dosen'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* KKN Card for Students in Cards View */}
              {isKknRelevant && selectedDay === 'all' && (
                <div className="bg-sky-50/70 rounded-xl border-2 border-sky-300 shadow-xs hover:shadow-md transition-shadow p-4 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-sky-800 text-white">
                        Periode Lapangan
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-sky-200 text-sky-900 border border-sky-300">
                        4 SKS • Dikelola LPPM
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-sky-800 block">MPK1077101</span>
                      <h4 className="text-sm font-bold text-sky-950 leading-snug">
                        Kuliah Kerja Nyata (KKN)
                      </h4>
                      <p className="text-[11px] text-sky-800 mt-1">
                        Mata kuliah wajib lapangan semester 7 untuk seluruh KBK Teknik Elektro.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-sky-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-sky-900">
                        <span className="font-semibold text-sky-950">Non-Tatap Muka Jurusan</span>
                        <span className="text-[10px] text-sky-700 font-bold">4 SKS KRS</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sky-900">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="font-medium">Desa Binaan KKN Tematik NTB</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-sky-900">
                        <Users className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-snug">
                          Dosen Pembimbing Lapangan (DPL) LPPM Universitas Mataram
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Tab Content: JADWAL UJIAN (UTS / UAS) */}
      {activeMainTab === 'ujian' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                Jadwal Ujian {activeExamSubTab} (Tahun Akademik {academicYear})
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-100 text-emerald-800">
                {filteredExamOfferings.length} Mata Ujian Terjadwal
              </span>
            </div>
          </div>

          {filteredExamOfferings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Tidak ada jadwal ujian {activeExamSubTab}</p>
              <p className="text-xs text-slate-400">
                Belum ada jadwal ujian yang dialokasikan untuk filter yang dipilih.
              </p>
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
                          <td className="py-3 px-3.5">
                            <span className="font-semibold text-slate-900">
                              {ex.examDate
                                ? new Date(ex.examDate).toLocaleDateString('id-ID', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : 'Belum Ditentukan'}
                            </span>
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
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-1 text-slate-800 font-medium">
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
    </div>
  );
};
