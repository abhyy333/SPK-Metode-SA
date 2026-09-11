import React, { useState } from 'react';
import { Sliders, Save, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ConstraintWeights } from '../types';
import { DEFAULT_WEIGHTS } from '../data/initialData';
import { useToast } from '../components/ui/Toast';

interface WeightsConfigPageProps {
  weights: ConstraintWeights;
  onSaveWeights: (weights: ConstraintWeights) => void;
}

export const WeightsConfigPage: React.FC<WeightsConfigPageProps> = ({
  weights,
  onSaveWeights,
}) => {
  const { showToast } = useToast();
  const [localWeights, setLocalWeights] = useState<ConstraintWeights>({ ...weights });

  const handleChange = (key: keyof ConstraintWeights, val: number) => {
    setLocalWeights(prev => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveWeights(localWeights);
    showToast('success', 'Bobot Penalti Disimpan', 'Konfigurasi bobot penalti constraints berhasil diperbarui.');
  };

  const handleReset = () => {
    setLocalWeights({ ...DEFAULT_WEIGHTS });
    onSaveWeights(DEFAULT_WEIGHTS);
    showToast('info', 'Bobot Direset', 'Bobot penalti dikembalikan ke standar default penelitian.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Konfigurasi Bobot Penalti (Cost Weights)</h2>
          <p className="text-xs text-slate-500">
            Kustomisasi nilai bobot penalti untuk setiap pelanggaran Hard dan Soft Constraints
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Bobot Penalti</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hard Constraints Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hard Constraints (Wajib 0 Pelanggaran)</h3>
              <p className="text-xs text-slate-500">
                Bobot penalti tinggi agar algoritma memprioritaskan eliminasi konflik mutlak
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">
                  C1, C2, C3: Bentrokan Dosen, Ruangan, atau Kelas
                </label>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {localWeights.hardConflictWeight}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={localWeights.hardConflictWeight}
                onChange={e => handleChange('hardConflictWeight', Number(e.target.value))}
                className="w-full accent-rose-600"
              />
              <p className="text-[10px] text-slate-400">
                Penalti per bentrokan jadwal dosen mengajar bersamaan, ruangan dipakai bersamaan, atau rombel kelas bentrok.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">
                  C4: Kapasitas Ruangan Tidak Mencukupi (Overcapacity)
                </label>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {localWeights.roomCapacityWeight}
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                step={5}
                value={localWeights.roomCapacityWeight}
                onChange={e => handleChange('roomCapacityWeight', Number(e.target.value))}
                className="w-full accent-rose-600"
              />
              <p className="text-[10px] text-slate-400">
                Jumlah mahasiswa mata kuliah melebihi daya tampung kursi ruangan yang dialokasikan.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">
                  C5: Dosen Terjadwal di Luar Hari Ketersediaan
                </label>
                <span className="text-xs font-mono font-bold text-rose-600">
                  {localWeights.availabilityWeight}
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={300}
                step={5}
                value={localWeights.availabilityWeight}
                onChange={e => handleChange('availabilityWeight', Number(e.target.value))}
                className="w-full accent-rose-600"
              />
              <p className="text-[10px] text-slate-400">
                Dosen ditempatkan pada hari di mana yang bersangkutan tidak bersedia mengajar.
              </p>
            </div>
          </div>
        </div>

        {/* Soft Constraints Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Soft Constraints (Preferensi Kualitas)</h3>
              <p className="text-xs text-slate-500">
                Bobot penalti moderat untuk memaksimalkan kenyamanan jadwal dosen & mahasiswa
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">
                  S1 & S2: Ketidaksesuaian Preferensi Waktu & Hari
                </label>
                <span className="text-xs font-mono font-bold text-amber-600">
                  {localWeights.preferenceWeight}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={localWeights.preferenceWeight}
                onChange={e => handleChange('preferenceWeight', Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <p className="text-[10px] text-slate-400">
                Penalti jika waktu/hari perkuliahan tidak sesuai preferensi dosen pengampu atau mata kuliah.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">
                  S3: Kesesuaian Fasilitas Laboratorium (Praktikum)
                </label>
                <span className="text-xs font-mono font-bold text-amber-600">
                  {localWeights.roomTypeMismatchWeight}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={150}
                step={5}
                value={localWeights.roomTypeMismatchWeight}
                onChange={e => handleChange('roomTypeMismatchWeight', Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <p className="text-[10px] text-slate-400">
                Mata kuliah berjenis Praktikum sebaiknya dialokasikan pada Ruang Laboratorium.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">
                  S4: Kepadatan Jadwal Kelas & Hari Jumat Sore
                </label>
                <span className="text-xs font-mono font-bold text-amber-600">
                  {localWeights.densityWeight}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={100}
                step={2}
                value={localWeights.densityWeight}
                onChange={e => handleChange('densityWeight', Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <p className="text-[10px] text-slate-400">
                Pemerataan distribusi jadwal agar mahasiswa tidak menumpuk dalam 1 hari dan slot Jumat sore diminimalkan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
