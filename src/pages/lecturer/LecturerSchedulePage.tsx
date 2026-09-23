import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  GraduationCap,
  Users,
  Printer,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Filter,
  BookOpen,
  FileSpreadsheet,
  Download,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  Lecturer,
  Course,
  ScheduleAssignment,
  Timeslot,
  Room,
  ClassGroup,
  DayOfWeek,
  ScheduleStatus,
  ExamOffering,
} from '../../types';
import { Badge } from '../../components/ui/Badge';
import { StorageService } from '../../services/storageService';
import { DownloadScheduleButton } from '../../components/schedule/DownloadScheduleButton';
import { ScheduleExportItem, ScheduleExportOptions } from '../../utils/scheduleExport';
import { calculateCourseTiming } from '../../utils/sessionUtils';
import { ScheduleBlockMatrix } from '../../components/schedule/ScheduleBlockMatrix';

interface LecturerSchedulePageProps {
  lecturer: Lecturer;
  courses: Course[];
  schedule: ScheduleAssignment[];
  timeslots: Timeslot[];
  rooms: Room[];
  classes: ClassGroup[];
  scheduleStatus: ScheduleStatus;
  academicYear: string;
}

const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export const LecturerSchedulePage: React.FC<LecturerSchedulePageProps> = ({
  lecturer,
  courses,
  schedule,
  timeslots,
  rooms,
  classes,
  scheduleStatus,
  academicYear,
}) => {
  // Main Tab: [ Jadwal Mengajar ] vs [ Jadwal Pengawas Ujian ]
  const [activeMainTab, setActiveMainTab] = useState<'mengajar' | 'pengawas'>('mengajar');
  // Sub-Tab inside Pengawas Ujian: [ UTS ] vs [ UAS ]
  const [activeExamSubTab, setActiveExamSubTab] = useState<'UTS' | 'UAS'>('UTS');

  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Master data maps
  const courseMap = useMemo(() => new Map<string, Course>(courses.map((c) => [c.id, c])), [courses]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map((t) => [t.id, t])), [timeslots]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map((r) => [r.id, r])), [rooms]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map((cl) => [cl.id, cl])), [classes]);

  // Lecturer teaching assignments (supports single or team teaching)
  const mySchedule = useMemo(() => {
    return schedule.filter((a) => {
      if (a.lecturerId === lecturer.id) return true;
      if (a.lecturerIds && a.lecturerIds.includes(lecturer.id)) return true;
      return false;
    });
  }, [schedule, lecturer.id]);

  // Exam offerings supervised by this lecturer
  const myExamSupervisions = useMemo(() => {
    const allExams = StorageService.getExamOfferings(activeExamSubTab);
    return allExams.filter((ex) => {
      const isSupervisor = ex.supervisorLecturerIds && ex.supervisorLecturerIds.includes(lecturer.id);
      const isCourseLecturer = ex.lecturerIds && ex.lecturerIds.includes(lecturer.id);
      return isSupervisor || isCourseLecturer;
    });
  }, [activeExamSubTab, lecturer.id]);

  const uniqueSlotIndices = useMemo(() => {
    return Array.from(new Set(timeslots.map((t) => t.slotIndex))).sort((a, b) => Number(a) - Number(b));
  }, [timeslots]);

  const filteredDays = selectedDay === 'all' ? ALL_DAYS : [selectedDay as DayOfWeek];

  // Build Download Options for Lecturer
  const exportOptions: ScheduleExportOptions = useMemo(() => {
    if (activeMainTab === 'mengajar') {
      const items: ScheduleExportItem[] = mySchedule.map((assign, idx) => {
        const crs = courseMap.get(assign.courseId);
        const ts = timeslotMap.get(assign.timeslotId);
        const rm = roomMap.get(assign.roomId);
        const cls = classMap.get(assign.classId);
        const courseSks = Math.max(1, Math.round(assign.sks || crs?.sks || crs?.credits || 2));
        const timing = calculateCourseTiming(ts, courseSks, timeslots);

        return {
          no: idx + 1,
          dayOrDate: ts?.day || '-',
          time: ts ? `${ts.startTime} - ${timing.endTime} (${timing.sessionRangeLabel})` : '-',
          courseCode: crs?.code || '-',
          courseName: crs?.name || '-',
          sks: courseSks,
          sectionOrClass: cls?.name || 'A',
          room: rm?.name || rm?.code || '-',
          lecturerOrSupervisor: lecturer.name,
          semester: crs?.semester,
        };
      });

      return {
        title: 'JADWAL MENGAJAR DOSEN',
        academicYear,
        academicTerm: 'Ganjil',
        filterSubtitle: `Dosen: ${lecturer.name} (NIP: ${lecturer.nip || '-'})`,
        items,
        isExam: false,
        filename: `jadwal_mengajar_${lecturer.name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      };
    } else {
      const examTitle =
        activeExamSubTab === 'UTS'
          ? 'JADWAL TUGAS PENGAWAS UJIAN TENGAH SEMESTER (UTS)'
          : 'JADWAL TUGAS PENGAWAS UJIAN AKHIR SEMESTER (UAS)';

      const items: ScheduleExportItem[] = myExamSupervisions.map((ex, idx) => {
        const crs = courseMap.get(ex.courseId);
        const roomNames = (ex.roomIds || [])
          .map((id) => roomMap.get(id)?.name || roomMap.get(id)?.code)
          .filter(Boolean)
          .join(', ') || '-';

        return {
          no: idx + 1,
          dayOrDate: ex.examDate
            ? new Date(ex.examDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
            : 'Belum Ditentukan',
          time: ex.examSessionId || 'Sesi 1 (08:00 - 09:30)',
          courseCode: ex.courseCode || crs?.code || '-',
          courseName: ex.courseName || crs?.name || '-',
          sectionOrClass: ex.sectionName || 'A',
          room: roomNames,
          lecturerOrSupervisor: lecturer.name,
          semester: ex.semester || crs?.semester,
          participantCount: ex.studentCount,
        };
      });

      return {
        title: examTitle,
        academicYear,
        academicTerm: 'Ganjil',
        filterSubtitle: `Pengawas: ${lecturer.name} (NIP: ${lecturer.nip || '-'})`,
        items,
        isExam: true,
        filename: `jadwal_pengawas_${activeExamSubTab.toLowerCase()}_${lecturer.name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      };
    }
  }, [
    activeMainTab,
    activeExamSubTab,
    mySchedule,
    myExamSupervisions,
    lecturer,
    academicYear,
    courseMap,
    timeslotMap,
    roomMap,
    classMap,
  ]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Portal Dosen
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">T.A. {academicYear} Semester Ganjil</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {lecturer.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              NIP: {lecturer.nip || '-'} • Jurusan Teknik Elektro Fakultas Teknik Universitas Mataram
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <DownloadScheduleButton
              options={exportOptions}
              variant="primary"
              label={`Download Jadwal ${activeMainTab === 'mengajar' ? 'Mengajar' : 'Pengawas ' + activeExamSubTab}`}
            />
          </div>
        </div>

        {/* Primary Tabs: [ Jadwal Mengajar ] vs [ Jadwal Pengawas Ujian ] */}
        <div className="mt-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex space-x-6">
            <button
              type="button"
              id="tab-lecturer-mengajar"
              onClick={() => setActiveMainTab('mengajar')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeMainTab === 'mengajar'
                  ? 'text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Jadwal Mengajar</span>
                <span className="ml-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">
                  {mySchedule.length} Sesi Kuliah
                </span>
              </div>
            </button>

            <button
              type="button"
              id="tab-lecturer-pengawas"
              onClick={() => setActiveMainTab('pengawas')}
              className={`pb-3 text-sm font-bold transition-all relative ${
                activeMainTab === 'pengawas'
                  ? 'text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span>Jadwal Pengawas Ujian</span>
                <span className="ml-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">
                  {myExamSupervisions.length} Tugas
                </span>
              </div>
            </button>
          </div>

          {/* Sub-Tabs when in Pengawas Ujian: [ UTS ] [ UAS ] */}
          {activeMainTab === 'pengawas' && (
            <div className="flex items-center gap-1 pb-2">
              <button
                type="button"
                id="btn-lecturer-subtab-uts"
                onClick={() => setActiveExamSubTab('UTS')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeExamSubTab === 'UTS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                UTS
              </button>
              <button
                type="button"
                id="btn-lecturer-subtab-uas"
                onClick={() => setActiveExamSubTab('UAS')}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                  activeExamSubTab === 'UAS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                UAS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: JADWAL MENGAJAR */}
      {activeMainTab === 'mengajar' && (
        <div className="space-y-4">
          {/* Controls & Filter */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDay('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedDay === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Semua Hari
              </button>
              {ALL_DAYS.map((day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedDay === day
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <span>Matriks Blok</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 font-extrabold">
                    Utama
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Daftar Baris
                </button>
              </div>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' ? (
            <ScheduleBlockMatrix
              assignments={mySchedule}
              courses={courses}
              lecturers={[lecturer]}
              classes={classes}
              rooms={rooms}
              timeslots={timeslots}
              userRole="lecturer"
              readOnly={true}
              defaultDay={selectedDay as any}
              hideFilterToolbar={true}
              academicYear={academicYear}
            />
          ) : (
            /* List View */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3 w-24">Hari</th>
                      <th className="p-3 w-36">Jam Kuliah</th>
                      <th className="p-3 w-24">Kode MK</th>
                      <th className="p-3">Mata Kuliah</th>
                      <th className="p-3 text-center w-14">SKS</th>
                      <th className="p-3 text-center w-16">Kelas</th>
                      <th className="p-3 w-32">Ruangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {mySchedule.map((assign, idx) => {
                      const crs = courseMap.get(assign.courseId);
                      const ts = timeslotMap.get(assign.timeslotId);
                      const rm = roomMap.get(assign.roomId);
                      const cls = classMap.get(assign.classId);
                      const courseSks = Math.max(1, Math.round(assign.sks || crs?.sks || crs?.credits || 2));
                      const timing = calculateCourseTiming(ts, courseSks, timeslots);

                      return (
                        <tr key={assign.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-800">{ts?.day || '-'}</td>
                          <td className="p-3">
                            {ts ? (
                              <div>
                                <div className="font-mono font-bold text-slate-800">{ts.startTime} - {timing.endTime}</div>
                                <div className="text-[10px] text-slate-500 font-sans mt-0.5">{timing.sessionRangeLabel} ({timing.durationMinutes} mnt)</div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-600">{crs?.code || '-'}</td>
                          <td className="p-3 font-semibold text-slate-900">{crs?.name || '-'}</td>
                          <td className="p-3 text-center font-semibold text-slate-800">{courseSks}</td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                              {cls?.name || 'A'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            {rm?.name || rm?.code || '-'}
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

      {/* TAB 2: JADWAL PENGAWAS UJIAN (UTS / UAS) */}
      {activeMainTab === 'pengawas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Daftar Tugas Pengawas Ujian {activeExamSubTab} (T.A. {academicYear})
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-100 text-indigo-800">
              {myExamSupervisions.length} Tugas Pengawas
            </span>
          </div>

          {myExamSupervisions.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
              <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">Tidak ada jadwal pengawas ujian {activeExamSubTab}</p>
              <p className="text-xs text-slate-400">
                Nama Anda belum ditugaskan sebagai pengawas pada jadwal ujian {activeExamSubTab} periode ini.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-700">
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3 w-32">Hari / Tanggal</th>
                      <th className="p-3 w-32">Sesi / Jam</th>
                      <th className="p-3 w-24">Kode MK</th>
                      <th className="p-3">Mata Kuliah</th>
                      <th className="p-3 text-center w-14">Smt</th>
                      <th className="p-3 text-center w-16">Kelas</th>
                      <th className="p-3 w-32">Ruang Ujian</th>
                      <th className="p-3 text-center w-20">Peserta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {myExamSupervisions.map((ex, idx) => {
                      const crs = courseMap.get(ex.courseId);
                      const roomNames = (ex.roomIds || [])
                        .map((id) => roomMap.get(id)?.name || roomMap.get(id)?.code)
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <tr key={ex.id} className="hover:bg-slate-50">
                          <td className="p-3 text-center font-medium text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-semibold text-slate-900">
                            {ex.examDate
                              ? new Date(ex.examDate).toLocaleDateString('id-ID', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Belum Ditentukan'}
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {ex.examSessionId === 'ex-ses-1'
                              ? '08:00 - 09:30'
                              : ex.examSessionId === 'ex-ses-2'
                              ? '10:00 - 11:30'
                              : ex.examSessionId === 'ex-ses-3'
                              ? '13:00 - 14:30'
                              : '08:00 - 09:30'}
                          </td>
                          <td className="p-3 font-mono font-medium text-slate-600">
                            {ex.courseCode || crs?.code || '-'}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">{ex.courseName || crs?.name || '-'}</td>
                          <td className="p-3 text-center font-semibold text-slate-700">
                            {ex.semester || crs?.semester || '-'}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-800 font-bold text-xs">
                              {ex.sectionName || 'A'}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            <div className="flex items-center gap-1">
                              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                              <span>{roomNames || '-'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-semibold text-slate-700">
                            {ex.studentCount ? `${ex.studentCount} Mhs` : '-'}
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
