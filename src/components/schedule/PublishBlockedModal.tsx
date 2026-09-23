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
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-3 text-rose-950">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-xs text-rose-900">
              Penerbitan Jadwal Ditolak
            </p>
            <p className="text-[11px] text-rose-800 leading-relaxed">
              Jadwal perkuliahan tidak dapat diterbitkan selama masih terdapat <strong>{report.hardConflictCount} Hard Conflict</strong>. Standar operasional akademik mewajibkan zero hard conflict demi mencegah bentrokan ruang kuliah dan jadwal mengajar dosen di kampus.
            </p>
          </div>
        </div>

        {/* Conflict Categories Breakdown Badges */}
        <div>
          <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Ringkasan Konflik Wajib Diselesaikan:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {report.summaryCategories.map((cat, idx) => {
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-md bg-white border border-rose-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-xs font-medium text-slate-800">
                      {cat.label}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono">
                    {cat.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Soft Constraint Notification Note */}
        {report.softPenaltyCount > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2 text-amber-950 text-xs">
            <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px]">
              <span className="font-semibold text-amber-900">Catatan Soft Constraint: </span>
              <span className="text-amber-800">
                Terdapat <strong>{report.softPenaltyCount} Soft Penalty</strong> (preferensi waktu dosen / sebaran jadwal). Soft penalty tidak memblokir penerbitan jadwal, namun hard conflict wajib bernilai 0.
              </span>
            </div>
          </div>
        )}

        {/* Detailed Conflicts Preview (Max 5 items) */}
        {report.details.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Daftar Pelanggaran Terdeteksi:
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {report.details.slice(0, 8).map((detail, i) => (
                <div
                  key={detail.id || i}
                  className="p-2 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{detail.title}</div>
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
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              onClose();
              onViewConflicts();
            }}
            id="btn-modal-view-conflicts"
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Periksa Bentrok</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
