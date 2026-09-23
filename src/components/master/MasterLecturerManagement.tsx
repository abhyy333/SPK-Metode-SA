import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  Eye,
  FileSpreadsheet,
  ShieldCheck,
  X,
  Upload,
  History,
  RefreshCw,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Info,
  Layers,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { MasterLecturerAssignment, MasterLecturerValidationReport, AcademicPeriod } from '../../types/masterLecturer';
import { MasterLecturerService } from '../../services/masterLecturerService';
import { StorageService } from '../../services/storageService';
import { Modal } from '../ui/Modal';
import { RAW_GANJIL_DATA, RAW_GENAP_DATA } from '../../data/masterLecturerDataset';
import { MasterLecturerImportModal } from './MasterLecturerImportModal';
import { MasterLecturerHistoryModal } from './MasterLecturerHistoryModal';
import { MasterLecturerSyncModal } from './MasterLecturerSyncModal';
import { MasterLecturerManualModal } from './MasterLecturerManualModal';
import { MasterLecturerDeleteAllModal } from './MasterLecturerDeleteAllModal';
import { downloadExcelTemplate } from '../../utils/masterLecturerImportUtils';

interface MasterLecturerManagementProps {
  onNotify?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

export const MasterLecturerManagement: React.FC<MasterLecturerManagementProps> = ({ onNotify }) => {
  const [data, setData] = useState<MasterLecturerAssignment[]>(() => {
    return StorageService.getMasterLecturerAssignments();
  });

  const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | AcademicPeriod>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedMappingStatus, setSelectedMappingStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isRawSourceModalOpen, setIsRawSourceModalOpen] = useState<boolean>(false);
  const [rawSourceTab, setRawSourceTab] = useState<'GANJIL' | 'GENAP'>('GANJIL');
  const [selectedRowDetail, setSelectedRowDetail] = useState<MasterLecturerAssignment | null>(null);

  // Feature Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<MasterLecturerAssignment | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);

  // Single row delete state
  const [deletingRow, setDeletingRow] = useState<MasterLecturerAssignment | null>(null);

  // Current user & role
  const currentUser = useMemo(() => StorageService.getCurrentUser(), []);
  const isAdmin = currentUser?.role === 'admin';

  // Dynamic Validation Report / Stats
  const report: MasterLecturerValidationReport = useMemo(() => {
    return MasterLecturerService.getValidationReport(data);
  }, [data]);

  const refreshData = () => {
    const updated = StorageService.getMasterLecturerAssignments();
    setData([...updated]);
  };

