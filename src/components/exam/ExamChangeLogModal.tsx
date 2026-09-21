import React from 'react';
import { ExamChangeLog, ExamType } from '../../types';
import { Modal } from '../ui/Modal';
import { FileText, User, Calendar, ArrowRight } from 'lucide-react';

interface ExamChangeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ExamChangeLog[];
  examType: ExamType;
}

export const ExamChangeLogModal: React.FC<ExamChangeLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  examType,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Audit Perubahan Jadwal Ujian (${examType})`}
      subtitle="Catatan riwayat mutasi, pergeseran ruangan/sesi, dan intervensi manual oleh Administrator"
      maxWidth="2xl"
    >
      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium text-slate-600">Belum ada catatan log perubahan untuk {examType}.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="pt-2 pb-2 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(log.changedAt).toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="text-slate-700 font-medium">{log.description}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Oleh: {log.changedBy}
                  </span>
                  {log.before && log.after && (
                    <span className="flex items-center gap-1 text-slate-400 font-mono">
                      <span>{typeof log.before === 'string' ? log.before : JSON.stringify(log.before)}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span className="text-indigo-600 font-semibold">
                        {typeof log.after === 'string' ? log.after : JSON.stringify(log.after)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
