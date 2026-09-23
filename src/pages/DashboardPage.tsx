import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Users,
  DoorOpen,
  Sliders,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
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
import { ScheduleValidationResult } from '../utils/scheduleValidation';
import { Badge } from '../components/ui/Badge';

interface DashboardPageProps {
  courses: Course[];
  lecturers: Lecturer[];
  rooms: Room[];
  timeslots: Timeslot[];
  currentSchedule: ScheduleAssignment[] | null;
  initialSchedule: ScheduleAssignment[] | null;
  activeOptimizationResult: OptimizationResult | null;
  scheduleValidation: ScheduleValidationResult;
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
  scheduleValidation,
  offerings = [],
  packages = [],
  onNavigate,
  onGenerateInitial,
  onRunOptimization,
  isOptimizing,
}) => {
  const isOptimized = Boolean(activeOptimizationResult);
  const hasSchedule = Boolean(currentSchedule && currentSchedule.length > 0);

  const totalOfferings = offerings.length || courses.length;
  const scheduledCount = currentSchedule ? currentSchedule.length : 0;
  const unscheduledCount = Math.max(0, totalOfferings - scheduledCount);

  const hardConflictsCount = scheduleValidation.hardConflictCount;
  const currentConflicts = scheduleValidation.totalConflictsCount;
  const warningCount = scheduleValidation.warningCount;

  const usedRoomIds = new Set(currentSchedule?.map((a) => a.roomId) || []);
  const activeRooms = rooms.filter((r) => r.isActive);

  const convergenceData = activeOptimizationResult?.convergenceHistory || [];

  return (
    <div className="space-y-4">
      {/* A. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sistem Penjadwalan Perkuliahan Teknik Elektro • T.A. 2026/2027 Ganjil
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('scheduling')}
            id="btn-dash-open-unified"
            className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
          >
            Penyusunan Jadwal
          </button>
          <button
            onClick={() => onNavigate('published-schedule')}
            id="btn-dash-view-published"
            className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
          >
            Lihat Jadwal Terbit
          </button>
        </div>
      </div>

      {/* C. Alert jika ada Hard Conflict (Compact Alert Strip) */}
      {hardConflictsCount > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-md px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>{hardConflictsCount} Hard Conflict</strong> terdeteksi pada jadwal aktif.
            </span>
          </div>
          <button
            onClick={() => onNavigate('conflicts')}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 shrink-0"
          >
            <span>Periksa Bentrok</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* B. Status Penjadwalan (1 Baris Ringkasan Horizontal) */}
      <div className="bg-white rounded-md border border-slate-200 p-3 sm:px-4 sm:py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 text-xs">
          <div className="pt-2 sm:pt-0 sm:px-2 first:pl-0">
            <span className="text-slate-500 block text-[11px]">Offering Kelas</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-slate-900 tabular-nums">{totalOfferings}</span>
              <span className="text-[11px] text-slate-400">kelas</span>
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-2">
            <span className="text-slate-500 block text-[11px]">Terjadwal</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-slate-900 tabular-nums">{scheduledCount}</span>
              <span className="text-[11px] text-slate-400">/ {totalOfferings}</span>
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-2">
            <span className="text-slate-500 block text-[11px]">Hard Conflict</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className={`text-base font-semibold tabular-nums ${hardConflictsCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                {hardConflictsCount}
              </span>
              <span className="text-[11px] text-slate-400">bentrok</span>
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-2">
            <span className="text-slate-500 block text-[11px]">Soft Warning</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className={`text-base font-semibold tabular-nums ${warningCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {warningCount}
              </span>
              <span className="text-[11px] text-slate-400">peringatan</span>
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-2">
            <span className="text-slate-500 block text-[11px]">Ruang Aktif</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-slate-900 tabular-nums">{usedRoomIds.size}</span>
              <span className="text-[11px] text-slate-400">/ {activeRooms.length} ruang</span>
            </div>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-2">
            <span className="text-slate-500 block text-[11px]">Dosen Terdaftar</span>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-slate-900 tabular-nums">{lecturers.length}</span>
              <span className="text-[11px] text-slate-400">dosen</span>
            </div>
          </div>
        </div>
      </div>

      {/* D. Section Cepat (Data & Pengaturan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('packages')}
          className="bg-white p-3 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-colors text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-900">Paket Kurikulum</h2>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Struktur 8 semester & 3 KBK konsentrasi
          </p>
        </button>

        <button
          onClick={() => onNavigate('master-lecturers')}
          className="bg-white p-3 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-colors text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-900">Dosen & Ketersediaan</h2>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Data master {lecturers.length} dosen & alokasi waktu
          </p>
        </button>

        <button
          onClick={() => onNavigate('rooms')}
          className="bg-white p-3 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-colors text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-900">Ruang Kuliah</h2>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {rooms.length} ruang kelas & kapasitas
          </p>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className="bg-white p-3 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 transition-colors text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-900">Parameter SA</h2>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Bobot penalti & konfigurasi pendinginan
          </p>
        </button>
      </div>

      {/* E. Grafik Konvergensi SA (jika ada hasil optimasi) */}
      {activeOptimizationResult && (
        <div className="bg-white rounded-md border border-slate-200 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900">
                Konvergensi Optimasi Simulated Annealing
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Waktu komputasi: <span className="font-mono text-slate-700">{activeOptimizationResult.executionTimeMs} ms</span> • Iterasi: <span className="font-mono text-slate-700">{(activeOptimizationResult.totalIterationsCompleted ?? (activeOptimizationResult as any).iterationsCompleted ?? 0).toLocaleString()}</span> • Penalti Akhir: <span className="font-mono font-medium text-slate-700">{activeOptimizationResult.bestCost.toLocaleString()}</span>
              </p>
            </div>
            <button
              onClick={() => onNavigate('optimization')}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Detail Hasil SA</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Convergence Chart */}
          {convergenceData.length > 0 && (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={convergenceData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="iteration" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
                  <Tooltip
                    contentStyle={{ borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    formatter={(val: any) => [val, 'Cost']}
                    labelFormatter={(iter) => `Iterasi ${iter}`}
                  />
                  <Area type="monotone" dataKey="currentCost" stroke="#64748b" strokeWidth={1.5} fill="#f1f5f9" fillOpacity={0.6} name="Cost Iterasi" />
                  <Line type="monotone" dataKey="bestCost" stroke="#0f172a" strokeWidth={2} dot={false} name="Best Cost" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
