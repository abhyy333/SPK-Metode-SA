import React, { useState } from 'react';
import {
  Zap,
  TrendingDown,
  Activity,
  Award,
  BookOpen,
  Code,
  FileText,
  Sliders,
  Layers,
  Sparkles,
  ChevronRight,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  OptimizationResult,
  SAParameters,
  ConstraintWeights,
  ScheduleAssignment,
  Course,
  Lecturer,
  Room,
  Timeslot,
  ClassGroup,
} from '../types';
import { Badge } from '../components/ui/Badge';

interface ResearchModePageProps {
  activeResult: OptimizationResult | null;
  history: OptimizationResult[];
  parameters: SAParameters;
  weights: ConstraintWeights;
  courses: Course[];
  lecturers: Lecturer[];
  rooms: Room[];
  timeslots: Timeslot[];
  classes: ClassGroup[];
  onNavigateToOptimization: () => void;
}

export const ResearchModePage: React.FC<ResearchModePageProps> = ({
  activeResult,
  history,
  parameters,
  weights,
  courses,
  lecturers,
  rooms,
  timeslots,
  classes,
  onNavigateToOptimization,
}) => {
  const [activeTab, setActiveTab] = useState<'formulation' | 'traces' | 'benchmarks' | 'constraints'>('formulation');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400 fill-current" />
              <span>Simulasi & Riset Tugas Akhir Mahasiswa S1</span>
            </span>
            <Badge variant="indigo" size="sm">
              Jurusan Teknik Elektro UNRAM
            </Badge>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Mode Analisis Riset: Simulated Annealing (SA)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Formulasi matematis fungsi objektif, probabilitas Metropolis (P = exp(-ΔC / T)), kurva penurunan suhu geometrik, dan analisis konvergensi solusi penjadwalan.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToOptimization}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Jalankan Simulasi SA Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('formulation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'formulation'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Formulasi Matematis & Algoritma
        </button>
        <button
          onClick={() => setActiveTab('traces')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'traces'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Kurva Suhu & Audit Trajectory
        </button>
        <button
          onClick={() => setActiveTab('constraints')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'constraints'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Matriks Batasan (Hard vs Soft)
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'benchmarks'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Riwayat Eksperimen ({history.length})
        </button>
      </div>

      {/* TAB 1: Formulation */}
      {activeTab === 'formulation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Objective Function Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <Code className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1. Formulasi Fungsi Objektif (Cost / Penalty)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tujuan optimasi adalah meminimalkan total penalti pelanggaran batasan:
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-indigo-950 space-y-2">
                <div className="font-bold text-center text-sm py-1 bg-white rounded-lg border border-slate-200">
                  Cost(S) = Σ (w_hard · HardConflicts) + Σ (w_soft · SoftConflicts)
                </div>
                <div className="text-[11px] text-slate-600 pt-1 space-y-1">
                  <div>• <strong>Hard Conflicts (C1..C5)</strong>: Bobot tinggi ({weights.hardConflictWeight} - {weights.roomCapacityWeight}) untuk mencegah solusi tidak valid.</div>
                  <div>• <strong>Soft Conflicts (S1..S4)</strong>: Bobot preferensi ({weights.preferenceWeight} - {weights.roomTypeMismatchWeight}) untuk meningkatkan kenyamanan perkuliahan.</div>
                </div>
              </div>
            </div>

            {/* Metropolis Criterion Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Activity className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Kriteria Penerimaan Metropolis (Metropolis Rule)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Solusi tetangga $S'$ diterima secara deterministik jika lebih baik ($\Delta C \le 0$), atau secara probabilistik jika lebih buruk ($\Delta C &gt; 0$) untuk lolos dari local optimum:
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-amber-950 space-y-2">
                <div className="font-bold text-center text-sm py-1 bg-white rounded-lg border border-slate-200">
                  P(ΔC, T) = exp( - ΔC / T )
                </div>
                <div className="text-[11px] text-slate-600 pt-1">
                  Dimana <strong>ΔC = Cost(S') - Cost(S)</strong>, dan <strong>T</strong> adalah temperatur saat iterasi berjalan.
                </div>
              </div>
            </div>
          </div>

          {/* Cooling & Neighborhood Operators */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>3. Skema Pendinginan Geometrik & Operator Neighborhood</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900">Skema Pendinginan:</span>
                <div className="font-mono font-bold text-indigo-700">T_(k+1) = α · T_k</div>
                <p className="text-slate-500 text-[11px]">
                  Pendinginan geometrik bertahap dengan faktor pendinginan α ({parameters.coolingRate}).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900">Operator 1: Single Reallocation</span>
                <div className="font-mono font-bold text-indigo-700">Move(a_i, slot_new, room_new)</div>
                <p className="text-slate-500 text-[11px]">
                  Memindahkan satu mata kuliah ke slot waktu atau ruangan alternatif secara acak terarah.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900">Operator 2: 2-Opt Swap</span>
                <div className="font-mono font-bold text-indigo-700">Swap(a_i, a_j)</div>
                <p className="text-slate-500 text-[11px]">
                  Menukarkan slot & ruangan antara dua penugasan mata kuliah yang saling beririsan.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Traces & Curve */}
      {activeTab === 'traces' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-6">
          {activeResult ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Audit Hasil Optimasi Aktif</h3>
                  <p className="text-xs text-slate-500">
                    Selesai dalam {activeResult.executionTimeMs || 0} ms • {activeResult.totalIterationsCompleted || (activeResult as any).totalIterations || 0} iterasi dieksekusi
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success" size="sm">
                    Konflik Akhir: {activeResult.bestConflicts?.total ?? (activeResult as any).finalFitness?.totalConflicts ?? 0}
                  </Badge>
                  <Badge variant="indigo" size="sm">
                    Cost: {activeResult.bestCost ?? (activeResult as any).finalFitness?.cost ?? 0}
                  </Badge>
                </div>
              </div>

              {/* Trajectory Table Sample */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sampel Jejak Evaluasi Titik Transisi (Trajectory Trace)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">Iterasi</th>
                        <th className="p-2.5">Suhu (T)</th>
                        <th className="p-2.5">Cost Saat Ini</th>
                        <th className="p-2.5">Cost Tetangga (S')</th>
                        <th className="p-2.5">ΔCost</th>
                        <th className="p-2.5">Probabilitas (P)</th>
                        <th className="p-2.5">Keputusan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(activeResult.sampleTrace || []).map(tr => (
                        <tr key={tr.iteration} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold">{tr.iteration}</td>
                          <td className="p-2.5 text-slate-600">{tr.temperature?.toFixed(2) ?? '-'}</td>
                          <td className="p-2.5">{tr.currentCost}</td>
                          <td className="p-2.5">{tr.neighborCost}</td>
                          <td className={`p-2.5 font-bold ${tr.deltaCost <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tr.deltaCost > 0 ? `+${tr.deltaCost}` : tr.deltaCost}
                          </td>
                          <td className="p-2.5 font-mono">
                            {tr.acceptanceProbability !== undefined
                              ? (tr.acceptanceProbability * 100).toFixed(1) + '%'
                              : '-'}
                          </td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                                tr.isNewBest
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tr.accepted
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {tr.actionTaken || (tr.isNewBest ? 'Solusi Terbaik Baru' : tr.accepted ? 'Diterima' : 'Ditolak')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Zap className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">Belum ada rekam jejak optimasi aktif</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Silakan jalankan Simulated Annealing dari menu Optimasi untuk merekam jejak evaluasi dan konvergensi suhu.
              </p>
              <button
                onClick={onNavigateToOptimization}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Mulai Optimasi Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Constraints */}
      {activeTab === 'constraints' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Daftar Batasan (Constraints) Sistem SPK
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
              <span className="font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Hard Constraints (Wajib Dipenuhi / Mutlak Bebas Konflik)</span>
              </span>
              <ul className="space-y-1.5 text-[11px] text-rose-800 list-disc list-inside">
                <li><strong>C1 (Dosen Overlap)</strong>: Dosen tidak boleh mengajar dua mata kuliah pada waktu yang sama.</li>
                <li><strong>C2 (Ruangan Overlap)</strong>: Ruangan tidak boleh digunakan oleh dua mata kuliah pada waktu yang sama.</li>
                <li><strong>C3 (Kelas Overlap)</strong>: Rombel kelas tidak boleh memiliki dua jadwal kuliah pada waktu yang sama.</li>
                <li><strong>C4 (Kapasitas Ruang & Retake)</strong>: Jumlah mahasiswa tidak boleh melebihi kapasitas kursi dan bentrokan jadwal mahasiswa mengulang dicegah.</li>
                <li><strong>C5 (Ketersediaan Dosen)</strong>: Kuliah tidak boleh dijadwalkan pada hari/slot yang ditandai tidak tersedia oleh dosen.</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Soft Constraints (Preferensi Optimalisasi Kualitas Jadwal)</span>
              </span>
              <ul className="space-y-1.5 text-[11px] text-indigo-800 list-disc list-inside">
                <li><strong>S1 (Fasilitas Laboratorium)</strong>: Mata kuliah tipe praktikum diprioritaskan di ruangan Laboratorium.</li>
                <li><strong>S2 (Preferensi Hari)</strong>: Menyesuaikan preferensi hari mata kuliah atau dosen.</li>
                <li><strong>S3 (Preferensi Waktu)</strong>: Menyesuaikan preferensi waktu dosen (Pagi/Siang/Sore).</li>
                <li><strong>S4 (Kepadatan Harian Kelas)</strong>: Menghindari beban jadwal kuliah mahasiswa yang terlalu padat (&gt;3 matkul) dalam satu hari.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Benchmarks */}
      {activeTab === 'benchmarks' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Riwayat Eksperimen Simulasi ({history.length} Run)
          </h3>

          {history.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada riwayat eksperimen yang tersimpan.
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((h, idx) => {
                const initialTotal = h.initialConflicts?.total ?? (h as any).initialFitness?.totalConflicts ?? (h as any).initialConflictsCount ?? 0;
                const bestTotal = h.bestConflicts?.total ?? (h as any).finalFitness?.totalConflicts ?? (h as any).bestConflictsCount ?? 0;
                const drop = Math.max(0, initialTotal - bestTotal);

                return (
                  <div key={h.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Run #{history.length - idx}</span>
                        <span className="text-[10px] text-slate-400">
                          {h.timestamp ? new Date(h.timestamp).toLocaleString('id-ID') : '-'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                        <span>T0: {h.parameters?.initialTemperature ?? '-'}</span>
                        <span>α: {h.parameters?.coolingRate ?? '-'}</span>
                        <span>Iterasi: {h.totalIterationsCompleted || (h as any).totalIterations || 0}</span>
                        <span>Waktu: {h.executionTimeMs || 0} ms</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900">
                          {initialTotal} → {bestTotal} Konflik
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          Penurunan {drop} Konflik
                        </div>
                      </div>
                      <Badge variant={bestTotal === 0 ? 'success' : 'indigo'} size="sm">
                        {bestTotal === 0 ? '0 Konflik ✓' : `${bestTotal} Konflik`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
