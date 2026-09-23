import React from 'react';
import { BookOpen, Sliders, ArrowRight } from 'lucide-react';

interface SchedulingModeSelectorProps {
  academicTerm: 'ganjil' | 'genap';
  onSelectAcademicTerm: (term: 'ganjil' | 'genap') => void;
  onSelectMode: (mode: 'template' | 'custom') => void;
}

export const SchedulingModeSelector: React.FC<SchedulingModeSelectorProps> = ({
  academicTerm,
  onSelectAcademicTerm,
  onSelectMode,
}) => {
  return (
    <div className="bg-white rounded-md p-6 sm:p-8 border border-slate-200 max-w-3xl mx-auto space-y-6">
      <div className="border-b border-slate-100 pb-4 text-center sm:text-left">
        <h2 className="text-base font-semibold text-slate-900 uppercase tracking-wide">Pilih Mode Penyusunan Jadwal</h2>
        <p className="text-xs text-slate-500 mt-1">
          Tentukan metode penyiapan mata kuliah sebelum proses pembagian rombel dan penempatan jadwal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        {/* Mode Option 1: Template Semester */}
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded border border-slate-200 bg-white text-slate-700 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                REKOMENDASI
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Template Paket Semester</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Mengambil mata kuliah dari paket kurikulum 2026/2022 &amp; KBK (Sem 5 &amp; 7) yang sudah terdaftar resmi.
              </p>
            </div>

            {/* Period selection within template card */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Pilih Periode Semester:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectAcademicTerm('ganjil')}
                  className={`p-2 rounded border text-xs font-medium transition-colors text-center cursor-pointer ${
                    academicTerm === 'ganjil'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>Semester Ganjil</div>
                  <div className={`text-[10px] font-mono ${academicTerm === 'ganjil' ? 'text-slate-300' : 'text-slate-500'}`}>
                    (1, 3, 5, 7)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectAcademicTerm('genap')}
                  className={`p-2 rounded border text-xs font-medium transition-colors text-center cursor-pointer ${
                    academicTerm === 'genap'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>Semester Genap</div>
                  <div className={`text-[10px] font-mono ${academicTerm === 'genap' ? 'text-slate-300' : 'text-slate-500'}`}>
                    (2, 4, 6, 8)
                  </div>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectMode('template')}
            id="btn-select-mode-template"
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Gunakan Template Semester</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mode Option 2: Custom Manual */}
        <div className="rounded-md border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                FLEKSIBEL
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Kustom Manual</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pilih mata kuliah secara spesifik dari Master Mata Kuliah dengan filter kurikulum, semester, dan KBK.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">•</span>
                <span>Pencarian &amp; filter multi-parameter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">•</span>
                <span>Indikator peringatan lintas semester</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectMode('custom')}
            id="btn-select-mode-custom"
            className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium text-xs rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Mulai Kustom Manual</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

