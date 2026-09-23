import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Users,
  BookOpen,
  Search,
  Check,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { MasterLecturerAssignment, AcademicPeriod } from '../../types/masterLecturer';
import { Course, Lecturer } from '../../types';
import { StorageService } from '../../services/storageService';

interface LecturerRowItem {
  id: string; // temporary key or lecturerId
  lecturerId: string | null;
  lecturerName: string;
  lecturerCode: string;
  isCoordinator: boolean;
}

interface MasterLecturerManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (message: string) => void;
  // If editing existing record:
  editingAssignment?: MasterLecturerAssignment | null;
  allAssignments?: MasterLecturerAssignment[];
}

function numberToRoman(num: number): string {
  const romanMap: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
  };
  return romanMap[num] || String(num);
}

export const MasterLecturerManualModal: React.FC<MasterLecturerManualModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  editingAssignment,
  allAssignments = [],
}) => {
  const isEditMode = Boolean(editingAssignment);

  // Master Data
  const masterCourses: Course[] = useMemo(() => StorageService.getCourses(), []);
  const masterLecturers: Lecturer[] = useMemo(() => StorageService.getLecturers(), []);
  const currentUser = useMemo(() => StorageService.getCurrentUser(), []);

  // Form States
  const [academicPeriod, setAcademicPeriod] = useState<AcademicPeriod>('GANJIL');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [courseNameInput, setCourseNameInput] = useState<string>('');
  const [sectionInput, setSectionInput] = useState<string>('');
  const [semesterNum, setSemesterNum] = useState<number>(1);
  const [sksInput, setSksInput] = useState<string>('2');
  const [wCodeInput, setWCodeInput] = useState<string>('WS');
  const [isPracticum, setIsPracticum] = useState<boolean>(false);
  const [isKkn, setIsKkn] = useState<boolean>(false);

  // Searchable Course dropdown state
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState<boolean>(false);
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Lecturers List (Team Teaching)
  const [lecturersList, setLecturersList] = useState<LecturerRowItem[]>([
    {
      id: `lec-row-${Date.now()}-1`,
      lecturerId: null,
      lecturerName: '',
      lecturerCode: '',
      isCoordinator: false,
    },
  ]);

  // Active Search Dropdown for Lecturers
  const [activeLecturerSearchIndex, setActiveLecturerSearchIndex] = useState<number | null>(null);
  const [lecturerSearchQuery, setLecturerSearchQuery] = useState<string>('');
  const lecturerDropdownRef = useRef<HTMLDivElement>(null);

  // Error feedback
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
      if (lecturerDropdownRef.current && !lecturerDropdownRef.current.contains(e.target as Node)) {
        setActiveLecturerSearchIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize or Populate Form on Open / Edit
  useEffect(() => {
    if (!isOpen) return;

    if (editingAssignment) {
      setAcademicPeriod(editingAssignment.academic_period);
      setCourseNameInput(editingAssignment.base_course_name || editingAssignment.raw_course_name);
      setCourseSearchQuery(editingAssignment.base_course_name || editingAssignment.raw_course_name);
      setSectionInput(editingAssignment.section || '');
      setSemesterNum(editingAssignment.semester_num || 1);
      setSksInput(editingAssignment.raw_sks || String(editingAssignment.effective_sks || 2));
      setWCodeInput(editingAssignment.raw_w_code || 'WS');
      setIsPracticum(editingAssignment.is_practicum || false);
      setIsKkn(editingAssignment.is_kkn || false);

      // Check if matched course in master
      if (editingAssignment.course_id) {
        setSelectedCourseId(editingAssignment.course_id);
      } else {
        const foundC = masterCourses.find(
          (c) =>
            c.name.toLowerCase().trim() === editingAssignment.base_course_name.toLowerCase().trim()
        );
        setSelectedCourseId(foundC?.id || '');
      }

      // Check all team teaching rows for this same course + section + period
      const matchingTeamRows = allAssignments.filter(
        (a) =>
          a.academic_period === editingAssignment.academic_period &&
          a.base_course_name.trim().toLowerCase() === editingAssignment.base_course_name.trim().toLowerCase() &&
          (a.section || '').trim().toUpperCase() === (editingAssignment.section || '').trim().toUpperCase()
      );

      const targetRows = matchingTeamRows.length > 0 ? matchingTeamRows : [editingAssignment];

      const loadedLecturers: LecturerRowItem[] = targetRows.map((r, idx) => {
        const foundL = masterLecturers.find(
          (l) =>
            l.id === r.lecturer_id ||
            l.name.toLowerCase().trim() === r.normalized_lecturer_name.toLowerCase().trim() ||
            l.code.toLowerCase().trim() === r.lecturer_code?.toLowerCase().trim()
        );
        return {
          id: `lec-row-${Date.now()}-${idx}`,
          lecturerId: foundL?.id || r.lecturer_id || null,
          lecturerName: r.normalized_lecturer_name || r.raw_lecturer_name || foundL?.name || '',
          lecturerCode: foundL?.code || r.lecturer_code || '',
          isCoordinator: r.is_coordinator || false,
        };
      });

      if (loadedLecturers.length === 0) {
        loadedLecturers.push({
          id: `lec-row-${Date.now()}-1`,
          lecturerId: null,
          lecturerName: '',
          lecturerCode: '',
          isCoordinator: false,
        });
      }

      setLecturersList(loadedLecturers);
    } else {
      // Reset for New Input
      setAcademicPeriod('GANJIL');
      setSelectedCourseId('');
      setCourseNameInput('');
      setCourseSearchQuery('');
      setSectionInput('');
      setSemesterNum(1);
      setSksInput('2');
      setWCodeInput('WS');
      setIsPracticum(false);
      setIsKkn(false);
      setLecturersList([
        {
          id: `lec-row-${Date.now()}-1`,
          lecturerId: null,
          lecturerName: '',
          lecturerCode: '',
          isCoordinator: false,
        },
      ]);
    }
    setErrorMessage('');
  }, [isOpen, editingAssignment, allAssignments, masterCourses, masterLecturers]);

  // Filtered master courses for searchable dropdown
  const filteredCourses = useMemo(() => {
    if (!courseSearchQuery.trim()) return masterCourses.slice(0, 30);
    const q = courseSearchQuery.toLowerCase().trim();
    return masterCourses
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          String(c.semester).includes(q)
      )
      .slice(0, 40);
  }, [masterCourses, courseSearchQuery]);

  // Filtered master lecturers for searchable dropdown
  const filteredLecturers = useMemo(() => {
    if (!lecturerSearchQuery.trim()) return masterLecturers.slice(0, 30);
    const q = lecturerSearchQuery.toLowerCase().trim();
    return masterLecturers
      .filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.code.toLowerCase().includes(q) ||
          (l.nip && l.nip.includes(q))
      )
      .slice(0, 40);
  }, [masterLecturers, lecturerSearchQuery]);

  // Handle Select Course from Master Dropdown
  const handleSelectCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    setCourseNameInput(course.name);
    setCourseSearchQuery(course.name);
    if (course.semester) {
      setSemesterNum(course.semester);
      // Auto adjust academic period if appropriate
      if (course.semester % 2 === 1) {
        setAcademicPeriod('GANJIL');
      } else {
        setAcademicPeriod('GENAP');
      }
    }
    if (course.sks) {
      setSksInput(String(course.sks));
    }
    const isLab = (
      course.name.toLowerCase().includes('praktikum') ||
      course.type === 'Praktikum' ||
      (course.category === 'Wajib' && course.code.startsWith('ELP'))
    );
    setIsPracticum(isLab);
    if (course.name.toUpperCase().includes('KKN')) {
      setIsKkn(true);
    }
    setIsCourseDropdownOpen(false);
  };

  // Add Lecturer to Team
  const handleAddLecturerRow = () => {
    setLecturersList((prev) => [
      ...prev,
      {
        id: `lec-row-${Date.now()}-${prev.length + 1}`,
        lecturerId: null,
        lecturerName: '',
        lecturerCode: '',
        isCoordinator: false,
      },
    ]);
  };

  // Remove Lecturer from Team
  const handleRemoveLecturerRow = (index: number) => {
    if (lecturersList.length <= 1) {
      // Clear the single row instead of removing it
      setLecturersList([
        {
          id: `lec-row-${Date.now()}-1`,
          lecturerId: null,
          lecturerName: '',
          lecturerCode: '',
          isCoordinator: false,
        },
      ]);
      return;
    }
    setLecturersList((prev) => prev.filter((_, i) => i !== index));
  };

  // Select Lecturer from Dropdown
  const handleSelectLecturer = (index: number, lec: Lecturer) => {
    setLecturersList((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        lecturerId: lec.id,
        lecturerName: lec.name,
        lecturerCode: lec.code,
      };
      return updated;
    });
    setActiveLecturerSearchIndex(null);
    setLecturerSearchQuery('');
  };

  // Toggle Coordinator for a Lecturer
  const handleToggleCoordinator = (index: number) => {
    setLecturersList((prev) => {
      const updated = [...prev];
      const currentVal = updated[index].isCoordinator;
      // In typical academic assignment, if toggling on, can set as coordinator
      updated[index] = {
        ...updated[index],
        isCoordinator: !currentVal,
      };
      return updated;
    });
  };

  // Save Assignment
  const handleSave = () => {
    setErrorMessage('');

    // Validations
    const trimmedCourseName = courseNameInput.trim();
    if (!trimmedCourseName) {
      setErrorMessage('Nama mata kuliah wajib diisi atau dipilih dari Master.');
      return;
    }

    const effectiveSks = parseFloat(sksInput) || 2;
    const cleanSection = sectionInput.trim().toUpperCase() || null;
    const sourceSemesterRoman = numberToRoman(semesterNum);

    // Build raw_course_name (e.g. "Basis Data - A" or "Agama")
    const rawCourseName = cleanSection
      ? `${trimmedCourseName} - ${cleanSection}`
      : trimmedCourseName;

    // Filter valid lecturers or allow LPPM / KKN if empty
    const validLecturers = lecturersList.filter((l) => l.lecturerName.trim() !== '');

    if (validLecturers.length === 0 && !isKkn && !isPracticum) {
      setErrorMessage('Minimal isi 1 dosen pengampu, atau centang KKN / LPPM jika dikelola LPPM.');
      return;
    }

    const existingRows = StorageService.getMasterLecturerAssignments();
    const maxRawNo = existingRows.reduce((max, r) => Math.max(max, r.raw_no || 0), 0);

    // IDs to replace if in edit mode
    let replacedIds: string[] = [];
    if (isEditMode && editingAssignment) {
      const matchingTeamRows = existingRows.filter(
        (a) =>
          a.academic_period === editingAssignment.academic_period &&
          a.base_course_name.trim().toLowerCase() === editingAssignment.base_course_name.trim().toLowerCase() &&
          (a.section || '').trim().toUpperCase() === (editingAssignment.section || '').trim().toUpperCase()
      );
      replacedIds = matchingTeamRows.map((r) => r.source_row_id);
      if (replacedIds.length === 0) {
        replacedIds = [editingAssignment.source_row_id];
      }
    }

    const newRows: MasterLecturerAssignment[] = [];

    if (validLecturers.length === 0) {
      // Row without lecturer (e.g. KKN or generic)
      const newId = isEditMode && editingAssignment
        ? editingAssignment.source_row_id
        : `src-manual-${Date.now()}-1`;

      newRows.push({
        source_row_id: newId,
        academic_period: academicPeriod,
        raw_no: editingAssignment?.raw_no || (maxRawNo + 1),
        raw_course_name: rawCourseName,
        raw_sks: String(effectiveSks),
        effective_sks: effectiveSks,
        raw_w_code: wCodeInput.trim() || 'WS',
        source_semester: sourceSemesterRoman,
        raw_lecturer_name: isKkn ? '' : '',
        is_coordinator: false,
        section: cleanSection,
        base_course_name: trimmedCourseName,
        normalized_course_name: trimmedCourseName.toLowerCase().trim(),
        normalized_lecturer_name: '',
        semester_num: semesterNum,
        is_practicum: isPracticum,
        is_kkn: isKkn,
        course_id: selectedCourseId || null,
        lecturer_id: null,
        lecturer_code: null,
        dataSource: 'manual',
        createdBy: editingAssignment?.createdBy || currentUser?.name || 'Administrator',
        createdAt: editingAssignment?.createdAt || new Date().toISOString(),
        updatedBy: currentUser?.name || 'Administrator',
        updatedAt: new Date().toISOString(),
        status_mapping: selectedCourseId ? 'lecturer_unlinked' : 'unlinked',
      });
    } else {
      // Create one row per lecturer (Team Teaching support)
      validLecturers.forEach((lecItem, idx) => {
        const rowId = isEditMode && replacedIds[idx]
          ? replacedIds[idx]
          : `src-manual-${Date.now()}-${idx + 1}`;

        const rawLecDisplay = lecItem.isCoordinator
          ? `${lecItem.lecturerName.trim()} (Koordinator)`
          : lecItem.lecturerName.trim();

        newRows.push({
          source_row_id: rowId,
          academic_period: academicPeriod,
          raw_no: editingAssignment?.raw_no || (maxRawNo + idx + 1),
          raw_course_name: rawCourseName,
          raw_sks: String(effectiveSks),
          effective_sks: effectiveSks,
          raw_w_code: wCodeInput.trim() || 'WS',
          source_semester: sourceSemesterRoman,
          raw_lecturer_name: rawLecDisplay,
          rawLecturerName: rawLecDisplay,
          is_coordinator: lecItem.isCoordinator,
          section: cleanSection,
          base_course_name: trimmedCourseName,
          normalized_course_name: trimmedCourseName.toLowerCase().trim(),
          normalized_lecturer_name: lecItem.lecturerName.trim(),
          normalizedLecturerName: lecItem.lecturerName.trim(),
          semester_num: semesterNum,
          is_practicum: isPracticum,
          is_kkn: isKkn,
          course_id: selectedCourseId || null,
          lecturer_id: lecItem.lecturerId || null,
          lecturer_code: lecItem.lecturerCode || null,
          dataSource: 'manual',
          createdBy: editingAssignment?.createdBy || currentUser?.name || 'Administrator',
          createdAt: editingAssignment?.createdAt || new Date().toISOString(),
          updatedBy: currentUser?.name || 'Administrator',
          updatedAt: new Date().toISOString(),
          status_mapping: selectedCourseId && lecItem.lecturerId ? 'mapped' : lecItem.lecturerId ? 'course_unlinked' : 'lecturer_unlinked',
        });
      });
    }

    try {
      StorageService.saveManualMasterLecturerAssignments(newRows, replacedIds, currentUser);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('master-lecturer-updated'));
      }
      onSaveSuccess(
        isEditMode
          ? `Berhasil memperbarui alokasi dosen untuk "${rawCourseName}".`
          : `Berhasil menambahkan alokasi dosen baru "${rawCourseName}" (${newRows.length} penugasan).`
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal menyimpan data penugasan dosen.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Master Dosen Pengampu' : 'Tambah Master Dosen Pengampu (Input Manual)'}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Banner Info */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <strong>Input Manual Hard Constraint:</strong> Data yang dimasukkan akan disimpan persis ke persistent data layer (
            <code className="bg-indigo-100/80 px-1 py-0.5 rounded font-mono text-indigo-900">dataSource: "manual"</code>) dan langsung terintegrasi dengan generator alokasi jadwal.
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Periode & Semester */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Periode Akademik */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Periode Akademik <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAcademicPeriod('GANJIL')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  academicPeriod === 'GANJIL'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>Semester Ganjil</span>
              </button>
              <button
                type="button"
                onClick={() => setAcademicPeriod('GENAP')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  academicPeriod === 'GENAP'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>Semester Genap</span>
              </button>
            </div>
          </div>

          {/* Semester (1-8) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Semester (Tingkat) <span className="text-rose-500">*</span>
            </label>
            <select
              value={semesterNum}
              onChange={(e) => setSemesterNum(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value={1}>Semester 1 (I)</option>
              <option value={2}>Semester 2 (II)</option>
              <option value={3}>Semester 3 (III)</option>
              <option value={4}>Semester 4 (IV)</option>
              <option value={5}>Semester 5 (V)</option>
              <option value={6}>Semester 6 (VI)</option>
              <option value={7}>Semester 7 (VII)</option>
              <option value={8}>Semester 8 (VIII)</option>
            </select>
          </div>
        </div>

        {/* Section 2: Mata Kuliah (Searchable Select from Master) */}
        <div className="space-y-1.5" ref={courseDropdownRef}>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Mata Kuliah <span className="text-rose-500">*</span>
            </label>
            {selectedCourseId && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                ✓ Terhubung Master MK
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Cari atau ketik nama mata kuliah..."
              value={courseSearchQuery}
              onChange={(e) => {
                setCourseSearchQuery(e.target.value);
                setCourseNameInput(e.target.value);
                setIsCourseDropdownOpen(true);
              }}
              onFocus={() => setIsCourseDropdownOpen(true)}
              className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {courseSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setCourseSearchQuery('');
                  setCourseNameInput('');
                  setSelectedCourseId('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dropdown Menu */}
            {isCourseDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                {filteredCourses.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    Tidak ada MK master yang cocok. Teks di atas akan dipakai sebagai nama MK kustom.
                  </div>
                ) : (
                  filteredCourses.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCourse(c)}
                      className="w-full text-left p-2.5 hover:bg-indigo-50/70 transition-colors flex items-center justify-between text-xs group"
                    >
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-indigo-900">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {c.code} • Sem {c.semester} • {c.sks} SKS • {c.category || 'Wajib'}
                        </div>
                      </div>
                      {selectedCourseId === c.id && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Kelas/Section, SKS, dan Kode W */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Kelas / Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kelas / Section
            </label>
            <input
              type="text"
              placeholder="A, B, C, D, INTER, atau kosong"
              value={sectionInput}
              onChange={(e) => setSectionInput(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">Kosongkan jika kelas tunggal</p>
          </div>

          {/* SKS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Bobot SKS <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 2, 3, 4, 1.5"
              value={sksInput}
              onChange={(e) => setSksInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Kode W */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kode W (W-Code)
            </label>
            <input
              type="text"
              placeholder="WS, WST, WK, PST, WE,WT"
              value={wCodeInput}
              onChange={(e) => setWCodeInput(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Section 4: Flag Khusus (Praktikum & KKN) */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isPracticum}
              onChange={(e) => setIsPracticum(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <span>🧪 Praktikum Laboratorium</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isKkn}
              onChange={(e) => setIsKkn(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <span>🏛️ Dikelola LPPM (KKN / Non-Dosen Jurusan)</span>
          </label>
        </div>

        {/* Section 5: DOSEN PENGAMPU & TEAM TEACHING */}
        <div className="space-y-2.5 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Dosen Pengampu & Team Teaching
              </h3>
              <p className="text-[11px] text-slate-500">
                Satu mata kuliah/kelas dapat diampu oleh lebih dari 1 dosen.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddLecturerRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Dosen
            </button>
          </div>

          <div className="space-y-2.5" ref={lecturerDropdownRef}>
            {lecturersList.map((lecRow, index) => (
              <div
                key={lecRow.id}
                className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                  {/* Lecturer Number badge */}
                  <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                    {index + 1}
                  </div>

                  {/* Lecturer Input & Search */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder={`Cari nama dosen ${index + 1}...`}
                      value={activeLecturerSearchIndex === index ? lecturerSearchQuery : lecRow.lecturerName}
                      onChange={(e) => {
                        setLecturerSearchQuery(e.target.value);
                        setActiveLecturerSearchIndex(index);
                        setLecturersList((prev) => {
                          const updated = [...prev];
                          updated[index] = {
                            ...updated[index],
                            lecturerName: e.target.value,
                            lecturerId: null,
                          };
                          return updated;
                        });
                      }}
                      onFocus={() => {
                        setActiveLecturerSearchIndex(index);
                        setLecturerSearchQuery(lecRow.lecturerName);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Lecturer Dropdown results */}
                    {activeLecturerSearchIndex === index && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                        {filteredLecturers.length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            Tidak ada nama dosen yang cocok di master. Teks di atas akan disimpan.
                          </div>
                        ) : (
                          filteredLecturers.map((lec) => (
                            <button
                              key={lec.id}
                              type="button"
                              onClick={() => handleSelectLecturer(index, lec)}
                              className="w-full text-left p-2 hover:bg-indigo-50/70 transition-colors flex items-center justify-between text-xs group"
                            >
                              <div>
                                <div className="font-bold text-slate-800 group-hover:text-indigo-900">
                                  {lec.name}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Kode: {lec.code} {lec.nip ? `• NIP: ${lec.nip}` : ''}
                                </div>
                              </div>
                              {lecRow.lecturerId === lec.id && (
                                <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Koordinator Checkbox */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 select-none shrink-0 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={lecRow.isCoordinator}
                      onChange={() => handleToggleCoordinator(index)}
                      className="w-3.5 h-3.5 text-purple-600 rounded-md border-slate-300 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className={lecRow.isCoordinator ? 'text-purple-700' : 'text-slate-600'}>
                      Koordinator MK
                    </span>
                  </label>

                  {/* Delete Lecturer from team */}
                  <button
                    type="button"
                    onClick={() => handleRemoveLecturerRow(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Hapus dosen ini dari team teaching"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
          >
            {isEditMode ? 'Simpan Perubahan' : 'Simpan Penugasan Dosen'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
