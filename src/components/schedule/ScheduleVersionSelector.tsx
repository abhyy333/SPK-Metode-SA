import React, { useState } from 'react';
import { Layers, CheckCircle2, Archive, AlertCircle, Sparkles, History, Clock } from 'lucide-react';
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
      <div className="flex flex-wrap items-center gap-2.5 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Versi Jadwal:</span>
        </div>

        {/* Compact Select Dropdown */}
        <select
          id={`select-version-${scheduleType}`}
          value={selectedVersionId}
          onChange={(e) => onSelectVersion(e.target.value)}
          className="bg-white border border-slate-300 rounded px-2.5 py-1 font-semibold text-slate-800 text-xs shadow-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer"
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
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
              currentVersion.status === 'Diterbitkan'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : currentVersion.status === 'Draft'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentVersion.status === 'Diterbitkan'
                  ? 'bg-emerald-600'
                  : currentVersion.status === 'Draft'
                  ? 'bg-amber-500'
                  : 'bg-slate-500'
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
            className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Terbitkan Jadwal Ini</span>
          </button>
        )}
      </div>

      {/* Light notification when viewing archived or draft version */}
      {isViewingArchivedOrDraft && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p>
              {currentVersion?.status === 'Digantikan' ? (
                <span>
                  Ini adalah versi arsip dan bukan jadwal yang sedang diterbitkan.{' '}
                  {publishedVersion && (
                    <span className="font-semibold text-amber-950">
                      (Versi aktif saat ini: {publishedVersion.name})
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  Ini adalah versi draf kerja internal dan belum diterbitkan untuk publik civitas akademika.
                </span>
              )}
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenPublish(currentVersion!)}
              className="text-[11px] font-semibold text-amber-900 underline hover:text-amber-950 shrink-0 ml-2"
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
        <div className="space-y-4 text-sm text-slate-600">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <p className="font-medium text-slate-800">
              <span className="font-bold text-emerald-700">{versionToPublish?.name}</span> akan menggantikan{' '}
              <span className="font-semibold text-slate-700">
                {publishedVersion ? publishedVersion.name : 'jadwal aktif saat ini'}
              </span>{' '}
              sebagai jadwal resmi yang diterbitkan untuk civitas akademika.
            </p>
            <p className="text-xs text-slate-500">
              Versi sebelumnya <span className="font-medium">tidak akan dihapus</span> dan tetap tersimpan aman dalam riwayat dengan status <span className="font-medium">Digantikan</span>.
            </p>
          </div>

          <div className="text-xs space-y-1 text-slate-500 bg-emerald-50/50 p-2.5 rounded border border-emerald-100">
            <p className="font-semibold text-emerald-900">Ketentuan Publikasi:</p>
            <p>• Seluruh dosen dan mahasiswa akan langsung melihat {versionToPublish?.name}.</p>
            <p>• Status jadwal {typeLabel} diperbarui menjadi <span className="font-semibold text-emerald-700">Diterbitkan</span>.</p>
            <p>• Waktu publikasi dan akun Administrator akan dicatat dalam jejak audit.</p>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-publish"
              onClick={() => setIsConfirmOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-confirm-publish"
              onClick={handleConfirmPublish}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              Terbitkan Jadwal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
