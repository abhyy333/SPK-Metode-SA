import React from 'react';
import { Globe, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PublishValidationReport } from '../../utils/publishValidation';

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  report: PublishValidationReport;
  academicYear: string;
  academicTerm: string;
}

export const PublishConfirmModal: React.FC<PublishConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  report,
  academicYear,
  academicTerm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terbitkan Jadwal Perkuliahan Resmi?"
      subtitle="Jadwal akan aktif dan dapat diakses oleh seluruh Dosen dan Mahasiswa"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Success / Ready Banner */}
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-950">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-emerald-900">
              Validasi Lolos (Zero Hard Conflict)
            </p>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Jadwal Semester <strong>{academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'} {academicYear}</strong> telah teruji bebas dari bentrokan dosen, ruangan, dan kendala wajib lainnya.
            </p>
          </div>
        </div>

        {/* Verification metrics card */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-slate-700">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-600">Status Validasi:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
              <CheckCircle2 className="w-3 h-3" />
              Siap Diterbitkan
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-600">Hard Conflict:</span>
            <strong className="text-emerald-700 font-extrabold">0 Hard Conflict</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-600">Soft Penalty:</span>
            <span className="font-semibold text-slate-700">
              {report.softPenaltyCount} Soft Penalty
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-600">Offering Terjadwal:</span>
            <strong className="text-slate-900">
              {report.scheduledOfferings} / {report.totalOfferings} Kelas
            </strong>
          </div>
        </div>

        {report.softPenaltyCount > 0 && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Terdapat {report.softPenaltyCount} soft penalty terkait preferensi waktu dosen atau sebaran jadwal. Hal ini tidak menghambat kelancaran perkuliahan.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            id="btn-modal-confirm-publish"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Terbitkan Jadwal Sekarang</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
