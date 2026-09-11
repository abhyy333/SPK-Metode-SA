import React from 'react';
import {
  Calendar,
  Clock,
  DoorOpen,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import {
  CurrentUser,
  Lecturer,
  Course,
  ScheduleAssignment,
  Timeslot,
  Room,
  ClassGroup,
  ScheduleStatus,
} from '../../types';
import { Badge } from '../../components/ui/Badge';

interface LecturerDashboardPageProps {
  currentUser: CurrentUser;
  lecturer: Lecturer;
  courses: Course[];
  schedule: ScheduleAssignment[];
  timeslots: Timeslot[];
  rooms: Room[];
  classes: ClassGroup[];
  scheduleStatus: ScheduleStatus;
  onNavigate: (viewId: string) => void;
}

export const LecturerDashboardPage: React.FC<LecturerDashboardPageProps> = ({
  currentUser,
  lecturer,
  courses,
  schedule,
  timeslots,
  rooms,
  classes,
  scheduleStatus,
  onNavigate,
}) => {
  // Filter courses taught by this lecturer
  const myCourses = courses.filter(c => c.lecturerId === lecturer.id);
  const totalSks = myCourses.reduce((sum, c) => sum + c.sks, 0);

  // Filter schedule assignments for this lecturer
  const mySchedule = schedule.filter(a => a.lecturerId === lecturer.id);

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const timeslotMap = new Map<string, Timeslot>(timeslots.map(t => [t.id, t]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const classMap = new Map<string, ClassGroup>(classes.map(cl => [cl.id, cl]));

  // Check for any conflicts on lecturer's assignments
  // e.g. double booking or unavailable day
  const conflictsOnMe: string[] = [];
  const slotCountMap = new Map<string, number>();
  mySchedule.forEach(a => {
    slotCountMap.set(a.timeslotId, (slotCountMap.get(a.timeslotId) || 0) + 1);
    const ts = timeslotMap.get(a.timeslotId);
    if (ts && !lecturer.availableDays.includes(ts.day)) {
      const crs = courseMap.get(a.courseId);
      conflictsOnMe.push(`Jadwal ${crs?.name || 'Mata Kuliah'} pada hari ${ts.day} di luar ketersediaan hari Anda.`);
    }
    if (ts && lecturer.unavailableSlotIds?.includes(ts.id)) {
      const crs = courseMap.get(a.courseId);
      conflictsOnMe.push(`Jadwal ${crs?.name || 'Mata Kuliah'} ditempatkan pada slot ${ts.day} (${ts.label}) yang Anda tandai tidak tersedia.`);
    }
  });

  slotCountMap.forEach((count, tsId) => {
    if (count > 1) {
      const ts = timeslotMap.get(tsId);
      conflictsOnMe.push(`Anda memiliki ${count} mata kuliah bersamaan pada ${ts?.day || 'Hari'}, pukul ${ts?.label || 'Waktu'}.`);
    }
  });

  const availableDaysCount = lecturer.availableDays.length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/40 text-amber-100 border border-amber-400/30 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Portal Dosen Pengampu</span>
            </span>
            <Badge
              variant={scheduleStatus === 'published' ? 'success' : scheduleStatus === 'optimized' ? 'indigo' : 'warning'}
              size="sm"
            >
              Status Jadwal: {scheduleStatus === 'published' ? 'Resmi Dipublikasikan' : scheduleStatus === 'optimized' ? 'Draft Optimasi SA' : 'Draft Penjadwalan'}
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Selamat Datang, {lecturer.name}
          </h1>
          <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed">
            NIP: <span className="font-mono">{lecturer.nip || '-'}</span> • Bidang Keahlian:{' '}
            <span className="font-semibold">{lecturer.expertise}</span> • Jurusan Teknik Elektro UNRAM
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('lecturer-availability')}
              id="btn-lecturer-availability"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-amber-900 text-xs font-bold hover:bg-amber-50 transition-colors shadow-xs"
            >
              <CalendarCheck className="w-4 h-4 text-amber-600" />
              <span>Atur Ketersediaan & Preferensi</span>
            </button>
            <button
              onClick={() => onNavigate('lecturer-schedule')}
              id="btn-lecturer-view-schedule"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 text-white text-xs font-bold border border-amber-400/30 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Lihat Jadwal Mengajar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts Alert if any */}
      {conflictsOnMe.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Perhatian: Ditemukan {conflictsOnMe.length} Catatan Jadwal Mengajar Anda</span>
          </div>
          <ul className="space-y-1 text-xs text-rose-800 list-disc list-inside">
            {conflictsOnMe.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mata Kuliah Diampu</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{myCourses.length}</span>
            <span className="text-xs text-slate-500">Kelas</span>
          </div>
          <p className="text-[10px] text-slate-400">Total beban mengajar semester ini</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Beban SKS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{totalSks}</span>
            <span className="text-xs text-slate-500">SKS</span>
          </div>
          <p className="text-[10px] text-slate-400">Berdasarkan data kurikulum</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ketersediaan Hari</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{availableDaysCount}</span>
            <span className="text-xs text-slate-500">Hari / Minggu</span>
          </div>
          <p className="text-[10px] text-slate-400">{lecturer.availableDays.join(', ')}</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preferensi Waktu</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-700">{lecturer.timePreference}</span>
          </div>
          <p className="text-[10px] text-slate-400">Preferensi jam perkuliahan</p>
        </div>
      </div>

      {/* My Teaching Schedule Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Jadwal Mengajar Anda Semester Ini
            </h3>
          </div>
          <button
            onClick={() => onNavigate('lecturer-schedule')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Tampilan Kalender Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {mySchedule.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">Belum ada jadwal mengajar yang dialokasikan</p>
            <p className="text-[11px] text-slate-500">
              Admin belum menjalankan penjadwalan awal atau optimasi Simulated Annealing.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mySchedule.map(assignment => {
              const crs = courseMap.get(assignment.courseId);
              const ts = timeslotMap.get(assignment.timeslotId);
              const rm = roomMap.get(assignment.roomId);
              const cls = classMap.get(assignment.classId);

              return (
                <div key={assignment.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{crs?.code} — {crs?.name}</span>
                      <Badge variant={crs?.type === 'Praktikum' ? 'warning' : 'primary'} size="sm">
                        {crs?.type} ({crs?.sks} SKS)
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Kelas: {cls?.code} ({crs?.studentCount} Mahasiswa)</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ruangan: {rm?.code} ({rm?.building})</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{ts?.day}</div>
                      <div className="text-[11px] text-indigo-600 font-medium font-mono">{ts?.label}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
