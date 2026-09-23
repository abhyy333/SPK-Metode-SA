import React from 'react';
import { BookOpen, Sliders, RefreshCw } from 'lucide-react';

interface SchedulingActiveModeHeaderProps {
  scheduleCreationMode: 'template' | 'custom';
  academicTerm: 'ganjil' | 'genap';
  onOpenSwitchModeModal: () => void;
}

export const SchedulingActiveModeHeader: React.FC<SchedulingActiveModeHeaderProps> = ({
  scheduleCreationMode,
  academicTerm,
  onOpenSwitchModeModal,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mode Aktif:</span>
        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5">
          {scheduleCreationMode === 'template' ? (
            <>
              <BookOpen className="w-3.5 h-3.5" />
              Template Semester ({academicTerm === 'ganjil' ? 'Ganjil — 1, 3, 5, 7' : 'Genap — 2, 4, 6, 8'})
            </>
          ) : (
            <>
              <Sliders className="w-3.5 h-3.5" />
              Custom Manual (Bebas dari Seluruh Master MK)
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSwitchModeModal}
          id="btn-switch-mode"
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span>Ganti Mode</span>
        </button>
      </div>
    </div>
  );
};
