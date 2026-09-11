import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  X,
} from 'lucide-react';
import { Lecturer, DayOfWeek, TimePreference, Course, RolePermissions } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { useToast } from '../components/ui/Toast';

interface LecturersPageProps {
  lecturers: Lecturer[];
  courses?: Course[];
  permissions?: RolePermissions;
  onSaveLecturer: (lecturer: Lecturer) => void;
  onDeleteLecturer: (id: string) => void;
}

const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

export const LecturersPage: React.FC<LecturersPageProps> = ({
  lecturers,
  courses = [],
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onSaveLecturer,
  onDeleteLecturer,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPreference, setSelectedPreference] = useState<string>('all');
  const [onlyWarnings, setOnlyWarnings] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Lecturer | null>(null);

  // Form states
  const [code, setCode] = useState('');
  const [nip, setNip] = useState('');
  const [name, setName] = useState('');
  const [expertise, setExpertise] = useState('');
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
  const [timePreference, setTimePreference] = useState<TimePreference>('Pagi');
  const [isActive, setIsActive] = useState(true);

  // Stats
  const stats = useMemo(() => {
    const total = lecturers.length;
    const active = lecturers.filter(l => l.isActive).length;
    const withWarning = lecturers.filter(l => l.dataWarning).length;
    return { total, active, withWarning };
  }, [lecturers]);

  const openAddModal = () => {
    setEditingLecturer(null);
    setCode('');
    setNip(`19${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`);
    setName('');
    setExpertise('');
    setAvailableDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
    setTimePreference('Pagi');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (l: Lecturer) => {
    setEditingLecturer(l);
    setCode(l.code || '');
    setNip(l.nip);
    setName(l.name);
    setExpertise(l.expertise);
    setAvailableDays(l.availableDays || []);
    setTimePreference(l.timePreference || 'Fleksibel');
    setIsActive(l.isActive);
    setIsModalOpen(true);
  };

  const toggleDay = (day: DayOfWeek) => {
    if (availableDays.includes(day)) {
      if (availableDays.length === 1) {
        showToast('warning', 'Minimal 1 Hari', 'Dosen harus memiliki minimal 1 hari ketersediaan.');
        return;
      }
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || availableDays.length === 0) {
      showToast('warning', 'Data Belum Lengkap', 'Nama, Kode Dosen, dan hari ketersediaan wajib diisi.');
      return;
    }

    const trimmedCode = code.trim().toUpperCase();

    // Check duplicate code if adding
    if (!editingLecturer && lecturers.some(l => l.code === trimmedCode)) {
      showToast('error', 'Kode Duplikat', `Kode Dosen ${trimmedCode} sudah digunakan oleh dosen lain.`);
      return;
    }

    // Check same name duplicate warning
    const otherSameName = lecturers.filter(
      l => l.name.toLowerCase() === name.trim().toLowerCase() && l.id !== editingLecturer?.id
    );

    let dataWarning = editingLecturer?.dataWarning;
    let warningReason = editingLecturer?.warningReason;

    if (otherSameName.length > 0) {
      dataWarning = true;
      warningReason = `Nama dosen sama dengan record lain (${otherSameName.map(o => o.code).join(', ')}), tetapi kode dosen berbeda.`;
    }

    const lecturerData: Lecturer = {
      id: editingLecturer ? editingLecturer.id : `lec-${trimmedCode.toLowerCase()}-${Date.now()}`,
      code: trimmedCode,
      nip: nip.trim() || `198001012005011001`,
      name: name.trim(),
      expertise: expertise.trim() || 'Teknik Elektro',
      availableDays,
      timePreference,
      isActive,
      dataWarning,
      warningReason,
      unavailableSlotIds: editingLecturer?.unavailableSlotIds || [],
      preferences: editingLecturer?.preferences,
    };

    onSaveLecturer(lecturerData);
    showToast(
      'success',
      editingLecturer ? 'Data Dosen Diperbarui' : 'Dosen Ditambahkan',
      `${lecturerData.name} (${lecturerData.code}) berhasil disimpan.`
    );
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteLecturer(deleteTarget.id);
    showToast('info', 'Dosen Dihapus', `${deleteTarget.name} telah berhasil dihapus dari sistem.`);
    setDeleteTarget(null);
  };

  const handleConfirmDeactivate = () => {
    if (!deleteTarget) return;
    const deactivated: Lecturer = {
      ...deleteTarget,
      isActive: false,
    };
    onSaveLecturer(deactivated);
    showToast('info', 'Status Dosen Dinonaktifkan', `${deleteTarget.name} telah dinonaktifkan.`);
    setDeleteTarget(null);
  };

  const filteredLecturers = useMemo(() => {
    return lecturers.filter(l => {
      const q = (searchTerm || '').toLowerCase();
      const matchSearch =
        (l.name || '').toLowerCase().includes(q) ||
        (l.code || '').toLowerCase().includes(q) ||
        (l.expertise || '').toLowerCase().includes(q) ||
        (l.nip || '').includes(searchTerm || '');

      const matchPref =
        selectedPreference === 'all' || l.timePreference === selectedPreference;

      const matchWarning = !onlyWarnings || !!l.dataWarning;

      return matchSearch && matchPref && matchWarning;
    });
  }, [lecturers, searchTerm, selectedPreference, onlyWarnings]);

  // Dependent courses
  const taughtCourses = deleteTarget
    ? courses.filter(c => c.lecturerId === deleteTarget.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Data Master Dosen Pengampu
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Total {stats.total} Dosen Jurusan Teknik Elektro dengan Kode Unik
            </p>
          </div>
        </div>

        {permissions.canCreate && (
          <button
            onClick={openAddModal}
            id="btn-add-lecturer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Dosen</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Dosen Terdaftar
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">52 Tenaga Pendidik & Pengampu</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Dosen Aktif Mengajar
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{stats.active}</div>
          <p className="text-[11px] text-emerald-600 mt-0.5">Tersedia untuk penjadwalan</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Perlu Verifikasi
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{stats.withWarning}</div>
          <p className="text-[11px] text-amber-600 mt-0.5">Nama sama beda kode (MSA & SUM)</p>
        </div>
      </div>

      {/* Warning notice if exists */}
      {stats.withWarning > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>Perhatian: Ditemukan {stats.withWarning} Record Dosen Perlu Verifikasi</span>
              <button
                onClick={() => setOnlyWarnings(!onlyWarnings)}
                className="text-xs px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 font-semibold transition-colors"
              >
                {onlyWarnings ? 'Tampilkan Semua Dosen' : 'Filter Dosen dengan Warning'}
              </button>
            </div>
            <p className="text-amber-800 text-xs">
              Nama dosen <strong>Maulida Septiyana, S.Si., M.Si.</strong> muncul dengan dua kode berbeda (<strong>MSA</strong> dan <strong>SUM</strong>). Sistem mempertahankan keduanya sebagai record mandiri dengan kode unik masing-masing.
            </p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            id="input-search-lecturer"
            placeholder="Cari Kode Dosen (misal: SNR, YUKI), Nama, atau NIP..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedPreference}
            onChange={e => setSelectedPreference(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Preferensi Waktu</option>
            <option value="Pagi">Pagi</option>
            <option value="Siang">Siang</option>
            <option value="Sore">Sore</option>
            <option value="Fleksibel">Fleksibel</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredLecturers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600" id="table-lecturers">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3">Kode Dosen</th>
                  <th className="px-4 py-3">Nama & NIP Dosen</th>
                  <th className="px-4 py-3">Bidang Keahlian</th>
                  <th className="px-4 py-3">Hari Ketersediaan</th>
                  <th className="px-3 py-3">Preferensi Waktu</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLecturers.map((l, idx) => (
                  <tr
                    key={l.id}
                    id={`row-lecturer-${l.code || l.id}`}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      l.dataWarning ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                      {idx + 1}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md text-xs">
                          {l.code || l.id.replace('lec-', '').toUpperCase()}
                        </span>
                        {l.dataWarning && (
                          <span
                            title={l.warningReason || 'Perlu verifikasi admin'}
                            className="text-amber-500 cursor-help"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{l.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">NIP: {l.nip}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {l.expertise}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {ALL_DAYS.map(day => {
                          const isAvail = l.availableDays?.includes(day);
                          return (
                            <span
                              key={day}
                              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                isAvail
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-slate-50 text-slate-300 border border-slate-100 line-through'
                              }`}
                            >
                              {day.substring(0, 3)}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={
                          l.timePreference === 'Pagi'
                            ? 'primary'
                            : l.timePreference === 'Siang'
                            ? 'warning'
                            : l.timePreference === 'Sore'
                            ? 'danger'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {l.timePreference}
                      </Badge>
                    </td>

                    <td className="px-3 py-3.5 whitespace-nowrap">
                      {l.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                          <XCircle className="w-3.5 h-3.5" />
                          Non-Aktif
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {permissions.canEdit && (
                          <button
                            onClick={() => openEditModal(l)}
                            id={`btn-edit-lecturer-${l.code || l.id}`}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Dosen"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {permissions.canDelete && (
                          <button
                            onClick={() => setDeleteTarget(l)}
                            id={`btn-delete-lecturer-${l.code || l.id}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Dosen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada dosen ditemukan</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Coba sesuaikan kata kunci pencarian Anda.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingLecturer ? 'Edit Data Dosen' : 'Tambah Dosen Pengampu'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Dosen (Unik) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: SNR, YUKI"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP Dosen
                  </label>
                  <input
                    type="text"
                    placeholder="18 digit NIP"
                    value={nip}
                    onChange={e => setNip(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bulkis Kanata, ST., MT."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bidang Keahlian
                </label>
                <input
                  type="text"
                  placeholder="Misal: Sistem Tenaga Listrik, Sistem Digital"
                  value={expertise}
                  onChange={e => setExpertise(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Hari Ketersediaan Mengajar
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map(day => {
                    const selected = availableDays.includes(day);
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preferensi Waktu
                  </label>
                  <select
                    value={timePreference}
                    onChange={e => setTimePreference(e.target.value as TimePreference)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Pagi">Pagi (07:30 - 11:00)</option>
                    <option value="Siang">Siang (11:10 - 15:10)</option>
                    <option value="Sore">Sore (15:20 - 17:00)</option>
                    <option value="Fleksibel">Fleksibel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Mengajar
                  </label>
                  <select
                    value={isActive ? 'active' : 'inactive'}
                    onChange={e => setIsActive(e.target.value === 'active')}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  Simpan Dosen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
        onConfirmDeactivate={handleConfirmDeactivate}
        title="Hapus Dosen Pengampu"
        itemName={deleteTarget ? `${deleteTarget.name} (${deleteTarget.code || ''})` : ''}
        itemType="Dosen"
        isUsed={taughtCourses.length > 0}
        usedDetails={
          taughtCourses.length > 0
            ? taughtCourses.map(c => `Mengampu mata kuliah: ${c.code} - ${c.name} (${c.sks} SKS)`)
            : []
        }
      />
    </div>
  );
};
