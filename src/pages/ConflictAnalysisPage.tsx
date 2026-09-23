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

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-md border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Total Pelanggaran</div>
            <div className="text-xl font-semibold text-slate-900 mt-0.5">{conflicts.length}</div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {conflicts.length === 0 ? 'Semua Beres' : `${conflicts.length} Catatan`}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-md border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Hard Conflict (Fatal)</div>
            <div className={`text-xl font-semibold mt-0.5 ${hardCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
              {hardCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Bentrokan Dosen, Ruang, Kapasitas</div>
          </div>
          {hardCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded">
              Wajib Dibenahi
            </span>
          )}
        </div>

        <div className="bg-white p-3.5 rounded-md border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">Soft Warning (Preferensi)</div>
            <div className={`text-xl font-semibold mt-0.5 ${softCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {softCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Waktu & Pola Distribusi</div>
          </div>
          {softCount > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded">
              Dapat Ditoleransi
            </span>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-md border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Filter:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">Semua Batasan ({conflicts.length})</option>
            <option value="hard">Hanya Hard Constraints ({hardCount})</option>
            <option value="soft">Hanya Soft Constraints ({softCount})</option>
          </select>

          <select
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            className="text-xs px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">Semua Tingkat Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan <span className="font-semibold text-slate-900">{filteredConflicts.length}</span> konflik
        </div>
      </div>

      {/* Interactive Conflict Table */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        {filteredConflicts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2.5 text-center w-12">No</th>
                  <th className="px-3.5 py-2.5">Jenis Bentrok</th>
                  <th className="px-3.5 py-2.5">Jadwal 1</th>
                  <th className="px-3.5 py-2.5">Jadwal 2</th>
                  <th className="px-3.5 py-2.5">Detail Pelanggaran</th>
                  <th className="px-3 py-2.5 text-center">Tingkat</th>
                  <th className="px-3 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredConflicts.map((c, index) => {
                  const assign1 = assignmentMap.get(c.assignment1Id);
                  const assign2 = c.assignment2Id ? assignmentMap.get(c.assignment2Id) : undefined;
                  const course1 = assign1 ? courseMap.get(assign1.courseId) : undefined;
                  const course2 = assign2 ? courseMap.get(assign2.courseId) : undefined;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedConflict(c)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-slate-900">{c.categoryName}</div>
                        <div className="text-[10px] text-slate-400">
                          {c.isHardConstraint ? 'Hard' : 'Soft'} • Penalti: {c.penalty}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-medium text-slate-800">
                          {course1?.code || c.course1Name || '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">
                          {course1?.name || c.course1Name || '-'}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        {c.course2Name || course2 ? (
                          <>
                            <div className="font-medium text-slate-800">
                              {course2?.code || c.course2Name}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">
                              {course2?.name || c.course2Name}
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 max-w-xs">
                        <p className="text-[11px] text-slate-700 line-clamp-2">{c.description}</p>
                        {c.involvedEntities.timeslotLabel && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">
                            {c.involvedEntities.timeslotLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
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
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedConflict(c);
                          }}
                          className="px-2 py-1 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">Tidak ditemukan bentrok jadwal (0 Hard Conflict)</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Seluruh batasan wajib akademik dan preferensi dosen telah terpenuhi dengan baik.
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
