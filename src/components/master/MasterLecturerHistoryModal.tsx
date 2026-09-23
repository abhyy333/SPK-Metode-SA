import React, { useState } from 'react';
import {
  History,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Layers,
  Trash2,
  Info,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { MasterLecturerImportBatch } from '../../types/masterLecturer';
import { MasterLecturerImportService } from '../../services/masterLecturerImportService';
import { StorageService } from '../../services/storageService';

interface MasterLecturerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchRollback: (message: string) => void;
  isAdmin?: boolean;
}

export const MasterLecturerHistoryModal: React.FC<MasterLecturerHistoryModalProps> = ({
  isOpen,
  onClose,
  onBatchRollback,
  isAdmin = true,
}) => {
  const [batches, setBatches] = useState<MasterLecturerImportBatch[]>(() => {
    return StorageService.getMasterLecturerImportBatches();
  });
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);
  const [confirmRollbackBatch, setConfirmRollbackBatch] = useState<MasterLecturerImportBatch | null>(null);

  const currentUser = StorageService.getCurrentUser();

  const refreshBatches = () => {
    setBatches(StorageService.getMasterLecturerImportBatches());
  };

  const handleOpenConfirm = (batch: MasterLecturerImportBatch) => {
    if (!isAdmin) {
      alert('Hanya role Administrator yang memiliki izin untuk me-rollback batch import.');
      return;
    }
    if (batch.status === 'ROLLED BACK') {
      alert('Batch ini sudah di-rollback sebelumnya.');
      return;
    }
    setConfirmRollbackBatch(batch);
  };

  const executeRollback = () => {
    if (!confirmRollbackBatch) return;

    setIsRollingBack(true);
    try {
      const result = MasterLecturerImportService.rollbackBatch(confirmRollbackBatch.id, currentUser);
      refreshBatches();
      setConfirmRollbackBatch(null);
      onBatchRollback(result.message);
    } catch (err: any) {
      alert(`Gagal me-rollback batch: ${err.message}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Riwayat Batch Import Master Dosen Pengampu"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              Setiap file yang diimport tercatat secara transaksional dengan status dan snapshot. Administrator dapat meninjau rincian setiap baris atau melakukan <strong>Rollback</strong> untuk membatalkan perubahan batch tertentu secara aman.
            </div>
          </div>

          {batches.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-slate-200 rounded-xl bg-white">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Belum Ada Riwayat Import Excel</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Gunakan tombol <strong>[ Import Excel ]</strong> untuk memasukkan data penugasan dosen.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((batch) => {
                const isExpanded = expandedBatchId === batch.id;
                const isRolledBack = batch.status === 'ROLLED BACK';
                const dateStr = new Date(batch.importedAt).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });

                return (
                  <div
                    key={batch.id}
                    className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
                      isRolledBack ? 'border-slate-300 opacity-80 bg-slate-50/50' : 'border-slate-200'
                    }`}
                  >
                    {/* Batch Header */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`p-1.5 rounded-lg border ${
                            isRolledBack ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <FileSpreadsheet className="w-4 h-4" />
                          </span>
                          <span className="text-sm font-bold text-slate-900">{batch.fileName}</span>

                          {/* Status Badge */}
                          {isRolledBack ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                              ROLLED BACK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
                              IMPORTED
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {batch.fileType || 'xlsx'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Mode: {batch.mode === 'append' ? 'Append' : 'Upsert'}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {batch.importedBy}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            {batch.totalRows} Baris
                          </span>
                          {isRolledBack && batch.rolledBackAt && (
                            <span className="text-amber-700 font-medium">
                              (Dibatalkan: {new Date(batch.rolledBackAt).toLocaleDateString('id-ID')})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats Badges & Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <div className="flex items-center gap-1.5 text-xs mr-2">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded">
                            ✓ {batch.successRows}
                          </span>
                          {batch.warningRows > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded">
                              ⚠ {batch.warningRows}
                            </span>
                          )}
                        </div>

                        {isAdmin && !isRolledBack && (
                          <button
                            type="button"
                            onClick={() => handleOpenConfirm(batch)}
                            disabled={isRollingBack}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-sm"
                            title="Kembalikan dataset ke kondisi sebelum file ini diimport"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                            Rollback
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors"
                          title={isExpanded ? 'Tutup Rincian' : 'Lihat Baris Data'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Rows Table */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-3">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Rincian Baris dalam Batch Ini ({batch.rows?.length || 0} baris)
                        </div>
                        <div className="max-h-[35vh] overflow-y-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 sticky top-0 font-bold text-slate-600 uppercase border-b border-slate-200">
                              <tr>
                                <th className="p-2 w-10 text-center">No</th>
                                <th className="p-2 w-16">Periode</th>
                                <th className="p-2 w-12 text-center">Sem</th>
                                <th className="p-2 min-w-[200px]">Mata Kuliah</th>
                                <th className="p-2 w-12 text-center">SKS</th>
                                <th className="p-2 min-w-[240px]">D O S E N (Verbatim)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(batch.rows || []).map((row, idx) => (
                                <tr key={row.source_row_id || idx} className="hover:bg-slate-50">
                                  <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                                  <td className="p-2 font-semibold">{row.academic_period}</td>
                                  <td className="p-2 text-center font-mono">{row.source_semester}</td>
                                  <td className="p-2 font-medium text-slate-900">
                                    {row.raw_course_name}
                                  </td>
                                  <td className="p-2 text-center font-mono">{row.raw_sks}</td>
                                  <td className="p-2 font-medium text-slate-900">
                                    {row.raw_lecturer_name || row.rawLecturerName || <span className="text-slate-400 italic">LPPM / Kosong</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* CONFIRMATION MODAL FOR ROLLBACK */}
      {confirmRollbackBatch && (
        <Modal
          isOpen={true}
          onClose={() => !isRollingBack && setConfirmRollbackBatch(null)}
          title="Rollback import ini?"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-sm text-rose-950">Konfirmasi Pembatalan Batch</div>
                <div>Semua perubahan yang dibuat oleh batch ini akan dibatalkan secara aman.</div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Nama file:</span>
                <span className="font-semibold text-slate-800">{confirmRollbackBatch.fileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Jumlah data:</span>
                <span className="font-semibold text-slate-800">{confirmRollbackBatch.totalRows} baris</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Mode Import:</span>
                <span className="font-semibold text-slate-800">
                  {confirmRollbackBatch.mode === 'append' ? 'Append (Hapus hanya record batch ini)' : 'Upsert (Restore Snapshot)'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Tanggal Import:</span>
                <span className="font-medium text-slate-700">
                  {new Date(confirmRollbackBatch.importedAt).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRollbackBatch(null)}
                disabled={isRollingBack}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeRollback}
                disabled={isRollingBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-lg shadow-sm transition-colors"
              >
                {isRollingBack ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Memproses Rollback...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    Rollback
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
