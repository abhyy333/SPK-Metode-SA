import React, { useRef } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  UserCheck,
  GraduationCap,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ExamOffering,
  ExamSession,
  Room,
  Lecturer,
  ExamConflictItem,
} from '../../types';

export interface ExamBlockMatrixProps {
  offerings: ExamOffering[];
  rooms: Room[];
  sessions: ExamSession[];
  lecturers: Lecturer[];
  availableDates: string[];
  conflicts?: ExamConflictItem[];
  onSelectOffering?: (offering: ExamOffering) => void;
  userRole?: 'admin' | 'lecturer' | 'student';
  examType: 'UTS' | 'UAS';
}

// Semester accent colors matching ScheduleBlockMatrix for visual consistency
const SEMESTER_COLOR_MAP: Record<number, { border: string; bg: string; badge: string; text: string }> = {
  1: { border: 'border-l-indigo-600', bg: 'bg-indigo-50/40', badge: 'bg-indigo-100 text-indigo-900', text: 'text-indigo-950' },
  2: { border: 'border-l-sky-600', bg: 'bg-sky-50/40', badge: 'bg-sky-100 text-sky-900', text: 'text-sky-950' },
  3: { border: 'border-l-emerald-600', bg: 'bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-900', text: 'text-emerald-950' },
  4: { border: 'border-l-teal-600', bg: 'bg-teal-50/40', badge: 'bg-teal-100 text-teal-900', text: 'text-teal-950' },
  5: { border: 'border-l-amber-600', bg: 'bg-amber-50/40', badge: 'bg-amber-100 text-amber-900', text: 'text-amber-950' },
  6: { border: 'border-l-orange-600', bg: 'bg-orange-50/40', badge: 'bg-orange-100 text-orange-900', text: 'text-orange-950' },
  7: { border: 'border-l-purple-600', bg: 'bg-purple-50/40', badge: 'bg-purple-100 text-purple-900', text: 'text-purple-950' },
  8: { border: 'border-l-rose-600', bg: 'bg-rose-50/40', badge: 'bg-rose-100 text-rose-900', text: 'text-rose-950' },
};

