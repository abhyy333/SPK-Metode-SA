import React from 'react';
import {
  Printer,
  Download,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  Clock,
  Building,
} from 'lucide-react';
import {
  OptimizationResult,
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConflictItem,
} from '../types';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

interface ReportsPageProps {
  activeOptimizationResult: OptimizationResult | null;
  currentSchedule: ScheduleAssignment[] | null;
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  rooms: Room[];
  timeslots: Timeslot[];
  conflicts: ConflictItem[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  activeOptimizationResult,
  currentSchedule,
  courses,
  lecturers,
  classes,
  rooms,
  timeslots,
  conflicts,
}) => {
  const { showToast } = useToast();

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const lecturerMap = new Map<string, Lecturer>(lecturers.map(l => [l.id, l]));
  const classMap = new Map<string, ClassGroup>(classes.map(cl => [cl.id, cl]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const timeslotMap = new Map<string, Timeslot>(timeslots.map(t => [t.id, t]));

  const handleExportCSV = () => {
    if (!currentSchedule || currentSchedule.length === 0) {
      showToast('warning', 'Tidak Ada Jadwal', 'Belum ada jadwal yang siap diekspor.');
      return;
    }

    const headers = ['Hari', 'Waktu', 'Kode Matkul', 'Nama Matkul', 'SKS', 'Kelas', 'Dosen', 'Ruangan'];
    const rows = currentSchedule.map(assign => {
      const c = courseMap.get(assign.courseId);
      const l = c ? lecturerMap.get(c.lecturerId) : null;
      const cl = c ? classMap.get(c.classId) : null;
      const r = roomMap.get(assign.roomId);
      const t = timeslotMap.get(assign.timeslotId);

      return [
        `"${t?.day || ''}"`,
        `"${t?.label || ''}"`,
        `"${c?.code || ''}"`,
        `"${c?.name || ''}"`,
        c?.sks || 0,
        `"${cl?.code || ''}"`,
        `"${l?.name || ''}"`,
        `"${r?.code || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jadwal_Teknik_Elektro_UNRAM_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'File CSV Berhasil Diunduh', 'Rekap jadwal perkuliahan berhasil diekspor.');
  };

  const handleExportJSON = () => {
    if (!currentSchedule || currentSchedule.length === 0) return;
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            institution: 'Jurusan Teknik Elektro - Universitas Mataram',
            optimizationResult: activeOptimizationResult,
            schedule: currentSchedule,
            conflicts,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Hasil_Optimasi_SA_Elektro_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('success', 'File JSON Berhasil Diunduh', 'Hasil dan parameter optimasi diekspor.');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Laporan & Rekapitulasi Jadwal Kuliah</h2>
          <p className="text-xs text-slate-500">
            Dokumen resmi hasil optimasi jadwal perkuliahan untuk kebutuhan evaluasi dan skripsi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Academic Header */}
        <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
          <h3 className="text-xs font-bold tracking-wider text-slate-600 uppercase">
            KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
          </h3>
          <h2 className="text-base font-extrabold text-slate-900 uppercase">
            UNIVERSITAS MATARAM — FAKULTAS TEKNIK
          </h2>
          <h1 className="text-lg font-black text-indigo-900 uppercase">
            JURUSAN TEKNIK ELEKTRO
          </h1>
          <p className="text-[11px] text-slate-500">
            Jl. Majapahit No. 62, Mataram, Nusa Tenggara Barat • Telp: (0370) 636087 • Web: elektro.unram.ac.id
          </p>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-full">
              LAPORAN HASIL PENJADWALAN MENGGUNAKAN SIMULATED ANNEALING
            </span>
          </div>
        </div>

        {/* Thesis & System Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800">Identitas Penelitian / Sistem:</div>
            <div className="text-slate-600">
              Judul: <span className="font-medium text-slate-900 italic">"Pengembangan Sistem Pendukung Keputusan Penjadwalan Perkuliahan Menggunakan Simulated Annealing"</span>
            </div>
            <div className="text-slate-600">
              Target Semester: <span className="font-semibold text-slate-900">Ganjil 2026/2027</span>
            </div>
            <div className="text-slate-600">
              Total Mata Kuliah Terjadwal: <span className="font-semibold text-slate-900">{currentSchedule?.length || 0} Kelas</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-800">Parameter Optimasi Terpasang:</div>
            <div className="text-slate-600">
              Suhu Awal (T₀): <span className="font-mono font-semibold">{activeOptimizationResult?.parameters.initialTemperature || 1000}</span> | Pendinginan (α): <span className="font-mono font-semibold">{activeOptimizationResult?.parameters.coolingRate || 0.995}</span>
            </div>
            <div className="text-slate-600">
              Batas Iterasi (N): <span className="font-mono font-semibold">{activeOptimizationResult?.parameters.maxIterations || 5000}</span> | Mutasi: <span className="font-mono font-semibold">{activeOptimizationResult?.parameters.mutationRate || 0.2}</span>
            </div>
            <div className="text-slate-600">
              Waktu Eksekusi: <span className="font-mono font-semibold text-indigo-700">{activeOptimizationResult?.executionTimeMs || 0} ms</span>
            </div>
          </div>
        </div>

        {/* Optimization Metrics Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            1. Perbandingan Metrik Evaluasi Jadwal
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Metrik Evaluasi</th>
                  <th className="px-4 py-2.5 text-center">Sebelum Optimasi (Initial)</th>
                  <th className="px-4 py-2.5 text-center bg-indigo-50/60 text-indigo-950">
                    Setelah Optimasi (Final Best)
                  </th>
                  <th className="px-4 py-2.5 text-right">Tingkat Efisiensi / Perbaikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-2.5 font-medium">Total Konflik Batasan</td>
                  <td className="px-4 py-2.5 text-center font-bold text-rose-600">
                    {activeOptimizationResult?.initialConflicts.total ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold text-emerald-600 bg-indigo-50/30">
                    {activeOptimizationResult?.bestConflicts.total ?? conflicts.length}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-indigo-700">
                    {activeOptimizationResult && activeOptimizationResult.initialConflicts.total > 0
                      ? `${(
                          ((activeOptimizationResult.initialConflicts.total -
                            activeOptimizationResult.bestConflicts.total) /
                            activeOptimizationResult.initialConflicts.total) *
                          100
                        ).toFixed(1)}%`
                      : '-'}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Hard Constraints (C1 - C5)</td>
                  <td className="px-4 py-2.5 text-center font-semibold">
                    {activeOptimizationResult?.initialConflicts.hard ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold text-emerald-700 bg-indigo-50/30">
                    {activeOptimizationResult?.bestConflicts.hard ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-700">0 Hard Conflict Target</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Soft Constraints (Preferensi)</td>
                  <td className="px-4 py-2.5 text-center font-semibold">
                    {activeOptimizationResult?.initialConflicts.soft ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-semibold text-emerald-700 bg-indigo-50/30">
                    {activeOptimizationResult?.bestConflicts.soft ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-700">Preferensi Optimal</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium">Total Nilai Cost Function</td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold">
                    {activeOptimizationResult?.initialCost ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30">
                    {activeOptimizationResult?.bestCost ?? '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                    {activeOptimizationResult && activeOptimizationResult.initialCost > 0
                      ? `${(
                          ((activeOptimizationResult.initialCost - activeOptimizationResult.bestCost) /
                            activeOptimizationResult.initialCost) *
                          100
                        ).toFixed(1)}% Cost Reduction`
                      : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Complete Schedule Master Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            2. Rekapitulasi Jadwal Kuliah Lengkap
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-3 py-2">Hari & Waktu</th>
                  <th className="px-3 py-2">Kode</th>
                  <th className="px-3 py-2">Mata Kuliah</th>
                  <th className="px-2 py-2 text-center">SKS</th>
                  <th className="px-2 py-2">Kelas</th>
                  <th className="px-3 py-2">Dosen Pengampu</th>
                  <th className="px-3 py-2">Ruangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(currentSchedule || []).map(assign => {
                  const c = courseMap.get(assign.courseId);
                  const l = c ? lecturerMap.get(c.lecturerId) : null;
                  const cl = c ? classMap.get(c.classId) : null;
                  const r = roomMap.get(assign.roomId);
                  const t = timeslotMap.get(assign.timeslotId);

                  return (
                    <tr key={assign.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-semibold whitespace-nowrap text-slate-900">
                        {t?.day}, {t?.label}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-700">{c?.code}</td>
                      <td className="px-3 py-2 font-medium">{c?.name}</td>
                      <td className="px-2 py-2 text-center font-bold">{c?.sks}</td>
                      <td className="px-2 py-2 font-semibold">{cl?.code}</td>
                      <td className="px-3 py-2">{l?.name}</td>
                      <td className="px-3 py-2 font-mono font-semibold">{r?.code}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signatures for Thesis / Academic Validation */}
        <div className="pt-8 grid grid-cols-2 text-xs text-center text-slate-800">
          <div>
            <p className="text-slate-500 mb-16">Mengetahui,<br />Ketua Jurusan Teknik Elektro</p>
            <p className="font-bold underline text-slate-900">Dr. Ir. I Made Arya, M.T.</p>
            <p className="text-[11px] text-slate-500 font-mono">NIP. 197405121999031002</p>
          </div>

          <div>
            <p className="text-slate-500 mb-16">Mataram, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Dosen Pembimbing Skripsi</p>
            <p className="font-bold underline text-slate-900">Ir. Nurul Hidayati, M.Eng.</p>
            <p className="text-[11px] text-slate-500 font-mono">NIP. 197808202005012001</p>
          </div>
        </div>
      </div>
    </div>
  );
};
