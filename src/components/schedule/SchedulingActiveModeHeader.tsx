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
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-md border border-slate-200">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mode Aktif:</span>
        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5">
          {scheduleCreationMode === 'template' ? (
            <>
              <BookOpen className="w-3.5 h-3.5 text-slate-600" />
              Template Semester ({academicTerm === 'ganjil' ? 'Ganjil — 1, 3, 5, 7' : 'Genap — 2, 4, 6, 8'})
            </>
          ) : (
            <>
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              Kustom Manual (Master MK)
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSwitchModeModal}
          id="btn-switch-mode"
          className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Ganti Mode</span>
        </button>
      </div>
    </div>
  );
};