export const ExamBlockMatrix: React.FC<ExamBlockMatrixProps> = ({
  offerings,
  rooms,
  sessions,
  lecturers,
  availableDates,
  conflicts = [],
  onSelectOffering,
  userRole = 'admin',
  examType,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const roomMap = new Map(rooms.map(r => [r.id, r]));
  const lecturerMap = new Map(lecturers.map(l => [l.id, l]));
  const sessionMap = new Map(sessions.map(s => [s.id, s]));

  // Build conflict lookup by offering ID
  const offeringHardConflictMap = new Map<string, ExamConflictItem[]>();
  conflicts.forEach(c => {
    if (c.severity === 'high') {
      c.examOfferingIds.forEach(id => {
        const list = offeringHardConflictMap.get(id) || [];
        list.push(c);
        offeringHardConflictMap.set(id, list);
      });
    }
  });

  const activeSessions = [...sessions]
    .filter(s => s.isActive)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Determine dates to show in columns: availableDates or dates present in offerings
  const datesToShow = availableDates.length > 0
    ? availableDates
    : Array.from(new Set(offerings.map(o => o.examDate).filter(Boolean))) as string[];

  // Helper date formatter
  const formatDateHeader = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { dayName: 'Hari', formattedDate: dateStr };
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return {
        dayName: days[d.getDay()],
        formattedDate: `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
      };
    } catch {
      return { dayName: 'Hari', formattedDate: dateStr };
    }
  };

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  // Group offerings by Date and SessionId
  const matrixGrid = new Map<string, ExamOffering[]>();
  offerings.forEach(off => {
    if (off.examDate && off.examSessionId) {
      const key = `${off.examDate}__${off.examSessionId}`;
      const list = matrixGrid.get(key) || [];
      list.push(off);
      matrixGrid.set(key, list);
    }
  });

  // Calculate grid template columns: Sticky time column (110px) + 1 column per date (min 280px)
  const gridColumnsCSS = `110px repeat(${Math.max(datesToShow.length, 1)}, minmax(280px, 1fr))`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      {/* 1. Header Toolbar of the Matrix */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white text-xs">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white tracking-wide flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Papan Matriks Jadwal Ujian ({examType})</span>
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            ({offerings.length} kelas ujian • Durasi 100 Menit / 2 Sesi • Scroll horizontal jika melebihi layar)
          </span>
        </div>

        {/* Scroll Navigation */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
            Geser Tanggal:
          </span>
          <button
            type="button"
            onClick={handleScrollLeft}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-all border border-slate-700 cursor-pointer active:scale-95"
            title="Geser ke Kiri"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Kiri</span>
          </button>
          <button
            type="button"
            onClick={handleScrollRight}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-all border border-slate-700 cursor-pointer active:scale-95"
            title="Geser ke Kanan"
          >
            <span className="hidden xs:inline">Kanan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Table Canvas with Sticky Headers */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto max-w-full overflow-y-auto max-h-[75vh]"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: gridColumnsCSS,
            minWidth: '100%',
          }}
          className="relative bg-slate-100 gap-[1px]"
        >
          {/* Top-Left Corner Cell (Sticky in both directions) */}
          <div className="sticky top-0 left-0 z-30 bg-slate-900 text-slate-300 font-bold text-xs p-3 border-b border-r border-slate-700 flex flex-col justify-center items-center">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Waktu</span>
            <span className="text-white text-xs font-extrabold">Sesi Ujian</span>
          </div>

          {/* Sticky Column Headers for Each Date */}
          {datesToShow.map(dateStr => {
            const { dayName, formattedDate } = formatDateHeader(dateStr);
            const dateOfferingsCount = offerings.filter(o => o.examDate === dateStr).length;

            return (
              <div
                key={dateStr}
                className="sticky top-0 z-20 bg-slate-800 text-white p-3 border-b border-slate-700 flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                    <span>{dayName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-indigo-300 font-bold">
                      {dateOfferingsCount}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {formattedDate}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Body Rows (One row per Exam Session) */}
          {activeSessions.map((session, sIdx) => {
            return (
              <React.Fragment key={session.id}>
                {/* Sticky Left Column Cell for this Session */}
                <div className="sticky left-0 z-10 bg-slate-50 border-r border-slate-200 p-3 flex flex-col justify-center items-center text-center shadow-2xs">
                  <span className="text-xs font-black text-slate-900">{session.name}</span>
                  <span className="text-[11px] font-bold text-indigo-700 mt-0.5 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                    {session.startTime} - {session.endTime}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">
                    100 Menit
                  </span>
                </div>

                {/* Matrix Grid Cells for each Date */}
                {datesToShow.map(dateStr => {
                  const cellKey = `${dateStr}__${session.id}`;
                  const cellOfferings = matrixGrid.get(cellKey) || [];

                  return (
                    <div
                      key={cellKey}
                      className="bg-white p-2 min-h-[140px] flex flex-col gap-2 transition-colors hover:bg-slate-50/50"
                    >
                      {cellOfferings.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-300 text-[11px] italic">
                          - Tidak ada ujian -
                        </div>
                      ) : (
                        cellOfferings.map(offering => {
                          const roomObj = rooms.find(r => offering.roomIds?.includes(r.id));
                          const sup1Obj = offering.supervisor1Id ? lecturerMap.get(offering.supervisor1Id) : (offering.supervisorLecturerIds?.[0] ? lecturerMap.get(offering.supervisorLecturerIds[0]) : null);
                          const sup2Obj = offering.supervisor2Id ? lecturerMap.get(offering.supervisor2Id) : (offering.supervisorLecturerIds?.[1] && offering.supervisorLecturerIds[1] !== sup1Obj?.id ? lecturerMap.get(offering.supervisorLecturerIds[1]) : null);
                          
                          const hardConflicts = offeringHardConflictMap.get(offering.id) || [];
                          const hasHardConflict = hardConflicts.length > 0;
                          const semColor = SEMESTER_COLOR_MAP[offering.semester] || SEMESTER_COLOR_MAP[1];

                          return (
                            <div
                              key={offering.id}
                              onClick={() => onSelectOffering && onSelectOffering(offering)}
                              className={`rounded-2xl p-3 border border-l-4 shadow-xs transition-all cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] space-y-2 ${semColor.border} ${semColor.bg} ${
                                hasHardConflict ? 'ring-2 ring-rose-500 bg-rose-50/60' : 'bg-white'
                              }`}
                            >
                              {/* 1. Header: Course Title & Section */}
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-black text-slate-900 truncate leading-snug">
                                    {offering.courseName}
                                  </h4>
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${semColor.badge}`}>
                                      {offering.examType} • Sem {offering.semester}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800">
                                      Kelas {offering.sectionName || 'A'}
                                    </span>
                                  </div>
                                </div>
                                {hasHardConflict && (
                                  <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] shrink-0 animate-pulse flex items-center gap-0.5">
                                    <ShieldAlert className="w-2.5 h-2.5" />
                                    <span>BENTROK</span>
                                  </span>
                                )}
                              </div>

                              {/* 2. Room & Participant info */}
                              <div className="text-[11px] text-slate-600 space-y-0.5 pt-0.5">
                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
                                  <span>{session.startTime} - {session.endTime}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                  <span className="flex items-center gap-1 font-medium truncate">
                                    <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <strong>{roomObj ? roomObj.name : 'Ruang Belum Ada'}</strong>
                                  </span>
                                  <span className="flex items-center gap-1 shrink-0 font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                    <Users className="w-2.5 h-2.5 text-slate-500" />
                                    {offering.studentCount} Peserta
                                  </span>
                                </div>
                              </div>

                              {/* 3. Supervisors Section (Requirement 13) */}
                              <div className="pt-1.5 border-t border-slate-200/80 space-y-1 text-[10px]">
                                {/* Pengawas 1 (Auto Dosen Pengampu) */}
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-slate-500 shrink-0">Pengawas 1:</span>
                                  <span className="font-bold text-slate-900 text-right truncate">
                                    {sup1Obj ? sup1Obj.name : <span className="text-amber-600 italic">Belum Ada Dosen Pengampu</span>}
                                  </span>
                                </div>

                                {/* Pengawas 2 (Manual Admin) */}
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-slate-500 shrink-0">Pengawas 2:</span>
                                  <span className="font-bold text-slate-900 text-right truncate">
                                    {sup2Obj ? sup2Obj.name : <span className="text-slate-400 italic">Belum Ditentukan</span>}
                                  </span>
                                </div>

                                {/* Badge Warning if Pengawas 2 is Empty (BUKAN CONFLICT) */}
                                {!sup2Obj && (
                                  <div className="mt-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 font-bold text-[9px] flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span>⚠ Pengawas 2 Belum Diisi</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
