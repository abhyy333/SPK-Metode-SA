import React from 'react';
import {
  AlertTriangle,
  X,
  Eye,
  ShieldAlert,
  Info,
  Layers,
  Users,
  DoorOpen,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PublishValidationReport } from '../../utils/publishValidation';

interface PublishBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: PublishValidationReport;
  onViewConflicts: () => void;
}

export const PublishBlockedModal: React.FC<PublishBlockedModalProps> = ({
  isOpen,
  onClose,
  report,
  onViewConflicts,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Jadwal Belum Dapat Diterbitkan"
      subtitle="Ditemukan bentrokan kendala utama (Hard Conflict) atau offering yang belum lengkap"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Warning Alert Banner */}
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3.5 text-rose-950">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-rose-900">
              Penerbitan Jadwal Ditolak
            </p>
            <p className="text-xs text-rose-800 leading-relaxed">
              Jadwal perkuliahan tidak dapat diterbitkan selama masih terdapat <strong>{report.hardConflictCount} Hard Conflict</strong>. Standar operasional akademik mewajibkan zero hard conflict demi mencegah bentrokan ruang kuliah dan jadwal mengajar dosen di kampus.
            </p>
          </div>
        </div>

        {/* Conflict Categories Breakdown Badges */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Ringkasan Konflik Wajib Diselesaikan:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {report.summaryCategories.map((cat, idx) => {
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-rose-200 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                    {cat.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Soft Constraint Notification Note */}
        {report.softPenaltyCount > 0 && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-950 text-xs">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900">Catatan Soft Constraint: </span>
              <span className="text-amber-800">
                Terdapat <strong>{report.softPenaltyCount} Soft Penalty</strong> (preferensi waktu dosen / sebaran jadwal). Soft penalty tidak memblokir penerbitan jadwal, namun hanya hard conflict yang wajib bernilai 0.
              </span>
            </div>
          </div>
        )}

        {/* Detailed Conflicts Preview (Max 5 items) */}
        {report.details.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Daftar Pelanggaran Terdeteksi:
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {report.details.slice(0, 8).map((detail, i) => (
                <div
                  key={detail.id || i}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{detail.title}</div>
                    <div className="text-[11px] text-slate-600 leading-normal">{detail.description}</div>
                  </div>
                </div>
              ))}
              {report.details.length > 8 && (
                <p className="text-[11px] text-slate-400 text-center italic py-1">
                  +{report.details.length - 8} konflik lainnya. Klik "Lihat Konflik" untuk rincian lengkap.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions - No "Publish with Warning" allowed! */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onViewConflicts();
            }}
            id="btn-modal-view-conflicts"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Lihat Konflik</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
