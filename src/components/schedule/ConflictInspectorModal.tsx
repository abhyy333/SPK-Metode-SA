import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Users,
  DoorOpen,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  UserX,
  Target,
} from 'lucide-react';
import {
  ConflictItem,
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  CourseOffering,
} from '../../types';
import { formatCourseSectionTitle } from '../../utils/sectionUtils';
import { PublishValidationReport } from '../../utils/publishValidation';
import { ScheduleValidationResult } from '../../utils/scheduleValidation';

interface ConflictInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictItem[];
  assignments: ScheduleAssignment[];
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  offerings?: CourseOffering[];
  validationReport?: PublishValidationReport;
  scheduleValidation?: ScheduleValidationResult;
  onFocusAssignment: (assignmentId: string, day?: string) => void;
  initialTab?: 'conflicts' | 'warnings';
}

export const ConflictInspectorModal: React.FC<ConflictInspectorModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  assignments,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  offerings = [],
  validationReport,
  scheduleValidation,
  onFocusAssignment,
  initialTab = 'conflicts',
}) => {
  const [activeTab, setActiveTab] = useState<'conflicts' | 'warnings'>(initialTab);

  if (!isOpen) return null;

  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const timeslotMap = new Map(timeslots.map((t) => [t.id, t]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const lecturerMap = new Map(lecturers.map((l) => [l.id, l]));

  // Separate hard conflicts and warnings using scheduleValidation if available, ensuring exact sync
  const hardConflicts = scheduleValidation
    ? scheduleValidation.hardConflicts
    : conflicts.filter((c) => c.isHardConstraint || c.severity === 'high');

  // Identify assignments or offerings without lecturer (Warning)
  const assignmentsWithoutLecturer = assignments.filter((a) => {
    const hasLec = (a.lecturerIds && a.lecturerIds.length > 0) || Boolean(a.lecturerId);
    return !hasLec;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Pemeriksa Konflik & Peringatan Jadwal
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Klik item di bawah untuk langsung menuju dan menyelesaikan masalah pada matriks jadwal.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="px-5 pt-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'conflicts'
                ? 'border-rose-600 text-rose-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Hard Conflicts</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
              {hardConflicts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('warnings')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
              activeTab === 'warnings'
                ? 'border-amber-600 text-amber-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserX className="w-3.5 h-3.5 text-amber-600" />
            <span>Peringatan Dosen Kosong</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              {assignmentsWithoutLecturer.length}
            </span>
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {activeTab === 'conflicts' && (
            <>
              {hardConflicts.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-200">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                    ✓
                  </div>
                  <h4 className="font-black text-sm text-emerald-950">Jadwal Bebas Hard Conflict!</h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Seluruh kendala utama dosen, ruangan, kapasitas, dan sesi terpenuhi tanpa bentrokan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {hardConflicts.map((c, idx) => {
                    const assign1 = c.assignment1Id
                      ? assignments.find((a) => a.id === c.assignment1Id)
                      : undefined;
                    const c1 = assign1 ? courseMap.get(assign1.courseId) : undefined;
                    const cl1 = assign1 ? classMap.get(assign1.classId) : undefined;
                    const s1 = assign1 ? timeslotMap.get(assign1.timeslotId) : undefined;
                    const r1 = assign1 ? roomMap.get(assign1.roomId) : undefined;

                    const title1 = formatCourseSectionTitle(
                      c1?.name || 'Mata Kuliah',
                      null,
                      cl1?.code,
                      cl1?.name,
                      assign1?.classId
                    );

                    return (
                      <div
                        key={c.id || idx}
                        onClick={() => {
                          if (c.assignment1Id) {
                            onFocusAssignment(c.assignment1Id, s1?.day);
                            onClose();
                          }
                        }}
                        className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 hover:border-rose-400 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider">
                              {c.category?.replace(/_/g, ' ') || 'BENTROK'}
                            </span>
                            <span className="text-xs font-black text-slate-900 group-hover:text-rose-700 transition-colors">
                              {title1}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 font-medium line-clamp-2 mt-1">
                            {c.description}
                          </p>

                          {s1 && (
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {s1.day}, {s1.label} ({s1.startTime} - {s1.endTime})
                              </span>
                              {r1 && (
                                <span className="flex items-center gap-1">
                                  <DoorOpen className="w-3 h-3 text-slate-400" />
                                  {r1.name} ({r1.code})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold group-hover:bg-rose-600 group-hover:text-white transition-all shadow-2xs">
                          <Target className="w-3.5 h-3.5" />
                          <span>Fokus</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'warnings' && (
            <>
              {assignmentsWithoutLecturer.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-200">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                    ✓
                  </div>
                  <h4 className="font-black text-sm text-emerald-950">Seluruh Mata Kuliah Memiliki Dosen</h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Tidak ada peringatan dosen kosong pada jadwal yang sedang aktif.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold">Informasi:</span> Dosen kosong adalah <strong>Warning</strong> (tidak memblokir penerbitan jadwal). Anda dapat menentukan dosen pengampu sekarang atau membiarkannya dilengkapi kemudian.
                  </div>

                  {assignmentsWithoutLecturer.map((a) => {
                    const c = courseMap.get(a.courseId);
                    const cl = classMap.get(a.classId);
                    const s = timeslotMap.get(a.timeslotId);
                    const r = roomMap.get(a.roomId);

                    const title = formatCourseSectionTitle(
                      c?.name || 'Mata Kuliah',
                      null,
                      cl?.code,
                      cl?.name,
                      a.classId
                    );

                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          onFocusAssignment(a.id, s?.day);
                          onClose();
                        }}
                        className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-400 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider">
                              WARNING: BELUM ADA DOSEN
                            </span>
                            <span className="text-xs font-black text-slate-900 group-hover:text-amber-800 transition-colors">
                              {title}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600 font-medium">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {s ? `${s.day}, ${s.label}` : 'Sesi Belum Ditentukan'}
                            </span>
                            <span className="flex items-center gap-1">
                              <DoorOpen className="w-3 h-3 text-slate-400" />
                              {r?.code || 'Ruang Belum Ditentukan'}
                            </span>
                            <span className="text-slate-400">
                              Sem {c?.semester || 1} • {c?.sks || 2} SKS
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs font-bold group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs">
                          <Target className="w-3.5 h-3.5" />
                          <span>Tentukan Dosen</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
