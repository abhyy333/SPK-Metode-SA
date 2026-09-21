import React, { useState } from 'react';
import { ExamVersion, ExamType } from '../../types';
import { Modal } from '../ui/Modal';
import { History, RotateCcw, Calendar, CheckCircle, Tag, Eye } from 'lucide-react';

interface ExamHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: ExamVersion[];
  examType: ExamType;
  academicYear: string;
  academicTerm: string;
  onRestoreVersion: (version: ExamVersion) => void;
}

export const ExamHistoryModal: React.FC<ExamHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  examType,
  academicYear,
  academicTerm,
  onRestoreVersion,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<ExamVersion | null>(null);

  const handleRestore = (version: ExamVersion) => {
    if (confirm(`Pulihkan jadwal ke versi "${version.versionName}"? Jadwal saat ini akan digantikan dengan data versi ini.`)) {
      onRestoreVersion(version);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Riwayat & Versi Jadwal Ujian (${examType})`}
      subtitle={`${academicYear} ${academicTerm} • Kelola dan pulihkan snapshot versi jadwal ujian`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {versions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">Belum ada versi tersimpan untuk {examType}.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Versi akan otomatis dibuat saat Anda menerbitkan jadwal atau membuat snapshot secara manual.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((ver) => (
              <div
                key={ver.id}
                className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-xs transition-all space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                        ver.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {ver.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{ver.versionName}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(ver.createdAt).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Total Mata Kuliah:</span>
                    <span className="font-semibold text-slate-700">{ver.summary?.totalExams || ver.offerings.length} Ujian</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Terjadwal:</span>
                    <span className="font-semibold text-emerald-600">
                      {ver.summary?.scheduledExams || ver.offerings.filter(o => o.examDate).length} Terplot
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Peserta:</span>
                    <span className="font-semibold text-slate-700">
                      {ver.summary?.totalStudents || ver.offerings.reduce((s, o) => s + (o.studentCount || 0), 0)} Mhs
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Dibuat Oleh:</span>
                    <span className="font-semibold text-slate-700">{ver.createdBy || 'Admin'}</span>
                  </div>
                </div>

                {ver.notes && (
                  <p className="text-[11px] text-slate-600 bg-indigo-50/40 p-2 rounded-lg border border-indigo-100/50">
                    <strong className="text-indigo-950">Catatan: </strong>
                    {ver.notes}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedVersion(selectedVersion?.id === ver.id ? null : ver)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {selectedVersion?.id === ver.id ? 'Tutup Rincian' : 'Lihat Rincian Penjadwalan'}
                  </button>

                  <button
                    onClick={() => handleRestore(ver)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Pulihkan Versi Ini
                  </button>
                </div>

                {selectedVersion?.id === ver.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Daftar Ujian Versi Ini ({ver.offerings.length})
                    </h5>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {ver.offerings.map((off, idx) => (
                        <div
                          key={off.id || idx}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{off.courseName}</span>{' '}
                            <span className="text-slate-500 font-mono">({off.sectionName || 'Utama'})</span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {off.examDate || 'Belum ada tanggal'} • {off.studentCount} Mahasiswa
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-indigo-600 font-mono">
                            {off.roomIds?.length ? `Ruang: ${off.roomIds.join(', ')}` : 'Belum ada ruang'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
