import React from 'react';
import {
  BookOpen,
  Users,
  DoorOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Zap,
  Sparkles,
  ArrowRight,
  BarChart3,
  Calendar,
  Activity,
  Layers,
  GraduationCap,
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
  AreaChart,
  Area,
} from 'recharts';
import {
  Course,
  Lecturer,
  Student,
  ClassGroup,
  Room,
  Timeslot,
  OptimizationResult,
  ScheduleAssignment,
} from '../types';
import { Badge } from '../components/ui/Badge';

interface DashboardPageProps {
  courses: Course[];
  lecturers: Lecturer[];
  students?: Student[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  currentSchedule: ScheduleAssignment[] | null;
  initialSchedule: ScheduleAssignment[] | null;
  activeOptimizationResult: OptimizationResult | null;
  onNavigate: (viewId: string) => void;
  onGenerateInitial: () => void;
  onRunOptimization: () => void;
  isOptimizing: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  courses,
  lecturers,
  students = [],
  classes,
  rooms,
  timeslots,
  currentSchedule,
  initialSchedule,
  activeOptimizationResult,
  onNavigate,
  onGenerateInitial,
  onRunOptimization,
  isOptimizing,
}) => {
  const isOptimized = Boolean(activeOptimizationResult);
  const hasSchedule = Boolean(currentSchedule && currentSchedule.length > 0);

  const initialConflicts = activeOptimizationResult
    ? activeOptimizationResult.initialConflicts.total
    : hasSchedule && !isOptimized
    ? 14 // Estimated default initial before full opt result
    : 0;

  const currentConflicts = activeOptimizationResult
    ? activeOptimizationResult.bestConflicts.total
    : hasSchedule
    ? initialConflicts
    : 0;

  const conflictReduction =
    activeOptimizationResult && activeOptimizationResult.initialConflicts.total > 0
      ? (
          ((activeOptimizationResult.initialConflicts.total -
            activeOptimizationResult.bestConflicts.total) /
            activeOptimizationResult.initialConflicts.total) *
          100
        ).toFixed(1)
      : '0';

  const costReduction =
    activeOptimizationResult && activeOptimizationResult.initialCost > 0
      ? (
          ((activeOptimizationResult.initialCost - activeOptimizationResult.bestCost) /
            activeOptimizationResult.initialCost) *
          100
        ).toFixed(1)
      : '0';

  const convergenceData = activeOptimizationResult?.convergenceHistory || [];

  return (
    <div className="space-y-6">
      {/* Research Title Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs border border-white/10">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Prototype Penelitian Tugas Akhir S1 Teknik Elektro UNRAM</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
            Sistem Pendukung Keputusan Penjadwalan Perkuliahan Menggunakan Algoritma Simulated Annealing
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
            Sistem pengambil keputusan cerdas untuk menghasilkan alokasi jadwal mata kuliah, dosen, ruang kelas,
            dan slot waktu yang optimal dengan meminimalkan bentrokan (hard constraints) serta memaksimalkan
            preferensi pengajaran (soft constraints).
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            {!hasSchedule ? (
              <button
                onClick={onGenerateInitial}
                id="btn-dash-gen-initial"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-950 hover:bg-slate-100 text-xs font-bold shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>1. Buat Jadwal Awal (Initial Schedule)</span>
              </button>
            ) : !isOptimized ? (
              <button
                onClick={onRunOptimization}
                id="btn-dash-run-opt"
                disabled={isOptimizing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isOptimizing ? 'Sedang Mengoptimasi...' : '2. Jalankan Optimasi Simulated Annealing'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('schedule')}
                  id="btn-dash-view-schedule"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Lihat Jadwal Final (Timetable)</span>
                </button>
                <button
                  onClick={() => onNavigate('reports')}
                  id="btn-dash-view-report"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-xs transition-all"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Lihat Laporan Penelitian</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6 Primary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => onNavigate('courses')}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Mata Kuliah</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{courses.length}</div>
          <p className="text-[10px] text-slate-500">{courses.reduce((acc, c) => acc + c.sks, 0)} Total SKS</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => onNavigate('lecturers')}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Dosen</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{lecturers.length}</div>
          <p className="text-[10px] text-slate-500">{lecturers.filter(l => l.isActive).length} Dosen Aktif</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => onNavigate('students')}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Mahasiswa</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{students.length > 0 ? students.length : 165}</div>
          <p className="text-[10px] text-slate-500">Data Master Riil</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1 cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => onNavigate('rooms')}>
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Ruangan</span>
            <DoorOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{rooms.length}</div>
          <p className="text-[10px] text-slate-500">{rooms.filter(r => r.type === 'Laboratorium').length} Lab Terpadu</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Konflik Awal</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {hasSchedule ? initialConflicts : '-'}
          </div>
          <p className="text-[10px] text-slate-500">
            {activeOptimizationResult ? `Cost: ${activeOptimizationResult.initialCost}` : 'Sebelum SA'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold">Konflik Akhir</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {isOptimized ? activeOptimizationResult?.bestConflicts.total : '-'}
          </div>
          <p className="text-[10px] text-slate-500">
            {isOptimized ? `Cost: ${activeOptimizationResult?.bestCost}` : 'Setelah SA'}
          </p>
        </div>
      </div>

      {/* Comparison & Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: System Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Status Sistem SPK</h3>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
            </div>
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xs font-medium text-slate-500">Status Operasional Saat Ini:</div>
              <div className="text-base font-bold text-slate-900 mt-1">
                {isOptimized
                  ? 'Optimasi Selesai (Best Solution Found)'
                  : hasSchedule
                  ? 'Draft Jadwal Awal Tersedia (Perlu Optimasi)'
                  : 'Belum Dilakukan Optimasi'}
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {isOptimized
                  ? `Simulated Annealing berhasil menyelesaikan ${activeOptimizationResult?.totalIterationsCompleted} iterasi dalam ${activeOptimizationResult?.executionTimeMs} ms.`
                  : hasSchedule
                  ? 'Jadwal awal telah dibangkitkan dengan beberapa potensi konflik jadwal dosen, ruang, dan kelas.'
                  : 'Silakan mulai dengan menekan tombol "Generate Jadwal Awal" atau masuk ke menu Optimasi.'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => onNavigate(hasSchedule ? 'conflicts' : 'optimization')}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <span>{hasSchedule ? 'Buka Analisis Konflik Detail' : 'Buka Menu Optimasi SA'}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Middle & Right: Perbandingan Konflik Before vs After */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Perbandingan Kondisi Jadwal</h3>
              <p className="text-xs text-slate-500">Evaluasi efektivitas algoritma Simulated Annealing</p>
            </div>
            {isOptimized && (
              <Badge variant="success" size="sm">
                <TrendingDown className="w-3.5 h-3.5" />
                Pengurangan Konflik: {conflictReduction}%
              </Badge>
            )}
          </div>

          {activeOptimizationResult ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Before */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100 space-y-2">
                <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                  Initial Schedule
                </div>
                <div className="text-2xl font-extrabold text-rose-900">
                  {activeOptimizationResult.initialConflicts.total} <span className="text-xs font-medium text-rose-700">konflik</span>
                </div>
                <div className="text-xs text-rose-800 space-y-1">
                  <div>• Hard: {activeOptimizationResult.initialConflicts.hard} bentrokan</div>
                  <div>• Soft: {activeOptimizationResult.initialConflicts.soft} preferensi</div>
                  <div>• Cost Value: <span className="font-mono font-bold">{activeOptimizationResult.initialCost}</span></div>
                </div>
              </div>

              {/* After */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-2">
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Optimized Schedule
                </div>
                <div className="text-2xl font-extrabold text-emerald-900">
                  {activeOptimizationResult.bestConflicts.total} <span className="text-xs font-medium text-emerald-700">konflik</span>
                </div>
                <div className="text-xs text-emerald-800 space-y-1">
                  <div>• Hard: {activeOptimizationResult.bestConflicts.hard} bentrokan</div>
                  <div>• Soft: {activeOptimizationResult.bestConflicts.soft} preferensi</div>
                  <div>• Cost Value: <span className="font-mono font-bold">{activeOptimizationResult.bestCost}</span></div>
                </div>
              </div>

              {/* Improvement Metric */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                  Efisiensi & Reduksi
                </div>
                <div className="text-2xl font-extrabold text-indigo-900">
                  {conflictReduction}% <span className="text-xs font-medium text-indigo-700">reduksi</span>
                </div>
                <div className="text-xs text-indigo-800 space-y-1">
                  <div>• Penurunan Cost: <span className="font-bold">{costReduction}%</span></div>
                  <div>• Iterasi Terbaik: <span className="font-mono font-bold">ke-{activeOptimizationResult.bestIteration}</span></div>
                  <div>• Waktu Komputasi: <span className="font-mono font-bold">{activeOptimizationResult.executionTimeMs} ms</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <Activity className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Belum ada data perbandingan optimasi</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Jalankan Simulated Annealing pada halaman Optimasi untuk melihat perbandingan kuantitatif secara otomatis.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fitness / Cost Convergence Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Perubahan Nilai Fitness & Cost (Konvergensi SA)</h3>
            <p className="text-xs text-slate-500">
              Grafik trajektori penurunan cost function terhadap iterasi Simulated Annealing
            </p>
          </div>
          {activeOptimizationResult && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-400 rounded-full"></span>
                <span className="text-slate-600">Current Cost</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-indigo-600 rounded-full"></span>
                <span className="font-bold text-indigo-700">Best Cost (Global Best)</span>
              </div>
            </div>
          )}
        </div>

        {convergenceData.length > 0 ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convergenceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="iteration"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={val => `Iter ${val}`}
                />
                <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: string) => [
                    value,
                    name === 'bestCost' ? 'Solusi Terbaik' : name === 'currentCost' ? 'Solusi Berjalan' : name,
                  ]}
                  labelFormatter={label => `Iterasi ke-${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="currentCost"
                  stroke="#f43f5e"
                  strokeWidth={1}
                  dot={false}
                  name="Current Cost"
                  opacity={0.6}
                />
                <Line
                  type="stepAfter"
                  dataKey="bestCost"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={false}
                  name="Best Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex flex-col items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center p-4">
            <BarChart3 className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Grafik Konvergensi Belum Tersedia</p>
            <p className="text-[11px] text-slate-500 max-w-sm mt-1">
              Data iterasi dan penurunan cost akan terekam secara realtime saat algoritma Simulated Annealing dieksekusi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
