import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { StorageService } from '../../services/storageService';

interface MasterLecturerDeleteAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: (message: string) => void;
  totalRows: number;
}

export const MasterLecturerDeleteAllModal: React.FC<MasterLecturerDeleteAllModalProps> = ({
  isOpen,
  onClose,
  onDeleteSuccess,
  totalRows,
}) => {
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const isConfirmed = confirmationInput.trim() === 'HAPUS SEMUA';

  const handleExecuteDelete = () => {
    if (!isConfirmed) {
      setErrorMsg('Ketik "HAPUS SEMUA" persis dengan huruf kapital untuk mengonfirmasi.');
      return;
    }

    try {
      const currentUser = StorageService.getCurrentUser();
      StorageService.clearMasterLecturerAssignments(currentUser);
      onDeleteSuccess('Master Dosen Pengampu telah dikosongkan. Jadwal existing tetap dipertahankan.');
      setConfirmationInput('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus data master dosen.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setConfirmationInput('');
        setErrorMsg('');
        onClose();
      }}
      title="Hapus seluruh data Master Dosen Pengampu?"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Warning Card */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 text-xs text-rose-900">
            <div className="font-bold text-sm text-rose-950">
              Peringatan Tindakan Destruktif ({totalRows} Baris Alokasi)
            </div>
            <p className="leading-relaxed">
              Seluruh assignment dosen pengampu, baik hasil <strong>Import Excel</strong> maupun <strong>Input Manual</strong>, akan dihapus dari data master.
            </p>
            <div className="p-2 bg-white/70 rounded-lg border border-rose-200 text-[11px] text-slate-700 font-medium space-y-0.5">
              <div>✓ Data <strong>Master Dosen</strong> tidak akan dihapus.</div>
              <div>✓ Data <strong>Master Mata Kuliah</strong> tidak akan dihapus.</div>
              <div>✓ Kurikulum, Ruangan, Sesi, dan Jadwal Existing <strong>tetap dipertahankan</strong>.</div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-100 text-rose-800 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* Double Confirmation Input */}
        <div className="space-y-2 pt-1">
          <label className="block text-xs font-semibold text-slate-700">
            Ketik <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">HAPUS SEMUA</span> di bawah untuk mengaktifkan tombol:
          </label>
          <input
            type="text"
            placeholder="Ketik HAPUS SEMUA"
            value={confirmationInput}
            onChange={(e) => {
              setConfirmationInput(e.target.value);
              setErrorMsg('');
            }}
            className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-rose-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono placeholder:font-sans placeholder:font-normal"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={() => {
              setConfirmationInput('');
              setErrorMsg('');
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!isConfirmed}
            onClick={handleExecuteDelete}
            className={`px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 transition-all shadow-xs ${
              isConfirmed
                ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer shadow-rose-600/20'
                : 'bg-rose-300 cursor-not-allowed opacity-60'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Semua</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
