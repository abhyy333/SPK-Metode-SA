import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Users,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AcademicPeriod } from '../../types/masterLecturer';
import { MasterLecturerImportService, SyncOfferingsResult } from '../../services/masterLecturerImportService';
import { StorageService } from '../../services/storageService';

interface MasterLecturerSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess: (message: string) => void;
  defaultPeriod?: AcademicPeriod;
}

export const MasterLecturerSyncModal: React.FC<MasterLecturerSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
  defaultPeriod = 'GANJIL',
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod>(defaultPeriod);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Calculate prospective sync preview
  const preview = useMemo(() => {
    if (!isOpen) return null;
    const offerings = StorageService.getCourseOfferings();
    const masterData = StorageService.getMasterLecturerAssignments().filter(
      (d) => d.academic_period === selectedPeriod
    );
    const lecturers = StorageService.getLecturers();

    const normalizeCourse = (name: string) =>
      (name || '').toLowerCase().replace(/[\(\)\-\_\,\.\s]/g, '');

    const prospectiveUpdates: SyncOfferingsResult['updatedOfferings'] = [];
    let matchCount = 0;

    offerings.forEach((offering) => {
      const offCourseName = offering.courseName || '';
      const offSec = (offering.section || '').trim().toUpperCase();
      const normOffCourse = normalizeCourse(offCourseName);

      // 1. Exact match on raw_course_name
      let matchedRows = masterData.filter((m) => {
        const mCourse = m.raw_course_name.trim().toLowerCase();
        if (offSec && mCourse === `${offCourseName.toLowerCase()} - ${offSec.toLowerCase()}`) return true;
        if (mCourse === offCourseName.toLowerCase()) return true;
        return false;
      });

      // 2. Base course name match
      if (matchedRows.length === 0) {
        matchedRows = masterData.filter((m) => {
          const normBase = normalizeCourse(m.base_course_name);
          const nameMatches = normBase === normOffCourse || normBase.includes(normOffCourse) || normOffCourse.includes(normBase);
          if (!nameMatches) return false;
          if (offSec && m.section) {
            return m.section.toUpperCase() === offSec;
          }
          return true;
        });
      }

      if (matchedRows.length > 0) {
        matchCount++;
        const newLecNames: string[] = [];
        matchedRows.forEach((r) => {
          if (r.lecturer_id) {
            const found = lecturers.find((l) => l.id === r.lecturer_id);
            if (found && !newLecNames.includes(found.name)) newLecNames.push(found.name);
          } else if (r.raw_lecturer_name) {
            if (!newLecNames.includes(r.raw_lecturer_name)) newLecNames.push(r.raw_lecturer_name);
          }
        });

        prospectiveUpdates.push({
          offeringId: offering.id,
          courseName: offering.courseName || offering.courseCode || 'Mata Kuliah',
          section: offering.section,
          previousLecturers: offering.lecturerNames || (offering.lecturerId ? [offering.lecturerId] : ['-']),
          newLecturers: newLecNames.length > 0 ? newLecNames : ['-'],
        });
      }
    });

    return {
      totalOfferings: offerings.length,
      matchedOfferings: matchCount,
      updates: prospectiveUpdates,
    };
  }, [isOpen, selectedPeriod]);

  const handleExecuteSync = () => {
    setIsProcessing(true);
    try {
      const result = MasterLecturerImportService.syncToCourseOfferings(selectedPeriod);
      onSyncSuccess(
        `Sinkronisasi berhasil: ${result.updatedCount} seksi Course Offering diperbarui sesuai Master Dosen Pengampu (${selectedPeriod}).`
      );
      onClose();
    } catch (err: any) {
      alert(`Gagal melakukan sinkronisasi: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sinkronisasi Dosen Pengampu ke Course Offering"
      maxWidth="3xl"
    >
      <div className="space-y-5">
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="text-xs text-indigo-900 leading-relaxed">
            Fitur ini akan secara otomatis memperbarui penugasan dosen pada seluruh <strong>Course Offering</strong> aktif berdasarkan data <strong>Master Dosen Pengampu</strong> (termasuk kelas multi-dosen / Team Teaching).
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Target Periode Akademik:
          </span>
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm text-xs">
            <button
              type="button"
              onClick={() => setSelectedPeriod('GANJIL')}
              className={`px-3 py-1.5 font-bold rounded-md transition-all ${
                selectedPeriod === 'GANJIL' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester Ganjil
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod('GENAP')}
              className={`px-3 py-1.5 font-bold rounded-md transition-all ${
                selectedPeriod === 'GENAP' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semester Genap
            </button>
          </div>
        </div>

        {/* Summary Metric */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500 font-medium">Total Course Offering Aktif</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {preview?.totalOfferings || 0} Seksi
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="text-xs text-emerald-700 font-medium">Seksi Cocok dengan Master</div>
            <div className="text-xl font-bold text-emerald-900 mt-0.5">
              {preview?.matchedOfferings || 0} Seksi
            </div>
          </div>
        </div>

        {/* Preview Table */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Pratinjau Alokasi Dosen yang Akan Diterapkan
          </div>
          <div className="max-h-[35vh] overflow-y-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 sticky top-0 font-bold text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="p-2.5 min-w-[180px]">Mata Kuliah & Kelas</th>
                  <th className="p-2.5 min-w-[200px]">Dosen Sebelum Sync</th>
                  <th className="p-2.5 w-8 text-center"></th>
                  <th className="p-2.5 min-w-[200px] text-emerald-800">Dosen Baru (Master)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {(!preview?.updates || preview.updates.length === 0) ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Tidak ada seksi course offering yang cocok dengan periode ini.
                    </td>
                  </tr>
                ) : (
                  preview.updates.map((item, idx) => (
                    <tr key={item.offeringId || idx} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{item.courseName}</div>
                        {item.section && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 mt-0.5">
                            Kelas {item.section}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {item.previousLecturers.join(', ')}
                      </td>
                      <td className="p-2.5 text-center text-slate-400">
                        <ArrowRight className="w-3.5 h-3.5 mx-auto text-indigo-500" />
                      </td>
                      <td className="p-2.5 font-medium text-emerald-900 bg-emerald-50/40">
                        {item.newLecturers.join(', ')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExecuteSync}
            disabled={isProcessing || !preview?.matchedOfferings}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Menerapkan Sinkronisasi...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terapkan Sinkronisasi ({preview?.matchedOfferings || 0} Seksi)
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
