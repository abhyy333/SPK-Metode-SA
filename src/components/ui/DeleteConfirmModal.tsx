import React, { useState } from 'react';
import { AlertTriangle, Trash2, Ban, X, Loader2, ShieldAlert } from 'lucide-react';
import { Modal } from './Modal';

export interface DeleteDependencyInfo {
  isBlocked: boolean;
  title: string;
  message: string;
  items?: string[];
  canDeactivateInstead?: boolean;
  deactivateLabel?: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void> | void;
  onConfirmDeactivate?: () => Promise<void> | void;
  title?: string;
  entityName?: string;
  entityType?: string;
  details?: { label: string; value: string }[];
  warningMessage?: string;
  dependencyInfo?: DeleteDependencyInfo;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmDelete,
  onConfirmDeactivate,
  title,
  entityName = '',
  entityType = 'Data',
  details = [],
  warningMessage = 'Data yang telah dihapus tidak dapat dipulihkan.',
  dependencyInfo,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const safeType = entityType || 'Data';
  const lowerType = safeType.toLowerCase();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  const handleDeactivate = async () => {
    if (!onConfirmDeactivate) return;
    try {
      setIsDeactivating(true);
      await onConfirmDeactivate();
    } finally {
      setIsDeactivating(false);
      onClose();
    }
  };

  const isBlocked = Boolean(dependencyInfo?.isBlocked);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isDeleting || isDeactivating ? () => {} : onClose}
      title={title || (isBlocked ? `Tidak Dapat Menghapus ${safeType}` : `Hapus ${safeType}?`)}
      subtitle={isBlocked ? 'Peringatan integritas referensi data' : 'Konfirmasi tindakan penghapusan permanen'}
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {/* If Blocked by Reference Dependency */}
        {isBlocked ? (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900">
                  {dependencyInfo?.title || `Tidak dapat menghapus ${lowerType}`}
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {dependencyInfo?.message}
                </p>
              </div>
            </div>

            {dependencyInfo?.items && dependencyInfo.items.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 max-h-40 overflow-y-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Entitas yang masih menggunakan data ini:
                </span>
                <ul className="space-y-1">
                  {dependencyInfo.items.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-slate-500">
              {dependencyInfo?.canDeactivateInstead ? (
                <span>
                  Anda dapat <strong>menonaktifkan</strong> status {lowerType} ini agar tidak dipilih lagi pada jadwal baru tanpa merusak data yang sudah ada.
                </span>
              ) : (
                <span>
                  Silakan hapus atau ubah alokasi data yang terikat terlebih dahulu sebelum menghapus entitas ini.
                </span>
              )}
            </div>

            {/* Blocked Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                id="btn-cancel-blocked-delete"
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batalkan
              </button>
              {dependencyInfo?.canDeactivateInstead && onConfirmDeactivate && (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                  id="btn-confirm-deactivate"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isDeactivating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menonaktifkan...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>{dependencyInfo.deactivateLabel || `Nonaktifkan ${safeType}`}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Normal Delete Confirmation */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-100 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-900">
                  Apakah Anda yakin ingin menghapus {lowerType} ini?
                </p>
                <div className="text-sm font-bold text-rose-700">{entityName}</div>
                <p className="text-[11px] text-rose-600/90 pt-0.5">{warningMessage}</p>
              </div>
            </div>

            {details.length > 0 && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Rincian Data:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {details.map((d, idx) => (
                    <div key={idx}>
                      <span className="text-[10px] text-slate-400 block">{d.label}:</span>
                      <span className="font-semibold text-slate-800 truncate block">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                id="btn-cancel-delete"
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                id="btn-confirm-delete"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
