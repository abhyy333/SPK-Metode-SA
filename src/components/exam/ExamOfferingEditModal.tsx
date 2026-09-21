import React, { useState, useEffect } from 'react';
import { ExamOffering, ExamSession, Room, Lecturer } from '../../types';
import { Modal } from '../ui/Modal';
import { Calendar, Clock, MapPin, UserCheck, Users, Save, AlertTriangle, Info } from 'lucide-react';

interface ExamOfferingEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  offering: ExamOffering | null;
  rooms: Room[];
  sessions: ExamSession[];
  lecturers: Lecturer[];
  availableDates: string[];
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
  onSave,
}) => {
  const [formData, setFormData] = useState<ExamOffering | null>(null);

  useEffect(() => {
    if (offering) {
      setFormData({ ...offering });
    }
  }, [offering, isOpen]);

  if (!formData || !offering) return null;

  // Selected room details
  const selectedRoomId = formData.roomIds?.[0] || '';
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  const isCapacityShort = selectedRoom ? selectedRoom.capacity < formData.studentCount : false;

  // Course Lecturers (Dosen Pengampu)
  const courseLecturers = lecturers.filter(l => formData.lecturerIds?.includes(l.id));

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleSupervisorToggle = (lecId: string) => {
    const current = formData.supervisorLecturerIds || [];
    const exists = current.includes(lecId);
    const updated = exists ? current.filter(id => id !== lecId) : [...current, lecId];
    setFormData({ ...formData, supervisorLecturerIds: updated });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Penjadwalan: ${formData.courseName} (${formData.sectionName || 'Utama'})`}
      subtitle={`${formData.examType} • Semester ${formData.semester} • Kode: ${formData.courseCode}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Info Bar Dosen Pengampu & Mahasiswa */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-semibold text-indigo-950">Dosen Pengampu: </span>
              <span className="text-indigo-800">
                {courseLecturers.length > 0
                  ? courseLecturers.map(l => l.name).join(', ')
                  : 'Belum terdaftar'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200/60 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-700">Jumlah Peserta:</span>
            <span className="font-bold text-indigo-700">{formData.studentCount} Mhs</span>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Section & Peserta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Seksi / Kelompok
            </label>
            <input
              type="text"
              value={formData.sectionName || ''}
              onChange={e => setFormData({ ...formData, sectionName: e.target.value })}
              placeholder="Contoh: A, B, atau Kelas 1"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Jumlah Peserta Ujian
            </label>
            <input
              type="number"
              min={1}
              value={formData.studentCount || ''}
              onChange={e => setFormData({ ...formData, studentCount: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Tanggal Ujian */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Tanggal Ujian
            </label>
            <select
              value={formData.examDate || ''}
              onChange={e => setFormData({ ...formData, examDate: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">-- Belum Ditentukan --</option>
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Sesi Ujian */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Sesi Ujian
            </label>
            <select
              value={formData.examSessionId || ''}
              onChange={e => setFormData({ ...formData, examSessionId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">-- Belum Ditentukan --</option>
              {sessions.filter(s => s.isActive).map(ses => (
                <option key={ses.id} value={ses.id}>
                  {ses.name} ({ses.startTime} – {ses.endTime})
                </option>
              ))}
            </select>
          </div>

          {/* Ruangan */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Alokasi Ruangan Ujian
              </span>
              {selectedRoom && (
                <span className={`text-[11px] font-semibold ${isCapacityShort ? 'text-rose-600' : 'text-emerald-600'}`}>
                  Kapasitas: {selectedRoom.capacity} kursi {isCapacityShort ? '(Kurang!)' : '(Mencukupi)'}
                </span>
              )}
            </label>
            <select
              value={selectedRoomId}
              onChange={e => setFormData({ ...formData, roomIds: e.target.value ? [e.target.value] : [] })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="">-- Belum Ditentukan --</option>
              {rooms.filter(r => r.isActive).map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} (Kapasitas: {r.capacity} kursi, {r.building})
                </option>
              ))}
            </select>

            {isCapacityShort && (
              <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Peringatan: Peserta ({formData.studentCount}) melebihi daya tampung {selectedRoom?.name} ({selectedRoom?.capacity}).
                </span>
              </div>
            )}
          </div>

          {/* Pengawas Ujian (Multi-select / Checkboxes) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                Pilih Dosen Pengawas Ujian (Admin Role)
              </span>
              <span className="text-[11px] text-slate-500">
                {formData.supervisorLecturerIds?.length || 0} Pengawas Dipilih
              </span>
            </label>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/50 space-y-1 divide-y divide-slate-100">
              {lecturers.map(lec => {
                const isSelected = formData.supervisorLecturerIds?.includes(lec.id);
                const isCourseLecturer = formData.lecturerIds?.includes(lec.id);

                return (
                  <label
                    key={lec.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSupervisorToggle(lec.id)}
                        className="rounded-md text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{lec.name}</span>
                      {isCourseLecturer && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md font-medium">
                          Dosen Pengampu
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{lec.code}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Perubahan
          </button>
        </div>
      </div>
    </Modal>
  );
};
