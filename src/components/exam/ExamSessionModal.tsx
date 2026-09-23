import React, { useState, useEffect } from 'react';
import { ExamSession } from '../../types';
import { Modal } from '../ui/Modal';
import { Plus, Trash2, Clock, Check, RefreshCw } from 'lucide-react';

interface ExamSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ExamSession[];
  onSaveSessions: (sessions: ExamSession[]) => void;
  onResetDefault: () => void;
}

export const ExamSessionModal: React.FC<ExamSessionModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onSaveSessions,
  onResetDefault,
}) => {
  const [localSessions, setLocalSessions] = useState<ExamSession[]>(sessions);
  const [newSessionName, setNewSessionName] = useState('');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [errorMsg, setErrorMsg] = useState('');

  // Update local state when prop changes
  useEffect(() => {
    setLocalSessions(sessions);
  }, [sessions, isOpen]);

  const handleAddSession = () => {
    if (!newStartTime || !newEndTime) {
      setErrorMsg('Jam mulai dan jam selesai harus diisi.');
      return;
    }
    if (newStartTime >= newEndTime) {
      setErrorMsg('Jam mulai harus lebih awal dari jam selesai.');
      return;
    }

    const startMinutes = parseInt(newStartTime.split(':')[0], 10) * 60 + parseInt(newStartTime.split(':')[1], 10);
    const endMinutes = parseInt(newEndTime.split(':')[0], 10) * 60 + parseInt(newEndTime.split(':')[1], 10);
    const duration = endMinutes - startMinutes;

    const name = newSessionName.trim() || `Sesi ${localSessions.length + 1}`;
    const newSession: ExamSession = {
      id: `ex-ses-${Date.now()}`,
      name,
      startTime: newStartTime,
      endTime: newEndTime,
      durationMinutes: duration,
      isActive: true,
      orderIndex: localSessions.length + 1,
    };

    const updated = [...localSessions, newSession].sort((a, b) => a.startTime.localeCompare(b.startTime));
    setLocalSessions(updated);
    onSaveSessions(updated);
    setNewSessionName('');
    setErrorMsg('');
  };

  const handleDeleteSession = (id: string) => {
    const updated = localSessions.filter(s => s.id !== id);
    setLocalSessions(updated);
    onSaveSessions(updated);
  };

  const handleToggleActive = (id: string) => {
    const updated = localSessions.map(s =>
      s.id === id ? { ...s, isActive: !s.isActive } : s
    );
    setLocalSessions(updated);
    onSaveSessions(updated);
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan sesi ujian ke konfigurasi standar (Sesi 1 - 4)?')) {
      onResetDefault();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfigurasi Sesi Ujian"
      subtitle="Kelola jam sesi ujian (terpisah dari sesi perkuliahan rutin). Urutan sesi otomatis diurutkan berdasarkan jam mulai."
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Form Tambah Sesi */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Tambah Sesi Ujian Baru
          </h4>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
              {errorMsg}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Nama Sesi (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: Sesi 5"
                value={newSessionName}
                onChange={e => setNewSessionName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Jam Mulai
              </label>
              <input
                type="time"
                value={newStartTime}
                onChange={e => setNewStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Jam Selesai
              </label>
              <input
                type="time"
                value={newEndTime}
                onChange={e => setNewEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            onClick={handleAddSession}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Simpan Sesi Ujian
          </button>
        </div>

        {/* Daftar Sesi Ujian */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Sesi Ujian Aktif ({localSessions.length})
            </h4>
            <button
              onClick={handleResetToDefault}
              className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset ke Standar
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
            {localSessions.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Belum ada sesi ujian. Tambahkan sesi ujian di atas.
              </div>
            ) : (
              localSessions.map((session, index) => (
                <div
                  key={session.id}
                  className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    session.isActive ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">{session.name}</h5>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {session.startTime} – {session.endTime} ({session.durationMinutes} Menit)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(session.id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
                        session.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {session.isActive ? 'Aktif' : 'Nonaktif'}
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  );
};
