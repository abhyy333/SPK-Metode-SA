import React from 'react';
import { Search, Check, X } from 'lucide-react';
import { Course, CurriculumPackage, KBK } from '../../types';

interface SchedulingTemplateViewProps {
  academicTerm: 'ganjil' | 'genap';
  setAcademicTerm: (term: 'ganjil' | 'genap') => void;
  curriculumAvailability: Record<number, boolean>;
  handleToggleCurriculumActive: (year: number) => void;
  termSemesters: number[];
  selectedSemesterFilter: number | 'all';
  setSelectedSemesterFilter: (filter: number | 'all') => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  handleSelectAllTemplate: () => void;
  handleClearAllSelected: () => void;
  totalPlannedCoursesCount: number;
  totalTemplateCoursesCount: number;
  totalPlannedStudentsCount: number;
  totalCalculatedSectionsCount: number;
  activePackages: CurriculumPackage[];
  COHORT_PROJECTIONS: Record<number, number>;
  handleBulkSelectSemester: (sem: number, select: boolean) => void;
  courseMap: Map<string, Course>;
  checkIsPracticum: (course: Course) => boolean;
  plannedCourses: Record<string, any>;
  studentInputMap: Record<string, string>;
  kbks: KBK[];
  handleTogglePackage: (pkg: CurriculumPackage) => void;
  handleToggleCourse: (course: Course, semester: number, curriculumYear: number, kbkId: string | null) => void;
  handleStudentInputChange: (courseId: string, val: string) => void;
  handleStudentInputBlur: (courseId: string) => void;
  createBalancedSections: (count: number, max: number) => { section: string; studentCount: number }[];
  MIN_STUDENTS_PER_CLASS: number;
  MAX_STUDENTS_PER_CLASS: number;
}

