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
  RefreshCw,
  X,
  ShieldAlert,
  Info,
  Check,
} from 'lucide-react';
import { Lecturer, DayOfWeek, TimePreference, Course, RolePermissions } from '../types';
import { Badge } from '../components/ui/Badge';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { useToast } from '../components/ui/Toast';
import {
  validateLecturersList,
  normalizeLecturerName,
  normalizeNip,
  LecturerDuplicateWarning,
} from '../utils/lecturerValidation';

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
  const [isVerifying, setIsVerifying] = useState(false);

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

  // Purely derived validation report (recalculated reactively whenever lecturers array changes)
  const validationReport = useMemo(() => {
    return validateLecturersList(lecturers);
  }, [lecturers]);

  // Combined stats
  const stats = useMemo(() => {
    const total = lecturers.length;
    const active = lecturers.filter((l) => l.isActive).length;
    const withWarning = validationReport.warningLecturerIds.size;
    return { total, active, withWarning };
  }, [lecturers, validationReport]);

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
    setAvailableDays(l.availableDays || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
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
      setAvailableDays(availableDays.filter((d) => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const handleRunVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const rep = validateLecturersList(lecturers);
      if (rep.totalWarnings === 0) {
        showToast(
          'success',
          'Verifikasi Dosen Valid',
          `Seluruh ${rep.totalLecturers} dosen terverifikasi unik dan bebas duplikasi kode/NIDN.`
        );
      } else {
        showToast(
          'warning',
          'Hasil Verifikasi Dosen',
          `Ditemukan ${rep.totalWarnings} record dosen yang memerlukan pemeriksaan (kode duplikat / nama sama beda kode).`
        );
      }
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || availableDays.length === 0) {
      showToast('warning', 'Data Belum Lengkap', 'Nama, Kode Dosen, dan hari ketersediaan wajib diisi.');
      return;
    }

    const trimmedCode = code.trim().toUpperCase();
    const normalizedNewName = normalizeLecturerName(name);

    // Check duplicate code if adding or renaming to an existing code
    const codeConflict = lecturers.find(
      (l) => (l.code || '').trim().toUpperCase() === trimmedCode && l.id !== editingLecturer?.id
    );

    if (codeConflict) {
      showToast(
        'error',
        'Kode Dosen Duplikat',
        `Kode "${trimmedCode}" sudah dipakai oleh ${codeConflict.name}. Gunakan kode unik lain.`
      );
      return;
    }

    // Check same name warning
    const otherSameName = lecturers.filter(
      (l) => normalizeLecturerName(l.name) === normalizedNewName && l.id !== editingLecturer?.id
    );

    let dataWarning = false;
    let warningReason: string | undefined = undefined;

    if (otherSameName.length > 0) {
      dataWarning = true;
      warningReason = `Nama dosen identik dengan record (${otherSameName.map((o) => o.code).join(', ')}). Dipertahankan sebagai record mandiri.`;
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
    showToast(
      'info',
      'Dosen Berhasil Dihapus',
      `${deleteTarget.name} (${deleteTarget.code || ''}) telah dihapus. Status validasi diperbarui.`
    );
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
    return lecturers.filter((l) => {
      const q = (searchTerm || '').toLowerCase();
      const matchSearch =
        (l.name || '').toLowerCase().includes(q) ||
        (l.code || '').toLowerCase().includes(q) ||
        (l.expertise || '').toLowerCase().includes(q) ||
        (l.nip || '').includes(searchTerm || '');

      const matchPref = selectedPreference === 'all' || l.timePreference === selectedPreference;

      const hasWarn = validationReport.warningLecturerIds.has(l.id) || !!l.dataWarning;
      const matchWarning = !onlyWarnings || hasWarn;

      return matchSearch && matchPref && matchWarning;
    });
  }, [lecturers, searchTerm, selectedPreference, onlyWarnings, validationReport]);

  // Dependent courses
  const taughtCourses = deleteTarget ? courses.filter((c) => c.lecturerId === deleteTarget.id) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Master Data Dosen & Ketersediaan</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola daftar dosen pengampu, kode inisial unik, preferensi waktu, dan validasi duplikasi data
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunVerification}
            id="btn-verify-lecturers"
            disabled={isVerifying}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 border border-slate-200 transition-all shadow-2xs"
            title="Periksa ulang konsistensi data dosen dan hilangkan peringatan yang sudah tidak relevan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>{isVerifying ? 'Memverifikasi...' : 'Verifikasi Ulang Data'}</span>
          </button>

          {permissions.canCreate && (
            <button
              onClick={openAddModal}
              id="btn-add-lecturer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Dosen</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Dosen</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-1">Terdaftar dalam sistem Elektro</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dosen Aktif</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono">{stats.active}</div>
          <p className="text-[11px] text-slate-400 mt-1">Siap dijadwalkan mengajar</p>
        </div>

        <div
          onClick={() => setOnlyWarnings(!onlyWarnings)}
          className={`bg-white rounded-2xl p-4 border cursor-pointer transition-all shadow-2xs ${
            stats.withWarning > 0
              ? onlyWarnings
                ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/20'
                : 'border-amber-200 hover:border-amber-300'
              : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Perlu Verifikasi</span>
            <span
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                stats.withWarning > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <div
            className={`text-2xl font-bold mt-2 font-mono ${
              stats.withWarning > 0 ? 'text-amber-600' : 'text-slate-400'
            }`}
          >
            {stats.withWarning}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.withWarning > 0
              ? onlyWarnings
                ? 'Klik untuk reset filter'
                : 'Klik untuk memfilter record ini'
              : 'Semua record bersih'}
          </p>
        </div>
      </div>

      {/* Dynamic Validation Banner */}
      {validationReport.totalWarnings > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 shadow-2xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Pemberitahuan Audit Data Dosen ({validationReport.totalWarnings} Catatan)
                </h4>
                <button
                  onClick={handleRunVerification}
                  className="text-xs font-semibold text-amber-700 underline hover:text-amber-900 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Perbarui Status
                </button>
              </div>
              <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                Terdapat entri data dosen yang memiliki nama sama namun kode berbeda atau berpotensi duplikasi. Sistem
                secara otomatis memperbarui validasi ini saat data diperbaiki atau dihapus.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {validationReport.warnings.slice(0, 4).map((w, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-300/80 text-[11px] font-medium text-amber-900"
                  >
                    <span className="font-mono font-bold">{w.code}:</span>
                    <span>{w.name}</span>
                    <span className="text-amber-700">({w.title})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kode dosen, NIP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
            onChange={(e) => setSelectedPreference(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Preferensi Waktu</option>
            <option value="Pagi">Pagi (07:30 - 11:00)</option>
            <option value="Siang">Siang (11:10 - 15:10)</option>
            <option value="Sore">Sore (15:20 - 17:00)</option>
            <option value="Fleksibel">Fleksibel</option>
          </select>

          {stats.withWarning > 0 && (
            <button
              onClick={() => setOnlyWarnings(!onlyWarnings)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                onlyWarnings
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {onlyWarnings ? 'Tampilkan Semua' : 'Hanya Peringatan'}
            </button>
          )}
        </div>
      </div>

      {/* Lecturers Table */}
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
                {filteredLecturers.map((l, idx) => {
                  const isWarned = validationReport.warningLecturerIds.has(l.id) || Boolean(l.dataWarning);
                  const matchingWarn = validationReport.warnings.find((w) => w.lecturerId === l.id);

                  return (
                    <tr
                      key={l.id}
                      id={`row-lecturer-${l.code || l.id}`}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isWarned ? 'bg-amber-50/30' : ''
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
                          {isWarned && (
                            <span
                              title={matchingWarn?.details || l.warningReason || 'Perlu verifikasi data'}
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
                        {isWarned && matchingWarn && (
                          <div className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            <span>{matchingWarn.title}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {l.expertise}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {ALL_DAYS.map((day) => {
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
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Tidak ada dosen ditemukan</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter preferensi Anda.
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP / NIDN Dosen
                  </label>
                  <input
                    type="text"
                    placeholder="18 digit NIP / NIDN"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
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
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bidang Keahlian
                </label>
                <input
                  type="text"
                  placeholder="Misal: Sistem Tenaga Listrik, Sistem Digital & Telekomunikasi"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Hari Ketersediaan Mengajar
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((day) => {
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
                    Preferensi Sesi Waktu
                  </label>
                  <select
                    value={timePreference}
                    onChange={(e) => setTimePreference(e.target.value as TimePreference)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Pagi">Pagi (Sesi 1 - 2 / 07:30 - 11:00)</option>
                    <option value="Siang">Siang (Sesi 3 - 4 / 11:10 - 15:10)</option>
                    <option value="Sore">Sore (Sesi 5 / 15:20 - 17:00)</option>
                    <option value="Fleksibel">Fleksibel (Semua Sesi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Mengajar
                  </label>
                  <select
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
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
            ? taughtCourses.map((c) => `Mengampu mata kuliah: ${c.code} - ${c.name} (${c.sks} SKS)`)
            : []
        }
      />
    </div>
  );
};

export default LecturersPage;
