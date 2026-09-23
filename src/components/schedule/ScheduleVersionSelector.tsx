import React, { useState } from 'react';
import { Layers, AlertCircle, Check, Send } from 'lucide-react';
import { ScheduleVersion, ExamVersion } from '../../types';
import { StorageService } from '../../services/storageService';
import { Modal } from '../ui/Modal';

export interface VersionOption {
  id: string;
  name: string;
  versionNumber: number;
  status: 'Draft' | 'Diterbitkan' | 'Digantikan';
  createdAt?: string;
  publishedAt?: string;
  publishedBy?: string;
  notes?: string;
  summaryText?: string;
}

interface ScheduleVersionSelectorProps {
  scheduleType: 'perkuliahan' | 'UTS' | 'UAS';
  versions: VersionOption[];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
  onPublishVersion: (versionId: string) => void;
  canManage: boolean;
  className?: string;
}

export const ScheduleVersionSelector: React.FC<ScheduleVersionSelectorProps> = ({
  scheduleType,
  versions,
  selectedVersionId,
  onSelectVersion,
  onPublishVersion,
  canManage,
  className = '',
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [versionToPublish, setVersionToPublish] = useState<VersionOption | null>(null);

  const currentVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];
  const publishedVersion = versions.find((v) => v.status === 'Diterbitkan');
  const isViewingArchivedOrDraft = currentVersion && currentVersion.status !== 'Diterbitkan';

  const handleOpenPublish = (version: VersionOption) => {
    setVersionToPublish(version);
    setIsConfirmOpen(true);
  };

  const handleConfirmPublish = () => {
    if (versionToPublish) {
      onPublishVersion(versionToPublish.id);
    }
    setIsConfirmOpen(false);
    setVersionToPublish(null);
  };

  const typeLabel =
    scheduleType === 'perkuliahan'
      ? 'Jadwal Perkuliahan'
      : scheduleType === 'UTS'
      ? 'Jadwal UTS'
      : 'Jadwal UAS';

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Version Selector Row */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Versi:</span>
        </div>

        {/* Compact Select Dropdown */}
        <select
          id={`select-version-${scheduleType}`}
          value={selectedVersionId}
          onChange={(e) => onSelectVersion(e.target.value)}
          className="bg-white border border-slate-300 rounded px-2.5 py-1 font-mono font-medium text-slate-800 text-xs focus:border-slate-500 focus:outline-hidden cursor-pointer"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.status} {v.publishedAt ? `(${new Date(v.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })})` : ''}
            </option>
          ))}
        </select>

        {/* Status Badge */}
        {currentVersion && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
              currentVersion.status === 'Diterbitkan'
                ? 'bg-slate-100 text-slate-800 border border-slate-300'
                : currentVersion.status === 'Draft'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentVersion.status === 'Diterbitkan'
                  ? 'bg-slate-700'
                  : currentVersion.status === 'Draft'
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
            />
            {currentVersion.status}
          </span>
        )}

        {/* Publish Button if not published */}
        {canManage && isViewingArchivedOrDraft && currentVersion && (
          <button
            type="button"
            id="btn-publish-current-version"
            onClick={() => handleOpenPublish(currentVersion)}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors cursor-pointer"
          >
            <Send className="w-3 h-3" />
            <span>Terbitkan Jadwal Ini</span>
          </button>
        )}
      </div>

      {/* Light notification when viewing archived or draft version */}
      {isViewingArchivedOrDraft && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-amber-200 bg-amber-50/70 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p>
              {currentVersion?.status === 'Digantikan' ? (
                <span>
                  Versi arsip (bukan jadwal resmi yang sedang aktif).{' '}
                  {publishedVersion && (
                    <span className="font-semibold text-amber-950 font-mono">
                      (Versi aktif: {publishedVersion.name})
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  Versi draf kerja internal, belum dipublikasikan untuk umum.
                </span>
              )}
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenPublish(currentVersion!)}
              className="text-[11px] font-medium text-amber-900 underline hover:text-amber-950 shrink-0 ml-2 cursor-pointer"
            >
              Jadikan Jadwal Aktif
            </button>
          )}
        </div>
      )}

      {/* Confirmation Dialog matching Requirement #21 */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title={`Terbitkan ${versionToPublish?.name || 'Versi Ini'}?`}
      >
        <div className="space-y-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
            <p className="font-medium text-slate-800">
              <span className="font-bold text-slate-900 font-mono">{versionToPublish?.name}</span> akan menggantikan{' '}
              <span className="font-medium text-slate-700 font-mono">
                {publishedVersion ? publishedVersion.name : 'jadwal aktif saat ini'}
              </span>{' '}
              sebagai jadwal resmi yang diterbitkan untuk civitas akademika.
            </p>
            <p className="text-[11px] text-slate-500">
              Versi sebelumnya tidak akan dihapus dan tetap tersimpan dalam riwayat dengan status <span className="font-medium">Digantikan</span>.
            </p>
          </div>

          <div className="space-y-1 text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono text-[11px]">
            <p className="font-semibold text-slate-700">Ketentuan Publikasi:</p>
            <p>• Dosen dan mahasiswa akan langsung melihat {versionToPublish?.name}.</p>
            <p>• Status jadwal {typeLabel} diperbarui menjadi Diterbitkan.</p>
            <p>• Jejak audit mencatat administrator dan waktu terbit.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-publish"
              onClick={() => setIsConfirmOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-confirm-publish"
              onClick={handleConfirmPublish}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              Terbitkan Jadwal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