export const SchedulingTemplateView: React.FC<SchedulingTemplateViewProps> = ({
  academicTerm,
  setAcademicTerm,
  curriculumAvailability,
  handleToggleCurriculumActive,
  termSemesters,
  selectedSemesterFilter,
  setSelectedSemesterFilter,
  searchQuery,
  setSearchQuery,
  handleSelectAllTemplate,
  handleClearAllSelected,
  totalPlannedCoursesCount,
  totalTemplateCoursesCount,
  totalPlannedStudentsCount,
  totalCalculatedSectionsCount,
  activePackages,
  COHORT_PROJECTIONS,
  handleBulkSelectSemester,
  courseMap,
  checkIsPracticum,
  plannedCourses,
  studentInputMap,
  kbks,
  handleTogglePackage,
  handleToggleCourse,
  handleStudentInputChange,
  handleStudentInputBlur,
  createBalancedSections,
  MIN_STUDENTS_PER_CLASS,
  MAX_STUDENTS_PER_CLASS,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Filter & Curriculum Activation Bar */}
      <div className="bg-white rounded-md p-4 border border-slate-200 space-y-3.5">
        {/* Row 1: Academic Term & Curriculum Active Switches */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Term Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Periode:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setAcademicTerm('ganjil')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  academicTerm === 'ganjil'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Semester Ganjil (1, 3, 5, 7)
              </button>
              <button
                type="button"
                onClick={() => setAcademicTerm('genap')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  academicTerm === 'genap'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                Semester Genap (2, 4, 6, 8)
              </button>
            </div>
          </div>

          {/* Curriculum Active/Inactive Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status Kurikulum:</span>

            {/* Kurikulum 2026 Toggle */}
            <button
              type="button"
              onClick={() => handleToggleCurriculumActive(2026)}
              id="toggle-curr-2026"
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                curriculumAvailability[2026] !== false
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] text-white ${
                  curriculumAvailability[2026] !== false ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                {curriculumAvailability[2026] !== false ? '✓' : '✕'}
              </div>
              <span>Kurikulum 2026 (OBE)</span>
              <span className="text-[10px] uppercase font-semibold opacity-80">
                {curriculumAvailability[2026] !== false ? 'Aktif' : 'Nonaktif'}
              </span>
            </button>

            {/* Kurikulum 2022 Toggle */}
            <button
              type="button"
              onClick={() => handleToggleCurriculumActive(2022)}
              id="toggle-curr-2022"
              className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                curriculumAvailability[2022] !== false
                  ? 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] text-white ${
                  curriculumAvailability[2022] !== false ? 'bg-slate-700' : 'bg-slate-300'
                }`}
              >
                {curriculumAvailability[2022] !== false ? '✓' : '✕'}
              </div>
              <span>Kurikulum 2022</span>
              <span className="text-[10px] uppercase font-semibold opacity-80">
                {curriculumAvailability[2022] !== false ? 'Aktif' : 'Nonaktif'}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Semester Filter, Search, and Global Template Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Semester Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              type="button"
              onClick={() => setSelectedSemesterFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedSemesterFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Semester
            </button>
            {termSemesters.map((sem) => (
              <button
                key={sem}
                type="button"
                onClick={() => setSelectedSemesterFilter(sem)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedSemesterFilter === sem
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semester {sem}
              </button>
            ))}
          </div>

          {/* Search and Bulk Selection Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Cari kode/nama MK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400 w-44 sm:w-52"
              />
            </div>

            <button
              type="button"
              onClick={handleSelectAllTemplate}
              id="btn-select-all-template"
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pilih Semua dari Template</span>
            </button>

            <button
              type="button"
              onClick={handleClearAllSelected}
              id="btn-clear-all-template"
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Kosongkan Semua</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600" />
          <span>
            Status Pemilihan: <strong>{totalPlannedCoursesCount} / {totalTemplateCoursesCount} MK Dipilih</strong> (
            {totalPlannedStudentsCount} Total Mahasiswa • {totalCalculatedSectionsCount} Estimasi Rombel)
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          * Centang checkbox pada mata kuliah yang ingin dibuka di semester ini.
        </div>
      </div>

      {/* Grouped Semester & KBK Package Cards */}
      <div className="space-y-5">
        {termSemesters
          .filter((sem) => selectedSemesterFilter === 'all' || selectedSemesterFilter === sem)
          .map((sem) => {
            const packagesForSem = activePackages.filter((p) => p.semester === sem);
            const cohortProjection = COHORT_PROJECTIONS[sem] || 40;

            if (packagesForSem.length === 0) {
              return (
                <div
                  key={sem}
                  className="bg-white rounded-md border border-slate-200 p-6 text-center space-y-1.5"
                >
                  <h3 className="font-semibold text-xs text-slate-800 uppercase tracking-wider">SEMESTER {sem}</h3>
                  <p className="text-xs text-slate-400">
                    Tidak ada paket aktif untuk semester {sem} (kurikulum terkait dinonaktifkan).
                  </p>
                </div>
              );
            }

            return (
              <div key={sem} className="space-y-2.5">
                {/* Semester Section Header with Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded bg-slate-900 text-white font-semibold text-xs font-mono">
                      SEMESTER {sem}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Proyeksi Kuota Angkatan: <strong className="text-slate-800">{cohortProjection} Mahasiswa</strong>
                    </span>
                  </div>

                  {/* Quick Bulk Actions for this semester */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleBulkSelectSemester(sem, true)}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                    >
                      + Pilih Semua Sem {sem}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkSelectSemester(sem, false)}
                      className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 font-medium text-xs transition-colors cursor-pointer"
                    >
                      ✕ Kosongkan Sem {sem}
                    </button>
                  </div>
                </div>

                {/* Render Packages for this semester */}
                <div className="grid grid-cols-1 gap-3">
                  {packagesForSem.map((pkg) => {
                    const rawItems = pkg.courseItems || [];
                    const validCourses = rawItems
                      .map((item) => {
                        const c = courseMap.get(item.courseId);
                        return c
                          ? {
                              course: c,
                              kbkId: item.kbkId || pkg.kbkId || null,
                            }
                          : null;
                      })
                      .filter((item): item is { course: Course; kbkId: string | null } => Boolean(item))
                      .filter(({ course }) => {
                        if (!searchQuery) return true;
                        return (
                          course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.code.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                      });

                    if (validCourses.length === 0 && searchQuery) {
                      return null;
                    }

                    const theoryCourses = validCourses.filter((v) => !checkIsPracticum(v.course));
                    const selectedCountInPkg = validCourses.filter((v) =>
                      Boolean(plannedCourses[v.course.id])
                    ).length;
                    const isAllPkgSelected =
                      theoryCourses.length > 0 &&
                      theoryCourses.every((v) => Boolean(plannedCourses[v.course.id]));
                    const totalPkgSks = validCourses.reduce((acc, v) => acc + (v.course.sks || 0), 0);

                    const kbkObj = pkg.kbkId ? kbks.find((k) => k.id === pkg.kbkId) : null;
                    const kbkLabel = kbkObj
                      ? `KBK ${kbkObj.code} (${kbkObj.name})`
                      : pkg.kbkId
                      ? `KBK ${pkg.kbkId}`
                      : 'Paket Bersama / Umum';

                    return (
                      <div
                        key={pkg.id}
                        className="bg-white rounded-md border border-slate-200 overflow-hidden"
                      >
                        {/* Package Header Card */}
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isAllPkgSelected}
                                onChange={() => handleTogglePackage(pkg)}
                                className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                              />
                              <div className="font-semibold text-xs text-slate-900">
                                Paket Semester {pkg.semester} — Kurikulum {pkg.curriculumYear}
                              </div>
                            </label>

                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-200 text-slate-800">
                              {kbkLabel}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500">
                              {validCourses.length} MK ({totalPkgSks} SKS)
                            </span>
                            <span className="text-slate-300">•</span>
                            <span
                              className={`font-semibold ${
                                selectedCountInPkg > 0 ? 'text-slate-900' : 'text-slate-400'
                              }`}
                            >
                              Terpilih: {selectedCountInPkg} / {validCourses.length}
                            </span>
                          </div>
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50/70 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3 w-12 text-center">Pilih</th>
                                <th className="py-2.5 px-3">Kode &amp; Mata Kuliah</th>
                                <th className="py-2.5 px-3 w-16 text-center">SKS</th>
                                <th className="py-2.5 px-3 w-28">Kategori</th>
                                <th className="py-2.5 px-3 w-48">Jumlah Mahasiswa</th>
                                <th className="py-2.5 px-3">Estimasi Rombel &amp; Section</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {validCourses.map(({ course, kbkId }) => {
                                const isSelected = Boolean(plannedCourses[course.id]);
                                const isPracticum = checkIsPracticum(course);
                                const rawInput = studentInputMap[course.id] ?? '';
                                const isRawEmpty = rawInput.trim() === '';
                                const parsedCount = isRawEmpty ? 0 : parseInt(rawInput, 10);
                                const isBelowMin =
                                  isSelected &&
                                  !isPracticum &&
                                  !isRawEmpty &&
                                  parsedCount > 0 &&
                                  parsedCount < MIN_STUDENTS_PER_CLASS;
                                const isValidCount =
                                  isSelected && !isPracticum && !isRawEmpty && parsedCount >= MIN_STUDENTS_PER_CLASS;
                                const balanced = isValidCount
                                  ? createBalancedSections(parsedCount, MAX_STUDENTS_PER_CLASS)
                                  : [];

                                return (
                                  <tr
                                    key={course.id}
                                    className={`transition-colors ${
                                      isSelected ? 'bg-slate-50/70 hover:bg-slate-50' : 'hover:bg-slate-50/40 opacity-75'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 text-center align-top">
                                      <input
                                        type="checkbox"
                                        id={`cb-${course.id}`}
                                        checked={isSelected}
                                        onChange={() =>
                                          handleToggleCourse(
                                            course,
                                            pkg.semester,
                                            pkg.curriculumYear,
                                            kbkId
                                          )
                                        }
                                        className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer mt-0.5"
                                      />
                                    </td>

                                    <td className="py-2.5 px-3 align-top">
                                      <label
                                        htmlFor={`cb-${course.id}`}
                                        className="font-medium text-slate-900 cursor-pointer hover:text-slate-700 block text-xs"
                                      >
                                        {course.name}
                                      </label>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-slate-500 font-mono">
                                          {course.code}
                                        </span>
                                        {course.curriculumId && (
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                                            {course.curriculumId}
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="py-2.5 px-3 align-top text-center font-mono font-medium text-slate-800">
                                      {course.sks}
                                    </td>

                                    <td className="py-2.5 px-3 align-top">
                                      {isPracticum ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                          Praktikum
                                        </span>
                                      ) : course.category === 'Pilihan' ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                          Pilihan
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                          Wajib
                                        </span>
                                      )}
                                    </td>

                                    {/* Student Count Input */}
                                    <td className="py-2.5 px-3 align-top">
                                      {isSelected ? (
                                        isPracticum ? (
                                          <div className="text-[11px] text-slate-500 font-medium py-1">
                                            Praktikum Lab (Otomatis)
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                              <input
                                                id={`input-desk-${course.id}`}
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="Isi kuota"
                                                value={rawInput}
                                                onChange={(e) =>
                                                  handleStudentInputChange(course.id, e.target.value)
                                                }
                                                onBlur={() =>
                                                  handleStudentInputBlur(course.id)
                                                }
                                                className={`w-24 px-2 py-1 text-xs rounded border font-mono font-medium text-slate-900 transition-colors ${
                                                  isRawEmpty
                                                    ? 'border-rose-400 bg-rose-50/30'
                                                    : isBelowMin
                                                    ? 'border-amber-400 bg-amber-50/30'
                                                    : 'border-slate-300 bg-white focus:border-slate-500 focus:outline-hidden'
                                                }`}
                                              />
                                              <span className="text-[11px] text-slate-500 font-medium">mhs</span>
                                            </div>

                                            {isRawEmpty && (
                                              <div className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                                                <span>Wajib diisi</span>
                                              </div>
                                            )}

                                            {isBelowMin && (
                                              <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                                                <span>Min. 10 mhs untuk buka kelas</span>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      ) : (
                                        <div className="flex items-center gap-1.5 opacity-40">
                                          <input
                                            type="text"
                                            disabled
                                            placeholder="Isi kuota"
                                            value=""
                                            className="w-24 px-2 py-1 text-xs rounded border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed font-mono"
                                          />
                                          <span className="text-[11px] text-slate-400">mhs</span>
                                        </div>
                                      )}
                                    </td>

                                    {/* Section Breakdown Preview */}
                                    <td className="py-2.5 px-3 align-top">
                                      {isSelected ? (
                                        isPracticum ? (
                                          <span className="text-slate-500 text-[11px] block py-1">
                                            Jadwal Khusus Lab
                                          </span>
                                        ) : isRawEmpty ? (
                                          <span className="text-slate-400 italic text-[11px] block py-1">
                                            Jumlah mahasiswa belum diisi
                                          </span>
                                        ) : isBelowMin ? (
                                          <span className="text-rose-600 font-semibold text-[11px] block py-1">
                                            &lt; 10 mhs (Tidak Dibuka)
                                          </span>
                                        ) : isValidCount ? (
                                          <div className="py-0.5">
                                            <span className="text-slate-900 font-semibold text-xs font-mono">
                                              {balanced.length} Rombel Kelas
                                            </span>
                                            <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                                              {balanced.map((b) => `${b.section}: ${b.studentCount} mhs`).join(', ')}
                                            </div>
                                          </div>
                                        ) : (
                                          <span className="text-slate-400 block py-1">-</span>
                                        )
                                      ) : (
                                        <span className="text-slate-400 text-[11px] block py-1">
                                          Belum dicentang
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Package Cards */}
                        <div className="sm:hidden divide-y divide-slate-100">
                          {validCourses.map(({ course, kbkId }) => {
                            const isSelected = Boolean(plannedCourses[course.id]);
                            const isPracticum = checkIsPracticum(course);
                            const rawInput = studentInputMap[course.id] ?? '';
                            const isRawEmpty = rawInput.trim() === '';
                            const parsedCount = isRawEmpty ? 0 : parseInt(rawInput, 10);
                            const isBelowMin =
                              isSelected &&
                              !isPracticum &&
                              !isRawEmpty &&
                              parsedCount > 0 &&
                              parsedCount < MIN_STUDENTS_PER_CLASS;
                            const isValidCount =
                              isSelected && !isPracticum && !isRawEmpty && parsedCount >= MIN_STUDENTS_PER_CLASS;
                            const balanced = isValidCount
                              ? createBalancedSections(parsedCount, MAX_STUDENTS_PER_CLASS)
                              : [];

                            return (
                              <div
                                key={course.id}
                                className={`p-3 space-y-2 ${
                                  isSelected ? 'bg-slate-50' : 'bg-white'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="pt-0.5">
                                    <input
                                      id={`cb-mob-${course.id}`}
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() =>
                                        handleToggleCourse(
                                          course,
                                          pkg.semester,
                                          pkg.curriculumYear,
                                          kbkId
                                        )
                                      }
                                      className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <label
                                      htmlFor={`cb-mob-${course.id}`}
                                      className="font-medium text-slate-900 text-xs leading-snug cursor-pointer block"
                                    >
                                      {course.name}
                                    </label>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span className="text-[10px] text-slate-600 font-mono bg-slate-100 px-1 py-0.2 rounded">
                                        {course.code}
                                      </span>
                                      <span className="text-[11px] font-mono text-slate-700">
                                        {course.sks} SKS
                                      </span>
                                      <span className="text-slate-300">•</span>
                                      {isPracticum ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                          Praktikum
                                        </span>
                                      ) : course.category === 'Pilihan' ? (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                          Pilihan
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                                          Wajib
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile Input & Status (when selected) */}
                                {isSelected && (
                                  <div className="pl-6 pt-1.5 space-y-1.5 border-t border-slate-200/60 mt-1">
                                    {isPracticum ? (
                                      <div className="text-[11px] text-slate-500 font-medium">
                                        Jadwal Khusus Praktikum Laboratorium
                                      </div>
                                    ) : (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <span className="text-xs text-slate-700 font-medium">
                                            Jumlah Mahasiswa:
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              id={`input-mob-${course.id}`}
                                              type="text"
                                              inputMode="numeric"
                                              placeholder="Kuota"
                                              value={rawInput}
                                              onChange={(e) =>
                                                handleStudentInputChange(course.id, e.target.value)
                                              }
                                              onBlur={() =>
                                                handleStudentInputBlur(course.id)
                                              }
                                              className={`w-20 px-2 py-0.5 text-xs rounded border font-mono font-medium text-slate-900 transition-colors ${
                                                isRawEmpty
                                                  ? 'border-rose-400 bg-rose-50/30'
                                                  : isBelowMin
                                                  ? 'border-amber-400 bg-amber-50/30'
                                                  : 'border-slate-300 bg-white'
                                              }`}
                                            />
                                            <span className="text-xs text-slate-500 font-medium">mhs</span>
                                          </div>
                                        </div>

                                        {isRawEmpty && (
                                          <div className="text-[10px] text-rose-600 font-medium">
                                            Jumlah mahasiswa wajib diisi
                                          </div>
                                        )}

                                        {isBelowMin && (
                                          <div className="text-[10px] text-amber-700 font-medium">
                                            Minimal 10 mhs untuk membuka rombel
                                          </div>
                                        )}

                                        {isValidCount && (
                                          <div className="p-2 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-800 space-y-0.5 font-mono">
                                            <div className="font-semibold text-slate-900">
                                              Status: {balanced.length} Rombel Kelas
                                            </div>
                                            <div className="text-slate-600">
                                              {balanced.map((b) => `${b.section}: ${b.studentCount} mhs`).join(', ')}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
