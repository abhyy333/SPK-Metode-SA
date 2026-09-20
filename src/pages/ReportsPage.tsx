import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Clock,
  Building,
  Users,
  DoorOpen,
  Filter,
  BarChart3,
  Search,
} from 'lucide-react';
import {
  OptimizationResult,
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConflictItem,
  CourseOffering,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

interface ReportsPageProps {
  initialTab?: 'schedule' | 'lecturer-load' | 'room-usage';
  activeOptimizationResult: OptimizationResult | null;
  currentSchedule: ScheduleAssignment[] | null;
  courses: Course[];
  lecturers: Lecturer[];
  classes?: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  conflicts: ConflictItem[];
  offerings?: CourseOffering[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  initialTab = 'schedule',
  activeOptimizationResult,
  currentSchedule,
  courses,
  lecturers,
  rooms,
  timeslots,
  conflicts,
  offerings = [],
}) => {
  const { showToast } = useToast();
  const [activeReportTab, setActiveReportTab] = useState<'schedule' | 'lecturer-load' | 'room-usage'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');

  const courseMap = useMemo(() => new Map<string, Course>(courses.map(c => [c.id, c])), [courses]);
  const lecturerMap = useMemo(() => new Map<string, Lecturer>(lecturers.map(l => [l.id, l])), [lecturers]);
  const roomMap = useMemo(() => new Map<string, Room>(rooms.map(r => [r.id, r])), [rooms]);
  const timeslotMap = useMemo(() => new Map<string, Timeslot>(timeslots.map(t => [t.id, t])), [timeslots]);
  const offeringMap = useMemo(() => new Map<string, CourseOffering>(offerings.map(o => [o.id, o])), [offerings]);

  // 1. REKAP JADWAL ROWS
  const scheduleRows = useMemo(() => {
    if (!currentSchedule) return [];
    return currentSchedule.map(assign => {
      const c = courseMap.get(assign.courseId);
      const off = assign.courseOfferingId ? offeringMap.get(assign.courseOfferingId) : undefined;
      const r = roomMap.get(assign.roomId);
      const t = timeslotMap.get(assign.timeslotId);
      const lecIds = assign.lecturerIds || (assign.lecturerId ? [assign.lecturerId] : []);
      const lecs = lecIds.map(id => lecturerMap.get(id)).filter(Boolean) as Lecturer[];

      return {
        id: assign.id,
        day: t?.day || '-',
        time: t?.label || '-',
        slotIndex: t?.slotIndex || 0,
        courseCode: c?.code || '-',
        courseName: off?.courseName || c?.name || '-',
        sks: c?.sks || 0,
        section: off?.section || 'A',
        semester: c?.semester || off?.semester || 1,
        kbk: off?.kbkId || c?.kbkIds?.[0] || 'Umum',
        lecturers: lecs.map(l => l.name).join(', ') || '-',
        room: r?.name ? `${r.name} (${r.code})` : '-',
        roomType: r?.type || '-',
        capacity: r?.capacity || 0,
        expectedStudents: off?.expectedEnrollment || c?.studentCount || 35,
      };
    }).filter(row => {
      if (selectedDay !== 'all' && row.day !== selectedDay) return false;
      if (selectedSemester !== 'all' && String(row.semester) !== selectedSemester) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          row.courseName.toLowerCase().includes(q) ||
          row.courseCode.toLowerCase().includes(q) ||
          row.lecturers.toLowerCase().includes(q) ||
          row.room.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [currentSchedule, courseMap, offeringMap, roomMap, timeslotMap, lecturerMap, selectedDay, selectedSemester, searchTerm]);

  // 2. REKAP BEBAN DOSEN
  const lecturerLoadData = useMemo(() => {
    return lecturers.map(lec => {
      const assigned = (currentSchedule || []).filter(a =>
        a.lecturerIds?.includes(lec.id) || a.lecturerId === lec.id
      );

      const totalSks = assigned.reduce((sum, a) => {
        const c = courseMap.get(a.courseId);
        return sum + (c?.sks || 0);
      }, 0);

      const courseNames = Array.from(new Set(assigned.map(a => {
        const c = courseMap.get(a.courseId);
        const off = a.courseOfferingId ? offeringMap.get(a.courseOfferingId) : undefined;
        return `${c?.name || ''} (${off?.section || 'A'})`;
      }))).filter(Boolean);

      const days = Array.from(new Set(assigned.map(a => timeslotMap.get(a.timeslotId)?.day).filter(Boolean)));

      return {
        id: lec.id,
        code: lec.code,
        name: lec.name,
        nip: lec.nip || '-',
        expertise: lec.expertise || 'Teknik Elektro',
        targetSks: 12,
        assignedSks: totalSks,
        totalClasses: assigned.length,
        courseNames,
        days: days.join(', ') || '-',
        status: totalSks >= 12 && totalSks <= 16 ? 'Ideal' : totalSks > 16 ? 'Overload' : totalSks === 0 ? 'Belum Ada' : 'Underload',
      };
    }).sort((a, b) => b.assignedSks - a.assignedSks);
  }, [lecturers, currentSchedule, courseMap, offeringMap, timeslotMap]);

  // 3. REKAP PENGGUNAAN RUANGAN
  const roomUsageData = useMemo(() => {
    const totalTimeslotsCount = timeslots.filter(t => t.isActive).length || 25;

    return rooms.map(room => {
      const assigned = (currentSchedule || []).filter(a => a.roomId === room.id);
      const uniqueSlots = new Set(assigned.map(a => a.timeslotId));
      const usagePct = Math.round((uniqueSlots.size / totalTimeslotsCount) * 100);

      const scheduleList = assigned.map(a => {
        const c = courseMap.get(a.courseId);
        const t = timeslotMap.get(a.timeslotId);
        const off = a.courseOfferingId ? offeringMap.get(a.courseOfferingId) : undefined;
        return `${t?.day} ${t?.label}: ${c?.name} (${off?.section || 'A'})`;
      });

      return {
        id: room.id,
        code: room.code,
        name: room.name,
        type: room.type,
        capacity: room.capacity,
        totalClasses: assigned.length,
        usedSlots: uniqueSlots.size,
        totalSlots: totalTimeslotsCount,
        utilizationPct: Math.min(100, usagePct),
        scheduleList,
      };
    }).sort((a, b) => b.utilizationPct - a.utilizationPct);
  }, [rooms, currentSchedule, timeslots, courseMap, timeslotMap, offeringMap]);

  const handleExportCSV = () => {
    if (!currentSchedule || currentSchedule.length === 0) {
      showToast('warning', 'Tidak Ada Jadwal', 'Belum ada jadwal yang siap diekspor.');
      return;
    }

    let headers: string[] = [];
    let rows: string[] = [];
    let filename = '';

    if (activeReportTab === 'schedule') {
      headers = ['Hari', 'Waktu', 'Kode MK', 'Nama Mata Kuliah', 'SKS', 'Seksi', 'Semester', 'Dosen Pengampu', 'Ruangan', 'Kapasitas Ruang', 'Proyeksi Mahasiswa'];
      rows = scheduleRows.map(r => [
        `"${r.day}"`,
        `"${r.time}"`,
        `"${r.courseCode}"`,
        `"${r.courseName}"`,
        r.sks,
        `"${r.section}"`,
        r.semester,
        `"${r.lecturers}"`,
        `"${r.room}"`,
        r.capacity,
        r.expectedStudents,
      ].join(','));
      filename = `Rekap_Jadwal_Teknik_Elektro_${Date.now()}.csv`;
    } else if (activeReportTab === 'lecturer-load') {
      headers = ['Kode Dosen', 'Nama Dosen', 'NIP', 'Keahlian', 'Total SKS Mengajar', 'Jumlah Kelas', 'Hari Mengajar', 'Mata Kuliah Diampu'];
      rows = lecturerLoadData.map(l => [
        `"${l.code}"`,
        `"${l.name}"`,
        `"${l.nip}"`,
        `"${l.expertise}"`,
        l.assignedSks,
        l.totalClasses,
        `"${l.days}"`,
        `"${l.courseNames.join('; ')}"`,
      ].join(','));
      filename = `Rekap_Beban_Dosen_Elektro_${Date.now()}.csv`;
    } else {
      headers = ['Kode Ruang', 'Nama Ruang', 'Tipe', 'Kapasitas', 'Total Sesi Kuliah', 'Sesi Terpakai', 'Utilitas (%)'];
      rows = roomUsageData.map(r => [
        `"${r.code}"`,
        `"${r.name}"`,
        `"${r.type}"`,
        r.capacity,
        r.totalClasses,
        r.usedSlots,
        `${r.utilizationPct}%`,
      ].join(','));
      filename = `Rekap_Penggunaan_Ruang_Elektro_${Date.now()}.csv`;
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'File CSV Berhasil Diunduh', `${filename} berhasil diekspor.`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Laporan & Rekapitulasi Jadwal Kuliah</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Jurusan Teknik Elektro • T.A. 2026/2027 Ganjil • Berbasis Optimasi Simulated Annealing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveReportTab('schedule')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
            activeReportTab === 'schedule'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Rekap Jadwal Perkuliahan ({scheduleRows.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('lecturer-load')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
            activeReportTab === 'lecturer-load'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>2. Rekap Beban Mengajar Dosen ({lecturers.length})</span>
        </button>

        <button
          onClick={() => setActiveReportTab('room-usage')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
            activeReportTab === 'room-usage'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>3. Rekap Penggunaan Ruangan ({rooms.length})</span>
        </button>
      </div>

      {/* TAB 1: REKAP JADWAL */}
      {activeReportTab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari mata kuliah, dosen, ruangan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
            >
              <option value="all">Semua Hari</option>
              <option value="Senin">Senin</option>
              <option value="Selasa">Selasa</option>
              <option value="Rabu">Rabu</option>
              <option value="Kamis">Kamis</option>
              <option value="Jumat">Jumat</option>
            </select>

            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700"
            >
              <option value="all">Semua Semester</option>
              <option value="1">Semester 1</option>
              <option value="3">Semester 3</option>
              <option value="5">Semester 5</option>
              <option value="7">Semester 7</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3">Hari & Jam</th>
                    <th className="p-3">Mata Kuliah</th>
                    <th className="p-3">SKS</th>
                    <th className="p-3">Seksi</th>
                    <th className="p-3">Sem/KBK</th>
                    <th className="p-3">Dosen Pengampu</th>
                    <th className="p-3">Ruangan</th>
                    <th className="p-3 text-right">Peserta / Kapasitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduleRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        Belum ada jadwal yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    scheduleRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                          {row.day}, {row.time}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{row.courseName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.courseCode}</div>
                        </td>
                        <td className="p-3 font-semibold text-indigo-700">{row.sks} SKS</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                            Kelas {row.section}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">Sem {row.semester}</td>
                        <td className="p-3 text-slate-700 max-w-[200px] truncate">{row.lecturers}</td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{row.room}</div>
                          <div className="text-[10px] text-slate-400">{row.roomType}</div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <span className={row.expectedStudents > row.capacity ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {row.expectedStudents} / {row.capacity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REKAP BEBAN DOSEN */}
      {activeReportTab === 'lecturer-load' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Dosen & NIP</th>
                  <th className="p-3">Bidang Keahlian</th>
                  <th className="p-3 text-center">Beban SKS</th>
                  <th className="p-3 text-center">Jumlah Kelas</th>
                  <th className="p-3">Hari Mengajar</th>
                  <th className="p-3">Mata Kuliah Diampu</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lecturerLoadData.map((lec) => (
                  <tr key={lec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700">{lec.code}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{lec.name}</div>
                      <div className="text-[10px] text-slate-400">{lec.nip}</div>
                    </td>
                    <td className="p-3 text-slate-600">{lec.expertise}</td>
                    <td className="p-3 text-center font-bold text-indigo-700 text-sm">
                      {lec.assignedSks} <span className="text-[10px] font-normal text-slate-400">/ 12</span>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-700">{lec.totalClasses}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{lec.days}</td>
                    <td className="p-3 text-slate-700 text-[11px] max-w-[240px]">
                      {lec.courseNames.join(', ') || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={
                          lec.status === 'Ideal'
                            ? 'success'
                            : lec.status === 'Overload'
                            ? 'warning'
                            : lec.status === 'Belum Ada'
                            ? 'neutral'
                            : 'indigo'
                        }
                        size="sm"
                      >
                        {lec.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REKAP PENGGUNAAN RUANGAN */}
      {activeReportTab === 'room-usage' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Ruangan</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3 text-center">Kapasitas</th>
                  <th className="p-3 text-center">Total Sesi</th>
                  <th className="p-3 text-center">Sesi Terpakai</th>
                  <th className="p-3">Tingkat Utilitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomUsageData.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-700">{room.code}</td>
                    <td className="p-3 font-bold text-slate-900">{room.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${room.type === 'Laboratorium' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                        {room.type}
                      </span>
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-800">{room.capacity} kursi</td>
                    <td className="p-3 text-center font-semibold text-slate-800">{room.totalClasses}</td>
                    <td className="p-3 text-center text-slate-600">
                      {room.usedSlots} / {room.totalSlots}
                    </td>
                    <td className="p-3 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              room.utilizationPct > 80
                                ? 'bg-amber-500'
                                : room.utilizationPct > 40
                                ? 'bg-indigo-600'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${room.utilizationPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 min-w-[32px] text-right">
                          {room.utilizationPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
