import React from 'react';
import { Search, Check, X, AlertTriangle } from 'lucide-react';
import { Course, KBK } from '../../types';

interface SchedulingCustomManualViewProps {
  academicTerm: 'ganjil' | 'genap';
  setAcademicTerm: (term: 'ganjil' | 'genap') => void;
  filteredCustomCourses: Course[];
  customFilterSearch: string;
  setCustomFilterSearch: (val: string) => void;
  customFilterCurriculum: number | 'all';
  setCustomFilterCurriculum: (val: number | 'all') => void;
  customFilterSemester: number | 'all';
  setCustomFilterSemester: (val: number | 'all') => void;
  customFilterKbk: string | 'all';
  setCustomFilterKbk: (val: string | 'all') => void;
  customFilterCategory: string | 'all';
  setCustomFilterCategory: (val: string | 'all') => void;
  plannedCourses: Record<string, any>;
  studentInputMap: Record<string, string>;
  kbks: KBK[];
  totalPlannedCoursesCount: number;
  totalPlannedStudentsCount: number;
  totalCalculatedSectionsCount: number;
  checkIsPracticum: (course: Course) => boolean;
  isOutOfActivePeriod: (course: Course) => boolean;
  handleToggleCourse: (course: Course, semester: number, curriculumYear: number, kbkId: string | null) => void;
  handleStudentInputChange: (courseId: string, val: string) => void;
  handleStudentInputBlur: (courseId: string) => void;
  createBalancedSections: (count: number, max: number) => { section: string; studentCount: number }[];
  MIN_STUDENTS_PER_CLASS: number;
  MAX_STUDENTS_PER_CLASS: number;
  handleSelectAllFilteredCustom: () => void;
  handleClearAllSelected: () => void;
}

