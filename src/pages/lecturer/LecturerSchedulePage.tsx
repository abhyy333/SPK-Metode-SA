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
} from '../../types';
import { Badge } from '../../components/ui/Badge';

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
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const mySchedule = schedule.filter(a => a.lecturerId === lecturer.id);

  const courseMap = useMemo(() => new Map<string, Course>(courses.map(c => [c.id, c])), [courses]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map(t => [t.id, t])), [timeslots]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map(r => [r.id, r])), [rooms]);
  const classMap = useMemo(() => new Map<string, ClassGroup>(classes.map(cl => [cl.id, cl])), [classes]);

  const uniqueSlotIndices = useMemo(() => {
    return Array.from(new Set(timeslots.map(t => t.slotIndex))).sort((a, b) => Number(a) - Number(b));
  }, [timeslots]);

  const filteredDays = selectedDay === 'all' ? ALL_DAYS : [selectedDay as DayOfWeek];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Jadwal Mengajar Dosen</h2>
            <Badge variant="indigo" size="sm">
              {lecturer.name}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            T.A. {academicYear} • NIP: {lecturer.nip || '-'} • Jurusan Teknik Elektro UNRAM
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Matriks Tabel
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Daftar Harian
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            id="btn-print-lecturer-schedule"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Jadwal Mengajar</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDay === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Semua Hari
          </button>
          {ALL_DAYS.map(day => (
            <button
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

        <div className="text-xs text-slate-500 font-medium">
          {mySchedule.length} Jadwal Mengajar Terdaftar
        </div>
      </div>

      {/* Grid Timetable */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="p-3.5 w-28 font-bold uppercase text-[11px] text-center border-r border-slate-200">
                    Waktu / Jam
                  </th>
                  {filteredDays.map(day => (
                    <th key={day} className="p-3.5 font-bold text-center uppercase text-[11px] border-r border-slate-200 last:border-r-0">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {uniqueSlotIndices.map(slotIdx => {
                  const sampleSlot = timeslots.find(t => t.slotIndex === slotIdx);
                  const slotLabel = sampleSlot?.label || `Slot #${slotIdx}`;

                  return (
                    <tr key={slotIdx} className="hover:bg-slate-50/40">
                      <td className="p-3 text-center bg-slate-50/50 border-r border-slate-200 font-mono">
                        <div className="font-bold text-slate-800 text-xs">{slotLabel}</div>
                        <div className="text-[10px] text-slate-400 font-sans">Slot #{slotIdx}</div>
                      </td>

                      {filteredDays.map(day => {
                        const daySlot = timeslots.find(t => t.day === day && t.slotIndex === slotIdx);
                        const assignment = daySlot
                          ? mySchedule.find(a => a.timeslotId === daySlot.id)
                          : null;

                        const isDayUnavailable = !lecturer.availableDays.includes(day);
                        const isSlotBlocked = daySlot && lecturer.unavailableSlotIds?.includes(daySlot.id);

                        const crs = assignment ? courseMap.get(assignment.courseId) : null;
                        const rm = assignment ? roomMap.get(assignment.roomId) : null;
                        const cls = assignment ? classMap.get(assignment.classId) : null;

                        return (
                          <td
                            key={day}
                            className="p-2 border-r border-slate-200 last:border-r-0 align-top min-w-[150px]"
                          >
                            {assignment && crs ? (
                              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-slate-900 shadow-2xs space-y-1.5 transition-all hover:border-amber-400 hover:shadow-xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-xs text-amber-950">{crs.code}</span>
                                  <Badge variant={crs.type === 'Praktikum' ? 'warning' : 'primary'} size="sm">
                                    {crs.sks} SKS
                                  </Badge>
                                </div>
                                <div className="font-semibold text-xs text-slate-900 line-clamp-2">
                                  {crs.name}
                                </div>
                                <div className="text-[11px] text-slate-600 flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>Kelas {cls?.code} ({crs.studentCount} Mhs)</span>
                                </div>
                                <div className="pt-1 border-t border-amber-100 flex items-center justify-between text-[11px]">
                                  <span className="font-bold text-indigo-700 flex items-center gap-1">
                                    <DoorOpen className="w-3 h-3" />
                                    <span>{rm?.code}</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500">{rm?.building}</span>
                                </div>
                              </div>
                            ) : isDayUnavailable || isSlotBlocked ? (
                              <div className="h-16 flex items-center justify-center text-slate-400 text-[10px] bg-slate-50/60 border border-dashed border-slate-200 rounded-xl">
                                {isDayUnavailable ? 'Hari Tidak Tersedia' : 'Slot Diblokir'}
                              </div>
                            ) : (
                              <div className="h-16 flex items-center justify-center text-slate-300 text-[11px] border border-dashed border-slate-100 rounded-xl">
                                -
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

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredDays.map(day => {
            const daySlots = timeslots.filter(t => t.day === day).map(t => t.id);
            const dayAssignments = mySchedule.filter(a => daySlots.includes(a.timeslotId));

            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{day}</h3>
                  </div>
                  <Badge variant="warning" size="sm">
                    {dayAssignments.length} Kelas Mengajar
                  </Badge>
                </div>

                {dayAssignments.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Tidak ada jadwal mengajar pada hari {day}.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dayAssignments.map(asg => {
                      const crs = courseMap.get(asg.courseId);
                      const ts = timeslotMap.get(asg.timeslotId);
                      const rm = roomMap.get(asg.roomId);
                      const cls = classMap.get(asg.classId);

                      return (
                        <div key={asg.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">{crs?.code} — {crs?.name}</span>
                              <Badge variant={crs?.type === 'Praktikum' ? 'warning' : 'primary'} size="sm">
                                {crs?.type} ({crs?.sks} SKS)
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-4">
                              <span>Kelas: <strong>{cls?.code}</strong> ({crs?.studentCount} Mahasiswa)</span>
                              <span>Ruangan: <strong>{rm?.code} ({rm?.name})</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right font-mono text-xs font-bold text-slate-800">
                              {ts?.label}
                            </div>
                            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                              <Clock className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
