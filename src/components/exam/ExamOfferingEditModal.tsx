import React, { useState, useEffect, useMemo } from 'react';
import { ExamOffering, ExamSession, Room, Lecturer } from '../../types';
import { Modal } from '../ui/Modal';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Users,
  Save,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  GraduationCap
} from 'lucide-react';

interface ExamOfferingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering: ExamOffering | null;
  rooms: Room[];
  sessions: ExamSession[];
  lecturers: Lecturer[];
  availableDates: string[];
  allOfferings?: ExamOffering[];
  onSave: (updatedOffering: ExamOffering) => void;
}

export const ExamOfferingEditModal: React.FC<ExamOfferingEditModalProps> = ({
  isOpen,
  onClose,
  offering,
  rooms,
  sessions,
  lecturers,
  availableDates,
  allOfferings = [],
  onSave,
}) => {
  const [formData, setFormData] = useState<ExamOffering | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'jadwal' | 'pengawas' | 'konflik' | 'rekomendasi'>('jadwal');
  const [searchLecturer, setSearchLecturer] = useState<string>('');

  useEffect(() => {
    if (offering) {
      // Ensure supervisor1Id is set from lecturerIds[0] if available
      const sup1 = offering.supervisor1Id || offering.supervisorLecturerIds?.[0] || (offering.lecturerIds?.[0] || null);
      const sup2 = offering.supervisor2Id || (offering.supervisorLecturerIds?.[1] && offering.supervisorLecturerIds[1] !== sup1 ? offering.supervisorLecturerIds[1] : null);
      
      const supList: string[] = [];
      if (sup1) supList.push(sup1);
      if (sup2 && sup2 !== sup1) supList.push(sup2);

      setFormData({
        ...offering,
        supervisor1Id: sup1,
        supervisor2Id: sup2,
        supervisorLecturerIds: supList,
        durationMinutes: 100,
      });
      setActiveSubTab('jadwal');
      setSearchLecturer('');
    }
  }, [offering, isOpen]);

  // Calculate recommendation slots (dates + sessions + rooms with 0 conflict)
  const recommendations = useMemo(() => {
    if (!formData) return [];
    const list: Array<{ date: string; session: ExamSession; room: Room }> = [];
    const activeRooms = rooms.filter(r => r.isActive && r.capacity >= formData.studentCount);
    const activeSessions = sessions.filter(s => s.isActive);

    for (const d of availableDates) {
      for (const ses of activeSessions) {
        // Skip current slot
        if (d === formData.examDate && ses.id === formData.examSessionId) continue;

        const concurrentOfferings = allOfferings.filter(o => o.id !== formData.id && o.examDate === d && o.examSessionId === ses.id);
        const usedRoomIds = new Set(concurrentOfferings.flatMap(o => o.roomIds || []));
        const usedSupIds = new Set(concurrentOfferings.flatMap(o => o.supervisorLecturerIds || []));

        // Check if our supervisors are busy
        const sup1Busy = formData.supervisor1Id ? usedSupIds.has(formData.supervisor1Id) : false;
        const sup2Busy = formData.supervisor2Id ? usedSupIds.has(formData.supervisor2Id) : false;
        if (sup1Busy || sup2Busy) continue;

        // Find available rooms
        const freeRoom = activeRooms.find(r => !usedRoomIds.has(r.id));
        if (freeRoom) {
          list.push({ date: d, session: ses, room: freeRoom });
          if (list.length >= 4) return list;
        }
      }
    }
    return list;
  }, [formData, rooms, sessions, availableDates, allOfferings]);

  if (!formData || !offering) return null;

  // Selected room & capacity check
  const selectedRoomId = formData.roomIds?.[0] || '';
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const isCapacityShort = selectedRoom ? selectedRoom.capacity < formData.studentCount : false;

  // Primary Lecturer / Pengawas 1 (AUTO)
  const sup1Lecturer = lecturers.find(l => l.id === formData.supervisor1Id);
  const sup2Lecturer = lecturers.find(l => l.id === formData.supervisor2Id);

  // All lecturers of the course (Team Teaching)
  const courseLecturers = lecturers.filter(l => formData.lecturerIds?.includes(l.id));

  // Compute live conflicts for this offering
  const currentSlotKey = `${formData.examDate}__${formData.examSessionId}`;
  const slotOfferings = allOfferings.filter(o => 
    o.id !== formData.id && 
    o.examDate === formData.examDate && 
    o.examSessionId === formData.examSessionId
  );

  const roomConflictOfferings = slotOfferings.filter(o => selectedRoomId && o.roomIds?.includes(selectedRoomId));
  const sup1ConflictOfferings = slotOfferings.filter(o => formData.supervisor1Id && o.supervisorLecturerIds?.includes(formData.supervisor1Id));
  const sup2ConflictOfferings = slotOfferings.filter(o => formData.supervisor2Id && o.supervisorLecturerIds?.includes(formData.supervisor2Id));

  const hasRoomConflict = roomConflictOfferings.length > 0;
  const hasSup1Conflict = sup1ConflictOfferings.length > 0;
  const hasSup2Conflict = sup2ConflictOfferings.length > 0;
  const hasAnyHardConflict = hasRoomConflict || hasSup1Conflict || hasSup2Conflict || isCapacityShort;

  // Filtered lecturers for Pengawas 2 dropdown
  const filteredLecturersForSup2 = lecturers
    .filter(l => l.isActive && l.id !== formData.supervisor1Id)
    .filter(l => {
      if (!searchLecturer.trim()) return true;
      const q = searchLecturer.toLowerCase();
      return l.name.toLowerCase().includes(q) || (l.code && l.code.toLowerCase().includes(q));
    });

  const handleSave = () => {
    const supList: string[] = [];
    if (formData.supervisor1Id) supList.push(formData.supervisor1Id);
    if (formData.supervisor2Id && formData.supervisor2Id !== formData.supervisor1Id) supList.push(formData.supervisor2Id);

    const isFullyScheduled = Boolean(formData.examDate && formData.examSessionId && formData.roomIds?.length);
    const updated: ExamOffering = {
      ...formData,
      supervisorLecturerIds: supList,
      durationMinutes: 100,
      status: isFullyScheduled ? 'scheduled' : 'draft',
    };
    onSave(updated);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detail & Atur Jadwal Ujian: ${formData.courseName} - ${formData.sectionName || 'A'}`}
      subtitle={`${formData.examType} • Semester ${formData.semester} • Kode: ${formData.courseCode} • Durasi 100 Menit (2 Sesi)`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Navigation / Sub-tabs inside modal */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveSubTab('jadwal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'jadwal'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Jadwal & Ruangan</span>
          </button>
          <button
            onClick={() => setActiveSubTab('pengawas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'pengawas'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pengawas Ujian</span>
            {!formData.supervisor2Id && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Pengawas 2 belum diisi" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('konflik')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'konflik'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${hasAnyHardConflict ? 'text-rose-600' : 'text-slate-500'}`} />
            <span>Cek Konflik</span>
            {hasAnyHardConflict && (
              <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 font-black rounded-full text-[10px]">
                Bentrok
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('rekomendasi')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ml-auto ${
              activeSubTab === 'rekomendasi'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rekomendasi Pindah</span>
          </button>
        </div>

        {/* 1. Header Overview Summary Card */}
        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-semibold text-indigo-950">Mata Kuliah: </span>
              <span className="font-bold text-indigo-900">{formData.courseName} (Kelas {formData.sectionName || 'A'})</span>
              <span className="text-slate-500 ml-1.5">Sem {formData.semester}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-indigo-200/60 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-700">Peserta:</span>
            <span className="font-bold text-indigo-700">{formData.studentCount} Mhs</span>
          </div>
        </div>

        {/* TAB CONTENT: JADWAL & RUANGAN */}
        {activeSubTab === 'jadwal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tanggal Ujian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Tanggal Ujian
                </label>
                <select
                  value={formData.examDate || ''}
                  onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value="">-- Pilih Tanggal Ujian --</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {date}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sesi Ujian (Master Sesi Perkuliahan: 100 Menit / 2 Sesi) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Sesi Ujian (100 Menit)
                </label>
                <select
                  value={formData.examSessionId || ''}
                  onChange={e => setFormData({ ...formData, examSessionId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value="">-- Pilih Sesi Ujian --</option>
                  {sessions.filter(s => s.isActive).map(ses => (
                    <option key={ses.id} value={ses.id}>
                      {ses.name} ({ses.startTime} – {ses.endTime})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  1 ujian = 100 menit (menggabungkan 2 sesi master perkuliahan).
                </p>
              </div>

              {/* Ruangan */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    Alokasi Ruangan Ujian
                  </span>
                  {selectedRoom && (
                    <span className={`text-[11px] font-bold ${isCapacityShort ? 'text-rose-600' : 'text-emerald-600'}`}>
                      Kapasitas: {selectedRoom.capacity} kursi {isCapacityShort ? '(Kurang dari peserta!)' : '(Mencukupi)'}
                    </span>
                  )}
                </label>
                <select
                  value={selectedRoomId}
                  onChange={e => setFormData({ ...formData, roomIds: e.target.value ? [e.target.value] : [] })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value="">-- Belum Ditentukan --</option>
                  {rooms.filter(r => r.isActive).map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code}) — Kapasitas {r.capacity} kursi • {r.building}
                    </option>
                  ))}
                </select>

                {isCapacityShort && (
                  <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Peringatan: Peserta ({formData.studentCount}) melebihi daya tampung ruangan {selectedRoom?.name} ({selectedRoom?.capacity} kursi).
                    </span>
                  </div>
                )}
              </div>

              {/* Jumlah Peserta */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jumlah Peserta Ujian (Mhs)
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.studentCount || ''}
                  onChange={e => setFormData({ ...formData, studentCount: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                />
              </div>

              {/* Section Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Seksi / Kelas
                </label>
                <input
                  type="text"
                  value={formData.sectionName || ''}
                  onChange={e => setFormData({ ...formData, sectionName: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: PENGAWAS UJIAN (PENGAWAS 1 AUTO, PENGAWAS 2 MANUAL) */}
        {activeSubTab === 'pengawas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Alokasi Pengawas Ujian
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                  formData.supervisor1Id && formData.supervisor2Id
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {formData.supervisor1Id && formData.supervisor2Id
                  ? '✓ Pengawas Lengkap (2/2)'
                  : formData.supervisor1Id
                  ? '⚠️ Pengawas 2 Belum Diisi (1/2)'
                  : '⚠️ Pengawas Belum Lengkap (0/2)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PENGAWAS 1 (OTOMATIS DARI DOSEN PENGAMPU) */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Pengawas 1</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    AUTO (Dosen Pengampu)
                  </span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {sup1Lecturer ? sup1Lecturer.name : 'Belum Ada Dosen Pengampu'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {sup1Lecturer ? `Kode: ${sup1Lecturer.code}` : 'Atur Dosen Pengampu pada jadwal kuliah'}
                    </span>
                  </div>
                  {sup1Lecturer && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                </div>

                <p className="text-[10px] text-slate-500">
                  Pengawas 1 selalu otomatis ditugaskan dari Dosen Pengampu utama mata kuliah ini.
                </p>

                {/* Team Teaching Info */}
                {courseLecturers.length > 1 && (
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Team Teaching Perkuliahan:</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-500">
                      {courseLecturers.map(l => (
                        <li key={l.id} className={l.id === formData.supervisor1Id ? 'font-bold text-indigo-700' : ''}>
                          {l.name} {l.id === formData.supervisor1Id ? '(Pengawas 1)' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* PENGAWAS 2 (MANUAL DIINPUT OLEH ADMIN) */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Pengawas 2</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    MANUAL ADMIN
                  </span>
                </div>

                {/* Search / filter for lecturer */}
                <input
                  type="text"
                  placeholder="Cari dosen pengawas..."
                  value={searchLecturer}
                  onChange={e => setSearchLecturer(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />

                <select
                  value={formData.supervisor2Id || ''}
                  onChange={e => {
                    const val = e.target.value || null;
                    const supList: string[] = [];
                    if (formData.supervisor1Id) supList.push(formData.supervisor1Id);
                    if (val && val !== formData.supervisor1Id) supList.push(val);
                    setFormData({
                      ...formData,
                      supervisor2Id: val,
                      supervisorLecturerIds: supList,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
                >
                  <option value="">-- Pilih Dosen Pengawas 2 --</option>
                  {filteredLecturersForSup2.map(lec => {
                    const isCourseLecturer = formData.lecturerIds?.includes(lec.id);
                    return (
                      <option key={lec.id} value={lec.id}>
                        {lec.name} ({lec.code}){isCourseLecturer ? ' — [Dosen Pengampu Tim]' : ''}
                      </option>
                    );
                  })}
                </select>

                {!formData.supervisor2Id ? (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-1.5 text-amber-800 text-[11px] font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Pengawas 2 belum diisi (Bukan conflict, tetapi wajib diisi sebelum publish).</span>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-[11px] font-semibold">
                    <span>Pengawas 2: {sup2Lecturer?.name}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: CEK KONFLIK */}
        {activeSubTab === 'konflik' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-600">
              Pemeriksaan potensi bentrok ruangan, bentrok pengawas, dan ketercukupan kapasitas:
            </div>

            {hasAnyHardConflict ? (
              <div className="space-y-2">
                {hasRoomConflict && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Bentrok Ruangan ({selectedRoom?.name}):
                    </div>
                    <p className="text-[11px]">
                      Ruangan {selectedRoom?.name} telah digunakan oleh ujian:{' '}
                      <strong>{roomConflictOfferings.map(o => `${o.courseName} - ${o.sectionName || 'A'}`).join(', ')}</strong> pada tanggal dan sesi yang sama.
                    </p>
                  </div>
                )}

                {hasSup1Conflict && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Bentrok Pengawas 1 ({sup1Lecturer?.name}):
                    </div>
                    <p className="text-[11px]">
                      Dosen ini telah terjadwal mengawas ujian lain:{' '}
                      <strong>{sup1ConflictOfferings.map(o => `${o.courseName} - ${o.sectionName || 'A'}`).join(', ')}</strong> pada tanggal dan sesi yang sama.
                    </p>
                  </div>
                )}

                {hasSup2Conflict && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Bentrok Pengawas 2 ({sup2Lecturer?.name}):
                    </div>
                    <p className="text-[11px]">
                      Dosen ini telah terjadwal mengawas ujian lain:{' '}
                      <strong>{sup2ConflictOfferings.map(o => `${o.courseName} - ${o.sectionName || 'A'}`).join(', ')}</strong> pada tanggal dan sesi yang sama.
                    </p>
                  </div>
                )}

                {isCapacityShort && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      Kapasitas Ruangan Kurang:
                    </div>
                    <p className="text-[11px]">
                      Daya tampung ruangan {selectedRoom?.name} ({selectedRoom?.capacity} kursi) lebih kecil dari jumlah mahasiswa ({formData.studentCount} Mhs).
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Jadwal Ujian Bebas Hard Conflict!</p>
                  <p className="text-[11px] text-emerald-700">
                    Tidak ditemukan bentrok pemakaian ruangan maupun jadwal pengawas pada tanggal dan sesi yang dipilih.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: REKOMENDASI PINDAH */}
        {activeSubTab === 'rekomendasi' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-600">
              Pilihan slot tanggal, sesi, dan ruangan alternatif yang bebas bentrok:
            </div>

            {recommendations.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Belum menemukan slot rekomendasi alternatif yang memenuhi kriteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl space-y-2 transition-all shadow-2xs group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{rec.date}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Bebas Bentrok
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>Sesi: <strong className="text-slate-800">{rec.session.name} ({rec.session.startTime} - {rec.session.endTime})</strong></div>
                      <div>Ruang: <strong className="text-slate-800">{rec.room.name}</strong> (Kapasitas: {rec.room.capacity} kursi)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          examDate: rec.date,
                          examSessionId: rec.session.id,
                          roomIds: [rec.room.id],
                        });
                        setActiveSubTab('jadwal');
                      }}
                      className="w-full py-1.5 px-2.5 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Terapkan Slot Ini
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-400">
            {formData.supervisor2Id ? 'Pengawas lengkap' : '⚠ Pengawas 2 belum diisi (warning)'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
