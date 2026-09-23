import React from 'react';
import { Zap, BookOpen, Sliders, ArrowRight } from 'lucide-react';

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
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xs max-w-4xl mx-auto text-center space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div className="space-y-3">
        <div className="w-14 h-14 mx-auto rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
          <Zap className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">PILIH MODE PENYUSUNAN</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
          Tentukan metode pemilihan sumber mata kuliah sebelum masuk ke pembagian rombel dan penempatan jadwal perkuliahan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
        {/* Mode Option 1: Template Semester */}
        <div className="group rounded-3xl border-2 border-indigo-200 hover:border-indigo-600 bg-gradient-to-b from-indigo-50/50 to-white p-6 sm:p-7 transition-all flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                Rekomendasi
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Gunakan Template Semester</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Mengambil mata kuliah dari paket kurikulum 2026/2022 & peminatan KBK (Sem 5 & 7) yang sudah terstruktur di program studi.
              </p>
            </div>

            {/* Period selection within template card */}
            <div className="pt-2 border-t border-indigo-100/80 space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Pilih Periode Semester:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectAcademicTerm('ganjil')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    academicTerm === 'ganjil'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>Semester Ganjil</div>
                  <div className={`text-[10px] ${academicTerm === 'ganjil' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    (Sem 1, 3, 5, 7)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectAcademicTerm('genap')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    academicTerm === 'genap'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>Semester Genap</div>
                  <div className={`text-[10px] ${academicTerm === 'genap' ? 'text-indigo-100' : 'text-slate-400'}`}>
                    (Sem 2, 4, 6, 8)
                  </div>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectMode('template')}
            id="btn-select-mode-template"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
          >
            <span>Gunakan Template Semester</span>
            <ArrowRight className="w-4 h-4 transition-transform" />
          </button>
        </div>

        {/* Mode Option 2: Custom Manual */}
        <div className="group rounded-3xl border-2 border-slate-200 hover:border-slate-800 bg-gradient-to-b from-slate-50/50 to-white p-6 sm:p-7 transition-all flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center shadow-xs">
                <Sliders className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 uppercase tracking-wider">
                Fleksibel
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Custom Manual</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Pilih mata kuliah secara bebas dari seluruh Master Mata Kuliah. Mendukung multi-filter dan pemilihan lintas semester dengan warning indikator.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Pencarian dan multi-filter komprehensif</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Warning otomatis untuk MK di luar semester aktif</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectMode('custom')}
            id="btn-select-mode-custom"
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
          >
            <span>Mulai Custom Manual</span>
            <ArrowRight className="w-4 h-4 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
