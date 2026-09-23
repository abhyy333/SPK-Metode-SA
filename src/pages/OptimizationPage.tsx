import React, { useState } from 'react';
import {
  Zap,
  Sparkles,
  Play,
  Square,
  RefreshCw,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Eye,
  BarChart2,
  Layers,
  Thermometer,
  ShieldCheck,
  Award,
  ArrowRight,
  BookOpen,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  SAParameters,
  OptimizationResult,
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConstraintWeights,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import { StorageService } from '../services/storageService';

interface OptimizationPageProps {
  parameters: SAParameters;
  onChangeParameters: (params: SAParameters) => void;
  weights: ConstraintWeights;
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  currentSchedule: ScheduleAssignment[] | null;
  initialSchedule: ScheduleAssignment[] | null;
  activeOptimizationResult: OptimizationResult | null;
  onGenerateInitial: () => void;
  onRunOptimization: (params: SAParameters) => void;
  onStopOptimization: () => void;
  isOptimizing: boolean;
  liveProgressData: any;
  onNavigate: (viewId: string) => void;
}

export const OptimizationPage: React.FC<OptimizationPageProps> = ({
  parameters,
  onChangeParameters,
  weights,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  currentSchedule,
  initialSchedule,
  activeOptimizationResult,
  onGenerateInitial,
  onRunOptimization,
  onStopOptimization,
  isOptimizing,
  liveProgressData,
  onNavigate,
}) => {
  const { showToast } = useToast();
  const [showTrace, setShowTrace] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);

  // Local parameter form states
  const [initTemp, setInitTemp] = useState(parameters.initialTemperature);
  const [minTemp, setMinTemp] = useState(parameters.minimumTemperature);
  const [coolingRate, setCoolingRate] = useState(parameters.coolingRate);
  const [maxIter, setMaxIter] = useState(parameters.maxIterations);
  const [mutationRate, setMutationRate] = useState(parameters.mutationRate);

  const handleApplyParams = () => {
    const updated: SAParameters = {
      initialTemperature: Number(initTemp),
      minimumTemperature: Number(minTemp),
      coolingRate: Number(coolingRate),
      maxIterations: Number(maxIter),
      mutationRate: Number(mutationRate),
    };
    onChangeParameters(updated);
    showToast('success', 'Parameter Diperbarui', 'Konfigurasi Simulated Annealing berhasil disimpan.');
  };

  const handleStartOpt = () => {
    if (!currentSchedule || currentSchedule.length === 0) {
      showToast('warning', 'Jadwal Awal Kosong', 'Silakan klik "Generate Initial Schedule" terlebih dahulu.');
      return;
    }
    const currentParams: SAParameters = {
      initialTemperature: Number(initTemp),
      minimumTemperature: Number(minTemp),
      coolingRate: Number(coolingRate),
      maxIterations: Number(maxIter),
      mutationRate: Number(mutationRate),
    };
    onRunOptimization(currentParams);
  };

  // Extract live or completed chart data with smart downsampling (max 100 data points for 60fps SVG rendering)
  const rawChartData = isOptimizing
    ? liveProgressData?.recentTrace
      ? liveProgressData.convergenceHistory || []
      : []
    : activeOptimizationResult?.convergenceHistory || [];

  const chartData = React.useMemo(() => {
    if (!rawChartData || rawChartData.length <= 100) return rawChartData;
    const step = Math.ceil(rawChartData.length / 100);
    const downsampled = [];
    for (let i = 0; i < rawChartData.length; i += step) {
      downsampled.push(rawChartData[i]);
    }
    // Always include the last point
    if (downsampled[downsampled.length - 1] !== rawChartData[rawChartData.length - 1]) {
      downsampled.push(rawChartData[rawChartData.length - 1]);
    }
    return downsampled;
  }, [rawChartData]);

  const displayIteration = isOptimizing
    ? liveProgressData?.iteration || 0
    : activeOptimizationResult?.totalIterationsCompleted || 0;

  const displayCurrentCost = isOptimizing
    ? liveProgressData?.currentCost ?? '-'
    : activeOptimizationResult?.bestCost ?? '-';

  const displayBestCost = isOptimizing
    ? liveProgressData?.bestCost ?? '-'
    : activeOptimizationResult?.bestCost ?? '-';

  const displayTemperature = isOptimizing
    ? (liveProgressData?.temperature !== undefined && !isNaN(liveProgressData.temperature)
        ? Number(liveProgressData.temperature).toFixed(2)
        : '0.00')
    : activeOptimizationResult?.parameters?.minimumTemperature !== undefined && !isNaN(activeOptimizationResult.parameters.minimumTemperature)
    ? Number(activeOptimizationResult.parameters.minimumTemperature).toFixed(2)
    : String(initTemp ?? '100.00');

  const displayConflicts = isOptimizing
    ? (liveProgressData?.bestConflicts ?? '-')
    : (activeOptimizationResult?.bestConflicts?.total ?? (activeOptimizationResult as any)?.bestConflictsCount ?? '-');

  const traceList = isOptimizing
    ? liveProgressData?.recentTrace || []
    : activeOptimizationResult?.sampleTrace || [];

  // Pre-SA validation and offerings breakdown
  const offerings = React.useMemo(() => StorageService.getCourseOfferings(), [currentSchedule]);
  const preSaStats = React.useMemo(() => {
    const theoryOfferings = offerings.filter(o => !o.isPracticum && o.status !== 'closed_low_enrollment');
    const practicumCount = offerings.filter(o => o.isPracticum).length;
    const closedElectivesCount = offerings.filter(o => o.status === 'closed_low_enrollment').length;
    const activeSectionCount = theoryOfferings.length;
    const unassignedLecturers = theoryOfferings.filter(o => !o.lecturerIds || o.lecturerIds.length === 0).length;
    const unassignedRooms = (currentSchedule || []).filter(a => !a.roomId).length;

    return {
      theoryCount: theoryOfferings.length,
      practicumCount,
      closedElectivesCount,
      activeSectionCount,
      unassignedLecturers,
      unassignedRooms,
    };
  }, [offerings, currentSchedule]);

  return (
    <div className="space-y-6">
      {/* Pre-SA Operational Overview Card */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Validasi &amp; Status Operasional Pre-SA</h3>
              <p className="text-[11px] text-slate-500">
                Audit kesiapan Course Offering dan integritas data sebelum optimasi Simulated Annealing
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>SA Invariant Guaranteed: 100% Offering Preserved</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Theory Offering</span>
            <div className="text-base font-semibold text-slate-900 mt-0.5">{preSaStats.theoryCount} Rombel</div>
            <span className="text-[10px] text-slate-400">Masuk jadwal utama</span>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Praktikum</span>
            <div className="text-base font-semibold text-slate-900 mt-0.5">{preSaStats.practicumCount} Praktikum</div>
            <span className="text-[10px] text-slate-400">Jadwal lab mandiri</span>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Pilihan Ditutup (&lt;10)</span>
            <div className="text-base font-semibold text-slate-700 mt-0.5">{preSaStats.closedElectivesCount} MK</div>
            <span className="text-[10px] text-slate-400">Enrollment minim</span>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Total Sections</span>
            <div className="text-base font-semibold text-slate-900 mt-0.5">{preSaStats.activeSectionCount} Kelas</div>
            <span className="text-[10px] text-slate-400">Max 40 Mhs/kelas</span>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Belum Ada Dosen</span>
            <div className={`text-base font-semibold mt-0.5 ${preSaStats.unassignedLecturers > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {preSaStats.unassignedLecturers} Rombel
            </div>
            <span className="text-[10px] text-slate-400">Dosen di Offering</span>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-semibold text-slate-500">Belum Ada Ruang</span>
            <div className={`text-base font-semibold mt-0.5 ${preSaStats.unassignedRooms > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {preSaStats.unassignedRooms} Rombel
            </div>
            <span className="text-[10px] text-slate-400">Dialokasikan SA</span>
          </div>
        </div>
      </div>

      {/* Parameter Control Panel */}
      <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-500" />
            <div>
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Parameter Simulated Annealing</h3>
              <p className="text-[11px] text-slate-500">
                Konfigurasi temperatur pendinginan dan laju mutasi algoritma
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onGenerateInitial}
              id="btn-opt-generate-initial"
              disabled={isOptimizing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
              <span>Generate Initial</span>
            </button>

            {!isOptimizing ? (
              <button
                onClick={handleStartOpt}
                id="btn-opt-run-sa"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Jalankan Optimasi</span>
              </button>
            ) : (
              <button
                onClick={onStopOptimization}
                id="btn-opt-stop-sa"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Optimasi</span>
              </button>
            )}
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Initial Temp (T₀)
            </label>
            <input
              type="number"
              min={10}
              max={10000}
              step={50}
              disabled={isOptimizing}
              value={initTemp}
              onChange={e => setInitTemp(Number(e.target.value))}
              onBlur={handleApplyParams}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 font-mono focus:border-slate-400 focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400">Default: 1000</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Min Temp (Tₘᵢₙ)
            </label>
            <input
              type="number"
              min={0.001}
              max={10}
              step={0.05}
              disabled={isOptimizing}
              value={minTemp}
              onChange={e => setMinTemp(Number(e.target.value))}
              onBlur={handleApplyParams}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 font-mono focus:border-slate-400 focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400">Default: 0.1</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Cooling Rate (α)
            </label>
            <input
              type="number"
              min={0.8}
              max={0.999}
              step={0.001}
              disabled={isOptimizing}
              value={coolingRate}
              onChange={e => setCoolingRate(Number(e.target.value))}
              onBlur={handleApplyParams}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 font-mono focus:border-slate-400 focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400">Default: 0.995</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Max Iterations (N)
            </label>
            <input
              type="number"
              min={100}
              max={15000}
              step={500}
              disabled={isOptimizing}
              value={maxIter}
              onChange={e => setMaxIter(Number(e.target.value))}
              onBlur={handleApplyParams}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 font-mono focus:border-slate-400 focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400">Default: 5000</span>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-1">
              Mutation Rate
            </label>
            <input
              type="number"
              min={0.05}
              max={1.0}
              step={0.05}
              disabled={isOptimizing}
              value={mutationRate}
              onChange={e => setMutationRate(Number(e.target.value))}
              onBlur={handleApplyParams}
              className="w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-200 font-mono focus:border-slate-400 focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400">Default: 0.20</span>
          </div>
        </div>
      </div>

      {/* Realtime / Live Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-md border border-slate-200">
          <div className="text-[10px] uppercase font-medium text-slate-500">Iterasi</div>
          <div className="text-lg font-semibold font-mono text-slate-900 mt-0.5">
            {displayIteration} <span className="text-xs text-slate-400 font-normal">/ {maxIter}</span>
          </div>
          {isOptimizing && (
            <div className="w-full bg-slate-100 rounded-full h-1 mt-2 overflow-hidden">
              <div
                className="bg-slate-900 h-1 rounded-full transition-all"
                style={{ width: `${liveProgressData?.progressPercentage || 0}%` }}
              ></div>
            </div>
          )}
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200">
          <div className="text-[10px] uppercase font-medium text-slate-500">Temperatur (T)</div>
          <div className="text-lg font-semibold font-mono text-amber-700 mt-0.5 flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-amber-600" />
            {displayTemperature}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">T_min: {minTemp}</div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200">
          <div className="text-[10px] uppercase font-medium text-slate-500">Current Cost</div>
          <div className="text-lg font-semibold font-mono text-slate-800 mt-0.5">
            {displayCurrentCost}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Solusi Berjalan</div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200">
          <div className="text-[10px] uppercase font-medium text-slate-500">Best Cost (Global)</div>
          <div className="text-lg font-semibold font-mono text-slate-900 mt-0.5">
            {displayBestCost}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Nilai Minimum</div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200">
          <div className="text-[10px] uppercase font-medium text-slate-500">Konflik Terbaik</div>
          <div className="text-lg font-semibold font-mono text-emerald-700 mt-0.5 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            {displayConflicts}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {activeOptimizationResult ? `Hard: ${activeOptimizationResult.bestConflicts.hard}` : 'Total Bentrokan'}
          </div>
        </div>

        <div className="bg-white p-3 rounded-md border border-slate-200">
          <div className="text-[10px] uppercase font-medium text-slate-500">Status Proses</div>
          <div className="mt-1">
            {isOptimizing ? (
              <Badge variant="warning" size="sm">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Optimasi Berjalan
              </Badge>
            ) : activeOptimizationResult ? (
              <Badge variant="success" size="sm">
                <CheckCircle2 className="w-3 h-3" />
                Selesai
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Siap Dijalankan
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            {activeOptimizationResult ? `${activeOptimizationResult.executionTimeMs} ms` : '-'}
          </div>
        </div>
      </div>

      {/* Before vs After Comparison Card */}
      {activeOptimizationResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Perbandingan Sebelum vs Sesudah Optimasi
              </h3>
            </div>
            <button
              onClick={() => onNavigate('schedule')}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              <span>Lihat Hasil di Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Before */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Sebelum Optimasi (Initial)</span>
              <div className="text-2xl font-bold text-slate-900">
                {activeOptimizationResult.initialConflicts?.total ?? (activeOptimizationResult as any).initialConflictsCount ?? 0}{' '}
                <span className="text-xs text-slate-500 font-normal">total konflik</span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>Hard Conflicts:</span>
                  <span className="font-bold text-rose-600">{activeOptimizationResult.initialConflicts?.hard ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Soft Conflicts:</span>
                  <span className="font-bold text-amber-600">{activeOptimizationResult.initialConflicts?.soft ?? 0}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span>Total Cost:</span>
                  <span className="font-mono font-bold">{activeOptimizationResult.initialCost ?? 0}</span>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">
                Setelah Optimasi (Final Best)
              </span>
              <div className="text-2xl font-bold text-emerald-900">
                {activeOptimizationResult.bestConflicts?.total ?? (activeOptimizationResult as any).bestConflictsCount ?? 0}{' '}
                <span className="text-xs text-emerald-700 font-normal">total konflik</span>
              </div>
              <div className="text-xs text-emerald-800 space-y-1">
                <div className="flex justify-between">
                  <span>Hard Conflicts:</span>
                  <span className="font-bold text-emerald-700">{activeOptimizationResult.bestConflicts?.hard ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Soft Conflicts:</span>
                  <span className="font-bold text-emerald-700">{activeOptimizationResult.bestConflicts?.soft ?? 0}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-200">
                  <span>Total Cost:</span>
                  <span className="font-mono font-bold text-emerald-900">{activeOptimizationResult.bestCost ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Improvement */}
            <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-800 uppercase">Persentase Perbaikan</span>
                <div className="text-2xl font-bold text-indigo-950 mt-1">
                  {(() => {
                    const init = activeOptimizationResult.initialConflicts?.total ?? (activeOptimizationResult as any).initialConflictsCount ?? 0;
                    const best = activeOptimizationResult.bestConflicts?.total ?? (activeOptimizationResult as any).bestConflictsCount ?? 0;
                    if (init <= 0) return '0.0';
                    const red = ((init - best) / init) * 100;
                    return isNaN(red) ? '0.0' : Math.max(0, red).toFixed(1);
                  })()}
                  % <span className="text-xs text-indigo-700 font-normal">pengurangan konflik</span>
                </div>
              </div>

              <div className="text-xs text-indigo-900 space-y-1">
                <div className="flex justify-between">
                  <span>Cost Reduction:</span>
                  <span className="font-bold">
                    {(() => {
                      const initCost = activeOptimizationResult.initialCost ?? 0;
                      const bestCost = activeOptimizationResult.bestCost ?? 0;
                      if (initCost <= 0) return '0.0';
                      const red = ((initCost - bestCost) / initCost) * 100;
                      return isNaN(red) ? '0.0' : Math.max(0, red).toFixed(1);
                    })()}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Solusi Terbaik Ditemukan:</span>
                  <span className="font-mono font-bold">Iterasi #{activeOptimizationResult.bestIteration ?? 0}</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold pt-1">
                  {(activeOptimizationResult.bestConflicts?.total ?? 0) === 0
                    ? '★ Tidak ditemukan konflik pada solusi final.'
                    : '★ Berhasil meminimalkan konflik secara signifikan.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dual Graphs: Cost & Conflict Trajectories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Cost Trajectory */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Trajektori Penurunan Cost
              </h4>
              <p className="text-[11px] text-slate-500">Current Cost vs Best Global Cost</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="iteration" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="currentCost"
                  name="Current Cost"
                  stroke="#f43f5e"
                  strokeWidth={1}
                  dot={false}
                  opacity={0.5}
                />
                <Line
                  type="stepAfter"
                  dataKey="bestCost"
                  name="Best Cost"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Conflict Count Trajectory */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Reduksi Jumlah Konflik vs Iterasi
              </h4>
              <p className="text-[11px] text-slate-500">Jumlah Hard & Soft Constraints yang Dilanggar</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="iteration" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="hardConflicts"
                  name="Hard Conflicts"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="softConflicts"
                  name="Soft Conflicts"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="bestConflicts"
                  name="Total Konflik Terbaik"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Research Mode: Algorithm Trace Log */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Mode Penelitian (Research Mode) — Jejak Eksekusi Algoritma
              </h3>
              <p className="text-xs text-slate-500">
                Sampel log transisi status, probabilitas penerimaan Metropolis (P = exp(-Δ/T)), dan keputusan mutasi
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTrace(!showTrace)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            {showTrace ? 'Sembunyikan Log' : 'Tampilkan Log Trace'}
          </button>
        </div>

        {showTrace && (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-3 py-2">Iterasi</th>
                  <th className="px-3 py-2">Temp (T)</th>
                  <th className="px-3 py-2">Current Cost</th>
                  <th className="px-3 py-2">Neighbor Cost</th>
                  <th className="px-3 py-2">Δ Cost</th>
                  <th className="px-3 py-2">Metropolis Prob (P)</th>
                  <th className="px-3 py-2">Status Solusi</th>
                  <th className="px-3 py-2">Aksi Mutasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {traceList.length > 0 ? (
                  traceList.map((t, idx) => (
                    <tr
                      key={idx}
                      className={
                        t.isNewBest
                          ? 'bg-indigo-50/80 font-semibold text-indigo-900'
                          : t.accepted
                          ? 'hover:bg-slate-50 text-slate-800'
                          : 'hover:bg-slate-50 text-slate-400 opacity-75'
                      }
                    >
                      <td className="px-3 py-1.5 font-bold">#{t.iteration}</td>
                      <td className="px-3 py-1.5 text-amber-600">
                        {t.temperature !== undefined && !isNaN(t.temperature) ? t.temperature.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-1.5">{t.currentCost ?? '-'}</td>
                      <td className="px-3 py-1.5">{t.neighborCost ?? '-'}</td>
                      <td
                        className={`px-3 py-1.5 font-semibold ${
                          (t.deltaCost ?? 0) < 0
                            ? 'text-emerald-600'
                            : (t.deltaCost ?? 0) === 0
                            ? 'text-slate-500'
                            : 'text-rose-600'
                        }`}
                      >
                        {(t.deltaCost ?? 0) > 0 ? `+${t.deltaCost}` : (t.deltaCost ?? '-')}
                      </td>
                      <td className="px-3 py-1.5">
                        {t.acceptanceProbability !== undefined && !isNaN(t.acceptanceProbability)
                          ? `${(t.acceptanceProbability * 100).toFixed(1)}%`
                          : '-'}
                      </td>
                      <td className="px-3 py-1.5">
                        {t.isNewBest ? (
                          <span className="text-indigo-700 font-bold">★ Global Best</span>
                        ) : t.accepted ? (
                          <span className="text-emerald-600 font-medium">✓ Diterima</span>
                        ) : (
                          <span className="text-rose-500">✗ Ditolak</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-[10px] text-slate-600">{t.actionTaken}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 font-sans">
                      Log eksekusi akan muncul saat Simulated Annealing dijalankan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pedagogical Explanation Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Bagaimana Algoritma Simulated Annealing Bekerja?
            </h3>
          </div>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            {showExplanation ? 'Sembunyikan Penjelasan' : 'Lihat Penjelasan'}
          </button>
        </div>

        {showExplanation && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 text-xs text-slate-600">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-bold text-indigo-700">1. Inisialisasi Solusi Awal</span>
              <p className="text-[11px] leading-relaxed">
                Sistem membuat draft jadwal awal secara semi-random dengan memetakan seluruh mata kuliah ke
                ruangan dan slot waktu, kemudian menghitung total cost awal.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-bold text-indigo-700">2. Pembangkitan Solusi Tetangga</span>
              <p className="text-[11px] leading-relaxed">
                Pada setiap iterasi, dilakukan mutasi kecil (memindahkan slot waktu, mengganti ruangan, atau
                swap jadwal) untuk menghasilkan solusi kandidat baru.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-bold text-indigo-700">3. Kriteria Penerimaan Metropolis</span>
              <p className="text-[11px] leading-relaxed">
                Solusi yang lebih baik langsung diterima. Solusi yang lebih buruk tetap berpeluang diterima
                dengan probabilitas <span className="font-mono font-semibold">P = exp(-Δ/T)</span> untuk
                menghindari jebakan optimum lokal.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="font-bold text-indigo-700">4. Penurunan Temperatur & Konvergensi</span>
              <p className="text-[11px] leading-relaxed">
                Temperatur diturunkan bertahap melalui <span className="font-mono">T = T × α</span> hingga
                mencapai temperatur minimum atau batas iterasi maksimum, menghasilkan jadwal final terbaik.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
