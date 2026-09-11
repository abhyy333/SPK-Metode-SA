import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldCheck,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  Users,
  DoorOpen,
  Clock,
  Zap,
} from 'lucide-react';
import {
  ConflictItem,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ScheduleAssignment,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface ConflictAnalysisPageProps {
  conflicts: ConflictItem[];
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  currentSchedule: ScheduleAssignment[] | null;
  onNavigate: (viewId: string) => void;
}

export const ConflictAnalysisPage: React.FC<ConflictAnalysisPageProps> = ({
  conflicts,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  currentSchedule,
  onNavigate,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedConflict, setSelectedConflict] = useState<ConflictItem | null>(null);

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const lecturerMap = new Map<string, Lecturer>(lecturers.map(l => [l.id, l]));
  const classMap = new Map<string, ClassGroup>(classes.map(cl => [cl.id, cl]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const timeslotMap = new Map<string, Timeslot>(timeslots.map(t => [t.id, t]));
  const assignmentMap = new Map<string, ScheduleAssignment>(
    currentSchedule ? currentSchedule.map(a => [a.id, a]) : []
  );

  const filteredConflicts = conflicts.filter(c => {
    const matchSeverity = filterSeverity === 'all' || c.severity === filterSeverity;
    const matchType =
      filterType === 'all'
        ? true
        : filterType === 'hard'
        ? c.isHardConstraint
        : !c.isHardConstraint;
    return matchSeverity && matchType;
  });

  const hardCount = conflicts.filter(c => c.isHardConstraint).length;
  const softCount = conflicts.filter(c => !c.isHardConstraint).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Analisis Konflik & Pelanggaran Batasan</h2>
          <p className="text-xs text-slate-500">
            Identifikasi detail bentrokan hard constraints dan soft constraints pada jadwal aktif
          </p>
        </div>

        {conflicts.length > 0 && (
          <button
            onClick={() => onNavigate('optimization')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Optimasi Jadwal Ini</span>
          </button>
        )}
      </div>

      {/* Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Konflik Terdeteksi</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{conflicts.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-700">Hard Constraints (C1 - C5)</div>
            <div className="text-2xl font-bold text-rose-700 mt-1">{hardCount}</div>
            <div className="text-[10px] text-rose-500">Bentrokan Dosen, Ruang, Kapasitas</div>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-800">Soft Constraints (Preferensi)</div>
            <div className="text-2xl font-bold text-amber-800 mt-1">{softCount}</div>
            <div className="text-[10px] text-amber-600">Waktu, Hari & Distribusi</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
            <Filter className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Filter Tampilan:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Batasan ({conflicts.length})</option>
            <option value="hard">Hanya Hard Constraints ({hardCount})</option>
            <option value="soft">Hanya Soft Constraints ({softCount})</option>
          </select>

          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Tingkat Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <span className="font-bold text-slate-900">{filteredConflicts.length}</span> konflik
        </div>
      </div>

      {/* Interactive Conflict Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredConflicts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-center w-12">No</th>
                  <th className="px-4 py-3">Jenis Konflik</th>
                  <th className="px-4 py-3">Jadwal 1 (Terlibat)</th>
                  <th className="px-4 py-3">Jadwal 2 (Bentrokan)</th>
                  <th className="px-4 py-3">Detail Pelanggaran</th>
                  <th className="px-3 py-3 text-center">Severity</th>
                  <th className="px-3 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConflicts.map((c, index) => {
                  const assign1 = assignmentMap.get(c.assignment1Id);
                  const assign2 = c.assignment2Id ? assignmentMap.get(c.assignment2Id) : undefined;
                  const course1 = assign1 ? courseMap.get(assign1.courseId) : undefined;
                  const course2 = assign2 ? courseMap.get(assign2.courseId) : undefined;
                  const slot1 = assign1 ? timeslotMap.get(assign1.timeslotId) : undefined;
                  const room1 = assign1 ? roomMap.get(assign1.roomId) : undefined;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedConflict(c)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{c.categoryName}</div>
                        <div className="text-[10px] text-slate-400">
                          {c.isHardConstraint ? 'Hard Constraint' : 'Soft Constraint'} • Penalty:{' '}
                          {c.penalty}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {course1?.code || c.course1Name || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">
                          {course1?.name || c.course1Name || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {c.course2Name || course2 ? (
                          <>
                            <div className="font-semibold text-slate-800">
                              {course2?.code || c.course2Name}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">
                              {course2?.name || c.course2Name}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">— (Tunggal)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="text-[11px] text-slate-700 line-clamp-2">{c.description}</p>
                        {c.involvedEntities.timeslotLabel && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {c.involvedEntities.timeslotLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            c.severity === 'high'
                              ? 'danger'
                              : c.severity === 'medium'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {c.severity.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedConflict(c);
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Lihat Detail Konflik"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 text-center">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">Tidak Ditemukan Konflik!</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Semua aturan hard constraints dan soft constraints telah terpenuhi dengan baik pada solusi
              jadwal aktif.
            </p>
          </div>
        )}
      </div>

      {/* Modal Detail Konflik */}
      <Modal
        isOpen={Boolean(selectedConflict)}
        onClose={() => setSelectedConflict(null)}
        title="Detail Pelanggaran Batasan Jadwal"
        subtitle={selectedConflict?.categoryName}
        maxWidth="lg"
      >
        {selectedConflict && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">{selectedConflict.title}</span>
                <Badge
                  variant={
                    selectedConflict.severity === 'high'
                      ? 'danger'
                      : selectedConflict.severity === 'medium'
                      ? 'warning'
                      : 'neutral'
                  }
                  size="sm"
                >
                  Severity: {selectedConflict.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {selectedConflict.description}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-400">Entitas yang Terlibat:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {selectedConflict.involvedEntities.lecturerName && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Dosen:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedConflict.involvedEntities.lecturerName}
                    </span>
                  </div>
                )}
                {selectedConflict.involvedEntities.roomCode && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Ruangan:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedConflict.involvedEntities.roomCode}
                    </span>
                  </div>
                )}
                {selectedConflict.involvedEntities.className && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Kelas:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedConflict.involvedEntities.className}
                    </span>
                  </div>
                )}
                {selectedConflict.involvedEntities.timeslotLabel && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Waktu Sesi:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedConflict.involvedEntities.timeslotLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedConflict(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
