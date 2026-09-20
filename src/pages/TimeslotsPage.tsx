import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Copy,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Timeslot, DayOfWeek, ScheduleAssignment, RolePermissions } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { useToast } from '../components/ui/Toast';
import {
  ALL_DAYS,
  calculateSessionDuration,
  getOverlappingSessions,
  getSessionShortLabel,
} from '../utils/sessionUtils';

interface TimeslotsPageProps {
  timeslots: Timeslot[];
  schedule?: ScheduleAssignment[];
  permissions?: RolePermissions;
  onSaveTimeslot: (timeslot: Timeslot) => void;
  onDeleteTimeslot: (id: string) => void;
  onToggleTimeslot: (id: string) => void;
  onResetDefaultTimeslots: () => void;
}

export const TimeslotsPage: React.FC<TimeslotsPageProps> = ({
  timeslots,
  schedule = [],
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onSaveTimeslot,
  onDeleteTimeslot,
  onToggleTimeslot,
  onResetDefaultTimeslots,
}) => {
  const { showToast } = useToast();

  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTimeslot, setEditingTimeslot] = useState<Timeslot | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Timeslot | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }>({
    id: '',
    day: 'Senin',
    startTime: '07:30',
    endTime: '09:10',
    isActive: true,
  });

  const calculatedDuration = calculateSessionDuration(formData.startTime, formData.endTime);

  // Check Overlap with existing timeslots on the same day
  const overlappingSessions = getOverlappingSessions(
    formData.day,
    formData.startTime,
    formData.endTime,
    timeslots,
    editingTimeslot?.id
  );

  // Handlers
  const handleOpenAdd = (defaultDay: DayOfWeek = 'Senin') => {
    setEditingTimeslot(null);
    setFormData({
      id: `ts-${(defaultDay || 'senin').toLowerCase()}-${Date.now()}`,
      day: defaultDay,
      startTime: '07:30',
      endTime: '09:10',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ts: Timeslot) => {
    setEditingTimeslot(ts);
    setFormData({
      id: ts.id,
      day: ts.day,
      startTime: ts.startTime,
      endTime: ts.endTime,
      isActive: ts.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDuplicate = (ts: Timeslot) => {
    const duplicated: Timeslot = {
      ...ts,
      id: `ts-${(ts.day || 'senin').toLowerCase()}-${Date.now()}`,
      label: `${ts.startTime} - ${ts.endTime}`,
    };

    onSaveTimeslot(duplicated);
    showToast('success', 'Sesi Waktu Diduplikasi', `Sesi ${ts.day} ${ts.label} berhasil digandakan.`);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteTimeslot(deleteTarget.id);
    showToast('info', 'Sesi Waktu Dihapus', `Sesi ${deleteTarget.day} (${deleteTarget.label}) telah dihapus.`);
    setDeleteTarget(null);
  };

  const handleConfirmDeactivate = () => {
    if (!deleteTarget) return;
    onToggleTimeslot(deleteTarget.id);
    showToast('info', 'Sesi Waktu Dinonaktifkan', `Sesi ${deleteTarget.day} (${deleteTarget.label}) telah dinonaktifkan.`);
    setDeleteTarget(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (calculatedDuration <= 0) {
      showToast('error', 'Waktu Tidak Valid', 'Jam selesai harus lebih besar daripada jam mulai.');
      return;
    }

    const label = `${formData.startTime} - ${formData.endTime}`;
    const newTimeslot: Timeslot = {
      id: formData.id,
      day: formData.day,
      startTime: formData.startTime,
      endTime: formData.endTime,
      slotIndex: 1, // Will be auto-indexed on save
      durationMinutes: calculatedDuration,
      isActive: formData.isActive,
      label,
    };

    onSaveTimeslot(newTimeslot);
    setIsModalOpen(false);

    showToast(
      'success',
      editingTimeslot ? 'Sesi Waktu Diperbarui' : 'Sesi Waktu Ditambahkan',
      `${formData.day} ${formData.startTime} - ${formData.endTime} (${calculatedDuration} Menit) siap digunakan.`
    );
  };

  // Group timeslots by Day
  const activeDaysWithSlots = ALL_DAYS.filter(day =>
    timeslots.some(ts => ts.day === day)
  );

  const displayedDays =
    selectedDayFilter === 'all'
      ? activeDaysWithSlots.length > 0
        ? activeDaysWithSlots
        : (['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as DayOfWeek[])
      : [selectedDayFilter as DayOfWeek];

  const totalActiveSlots = timeslots.filter(t => t.isActive).length;

  // Check schedule references for delete
  const scheduledTimeslots = deleteTarget
    ? schedule.filter(a => a.timeslotId === deleteTarget.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Manajemen Sesi Waktu Perkuliahan</h2>
            <Badge variant="indigo" size="sm">
              {totalActiveSlots} / {timeslots.length} Sesi Aktif
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola matriks sesi harian (tambah, edit jam mulai/selesai, dan urutan sesi dihitung otomatis per hari)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {permissions.canManageSchedule && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Kembalikan matriks sesi waktu ke template standar Teknik Elektro UNRAM?')) {
                  onResetDefaultTimeslots();
                  showToast('info', 'Sesi Waktu Direset', 'Matriks sesi waktu telah dikembalikan ke template awal.');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Template</span>
            </button>
          )}

          {permissions.canCreate && (
            <button
              type="button"
              onClick={() => handleOpenAdd('Senin')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sesi Waktu</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedDayFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDayFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Semua Hari ({timeslots.length})
          </button>

          {ALL_DAYS.map(day => {
            const count = timeslots.filter(t => t.day === day).length;
            if (count === 0 && day !== 'Senin' && day !== 'Selasa' && day !== 'Rabu' && day !== 'Kamis' && day !== 'Jumat') {
              return null;
            }
            return (
              <button
                key={day}
                onClick={() => setSelectedDayFilter(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  selectedDayFilter === day
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{day}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Klik tombol status untuk mengaktifkan/menonaktifkan sesi
        </div>
      </div>

      {/* Timeslots Grid by Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {displayedDays.map(day => {
          const daySlots = timeslots
            .filter(t => t.day === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          const activeCount = daySlots.filter(s => s.isActive).length;

          return (
            <div
              key={day}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col"
            >
              {/* Day Header */}
              <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{day}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    {activeCount} / {daySlots.length} Aktif
                  </span>
                  {permissions.canCreate && (
                    <button
                      onClick={() => handleOpenAdd(day)}
                      className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
                      title={`Tambah sesi di hari ${day}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Slots List */}
              <div className="p-3 space-y-2 flex-1 divide-y divide-slate-100">
                {daySlots.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <Clock className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="text-xs font-medium">Belum ada sesi untuk {day}</p>
                    {permissions.canCreate && (
                      <button
                        onClick={() => handleOpenAdd(day)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        + Tambah Sesi Baru
                      </button>
                    )}
                  </div>
                ) : (
                  daySlots.map(ts => (
                    <div
                      key={ts.id}
                      className={`pt-2.5 first:pt-0 p-2.5 rounded-xl transition-all border ${
                        ts.isActive
                          ? 'bg-white border-slate-100 hover:border-slate-300 shadow-2xs'
                          : 'bg-slate-50/70 border-dashed border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Clock
                              className={`w-3.5 h-3.5 ${
                                ts.isActive ? 'text-indigo-600' : 'text-slate-400'
                              }`}
                            />
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              {ts.startTime} - {ts.endTime}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {getSessionShortLabel(ts)}
                            </span>
                            <span>•</span>
                            <span>{ts.durationMinutes} Menit</span>
                          </div>
                        </div>

                        {/* Status Toggle Button */}
                        {permissions.canManageSchedule && (
                          <button
                            onClick={() => {
                              onToggleTimeslot(ts.id);
                              showToast(
                                'info',
                                ts.isActive ? 'Sesi Dinonaktifkan' : 'Sesi Diaktifkan',
                                `${ts.day} ${getSessionShortLabel(ts)} (${ts.startTime} - ${ts.endTime}) ${ts.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`
                              );
                            }}
                            className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                              ts.isActive
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                            }`}
                            title={ts.isActive ? 'Klik untuk nonaktifkan sesi' : 'Klik untuk aktifkan sesi'}
                          >
                            {ts.isActive ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-1 text-slate-400">
                        {permissions.canCreate && (
                          <button
                            onClick={() => handleDuplicate(ts)}
                            className="p-1 rounded-md hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Duplikasi Sesi"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions.canEdit && (
                          <button
                            onClick={() => handleOpenEdit(ts)}
                            className="p-1 rounded-md hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Sesi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions.canDelete && (
                          <button
                            onClick={() => setDeleteTarget(ts)}
                            className="p-1 rounded-md hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Sesi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
        onConfirmDeactivate={handleConfirmDeactivate}
        title="Hapus Sesi Waktu Perkuliahan"
        itemName={deleteTarget ? `${deleteTarget.day} (${getSessionShortLabel(deleteTarget)}: ${deleteTarget.startTime} - ${deleteTarget.endTime})` : ''}
        itemType="Sesi Waktu"
        isUsed={scheduledTimeslots.length > 0}
        usedDetails={
          scheduledTimeslots.length > 0
            ? [`Sesi waktu ini saat ini teralokasi pada ${scheduledTimeslots.length} jadwal perkuliahan.`]
            : []
        }
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTimeslot ? 'Edit Sesi Waktu' : 'Tambah Sesi Waktu Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Hari Perkuliahan <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.day}
              onChange={e => setFormData({ ...formData, day: e.target.value as DayOfWeek })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              required
            >
              {ALL_DAYS.map(day => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Selesai <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 items-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Durasi Terhitung:</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {calculatedDuration > 0 ? (
                  <span className="text-emerald-700 font-mono">{calculatedDuration} Menit</span>
                ) : (
                  <span className="text-rose-600 font-medium">Jam tidak valid</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50/80 px-2.5 py-2 rounded-lg border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-medium leading-tight">
                Nomor Sesi diurutkan otomatis dari jam mulai
              </span>
            </div>
          </div>

          {/* Overlap Warning Banner */}
          {overlappingSessions.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Peringatan Tumpang Tindih Sesi</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Rentang waktu bertumpang tindih dengan sesi lain:{' '}
                <span className="font-bold">
                  {overlappingSessions.map(s => `${s.day} ${getSessionShortLabel(s)} (${s.startTime} - ${s.endTime})`).join(', ')}
                </span>
                . Anda tetap dapat menyimpan jika ini disengaja untuk skenario khusus.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveSlot"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActiveSlot" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Aktifkan sesi ini dalam optimasi penjadwalan
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              {editingTimeslot ? 'Simpan Perubahan' : 'Tambah Sesi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
