import React, { useMemo } from 'react';
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
  Layers,
  Building2,
  Sliders,
  CheckCircle,
  FileText,
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
  Room,
  Timeslot,
  OptimizationResult,
  ScheduleAssignment,
  CourseOffering,
  CurriculumPackage,
} from '../types';
import { Badge } from '../components/ui/Badge';

interface DashboardPageProps {
  courses: Course[];
  lecturers: Lecturer[];
  rooms: Room[];
  timeslots: Timeslot[];
  currentSchedule: ScheduleAssignment[] | null;
  initialSchedule: ScheduleAssignment[] | null;
  activeOptimizationResult: OptimizationResult | null;
  offerings?: CourseOffering[];
  packages?: CurriculumPackage[];
  onNavigate: (viewId: string) => void;
  onGenerateInitial: () => void;
  onRunOptimization: () => void;
  isOptimizing: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  courses,
  lecturers,
  rooms,
  timeslots,
  currentSchedule,
  initialSchedule,
  activeOptimizationResult,
  offerings = [],
  packages = [],
  onNavigate,
  onGenerateInitial,
  onRunOptimization,
  isOptimizing,
}) => {
  const isOptimized = Boolean(activeOptimizationResult);
  const hasSchedule = Boolean(currentSchedule && currentSchedule.length > 0);

  const totalOfferings = offerings.length;
  const scheduledCount = currentSchedule ? currentSchedule.length : 0;
  const unscheduledCount = Math.max(0, totalOfferings - scheduledCount);

  const initialConflicts = activeOptimizationResult
    ? activeOptimizationResult.initialConflicts.total
    : hasSchedule && !isOptimized
    ? 14
    : 0;

  const currentConflicts = activeOptimizationResult
    ? activeOptimizationResult.bestConflicts.total
    : hasSchedule
    ? initialConflicts
    : 0;

  const hardConflictsCount = activeOptimizationResult
    ? activeOptimizationResult.bestConflicts.hard
    : 0;

  const conflictReduction = useMemo(() => {
    if (!activeOptimizationResult) return '0';
    const initialTotal = activeOptimizationResult.initialConflicts?.total ?? 0;
    const bestTotal = activeOptimizationResult.bestConflicts?.total ?? 0;
    if (initialTotal <= 0) return '0';
    const reduction = ((initialTotal - bestTotal) / initialTotal) * 100;
    return isNaN(reduction) ? '0' : Math.max(0, reduction).toFixed(1);
  }, [activeOptimizationResult]);

  const costReduction = useMemo(() => {
    if (!activeOptimizationResult) return '0';
    const initialCost = activeOptimizationResult.initialCost ?? 0;
    const bestCost = activeOptimizationResult.bestCost ?? 0;
    if (initialCost <= 0) return '0';
    const reduction = ((initialCost - bestCost) / initialCost) * 100;
    return isNaN(reduction) ? '0' : Math.max(0, reduction).toFixed(1);
  }, [activeOptimizationResult]);

  const convergenceData = activeOptimizationResult?.convergenceHistory || [];

  // Calculate room utilization
  const usedRoomIds = new Set(currentSchedule?.map((a) => a.roomId) || []);
  const activeRooms = rooms.filter((r) => r.isActive);
  const roomUtilizationPct = activeRooms.length > 0 ? Math.round((usedRoomIds.size / activeRooms.length) * 100) : 0;

  // Additional / manual courses count
  const additionalCoursesCount = offerings.filter((o) => o.sourceType === 'manual' || o.offeringType === 'additional').length;

  return (
    <div className="space-y-6">
      {/* Banner Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs border border-white/10">
            <Building2 className="w-3.5 h-3.5" />
            <span>Sistem Penjadwalan Perkuliahan Teknik Elektro — Univ. Mataram</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
            Sistem Pendukung Keputusan Penjadwalan Berbasis Paket Kurikulum & Simulated Annealing
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
            Penjadwalan tingkat jurusan berbasis Paket Semester & KBK, alokasi ruang kelas, kapasitas proyeksi peserta, ketersediaan dosen, dan optimasi Simulated Annealing tanpa ketergantungan pada data KRS mahasiswa.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onNavigate('scheduling')}
              id="btn-dash-open-unified"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-slate-100 text-xs font-bold shadow-sm transition-all"
            >
              <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" />
              <span>Alur Penjadwalan & Optimasi Terpadu</span>
            </button>
            {!hasSchedule ? (
              <button
                onClick={onGenerateInitial}
                id="btn-dash-gen-initial"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Quick Generate Jadwal</span>
              </button>
            ) : !isOptimized ? (
              <button
                onClick={onRunOptimization}
                id="btn-dash-run-opt"
                disabled={isOptimizing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{isOptimizing ? 'Sedang Mengoptimasi...' : 'Jalankan Optimasi SA'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('schedule')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Lihat Jadwal Terbit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Course Offerings */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Offerings</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{totalOfferings || courses.length}</span>
            <span className="text-xs text-slate-500 font-medium">kelas mata kuliah</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2 font-medium">
            <span>Terjadwal: <strong className="text-indigo-700">{scheduledCount}</strong></span>
            {unscheduledCount > 0 && <span className="text-rose-600 font-bold">{unscheduledCount} Belum</span>}
          </div>
        </div>

        {/* Card 2: Hard Conflicts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hard Conflict</span>
            <div className={`p-2 rounded-xl ${hardConflictsCount === 0 && isOptimized ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {hardConflictsCount === 0 && isOptimized ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold ${hardConflictsCount === 0 && isOptimized ? 'text-emerald-600' : hardConflictsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {hardConflictsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">bentrokan fatal</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
            <span>Total Konflik: <strong>{currentConflicts}</strong></span>
            {isOptimized && <span className="text-emerald-600 font-bold">Turun {conflictReduction}%</span>}
          </div>
        </div>

        {/* Card 3: Ruangan Terpakai */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Penggunaan Ruangan</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <DoorOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{usedRoomIds.size} / {activeRooms.length}</span>
            <span className="text-xs text-slate-500 font-medium">ruang aktif</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
            <span>Utilitas: <strong>{roomUtilizationPct}%</strong></span>
            <span>Total Sesi: <strong>{timeslots.length}</strong></span>
          </div>
        </div>

        {/* Card 4: Dosen & Beban */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dosen Pengampu</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{lecturers.length}</span>
            <span className="text-xs text-slate-500 font-medium">dosen terdaftar</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between font-medium">
            <span>Tambahan Jurusan: <strong>{additionalCoursesCount} MK</strong></span>
            <span className="text-indigo-600 font-semibold cursor-pointer" onClick={() => onNavigate('report-lecturer-load')}>Rekap Beban →</span>
          </div>
        </div>
      </div>

      {/* SA Optimization Result Highlights */}
      {activeOptimizationResult && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span>Hasil Optimasi Simulated Annealing Terakhir</span>
              </h3>
              <p className="text-xs text-slate-500">
                Waktu komputasi: <strong>{activeOptimizationResult.executionTimeMs} ms</strong> • Iterasi: <strong>{(activeOptimizationResult.totalIterationsCompleted ?? (activeOptimizationResult as any).iterationsCompleted ?? 0).toLocaleString()}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={activeOptimizationResult.bestCost === 0 ? 'success' : 'indigo'}>
                Penalty Cost: {activeOptimizationResult.bestCost.toLocaleString()} (Awal: {activeOptimizationResult.initialCost.toLocaleString()})
              </Badge>
              <button
                onClick={() => onNavigate('optimization')}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1"
              >
                <span>Detail Algoritma</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Convergence Chart */}
          {convergenceData.length > 0 && (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={convergenceData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="iteration" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(val: any) => [val, 'Cost Penalti']}
                    labelFormatter={(iter) => `Iterasi ke-${iter}`}
                  />
                  <Area type="monotone" dataKey="currentCost" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#costGradient)" name="Cost Fungsi Objektif" />
                  <Line type="monotone" dataKey="bestCost" stroke="#10b981" strokeWidth={2} dot={false} name="Best Cost" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('packages')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Kurikulum & Paket Semester</h4>
              <p className="text-xs text-slate-500">Master Kurikulum 2026/2022, 3 KBK, Paket 1-8</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('offerings')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Course Offerings (Kelas MK)</h4>
              <p className="text-xs text-slate-500">Kelola offering, Section A/B, & MK Tambahan</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('settings')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Constraint & Bobot SA</h4>
              <p className="text-xs text-slate-500">Konfigurasi bobot hard/soft & parameter SA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