  React.useEffect(() => {
    const handleUpdate = () => {
      refreshData();
    };
    window.addEventListener('master-lecturer-updated', handleUpdate);
    return () => {
      window.removeEventListener('master-lecturer-updated', handleUpdate);
    };
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Period filter
      if (selectedPeriod !== 'ALL' && item.academic_period !== selectedPeriod) {
        return false;
      }

      // Semester filter
      if (selectedSemester !== 'ALL' && item.source_semester !== selectedSemester) {
        return false;
      }

      // Type filter
      if (selectedType === 'PRAKTIKUM' && !item.is_practicum) return false;
      if (selectedType === 'TEORI' && (item.is_practicum || item.is_kkn)) return false;
      if (selectedType === 'KKN' && !item.is_kkn) return false;
      if (selectedType === 'COORDINATOR' && !item.is_coordinator) return false;
      if (selectedType === 'MANUAL' && item.dataSource !== 'manual') return false;

      // Status Mapping filter
      if (selectedMappingStatus === 'MAPPED' && (!item.lecturer_id || !item.course_id)) return false;
      if (selectedMappingStatus === 'LECTURER_UNLINKED' && (item.lecturer_id || item.is_kkn || !item.raw_lecturer_name)) return false;
      if (selectedMappingStatus === 'COURSE_UNLINKED' && item.course_id) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesCourse = item.raw_course_name.toLowerCase().includes(query);
        const matchesLecturer = item.raw_lecturer_name.toLowerCase().includes(query);
        const matchesCode = item.raw_w_code.toLowerCase().includes(query);
        const matchesSection = item.section ? item.section.toLowerCase().includes(query) : false;
        const matchesNo = String(item.raw_no) === query;
        if (!matchesCourse && !matchesLecturer && !matchesCode && !matchesSection && !matchesNo) {
          return false;
        }
      }

      return true;
    });
  }, [data, selectedPeriod, selectedSemester, selectedType, selectedMappingStatus, searchQuery]);

  // Single Row Delete Handler
  const handleConfirmDeleteRow = () => {
    if (!isAdmin) {
      if (onNotify) onNotify('error', 'Akses Ditolak', 'Hanya role Administrator yang dapat menghapus alokasi dosen.');
      return;
    }
    if (!deletingRow) return;

    try {
      StorageService.deleteMasterLecturerAssignment(deletingRow.source_row_id, currentUser);
      refreshData();
      if (onNotify) {
        onNotify('info', 'Alokasi Dihapus', `Baris penugasan "${deletingRow.raw_course_name}" berhasil dihapus.`);
      }
      setDeletingRow(null);
    } catch (err: any) {
      if (onNotify) {
        onNotify('error', 'Gagal Menghapus', err?.message || 'Terjadi kesalahan saat menghapus data.');
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Periode', 'Semester', 'Mata Kuliah', 'Kelas', 'SKS', 'Kode W', 'Dosen Pengampu', 'Koordinator', 'Jenis', 'Sumber Data'];
    const rows = filteredData.map((d) => [
      d.raw_no,
      d.academic_period,
      d.source_semester,
      `"${d.base_course_name || d.raw_course_name}"`,
      d.section || '-',
      d.effective_sks,
      d.raw_w_code,
      `"${d.raw_lecturer_name}"`,
      d.is_coordinator ? 'Ya' : 'Tidak',
      d.is_kkn ? 'LPPM' : d.is_practicum ? 'Praktikum' : 'Teori',
      d.dataSource || 'official_dataset',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Master_Dosen_Pengampu_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                Persistent Master Data Layer
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {data.length} Baris Terdaftar
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Dosen Pengampu Mata Kuliah</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Pusat data penugasan dosen pengampu semester ganjil dan genap Teknik Elektro. Data ini bersifat <strong>Hard Constraint</strong> yang mengunci alokasi dosen pada seluruh modul sistem (Simulated Annealing, Course Offering, Conflict Detection, Timetable, Rekomendasi Swap, dan Ekspor Jadwal).
            </p>
          </div>

          {/* TOOLBAR BUTTONS */}
          <div className="flex items-center flex-wrap gap-2">
            {/* PRIMARY ACTIONS: Import Excel & Input Manual */}
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Import Excel
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingAssignment(null);
                    setIsManualModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  + Input Manual
                </button>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-400 bg-slate-100 rounded-xl border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Input & Import Dosen (Admin Only)
              </div>
            )}

            {/* SECONDARY ACTIONS */}
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Unduh Template Excel (.xlsx) dengan kolom standar"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Download Template
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors shadow-2xs cursor-pointer"
                title="Sinkronkan penugasan dosen master ke Course Offering aktif"
              >
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                Sinkronkan Dosen
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  const res = MasterLecturerService.rebuildTotalMaster('GANJIL');
                  refreshData();
                  if (onNotify) {
                    onNotify(
                      'success',
                      'Master Dosen Direbuild Total',
                      `Berhasil membangun ulang ${res.masterCount} record (${res.ganjilCount} Ganjil, ${res.genapCount} Genap) dan mensinkronkan ${res.syncResult.autoAssignedCount} Course Offering.`
                    );
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
                title="Bangun ulang total Master Dosen Pengampu dari Source of Truth data raw (392 baris) dan sinkronkan ke rombel aktif"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                Rebuild dari Source Asli
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Lihat riwayat batch import & rollback"
            >
              <History className="w-4 h-4 text-slate-600" />
              Riwayat Import
            </button>

            <button
              type="button"
              onClick={() => setIsRawSourceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Lihat data mentah sumber asli tanpa modifikasi"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              Source Asli
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              Ekspor CSV
            </button>

            {/* DESTRUCTIVE: Hapus Semua */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsDeleteAllModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-colors shadow-2xs cursor-pointer ml-auto"
                title="Hapus seluruh master assignment dosen pengampu"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                Hapus Semua
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW (Automatic updates, never hardcoded) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Source Baris</div>
            <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-1.5">
              <span>{data.length}</span>
              <span className="text-xs font-normal text-slate-500">baris</span>
            </div>
          </div>

          <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100">
            <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Semester Ganjil</div>
            <div className="text-xl font-bold text-indigo-900 mt-1 flex items-baseline gap-1.5">
              <span>{data.filter((d) => d.academic_period === 'GANJIL').length}</span>
              <span className="text-xs font-normal text-indigo-600">baris</span>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Semester Genap</div>
            <div className="text-xl font-bold text-blue-900 mt-1 flex items-baseline gap-1.5">
              <span>{data.filter((d) => d.academic_period === 'GENAP').length}</span>
              <span className="text-xs font-normal text-blue-600">baris</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Dosen Pengampu</div>
            <div className="text-xl font-bold text-emerald-900 mt-1 flex items-baseline gap-1.5">
              <span>{report.uniqueLecturersCount}</span>
              <span className="text-xs font-normal text-emerald-600">Nama Unik</span>
            </div>
          </div>

          <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Team Teaching</div>
            <div className="text-xl font-bold text-amber-900 mt-1 flex items-baseline gap-1.5">
              <span>{report.multipleLecturerRowsCount}</span>
              <span className="text-xs font-normal text-amber-600">Alokasi Multi</span>
            </div>
          </div>

          <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-100">
            <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Praktikum / LPPM</div>
            <div className="text-xl font-bold text-purple-900 mt-1 flex items-baseline gap-1.5">
              <span>{report.practicumRowsCount + report.kknRowsCount}</span>
              <span className="text-xs font-normal text-purple-600">({report.practicumRowsCount} Prak / {report.kknRowsCount} KKN)</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Period Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod('ALL');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPeriod === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Periode ({data.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod('GANJIL');
                if (['II', 'IV', 'VI', 'VIII'].includes(selectedSemester)) {
                  setSelectedSemester('ALL');
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPeriod === 'GANJIL' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester Ganjil ({data.filter((d) => d.academic_period === 'GANJIL').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPeriod('GENAP');
                if (['I', 'III', 'V', 'VII'].includes(selectedSemester)) {
                  setSelectedSemester('ALL');
                }
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                selectedPeriod === 'GENAP' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester Genap ({data.filter((d) => d.academic_period === 'GENAP').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari mata kuliah, nama dosen, kode W, kelas, atau nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Semester */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Semester:</span>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">
                {selectedPeriod === 'GANJIL'
                  ? 'Semua Ganjil (I, III, V, VII)'
                  : selectedPeriod === 'GENAP'
                  ? 'Semua Genap (II, IV, VI, VIII)'
                  : 'Semua Semester (I - VIII)'}
              </option>
              {(selectedPeriod === 'ALL' || selectedPeriod === 'GANJIL') && (
                <>
                  <option value="I">Semester I</option>
                  <option value="III">Semester III</option>
                  <option value="V">Semester V</option>
                  <option value="VII">Semester VII</option>
                </>
              )}
              {(selectedPeriod === 'ALL' || selectedPeriod === 'GENAP') && (
                <>
                  <option value="II">Semester II</option>
                  <option value="IV">Semester IV</option>
                  <option value="VI">Semester VI</option>
                  <option value="VIII">Semester VIII</option>
                </>
              )}
            </select>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Kategori:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="TEORI">Mata Kuliah Teori</option>
              <option value="PRAKTIKUM">Praktikum (Laboratorium)</option>
              <option value="KKN">KKN (LPPM)</option>
              <option value="COORDINATOR">Memiliki Koordinator</option>
              <option value="MANUAL">Input Manual</option>
            </select>
          </div>

          {/* Status Mapping */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Status Link:</span>
            <select
              value={selectedMappingStatus}
              onChange={(e) => setSelectedMappingStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Status Link</option>
              <option value="MAPPED">Terhubung Penuh (Dosen & MK)</option>
              <option value="LECTURER_UNLINKED">Dosen Belum Terhubung</option>
              <option value="COURSE_UNLINKED">MK Belum Terhubung</option>
            </select>
          </div>

          <div className="ml-auto text-slate-500 font-medium">
            Menampilkan <strong>{filteredData.length}</strong> dari <strong>{data.length}</strong> baris
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3 w-14 text-center">No</th>
                <th className="py-3.5 px-3 w-24">Periode</th>
                <th className="py-3.5 px-3 w-16 text-center">Sem</th>
                <th className="py-3.5 px-3 w-20 text-center">Kode W</th>
                <th className="py-3.5 px-4 min-w-[220px]">Mata Kuliah</th>
                <th className="py-3.5 px-3 w-16 text-center">SKS</th>
                <th className="py-3.5 px-4 min-w-[260px]">Dosen Pengampu</th>
                <th className="py-3.5 px-3 w-36">Kategori & Sumber</th>
                <th className="py-3.5 px-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    {data.length === 0
                      ? 'Belum ada data Master Dosen Pengampu. Klik "+ Input Manual" atau "Import Excel" untuk menambahkan data.'
                      : 'Tidak ada data master dosen yang cocok dengan kriteria filter.'}
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const isGanjil = row.academic_period === 'GANJIL';
                  return (
                    <tr
                      key={row.source_row_id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedRowDetail(row)}
                    >
                      {/* No */}
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {row.raw_no}
                      </td>

                      {/* Periode */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            isGanjil ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {row.academic_period}
                        </span>
                      </td>

                      {/* Semester */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-800 font-mono">{row.source_semester}</span>
                        <div className="text-[10px] text-slate-400">Sem {row.semester_num}</div>
                      </td>

                      {/* Kode W */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-medium">
                          {row.raw_w_code}
                        </span>
                      </td>

                      {/* Mata Kuliah */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{row.base_course_name}</span>
                          {row.section && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Kelas {row.section}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {row.raw_course_name}
                        </div>
                      </td>

                      {/* SKS */}
                      <td className="py-3 px-3 text-center font-mono">
                        <div className="font-bold text-slate-800">{row.effective_sks}</div>
                        {row.raw_sks !== String(row.effective_sks) && (
                          <div className="text-[9px] text-slate-400 font-mono">({row.raw_sks})</div>
                        )}
                      </td>

                      {/* Dosen Pengampu */}
                      <td className="py-3 px-4">
                        {row.raw_lecturer_name ? (
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-[10px] shrink-0 mt-0.5">
                              {row.normalized_lecturer_name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 leading-tight">
                                {row.normalized_lecturer_name}
                              </div>
                              {row.is_coordinator && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  Koordinator MK
                                </span>
                              )}
                              {!row.lecturer_id && (
                                <span className="inline-block mt-0.5 ml-1 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  Belum Link Master
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum Ditentukan / LPPM</span>
                        )}
                      </td>

                      {/* Kategori & Status */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {row.is_kkn ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              Dikelola LPPM
                            </span>
                          ) : row.is_practicum ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Praktikum Lab
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              Terjadwal
                            </span>
                          )}
                          {row.dataSource === 'manual' && (
                            <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-tight">
                              ✎ Input Manual
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions: Edit & Hapus (Admin) & Detail */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {isAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAssignment(row);
                                  setIsManualModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                title="Edit Alokasi Dosen"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingRow(row)}
                                className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Baris Alokasi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setSelectedRowDetail(row)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: INPUT MANUAL / EDIT */}
      {isManualModalOpen && (
        <MasterLecturerManualModal
          isOpen={isManualModalOpen}
          onClose={() => {
            setIsManualModalOpen(false);
            setEditingAssignment(null);
          }}
          editingAssignment={editingAssignment}
          allAssignments={data}
          onSaveSuccess={(msg) => {
            refreshData();
            if (onNotify) {
              onNotify('success', 'Master Dosen Diperbarui', msg);
            }
          }}
        />
      )}

      {/* MODAL: HAPUS SEMUA MASTER DOSEN */}
      {isDeleteAllModalOpen && (
        <MasterLecturerDeleteAllModal
          isOpen={isDeleteAllModalOpen}
          onClose={() => setIsDeleteAllModalOpen(false)}
          totalRows={data.length}
          onDeleteSuccess={(msg) => {
            refreshData();
            if (onNotify) {
              onNotify('info', 'Master Dosen Dikosongkan', msg);
            }
          }}
        />
      )}

      {/* MODAL: SINGLE ROW DELETE CONFIRMATION */}
      {deletingRow && (
        <Modal
          isOpen={Boolean(deletingRow)}
          onClose={() => setDeletingRow(null)}
          title="Konfirmasi Hapus Penugasan Dosen"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                Apakah Anda yakin ingin menghapus alokasi dosen berikut?
                <div className="mt-2 font-bold text-rose-950 font-mono">
                  {deletingRow.raw_course_name}
                </div>
                <div className="text-slate-600 mt-1">
                  Dosen: <strong>{deletingRow.raw_lecturer_name || 'LPPM'}</strong> ({deletingRow.academic_period}, Semester {deletingRow.source_semester})
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRow(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRow}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: IMPORT EXCEL */}
      {isImportModalOpen && (
        <MasterLecturerImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(msg) => {
            refreshData();
            if (onNotify) {
              onNotify('success', 'Import Sukses', msg);
            }
          }}
          onOpenSyncOfferings={() => {
            setIsSyncModalOpen(true);
          }}
        />
      )}

      {/* MODAL: RIWAYAT IMPORT & ROLLBACK */}
      {isHistoryModalOpen && (
        <MasterLecturerHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          onBatchRollback={(msg) => {
            refreshData();
            if (onNotify) {
              onNotify('info', 'Batch Rollback Berhasil', msg);
            }
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* MODAL: SYNC TO COURSE OFFERINGS */}
      {isSyncModalOpen && (
        <MasterLecturerSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onSyncSuccess={(msg) => {
            if (onNotify) {
              onNotify('success', 'Sinkronisasi Dosen Berhasil', msg);
            }
          }}
          defaultPeriod={selectedPeriod !== 'ALL' ? selectedPeriod : 'GANJIL'}
        />
      )}

      {/* MODAL: LIHAT RAW SOURCE VERBATIM (392 BARIS) */}
      <Modal
        isOpen={isRawSourceModalOpen}
        onClose={() => setIsRawSourceModalOpen(false)}
        title="Raw Source Verbatim Data (Official Dataset Reference)"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Ketentuan Integritas Data:</strong> Data mentah di bawah ini disimpan persis verbatim sesuai input master dari Jurusan Teknik Elektro Universitas Mataram (183 Baris Ganjil + 209 Baris Genap).
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setRawSourceTab('GANJIL')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                rawSourceTab === 'GANJIL' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semester Ganjil (183 Baris Verbatim)
            </button>
            <button
              type="button"
              onClick={() => setRawSourceTab('GENAP')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                rawSourceTab === 'GENAP' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semester Genap (209 Baris Verbatim)
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-12 text-center">No</th>
                  <th className="p-2.5 min-w-[200px]">Course (Mata Kuliah)</th>
                  <th className="p-2.5 w-16 text-center">SKS</th>
                  <th className="p-2.5 w-16 text-center">W-Code</th>
                  <th className="p-2.5 w-16 text-center">Sem</th>
                  <th className="p-2.5 min-w-[240px]">Lecturer (Dosen Pengampu)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {(rawSourceTab === 'GANJIL' ? RAW_GANJIL_DATA : RAW_GENAP_DATA).map((item) => (
                  <tr key={item.no} className="hover:bg-slate-50">
                    <td className="p-2 text-center text-slate-500">{item.no}</td>
                    <td className="p-2 font-medium text-slate-900">{item.course}</td>
                    <td className="p-2 text-center text-slate-700">{item.sks}</td>
                    <td className="p-2 text-center text-slate-700">{item.wCode}</td>
                    <td className="p-2 text-center text-slate-700">{item.semester}</td>
                    <td className="p-2 text-slate-900 font-sans">{item.lecturer || <span className="text-slate-400 italic font-mono">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* MODAL: DETAIL BARIS DATA */}
      {selectedRowDetail && (
        <Modal
          isOpen={Boolean(selectedRowDetail)}
          onClose={() => setSelectedRowDetail(null)}
          title={`Detail Penugasan: ${selectedRowDetail.raw_course_name}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 font-medium">Periode Akademik:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedRowDetail.academic_period}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Nomor Baris Asli:</span>
                  <div className="font-bold text-slate-900 mt-0.5">Baris #{selectedRowDetail.raw_no}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Semester:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedRowDetail.source_semester} (Semester {selectedRowDetail.semester_num})</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Kode W:</span>
                  <div className="font-bold text-slate-900 mt-0.5 font-mono">{selectedRowDetail.raw_w_code}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">SKS Sumber / Efektif:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedRowDetail.raw_sks} / {selectedRowDetail.effective_sks} SKS</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Kelas / Section:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedRowDetail.section || 'Tunggal'}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Sumber Data:</span>
                  <div className="font-bold text-indigo-700 mt-0.5 uppercase tracking-wide">
                    {selectedRowDetail.dataSource || 'official_dataset'}
                  </div>
                </div>
                {selectedRowDetail.createdAt && (
                  <div>
                    <span className="text-slate-500 font-medium">Dibuat Pada:</span>
                    <div className="font-bold text-slate-700 mt-0.5">
                      {new Date(selectedRowDetail.createdAt).toLocaleString('id-ID')}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1 text-xs">
              <div className="text-indigo-700 font-bold uppercase tracking-wider">Dosen Pengampu Resmi:</div>
              <div className="text-sm font-bold text-indigo-950">
                {selectedRowDetail.raw_lecturer_name || 'Tidak Ada (Dikelola LPPM)'}
              </div>
              {selectedRowDetail.is_coordinator && (
                <div className="text-purple-700 font-semibold">★ Bertindak sebagai Koordinator Mata Kuliah</div>
              )}
            </div>

            <div className="text-slate-500 text-[11px] space-y-1">
              <div>• Data ini berlaku sebagai <strong>Hard Constraint</strong> pada Simulated Annealing.</div>
              <div>• Dosen tidak dapat diganti secara acak oleh algoritma optimasi.</div>
            </div>

            {/* Action buttons inside detail */}
            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    const row = selectedRowDetail;
                    setSelectedRowDetail(null);
                    setEditingAssignment(row);
                    setIsManualModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Data Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const row = selectedRowDetail;
                    setSelectedRowDetail(null);
                    setDeletingRow(row);
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
