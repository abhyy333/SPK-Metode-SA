import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Users,
  Calendar,
  Layers,
  Info,
  Building,
  Check,
  X,
  Sparkles,
  Upload,
  FileText,
  FileSpreadsheet,
  Cpu,
  Zap,
  Radio,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { Student, ClassGroup, KBK } from '../types';
import { Badge } from '../components/ui/Badge';
import { parseStudentNim } from '../data/realDataset';
import { StorageService } from '../services/storageService';
import {
  determineStudentCurriculum,
  parseStudentCreditsCsv,
  StudentCreditCsvRow,
} from '../utils/curriculumDetermination';
import { useDebounce } from '../hooks/useDebounce';
import { Pagination } from '../components/ui/Pagination';

interface StudentsPageProps {
  students: Student[];
  classes: ClassGroup[];
  onAddStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  academicYear: string;
}

export const StudentsPage: React.FC<StudentsPageProps> = ({
  students,
  classes,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  academicYear,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>('all');
  const [selectedKbk, setSelectedKbk] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [onlyWarnings, setOnlyWarnings] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCohort, selectedCurriculum, selectedKbk, selectedClass, onlyWarnings, pageSize]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [parsedCsvRows, setParsedCsvRows] = useState<StudentCreditCsvRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSuccessMsg, setCsvSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formNim, setFormNim] = useState('');
  const [formName, setFormName] = useState('');
  const [formClassId, setFormClassId] = useState<string>('');
  const [formCredits, setFormCredits] = useState<number>(0);
  const [formKbkId, setFormKbkId] = useState<string>('');
  const [formIsOverride, setFormIsOverride] = useState<boolean>(false);
  const [formOverrideCurriculum, setFormOverrideCurriculum] = useState<number>(2026);
  const [formOverrideReason, setFormOverrideReason] = useState<string>('');

  const kbks = useMemo(() => StorageService.getKbks(), []);

  // Cohort options
  const cohorts = useMemo<number[]>(() => {
    const list = students
      .map((s) => s.cohortYear)
      .filter((y): y is number => typeof y === 'number');
    const set = new Set<number>(list);
    return Array.from(set).sort((a: number, b: number) => b - a);
  }, [students]);

  // Statistics
  const stats = useMemo(() => {
    const total = students.length;
    const curr2026 = students.filter((s) => (s.curriculumYear || 2026) === 2026).length;
    const curr2022 = students.filter((s) => (s.curriculumYear || 2026) === 2022).length;
    const withWarning = students.filter((s) => s.dataWarning).length;
    const withKbk = students.filter((s) => !!s.kbkId).length;

    return { total, curr2026, curr2022, withWarning, withKbk };
  }, [students]);

  // Filtered List with Debounce
  const filteredStudents = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase();
    return students.filter((st) => {
      const matchSearch =
        !term ||
        (st.nim || '').toLowerCase().includes(term) ||
        (st.name || '').toLowerCase().includes(term);

      const matchCohort =
        selectedCohort === 'all' || st.cohortYear.toString() === selectedCohort;

      const matchCurriculum =
        selectedCurriculum === 'all' || (st.curriculumYear || 2026).toString() === selectedCurriculum;

      const matchKbk =
        selectedKbk === 'all'
          ? true
          : selectedKbk === 'unassigned'
          ? !st.kbkId
          : st.kbkId === selectedKbk;

      const matchClass =
        selectedClass === 'all'
          ? true
          : selectedClass === 'unassigned'
          ? !st.classId
          : st.classId === selectedClass;

      const matchWarning = !onlyWarnings || !!st.dataWarning;

      return matchSearch && matchCohort && matchCurriculum && matchKbk && matchClass && matchWarning;
    });
  }, [students, debouncedSearchTerm, selectedCohort, selectedCurriculum, selectedKbk, selectedClass, onlyWarnings]);

  // Paginated List
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormNim('');
    setFormName('');
    setFormClassId('');
    setFormCredits(0);
    setFormKbkId('');
    setFormIsOverride(false);
    setFormOverrideCurriculum(2026);
    setFormOverrideReason('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (st: Student) => {
    setEditingStudent(st);
    setFormNim(st.nim);
    setFormName(st.name);
    setFormClassId(st.classId || '');
    setFormCredits(st.totalEarnedCredits || 0);
    setFormKbkId(st.kbkId || '');
    setFormIsOverride(st.isManualCurriculumOverride || false);
    setFormOverrideCurriculum(st.curriculumYear || 2026);
    setFormOverrideReason(st.curriculumOverrideReason || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNim.trim() || !formName.trim()) return;

    const parsed = parseStudentNim(formNim, 2026);
    const cohortYear = parsed.cohortYear || 2024;
    const determination = determineStudentCurriculum(
      cohortYear,
      formCredits,
      formIsOverride,
      formOverrideCurriculum,
      formOverrideReason
    );

    if (editingStudent) {
      const updated: Student = {
        ...editingStudent,
        nim: formNim.trim(),
        name: formName.trim(),
        cohortYear,
        semester: editingStudent.semester || parsed.currentSemester,
        currentSemester: parsed.currentSemester,
        status: parsed.status,
        classId: formClassId || null,
        totalEarnedCredits: formCredits,
        kbkId: formKbkId || undefined,
        curriculumYear: determination.curriculumYear,
        curriculumId: determination.curriculumId,
        curriculumDeterminationReason: determination.reason,
        isManualCurriculumOverride: formIsOverride,
        curriculumOverrideReason: formIsOverride ? formOverrideReason : undefined,
        dataWarning: parsed.dataWarning,
        warningReason: parsed.warningReason,
      };
      onEditStudent(updated);
      StorageService.updateStudent(updated);
    } else {
      const newStudent: Student = {
        id: `std-${formNim.trim().toLowerCase()}-${Date.now()}`,
        nim: formNim.trim(),
        name: formName.trim(),
        cohortYear,
        semester: parsed.currentSemester,
        currentSemester: parsed.currentSemester,
        status: parsed.status,
        classId: formClassId || null,
        totalEarnedCredits: formCredits,
        kbkId: formKbkId || undefined,
        curriculumYear: determination.curriculumYear,
        curriculumId: determination.curriculumId,
        curriculumDeterminationReason: determination.reason,
        isManualCurriculumOverride: formIsOverride,
        curriculumOverrideReason: formIsOverride ? formOverrideReason : undefined,
        enrolledCourseIds: [],
        isActive: true,
        dataWarning: parsed.dataWarning,
        warningReason: parsed.warningReason,
      };
      onAddStudent(newStudent);
    }

    setIsModalOpen(false);
  };

  // CSV Parsing
  const handleCsvChange = (text: string) => {
    setCsvContent(text);
    if (!text.trim()) {
      setParsedCsvRows([]);
      setCsvErrors([]);
      return;
    }
    const { validRows, errors } = parseStudentCreditsCsv(text);
    setParsedCsvRows(validRows);
    setCsvErrors(errors);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleCsvChange(text);
    };
    reader.readAsText(file);
  };

  const handleApplyCsvImport = () => {
    if (parsedCsvRows.length === 0) return;

    const result = StorageService.batchUpdateStudentCredits(parsedCsvRows);
    setCsvSuccessMsg(
      `Berhasil memperbarui ${result.updatedCount} mahasiswa dan menambahkan ${result.createdCount} data baru!`
    );

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const handleFillDemoCsv = () => {
    const sample = `nim,total_earned_credits,angkatan,kbk
F1B024001,24,2024,KOM
F1B024002,22,2024,STL
F1B023001,124,2023,KOM
F1B023002,118,2023,STL
F1B023003,130,2023,ELKOM
F1B022001,138,2022,ELKOM
F1B022002,112,2022,KOM`;
    handleCsvChange(sample);
  };

  return (
    <div className="space-y-6" id="students-management-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Data Master & Penentuan Kurikulum Mahasiswa
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Total {stats.total} Mahasiswa Teknik Elektro • T.A. {academicYear}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsCsvModalOpen(true);
              setCsvSuccessMsg(null);
            }}
            id="btn-import-sks-csv"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold border border-slate-300 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Impor SKS (CSV)</span>
          </button>
          <button
            onClick={handleOpenAdd}
            id="btn-add-student"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mahasiswa</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Mahasiswa
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Semua data terdaftar</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Kurikulum 2026
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-indigo-700">{stats.curr2026}</div>
          <p className="text-[11px] text-indigo-600 mt-0.5">Angkatan 2024+ / SKS &lt; 120</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Kurikulum 2022 (OBE)
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{stats.curr2022}</div>
          <p className="text-[11px] text-blue-600 mt-0.5">Angkatan ≤2023 & SKS ≥ 120</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
              Terdistribusi KBK
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700">{stats.withKbk}</div>
          <p className="text-[11px] text-purple-600 mt-0.5">Peminatan KOM / STL / ELKOM</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-student"
              placeholder="Cari NIM atau Nama Mahasiswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Cohort Filter */}
          <div>
            <select
              id="select-cohort-filter"
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
            >
              <option value="all">Semua Angkatan</option>
              {cohorts.map((c) => (
                <option key={c} value={c.toString()}>
                  Angkatan {c}
                </option>
              ))}
            </select>
          </div>

          {/* Curriculum Filter */}
          <div>
            <select
              id="select-curriculum-filter"
              value={selectedCurriculum}
              onChange={(e) => setSelectedCurriculum(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
            >
              <option value="all">Semua Kurikulum</option>
              <option value="2026">Kurikulum 2026</option>
              <option value="2022">Kurikulum 2022 (OBE)</option>
            </select>
          </div>

          {/* KBK Filter */}
          <div>
            <select
              id="select-kbk-filter"
              value={selectedKbk}
              onChange={(e) => setSelectedKbk(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
            >
              <option value="all">Semua Peminatan KBK</option>
              <option value="kbk-komputer">KBK Komputer (KOM)</option>
              <option value="kbk-sistem-tenaga">KBK Tenaga Listrik (STL)</option>
              <option value="kbk-elektronika-komunikasi">KBK Elektronika Komunikasi (ELKOM)</option>
              <option value="unassigned">Belum Pilih KBK</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Menampilkan <strong className="text-slate-800">{filteredStudents.length}</strong> dari {students.length} mahasiswa
          </span>
          {(searchTerm || selectedCohort !== 'all' || selectedCurriculum !== 'all' || selectedKbk !== 'all' || selectedClass !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCohort('all');
                setSelectedCurriculum('all');
                setSelectedKbk('all');
                setSelectedClass('all');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="table-students">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">NIM</th>
                <th className="py-3 px-4">Nama Mahasiswa</th>
                <th className="py-3 px-3 text-center">Angkatan</th>
                <th className="py-3 px-3 text-center">SKS Lulus</th>
                <th className="py-3 px-4">Kurikulum Terpasang</th>
                <th className="py-3 px-4">KBK / Peminatan</th>
                <th className="py-3 px-4">Kelas Rombel</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Tidak ada mahasiswa yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const assignedClass = classes.find((c) => c.id === st.classId);
                  const currYear = st.curriculumYear || (st.cohortYear >= 2024 ? 2026 : 2022);
                  const is2026 = currYear === 2026;
                  const assignedKbk = kbks.find((k) => k.id === st.kbkId);

                  return (
                    <tr
                      key={st.id || st.nim}
                      id={`row-student-${st.nim}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                        {itemIndex}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                            {st.nim}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">
                        {st.name}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {st.cohortYear}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {st.totalEarnedCredits ?? '-'} SKS
                      </td>

                      {/* Curriculum Badge */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              is2026
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {is2026 ? <Sparkles className="w-3 h-3" /> : <BookOpen className="w-3 h-3" />}
                            Kurikulum {currYear}
                          </span>
                          {st.curriculumDeterminationReason && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs" title={st.curriculumDeterminationReason}>
                              {st.curriculumDeterminationReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* KBK */}
                      <td className="py-3 px-4">
                        {assignedKbk ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              st.kbkId === 'kbk-komputer'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : st.kbkId === 'kbk-sistem-tenaga'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-sky-50 text-sky-800 border border-sky-200'
                            }`}
                          >
                            {assignedKbk.code}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Umum</span>
                        )}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-4">
                        {assignedClass ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Building className="w-3 h-3 text-emerald-600" />
                            {assignedClass.code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Belum ditentukan</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(st)}
                            id={`btn-edit-student-${st.nim}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Mahasiswa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingStudent(st)}
                            id={`btn-delete-student-${st.nim}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Mahasiswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredStudents.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[15, 25, 50, 100]}
        />
      </div>

      {/* CSV SKS Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" id="modal-import-sks">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Impor Data SKS Mahasiswa & Penentuan Kurikulum
                </h3>
                <p className="text-xs text-slate-500">
                  Unggah CSV atau tempel teks data perolehan SKS lulus mahasiswa untuk penentuan Kurikulum 2026 vs Kurikulum 2022.
                </p>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success message */}
            {csvSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{csvSuccessMsg}</span>
              </div>
            )}

            {/* Input area */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Format CSV (Kolom: nim, total_earned_credits, angkatan, kbk):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFillDemoCsv}
                    className="text-xs text-indigo-600 hover:underline font-semibold"
                  >
                    Gunakan Contoh Format
                  </button>
                  <label className="cursor-pointer text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors">
                    <span>Pilih File .CSV</span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <textarea
                rows={5}
                value={csvContent}
                onChange={(e) => handleCsvChange(e.target.value)}
                placeholder="nim,total_earned_credits,angkatan,kbk&#10;F1B024001,24,2024,KOM&#10;F1B023001,124,2023,KOM&#10;F1B023002,110,2023,STL"
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Parsing Errors */}
            {csvErrors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1 max-h-24 overflow-y-auto">
                <div className="font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Catatan Penguraian CSV:</span>
                </div>
                {csvErrors.map((err, i) => (
                  <div key={i} className="text-[11px]">{err}</div>
                ))}
              </div>
            )}

            {/* Parsed Preview Table */}
            {parsedCsvRows.length > 0 && (
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl max-h-48">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">NIM</th>
                      <th className="py-2 px-2 text-center">Angkatan</th>
                      <th className="py-2 px-2 text-center">SKS Lulus</th>
                      <th className="py-2 px-3">Kurikulum Hasil Analisis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {parsedCsvRows.map((r, i) => {
                      const determination = determineStudentCurriculum(
                        r.cohortYear || 2023,
                        r.totalEarnedCredits
                      );
                      const is2026 = determination.curriculumYear === 2026;

                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-1.5 px-3 font-mono font-bold">{r.nim}</td>
                          <td className="py-1.5 px-2 text-center">{r.cohortYear || '-'}</td>
                          <td className="py-1.5 px-2 text-center font-semibold">{r.totalEarnedCredits} SKS</td>
                          <td className="py-1.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                is2026
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              Kurikulum {determination.curriculumYear}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-xs text-slate-500">
                {parsedCsvRows.length} data mahasiswa siap diproses
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  disabled={parsedCsvRows.length === 0}
                  onClick={handleApplyCsvImport}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Proses & Perbarui Kurikulum
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Mahasiswa' : 'Tambah Mahasiswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIM Mahasiswa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: F1B02310096"
                    value={formNim}
                    onChange={(e) => setFormNim(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total SKS Lulus
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="160"
                    value={formCredits}
                    onChange={(e) => setFormCredits(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Mahasiswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ABDUL HABIR AL MAJDI"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Peminatan KBK
                  </label>
                  <select
                    value={formKbkId}
                    onChange={(e) => setFormKbkId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="">Belum Memilih KBK</option>
                    {kbks.map((kbk) => (
                      <option key={kbk.id} value={kbk.id}>
                        {kbk.code} ({kbk.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas Rombel
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="">Belum Ditentukan</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.code} — Smtr {cls.semester}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manual Override Option */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsOverride}
                    onChange={(e) => setFormIsOverride(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Override Manual Kurikulum oleh Admin
                  </span>
                </label>

                {formIsOverride && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pilih Kurikulum:
                      </label>
                      <select
                        value={formOverrideCurriculum}
                        onChange={(e) => setFormOverrideCurriculum(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value={2026}>Kurikulum 2026</option>
                        <option value={2022}>Kurikulum 2022 (OBE)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Alasan Override:
                      </label>
                      <input
                        type="text"
                        value={formOverrideReason}
                        onChange={(e) => setFormOverrideReason(e.target.value)}
                        placeholder="Contoh: Dispensasi persetujuan Ketua Jurusan..."
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Mahasiswa?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-3">
              Apakah Anda yakin ingin menghapus <strong>{deletingStudent.name}</strong> ({deletingStudent.nim}) dari master data mahasiswa?
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  onDeleteStudent(deletingStudent.id);
                  setDeletingStudent(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
