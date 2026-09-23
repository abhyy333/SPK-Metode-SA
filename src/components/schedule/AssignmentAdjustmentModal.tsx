import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  ArrowLeftRight,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  DoorOpen,
  Clock,
  Calendar,
  User,
  Users,
  ShieldCheck,
  Check,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConstraintWeights,
  ConflictItem,
} from '../../types';
import {
  getScheduleRecommendations,
  getSwapRecommendations,
  evaluateMove,
  evaluateSwap,
  MoveEvaluation,
  SwapEvaluation,
} from '../../algorithms/recommendationEngine';
import { formatCourseSectionTitle } from '../../utils/sectionUtils';

interface AssignmentAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: ScheduleAssignment;
  currentSchedule: ScheduleAssignment[];
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  weights: ConstraintWeights;
  onApplyMove: (
    assignmentId: string,
    newTimeslotId: string,
    newRoomId: string,
    newLecturerIds?: string[]
  ) => void;
  onApplySwap: (assignment1Id: string, assignment2Id: string) => void;
  onUpdateLecturers?: (assignmentId: string, lecturerIds: string[]) => void;
  initialTab?: 'recommendation' | 'swap' | 'manual';
  conflicts?: ConflictItem[];
}

export const AssignmentAdjustmentModal: React.FC<AssignmentAdjustmentModalProps> = ({
  isOpen,
  onClose,
  assignment,
  currentSchedule,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  weights,
  onApplyMove,
  onApplySwap,
  onUpdateLecturers,
  initialTab = 'recommendation',
  conflicts = [],
}) => {
  const [activeTab, setActiveTab] = useState<'recommendation' | 'swap' | 'manual'>(initialTab);

  // Entities mapping
  const course = courses.find((c) => c.id === assignment.courseId);
  const classGroup = classes.find((cl) => cl.id === assignment.classId);
  const room = rooms.find((r) => r.id === assignment.roomId);
  const slot = timeslots.find((t) => t.id === assignment.timeslotId);
  const assignedLec = assignment.lecturerId ? lecturers.find((l) => l.id === assignment.lecturerId) : undefined;

  // Title formatted as e.g. "Probabilitas dan Statistik-A"
  const formattedTitle = formatCourseSectionTitle(
    course?.name || 'Mata Kuliah',
    null,
    classGroup?.code,
    classGroup?.name,
    assignment.classId
  );

  // State for manual move tab
  const [manualTimeslotId, setManualTimeslotId] = useState<string>(assignment.timeslotId);
  const [manualRoomId, setManualRoomId] = useState<string>(assignment.roomId);
  const [manualLecturerId, setManualLecturerId] = useState<string>(assignment.lecturerId || '');

  // State for custom swap selection
  const [customSwapTargetId, setCustomSwapTargetId] = useState<string>('');

  // Conflicts related to this assignment
  const assignmentConflicts = useMemo(() => {
    return conflicts.filter(
      (c) => c.assignment1Id === assignment.id || c.assignment2Id === assignment.id
    );
  }, [conflicts, assignment.id]);

  const hasHardConflict = assignmentConflicts.some((c) => c.isHardConstraint);

  // 1. Move Recommendations (Sorted & Conflict-free prioritized)
  const moveRecommendations = useMemo<MoveEvaluation[]>(() => {
    if (!isOpen) return [];
    try {
      const recs = getScheduleRecommendations(
        assignment.id,
        currentSchedule,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights,
        8
      );
      // Prioritize 0 hard conflict candidates
      return recs.filter((r) => r.isValidWithoutHardConflict || r.simulatedHardConflicts === 0);
    } catch (e) {
      console.error('Error generating move recommendations:', e);
      return [];
    }
  }, [isOpen, assignment.id, currentSchedule, courses, lecturers, classes, rooms, timeslots, weights]);

  // 2. Swap Recommendations
  const swapRecommendations = useMemo<SwapEvaluation[]>(() => {
    if (!isOpen) return [];
    try {
      return getSwapRecommendations(
        assignment.id,
        currentSchedule,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights,
        6
      );
    } catch (e) {
      console.error('Error generating swap recommendations:', e);
      return [];
    }
  }, [isOpen, assignment.id, currentSchedule, courses, lecturers, classes, rooms, timeslots, weights]);

  // 3. Live evaluation for Manual Move
  const manualEvaluation = useMemo<MoveEvaluation | null>(() => {
    if (!manualTimeslotId || !manualRoomId) return null;
    try {
      return evaluateMove(
        assignment.id,
        manualTimeslotId,
        manualRoomId,
        currentSchedule,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights
      );
    } catch {
      return null;
    }
  }, [assignment.id, manualTimeslotId, manualRoomId, currentSchedule, courses, lecturers, classes, rooms, timeslots, weights]);

  // Live evaluation for custom selected swap
  const customSwapEvaluation = useMemo<SwapEvaluation | null>(() => {
    if (!customSwapTargetId) return null;
    try {
      return evaluateSwap(
        assignment.id,
        customSwapTargetId,
        currentSchedule,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights,
        true
      );
    } catch {
      return null;
    }
  }, [assignment.id, customSwapTargetId, currentSchedule, courses, lecturers, classes, rooms, timeslots, weights]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                Penyesuaian Jadwal
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Sem {course?.semester || 1} • {course?.sks || course?.credits || 2} SKS
              </span>
              {hasHardConflict ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[11px] border border-rose-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  Bentrok Terdeteksi
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Jadwal Valid
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white truncate">
              {formattedTitle}
            </h3>

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-300 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {slot?.day || 'Hari -'}, {slot?.label || 'Sesi -'} ({slot?.startTime} - {slot?.endTime})
              </span>
              <span className="flex items-center gap-1">
                <DoorOpen className="w-3.5 h-3.5 text-indigo-400" />
                {room?.name || 'Ruang'} ({room?.code})
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                {assignedLec?.name || 'Belum Ada Dosen'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-5 pt-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('recommendation')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'recommendation'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rekomendasi Pindah</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
              {moveRecommendations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('swap')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'swap'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tukar Jadwal (Swap)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-extrabold">
              {swapRecommendations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'manual'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pindah Manual</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: REKOMENDASI PINDAH */}
          {activeTab === 'recommendation' && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">Kandidat Bebas Konflik:</span> Sistem mengevaluasi slot waktu dan ruangan yang tidak menimbulkan bentrok baru untuk {formattedTitle}.
                </div>
              </div>

              {moveRecommendations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">Tidak Ditemukan Slot Kosong Tanpa Bentrok</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                    Seluruh ruangan pada sesi yang sesuai sedang padat. Silakan gunakan tab <strong>Tukar Jadwal (Swap)</strong> atau lakukan <strong>Pindah Manual</strong>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {moveRecommendations.map((rec, idx) => (
                    <div
                      key={`rec-${rec.targetTimeslotId}-${rec.targetRoomId}`}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 bg-white hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] tracking-wider uppercase border border-indigo-100">
                            REKOMENDASI {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Hard Conflict: 0
                          </span>
                        </div>

                        <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>{rec.timeslot.day}</span>
                          <span className="text-slate-400">•</span>
                          <span>{rec.timeslot.label}</span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{rec.timeslot.startTime} - {rec.timeslot.endTime}</span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 font-bold text-slate-800">
                            <DoorOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{rec.room.name} ({rec.room.code})</span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Kapasitas: {rec.room.capacity} kursi
                          </span>
                        </div>

                        {/* Top positive reason */}
                        {rec.reasons.length > 0 && (
                          <div className="mt-2 text-[10px] text-emerald-800 bg-emerald-50/80 px-2 py-1 rounded-lg line-clamp-2">
                            {rec.reasons.filter((r) => r.startsWith('✓')).join(' • ') || rec.reasons[0]}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          onApplyMove(assignment.id, rec.targetTimeslotId, rec.targetRoomId);
                          onClose();
                        }}
                        className="mt-3 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Gunakan Rekomendasi Ini</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TUKAR JADWAL (SWAP) */}
          {activeTab === 'swap' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
                <span className="font-bold">Pertukaran Slot Berpasangan:</span> Menukar slot waktu dan ruangan antara dua mata kuliah untuk mengeliminasi bentrok tanpa mengganggu jadwal lainnya.
              </div>

              {/* Automatic Swap Options */}
              {swapRecommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Opsi Swap Terbaik yang Direkomendasikan
                  </h4>
                  <div className="space-y-2.5">
                    {swapRecommendations.map((swp) => {
                      const otherTitle = formatCourseSectionTitle(
                        swp.course2?.name || 'Mata Kuliah 2',
                        null,
                        swp.class2?.code,
                        swp.class2?.name,
                        swp.assignment2.classId
                      );

                      return (
                        <div
                          key={`swap-${swp.assignment2Id}`}
                          className="p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-400 bg-white hover:shadow-xs transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                Ditukar dengan: <span className="text-indigo-700">{otherTitle}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200">
                                Hard Conflict: {swp.simulatedHardConflicts}
                              </span>
                            </div>

                            {/* Comparison Preview */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                              <div>
                                <span className="text-slate-400 block font-medium">Jadwal Sasaran Saat Ini:</span>
                                <span className="font-bold text-slate-800">
                                  {swp.timeslot2.day}, {swp.timeslot2.label} • {swp.room2.code}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-medium">Dampak Perubahan:</span>
                                <span className="font-bold text-emerald-700">
                                  {swp.conflictDiff > 0 ? `Mengurangi ${swp.conflictDiff} konflik` : 'Menghasilkan jadwal valid'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              onApplySwap(assignment.id, swp.assignment2Id);
                              onClose();
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Terapkan Swap</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Custom Target Swap Selector */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Atau Pilih Mata Kuliah Lain Secara Manual untuk Disimulasikan:
                </label>
                <select
                  value={customSwapTargetId}
                  onChange={(e) => setCustomSwapTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="">-- Pilih Mata Kuliah Pasangan Tukar --</option>
                  {currentSchedule
                    .filter((a) => a.id !== assignment.id)
                    .map((a) => {
                      const c = courses.find((crs) => crs.id === a.courseId);
                      const s = timeslots.find((ts) => ts.id === a.timeslotId);
                      const r = rooms.find((rm) => rm.id === a.roomId);
                      const cl = classes.find((cls) => cls.id === a.classId);
                      const title = formatCourseSectionTitle(c?.name || 'MK', null, cl?.code, cl?.name, a.classId);
                      return (
                        <option key={a.id} value={a.id}>
                          {title} ({s?.day}, {s?.label} • {r?.code})
                        </option>
                      );
                    })}
                </select>

                {customSwapEvaluation && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Evaluasi Simulasi Swap:</span>
                      {customSwapEvaluation.simulatedHardConflicts === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          AMAN (0 Hard Conflict)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          {customSwapEvaluation.simulatedHardConflicts} Hard Conflict Baru
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {customSwapEvaluation.reasons.join(' • ')}
                    </div>
                    <button
                      onClick={() => {
                        onApplySwap(assignment.id, customSwapTargetId);
                        onClose();
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
                    >
                      Terapkan Pertukaran Ini
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PINDAH MANUAL DENGAN EVALUASI REAL-TIME */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Sesi & Hari */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hari & Sesi Waktu Kuliah
                  </label>
                  <select
                    value={manualTimeslotId}
                    onChange={(e) => setManualTimeslotId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  >
                    {timeslots
                      .filter((t) => t.isActive)
                      .map((slotItem) => (
                        <option key={slotItem.id} value={slotItem.id}>
                          {slotItem.day} • {slotItem.label} ({slotItem.startTime} – {slotItem.endTime})
                        </option>
                      ))}
                  </select>
                </div>

                {/* 2. Ruangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alokasi Ruangan
                  </label>
                  <select
                    value={manualRoomId}
                    onChange={(e) => setManualRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  >
                    {rooms
                      .filter((r) => r.isActive)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code}) — {r.capacity} kursi
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 3. Dosen Pengampu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dosen Pengampu Utama
                </label>
                <select
                  value={manualLecturerId}
                  onChange={(e) => setManualLecturerId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                >
                  <option value="">-- Belum Ada Dosen Pengampu (Warning) --</option>
                  {lecturers
                    .filter((l) => l.isActive)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.code})
                      </option>
                    ))}
                </select>
              </div>

              {/* Real-time Evaluation Result Box */}
              {manualEvaluation && (
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    manualEvaluation.simulatedHardConflicts === 0
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-rose-50/70 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      {manualEvaluation.simulatedHardConflicts === 0 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>HASIL EVALUASI: AMAN</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>
                            HASIL EVALUASI: {manualEvaluation.simulatedHardConflicts} KONFLIK BARU
                          </span>
                        </>
                      )}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Hard Conflict: {manualEvaluation.simulatedHardConflicts} • Soft Penalty: {manualEvaluation.simulatedSoftConflicts}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1">
                    {manualEvaluation.reasons.map((reason, rIdx) => (
                      <div
                        key={rIdx}
                        className={`text-[11px] font-medium ${
                          reason.startsWith('✓')
                            ? 'text-emerald-800'
                            : reason.startsWith('⚠')
                            ? 'text-rose-800'
                            : 'text-slate-600'
                        }`}
                      >
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const newLecs = manualLecturerId ? [manualLecturerId] : [];
                    onApplyMove(assignment.id, manualTimeslotId, manualRoomId, newLecs);
                    if (onUpdateLecturers && manualLecturerId) {
                      onUpdateLecturers(assignment.id, newLecs);
                    }
                    onClose();
                  }}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                    manualEvaluation && manualEvaluation.simulatedHardConflicts > 0
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {manualEvaluation && manualEvaluation.simulatedHardConflicts > 0
                    ? 'Simpan Meskipun Ada Konflik'
                    : 'Simpan Perpindahan'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