export const SchedulingCustomManualView: React.FC<SchedulingCustomManualViewProps> = ({
  academicTerm,
  setAcademicTerm,
  filteredCustomCourses,
  customFilterSearch,
  setCustomFilterSearch,
  customFilterCurriculum,
  setCustomFilterCurriculum,
  customFilterSemester,
  setCustomFilterSemester,
  customFilterKbk,
  setCustomFilterKbk,
  customFilterCategory,
  setCustomFilterCategory,
  plannedCourses,
  studentInputMap,
  kbks,
  totalPlannedCoursesCount,
  totalPlannedStudentsCount,
  totalCalculatedSectionsCount,
  checkIsPracticum,
  isOutOfActivePeriod,
  handleToggleCourse,
  handleStudentInputChange,
  handleStudentInputBlur,
  createBalancedSections,
  MIN_STUDENTS_PER_CLASS,
  MAX_STUDENTS_PER_CLASS,
  handleSelectAllFilteredCustom,
  handleClearAllSelected,
}) => {
  return (
    <div className="space-y-4">
      {/* Filter Toolbar for Custom Manual Mode */}
      <div className="bg-white rounded-md p-4 border border-slate-200 space-y-3.5">
        {/* Row 1: Target Academic Term Switcher & Quick Bulk Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Periode Target:</span>
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

          {/* Bulk Select Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSelectAllFilteredCustom}
              id="btn-select-all-filtered-custom"
              className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Pilih Semua Terfilter ({filteredCustomCourses.filter((c) => !checkIsPracticum(c)).length} MK)</span>
            </button>
            <button
              type="button"
              onClick={handleClearAllSelected}
              id="btn-clear-all-custom"
              className="px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Kosongkan Semua</span>
            </button>
          </div>
        </div>

        {/* Row 2: Multi-Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Cari MK:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Kode / Nama MK..."
                value={customFilterSearch}
                onChange={(e) => setCustomFilterSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white font-medium focus:border-slate-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Filter Kurikulum */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Kurikulum:
            </label>
            <select
              value={customFilterCurriculum}
              onChange={(e) =>
                setCustomFilterCurriculum(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white font-medium focus:border-slate-400 focus:outline-hidden"
            >
              <option value="all">Semua Kurikulum</option>
              <option value={2026}>Kurikulum 2026 (OBE)</option>
              <option value={2022}>Kurikulum 2022</option>
            </select>
          </div>

          {/* Filter Semester */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Semester:
            </label>
            <select
              value={customFilterSemester}
              onChange={(e) =>
                setCustomFilterSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white font-medium focus:border-slate-400 focus:outline-hidden"
            >
              <option value="all">Semua Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filter KBK */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Peminatan / KBK:
            </label>
            <select
              value={customFilterKbk}
              onChange={(e) => setCustomFilterKbk(e.target.value)}
              className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white font-medium focus:border-slate-400 focus:outline-hidden"
            >
              <option value="all">Semua KBK</option>
              <option value="none">Tanpa KBK / Bersama</option>
              {kbks.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.code} - {k.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kategori / Jenis */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Jenis MK:
            </label>
            <select
              value={customFilterCategory}
              onChange={(e) => setCustomFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-white font-medium focus:border-slate-400 focus:outline-hidden"
            >
              <option value="all">Semua Jenis</option>
              <option value="Wajib">MK Wajib</option>
              <option value="Pilihan">MK Pilihan</option>
              <option value="Praktikum">Praktikum Lab</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-600" />
          <span>
            Hasil Filter: <strong>{filteredCustomCourses.length} MK</strong> (Total Dipilih:{' '}
            <strong>{totalPlannedCoursesCount} MK</strong> • {totalPlannedStudentsCount} Mahasiswa •{' '}
            {totalCalculatedSectionsCount} Estimasi Rombel)
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          * Mata kuliah di luar periode {academicTerm === 'ganjil' ? 'Ganjil' : 'Genap'} ditandai dengan label peringatan.
        </div>
      </div>

      {/* Custom Manual Courses Table & Cards */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/70 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Pilih</th>
                <th className="py-2.5 px-3">Kode &amp; Nama Mata Kuliah</th>
                <th className="py-2.5 px-3 w-16 text-center">SKS</th>
                <th className="py-2.5 px-3 w-20 text-center">Semester</th>
                <th className="py-2.5 px-3 w-36">Kurikulum &amp; KBK</th>
                <th className="py-2.5 px-3 w-48">Jumlah Mahasiswa</th>
                <th className="py-2.5 px-3">Estimasi Rombel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCustomCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Tidak ada mata kuliah yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredCustomCourses.map((course) => {
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
                  const sem = course.semester || (course as any).recommendedSemester || 1;
                  const isOut = isOutOfActivePeriod(course);
                  const currYear =
                    (course as any).curriculumYear ||
                    (course.curriculumId?.includes('2022') || course.code?.startsWith('FB') ? 2022 : 2026);
                  const kbkObj = course.kbkId ? kbks.find((k) => k.id === course.kbkId) : null;

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
                          id={`custom-cb-${course.id}`}
                          checked={isSelected}
                          onChange={() =>
                            handleToggleCourse(
                              course,
                              sem,
                              currYear,
                              course.kbkId || null
                            )
                          }
                          className="w-3.5 h-3.5 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer mt-0.5"
                        />
                      </td>

                      <td className="py-2.5 px-3 align-top">
                        <label
                          htmlFor={`custom-cb-${course.id}`}
                          className="font-medium text-slate-900 cursor-pointer hover:text-slate-700 block text-xs"
                        >
                          {course.name}
                        </label>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-slate-500 font-mono">
                            {course.code}
                          </span>
                          {isOut && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[10px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Di Luar Periode Aktif (Sem {sem})</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 align-top text-center font-mono font-medium text-slate-800">
                        {course.sks}
                      </td>

                      <td className="py-2.5 px-3 align-top text-center">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                          Sem {sem}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 align-top space-y-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1 py-0.2 rounded text-[10px] font-mono text-slate-700 bg-slate-100">
                            {currYear}
                          </span>
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
                        {kbkObj && (
                          <div className="text-[10px] font-mono text-slate-600">
                            KBK {kbkObj.code}
                          </div>
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
                                  id={`custom-input-desk-${course.id}`}
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

                      {/* Section Preview */}
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards for Custom Manual */}
        <div className="sm:hidden divide-y divide-slate-100">
          {filteredCustomCourses.map((course) => {
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
            const sem = course.semester || (course as any).recommendedSemester || 1;
            const isOut = isOutOfActivePeriod(course);
            const currYear =
              (course as any).curriculumYear ||
              (course.curriculumId?.includes('2022') || course.code?.startsWith('FB') ? 2022 : 2026);

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
                      id={`custom-cb-mob-${course.id}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() =>
                        handleToggleCourse(
                          course,
                          sem,
                          currYear,
                          course.kbkId || null
                        )
                      }
                      className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor={`custom-cb-mob-${course.id}`}
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
                      <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                        Sem {sem}
                      </span>
                      <span className="px-1 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-700">
                        {currYear}
                      </span>
                    </div>

                    {isOut && (
                      <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Di Luar Periode Aktif (Sem {sem})</span>
                      </div>
                    )}
                  </div>
                </div>

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
                              id={`custom-input-mob-${course.id}`}
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
    </div>
  );
};
