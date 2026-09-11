import React from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  DoorOpen,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  CurrentUser,
  ClassGroup,
  Course,
  ScheduleAssignment,
  Timeslot,
  Room,
  Lecturer,
  ScheduleStatus,
} from '../../types';
import { Badge } from '../../components/ui/Badge';

interface StudentDashboardPageProps {
  currentUser: CurrentUser;
  classes: ClassGroup[];
  courses: Course[];
  schedule: ScheduleAssignment[];
  timeslots: Timeslot[];
  rooms: Room[];
  lecturers: Lecturer[];
  scheduleStatus: ScheduleStatus;
  academicYear: string;
  onNavigate: (viewId: string) => void;
}

export const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({
  currentUser,
  classes,
  courses,
  schedule,
  timeslots,
  rooms,
  lecturers,
  scheduleStatus,
  academicYear,
  onNavigate,
}) => {
  const myClass = classes.find(c => c.id === currentUser.classId) || classes[0];

  // Courses and schedule for student's class
  const myCourses = courses.filter(c => c.classId === myClass?.id);
  const totalSks = myCourses.reduce((sum, c) => sum + c.sks, 0);

  const mySchedule = schedule.filter(a => a.classId === myClass?.id);

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const timeslotMap = new Map<string, Timeslot>(timeslots.map(t => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const lecturerMap = new Map<string, string>(lecturers.map(l => [l.id, l.name]));

  // Today's day name in Indonesian
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNames[new Date().getDay()] || 'Senin';
  const todaySchedule = mySchedule.filter(a => timeslotMap.get(a.timeslotId)?.day === todayName);

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/40 text-emerald-100 border border-emerald-400/30 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Portal Mahasiswa Teknik Elektro</span>
            </span>
            <Badge
              variant={scheduleStatus === 'published' ? 'success' : scheduleStatus === 'optimized' ? 'indigo' : 'warning'}
              size="sm"
            >
              Status: {scheduleStatus === 'published' ? 'JADWAL RESMI DIPUBLIKASIKAN' : 'DRAFT PENJADWALAN'}
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Selamat Datang, {currentUser.name || 'Mahasiswa Elektro'}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Kelas / Rombel: <span className="font-bold">{myClass?.code || 'ELK-A'}</span> ({myClass?.name}) • Semester{' '}
            <span className="font-bold">{myClass?.semester || 3}</span> • Tahun Ajaran {academicYear}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('student-schedule')}
              id="btn-student-view-schedule"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition-colors shadow-xs"
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Lihat Jadwal Kuliah Lengkap</span>
            </button>
            <button
              onClick={() => onNavigate('student-schedule')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/50 text-white text-xs font-bold border border-emerald-400/30 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh Jadwal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Status Notice if not published */}
      {scheduleStatus !== 'published' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-xs font-bold">Jadwal Kuliah Masih Berstatus Draft / Dalam Optimasi</div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Jadwal yang Anda lihat di bawah ini merupakan estimasi alokasi yang sedang dioptimalkan oleh sistem SPK menggunakan Simulated Annealing. Jadwal final resmi akan segera dipublikasikan oleh Ketua Jurusan.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mata Kuliah Semester Ini</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{myCourses.length}</span>
            <span className="text-xs text-slate-500">Mata Kuliah</span>
          </div>
          <p className="text-[10px] text-slate-400">Rombel {myClass?.code}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Beban Studi SKS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{totalSks}</span>
            <span className="text-xs text-slate-500">Total SKS</span>
          </div>
          <p className="text-[10px] text-slate-400">Paket kurikulum semester {myClass?.semester}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jumlah Mahasiswa</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{myClass?.studentCount || 35}</span>
            <span className="text-xs text-slate-500">Mahasiswa</span>
          </div>
          <p className="text-[10px] text-slate-400">{myClass?.program || 'S1 Teknik Elektro'}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Jadwal</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-700">
              {scheduleStatus === 'published' ? 'Published' : 'Optimasi SA'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">T.A. {academicYear}</p>
        </div>
      </div>

      {/* Today's Schedule Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Jadwal Kuliah Hari Ini ({todayName})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('student-schedule')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <span>Semua Hari</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-1.5">
            <CheckCircle2 className="w-7 h-7 mx-auto text-emerald-500" />
            <p className="text-xs font-bold text-slate-700">Tidak ada jadwal perkuliahan untuk hari {todayName}</p>
            <p className="text-[11px] text-slate-500">
              Gunakan waktu luang untuk belajar mandiri, praktikum mandiri, atau berdiskusi.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todaySchedule.map(assignment => {
              const crs = courseMap.get(assignment.courseId);
              const ts = timeslotMap.get(assignment.timeslotId);
              const rm = roomMap.get(assignment.roomId);
              const lecName = lecturerMap.get(assignment.lecturerId) || 'Dosen';

              return (
                <div key={assignment.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{crs?.code} — {crs?.name}</span>
                      <Badge variant={crs?.type === 'Praktikum' ? 'warning' : 'primary'} size="sm">
                        {crs?.type} ({crs?.sks} SKS)
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Dosen: {lecName}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-indigo-700">
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>Ruangan: {rm?.code} ({rm?.name})</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 font-mono">{ts?.label}</div>
                      <div className="text-[10px] text-slate-400">Slot #{ts?.slotIndex}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Course Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Rincian Mata Kuliah & Dosen Pengampu Semester {myClass?.semester}</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Kode & Nama Matkul</th>
                <th className="px-3 py-3">SKS</th>
                <th className="px-3 py-3">Jenis</th>
                <th className="px-4 py-3">Dosen Pengampu</th>
                <th className="px-4 py-3">Jadwal & Ruangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myCourses.map(crs => {
                const asg = mySchedule.find(a => a.courseId === crs.id);
                const ts = asg ? timeslotMap.get(asg.timeslotId) : null;
                const rm = asg ? roomMap.get(asg.roomId) : null;
                const lecName = lecturerMap.get(crs.lecturerId) || 'Belum Ditentukan';

                return (
                  <tr key={crs.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{crs.code}</div>
                      <div className="text-[11px] text-slate-600">{crs.name}</div>
                    </td>
                    <td className="px-3 py-3.5 font-bold text-indigo-700">{crs.sks} SKS</td>
                    <td className="px-3 py-3.5">
                      <Badge variant={crs.type === 'Praktikum' ? 'warning' : 'primary'} size="sm">
                        {crs.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{lecName}</td>
                    <td className="px-4 py-3.5">
                      {asg && ts && rm ? (
                        <div>
                          <div className="font-bold text-slate-900">
                            {ts.day}, {ts.label}
                          </div>
                          <div className="text-[11px] text-indigo-600 font-medium">
                            Ruangan: {rm.code} ({rm.name})
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Belum dijadwalkan</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
