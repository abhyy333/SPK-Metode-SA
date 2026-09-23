import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  BookOpen,
  Layers,
  ArrowRight,
  RefreshCw,
  Info,
  ShieldCheck,
  Check,
  X,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import {
  MasterLecturerAssignment,
  MasterLecturerColumnMapping,
  ParsedImportRowItem,
  MasterLecturerImportBatch,
  AcademicPeriod,
} from '../../types/masterLecturer';
import {
  autoDetectColumnMapping,
  parseSheetRowsToPreview,
  downloadExcelTemplate,
} from '../../utils/masterLecturerImportUtils';
import { MasterLecturerImportService } from '../../services/masterLecturerImportService';
import { StorageService } from '../../services/storageService';
import { Lecturer, Course } from '../../types';

interface MasterLecturerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (resultMessage: string) => void;
  onOpenSyncOfferings?: () => void;
}

type ImportStep = 'upload' | 'preview' | 'success';

export const MasterLecturerImportModal: React.FC<MasterLecturerImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onOpenSyncOfferings,
}) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawSheetData, setRawSheetData] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<MasterLecturerColumnMapping>({
    academicPeriodCol: '',
    courseNameCol: '',
    sksCol: '',
    wCodeCol: '',
    semesterCol: '',
    lecturerCol: '',
    noCol: '',
  });

  const [previewRows, setPreviewRows] = useState<ParsedImportRowItem[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'upsert'>('append');
  const [activeFilter, setActiveFilter] = useState<'all' | 'valid' | 'warning' | 'error' | 'duplicate' | 'multiple' | 'unlinked'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importSummary, setImportSummary] = useState<{ total: number; batchId: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load master data for matching
  const existingMasterData = useMemo(() => StorageService.getMasterLecturerAssignments(), [isOpen]);
  const lecturers: Lecturer[] = useMemo(() => StorageService.getLecturers(), [isOpen]);
  const courses: Course[] = useMemo(() => StorageService.getCourses(), [isOpen]);
  const currentUser = useMemo(() => StorageService.getCurrentUser(), [isOpen]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
      alert('Format file tidak didukung. Harap pilih file dengan ekstensi .xlsx, .xls, atau .csv');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert sheet to json array of objects
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: '',
        raw: false,
      });

      if (!jsonData || jsonData.length === 0) {
        alert('File Excel kosong atau tidak memiliki baris data.');
        setIsProcessing(false);
        return;
      }

      // Extract headers from first row
      const headers = Object.keys(jsonData[0]);
      setRawHeaders(headers);
      setRawSheetData(jsonData);

      // Auto detect columns without arbitrary fallback
      const mapping = autoDetectColumnMapping(headers);
      setColumnMapping(mapping);

      // Generate initial preview rows with auto semester-based period determination
      const parsedItems = parseSheetRowsToPreview(jsonData, mapping, existingMasterData, lecturers, courses);
      setPreviewRows(parsedItems);
      setStep('preview');
    } catch (err: any) {
      console.error('Error reading Excel file:', err);
      alert(`Gagal membaca file: ${err.message || 'File rusak atau tidak valid'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (field: keyof MasterLecturerColumnMapping, value: string) => {
    const updatedMapping = { ...columnMapping, [field]: value };
    setColumnMapping(updatedMapping);

    if (rawSheetData.length > 0) {
      const parsedItems = parseSheetRowsToPreview(rawSheetData, updatedMapping, existingMasterData, lecturers, courses);
      setPreviewRows(parsedItems);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const total = previewRows.length;
    const valid = previewRows.filter((r) => r.status === 'valid').length;
    const warning = previewRows.filter((r) => r.status === 'warning').length;
    const error = previewRows.filter((r) => r.status === 'error').length;
    const duplicate = previewRows.filter((r) => r.isDuplicateLooking).length;
    const multiple = previewRows.filter((r) => r.isMultipleLecturer).length;
    const unlinkedLecturer = previewRows.filter((r) => !r.assignment.lecturer_id && r.assignment.raw_lecturer_name && !r.assignment.is_kkn).length;
    const unlinkedCourse = previewRows.filter((r) => !r.assignment.course_id && r.assignment.raw_course_name).length;
    const selectedCount = previewRows.filter((r) => r.selected).length;

    return {
      total,
      valid,
      warning,
      error,
      duplicate,
      multiple,
      unlinkedLecturer,
      unlinkedCourse,
      selectedCount,
    };
  }, [previewRows]);

  // Filtered preview rows
  const filteredPreviewRows = useMemo(() => {
    return previewRows.filter((item) => {
      // Tab filter
      if (activeFilter === 'valid' && item.status !== 'valid') return false;
      if (activeFilter === 'warning' && item.status !== 'warning') return false;
      if (activeFilter === 'error' && item.status !== 'error') return false;
      if (activeFilter === 'duplicate' && !item.isDuplicateLooking) return false;
      if (activeFilter === 'multiple' && !item.isMultipleLecturer) return false;
      if (activeFilter === 'unlinked' && (item.assignment.lecturer_id && item.assignment.course_id)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCourse = item.raw.raw_course_name.toLowerCase().includes(q);
        const matchLec = item.raw.raw_lecturer_name.toLowerCase().includes(q);
        const matchCode = item.raw.raw_w_code.toLowerCase().includes(q);
        const matchSem = item.raw.source_semester.toLowerCase().includes(q);
        if (!matchCourse && !matchLec && !matchCode && !matchSem) return false;
      }

      return true;
    });
  }, [previewRows, activeFilter, searchQuery]);

  const toggleSelectRow = (index: number) => {
    setPreviewRows((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const selectAllRows = (select: boolean) => {
    setPreviewRows((prev) =>
      prev.map((item) => (item.status === 'error' ? { ...item, selected: false } : { ...item, selected: select }))
    );
  };

  const handleExecuteImport = () => {
    const selectedItems = previewRows.filter((r) => r.selected && r.status !== 'error');

    if (selectedItems.length === 0) {
      alert('Pilih setidaknya 1 baris valid untuk diimport.');
      return;
    }

    setIsProcessing(true);

    try {
      const generatedBatchId = `batch-${Date.now()}`;
      const batchPayload: Omit<MasterLecturerImportBatch, 'previousSnapshot'> = {
        id: generatedBatchId,
        fileName: file?.name || 'Data Dosen Pengampu.xlsx',
        fileType: (file?.name.split('.').pop()?.toLowerCase() as any) || 'xlsx',
        importedAt: new Date().toISOString(),
        importedBy: currentUser?.name || 'Administrator',
        mode: importMode,
        status: 'IMPORTED',
        totalRows: selectedItems.length,
        successRows: selectedItems.filter((r) => r.status === 'valid').length,
        warningRows: selectedItems.filter((r) => r.status === 'warning').length,
        errorRows: selectedItems.filter((r) => r.status === 'error').length,
        duplicateCount: selectedItems.filter((r) => r.isDuplicateLooking).length,
        multipleLecturerCount: selectedItems.filter((r) => r.isMultipleLecturer).length,
        unlinkedLecturerCount: selectedItems.filter((r) => !r.assignment.lecturer_id && r.assignment.raw_lecturer_name).length,
        unlinkedCourseCount: selectedItems.filter((r) => !r.assignment.course_id && r.assignment.raw_course_name).length,
        rows: selectedItems.map((r) => r.assignment),
      };

      const result = MasterLecturerImportService.executeImport(
        batchPayload,
        selectedItems.map((r) => r.assignment),
        importMode
      );

      setImportSummary({ total: result.totalImported, batchId: result.batchId });
      setStep('success');
      onImportSuccess(result.message);
    } catch (err: any) {
      alert(`Gagal melakukan import: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setRawHeaders([]);
    setRawSheetData([]);
    setPreviewRows([]);
    setImportSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isProcessing) {
          handleReset();
          onClose();
        }
      }}
      title="Import Master Dosen Pengampu dari Excel"
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-900 leading-relaxed space-y-1">
                <strong className="font-semibold block text-sm">Ketentuan Import Aman (Non-Destructive & Verbatim):</strong>
                <p>
                  1. <strong>Gelar Dosen Verbatim:</strong> Nama dosen pengampu beserta seluruh gelar akademik, gelar profesi, koma, dan titik disimpan 100% persis seperti file asli.
                </p>
                <p>
                  2. <strong>Auto-Detect Semester:</strong> Kolom Periode tidak perlu ada di Excel. Sistem otomatis memetakan Semester (I, III, V, VII = <strong>GANJIL</strong>, II, IV, VI, VIII = <strong>GENAP</strong>).
                </p>
                <p>
                  3. <strong>Rollback Transaksional:</strong> Setiap batch import dapat dibatalkan (Rollback) kapan saja melalui Riwayat Import tanpa merusak data lainnya.
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelected}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">
                  Klik untuk Memilih File Excel (.xlsx / .xls)
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Kolom yang diproses: <strong>Matakuliah</strong>, <strong>SKS</strong>, <strong>W</strong>, <strong>Smtr</strong>, <strong>D O S E N</strong>
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm mt-2">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilih file dari komputer</span>
              </div>
            </div>

            {/* Template Download Banner */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div className="text-sm font-bold text-slate-800">Unduh Format Template Standar</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Template resmi dengan kolom: Matakuliah, SKS, W, Smtr, D O S E N & contoh Team Teaching.
                </div>
              </div>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Download Template Excel
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PREVIEW & COLUMN MAPPING VERIFICATION */}
        {step === 'preview' && (
          <div className="space-y-5">
            {/* Top file info & mapping section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>File: <strong>{file?.name}</strong></span>
                  <span className="text-slate-400">({previewRows.length} baris terbaca)</span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold self-start sm:self-auto"
                >
                  Ganti File
                </button>
              </div>

              {/* Column Mapping Selectors */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Pemetaan Kolom Excel (Auto-Detected)
                  </div>
                  <div className="text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                    ⚡ Periode Ganjil/Genap otomatis dihitung dari Semester
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                  {/* Course Name */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kolom Mata Kuliah <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={columnMapping.courseNameCol}
                      onChange={(e) => handleMappingChange('courseNameCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs"
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* SKS */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kolom SKS <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={columnMapping.sksCol}
                      onChange={(e) => handleMappingChange('sksCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs"
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* W Code */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kolom W / Sifat <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={columnMapping.wCodeCol}
                      onChange={(e) => handleMappingChange('wCodeCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs"
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kolom Semester / Smtr <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={columnMapping.semesterCol}
                      onChange={(e) => handleMappingChange('semesterCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs"
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Lecturer */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kolom D O S E N <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={columnMapping.lecturerCol}
                      onChange={(e) => handleMappingChange('lecturerCol', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 text-xs"
                    >
                      <option value="">-- Pilih Kolom --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* DIAGNOSTIC METRIC CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Baris</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{metrics.total}</div>
              </div>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-emerald-700">Valid</div>
                <div className="text-lg font-bold text-emerald-800 mt-0.5">{metrics.valid}</div>
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-amber-700">Warning</div>
                <div className="text-lg font-bold text-amber-800 mt-0.5">{metrics.warning}</div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-blue-700">Team Teaching</div>
                <div className="text-lg font-bold text-blue-800 mt-0.5">{metrics.multiple}</div>
              </div>

              <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-orange-700">Dosen Unknown</div>
                <div className="text-lg font-bold text-orange-800 mt-0.5">{metrics.unlinkedLecturer}</div>
              </div>

              <div className="p-2.5 bg-cyan-50 border border-cyan-200 rounded-lg text-center">
                <div className="text-[10px] uppercase font-bold text-cyan-700">MK Unknown</div>
                <div className="text-lg font-bold text-cyan-800 mt-0.5">{metrics.unlinkedCourse}</div>
              </div>

              {metrics.error > 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-center">
                  <div className="text-[10px] uppercase font-bold text-rose-700">Error</div>
                  <div className="text-lg font-bold text-rose-800 mt-0.5">{metrics.error}</div>
                </div>
              )}
            </div>

            {/* CONTROLS & IMPORT MODE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1 font-semibold rounded ${activeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                >
                  Semua ({previewRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('valid')}
                  className={`px-2.5 py-1 font-semibold rounded ${activeFilter === 'valid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'}`}
                >
                  Valid ({metrics.valid})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('warning')}
                  className={`px-2.5 py-1 font-semibold rounded ${activeFilter === 'warning' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600'}`}
                >
                  Warning ({metrics.warning})
                </button>
                {metrics.error > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('error')}
                    className={`px-2.5 py-1 font-semibold rounded ${activeFilter === 'error' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'}`}
                  >
                    Error ({metrics.error})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveFilter('multiple')}
                  className={`px-2.5 py-1 font-semibold rounded ${activeFilter === 'multiple' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}
                >
                  Team Teaching ({metrics.multiple})
                </button>
              </div>

              {/* Mode Selection */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Mode Import:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setImportMode('append')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      importMode === 'append' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Tambahkan Data (Append)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('upsert')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                      importMode === 'upsert' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Update / Upsert
                  </button>
                </div>
              </div>
            </div>

            {/* PREVIEW DATA TABLE */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="max-h-[42vh] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700 uppercase border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={metrics.selectedCount === previewRows.filter((r) => r.status !== 'error').length}
                          onChange={(e) => selectAllRows(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                      </th>
                      <th className="p-2.5 w-12 text-center">No</th>
                      <th className="p-2.5 w-14 text-center">Smtr</th>
                      <th className="p-2.5 w-24">Periode</th>
                      <th className="p-2.5 min-w-[200px]">Mata Kuliah</th>
                      <th className="p-2.5 w-14 text-center">SKS</th>
                      <th className="p-2.5 w-12 text-center">W</th>
                      <th className="p-2.5 min-w-[260px]">D O S E N (Verbatim)</th>
                      <th className="p-2.5 min-w-[180px]">Status & Diagnostik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-500">
                          Tidak ada baris data pada filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((item, idx) => {
                        const isGanjil = item.assignment.academic_period === 'GANJIL';
                        const verbatimLecturer = item.raw.raw_lecturer_name;
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 ${
                              item.status === 'error' ? 'bg-rose-50/40' : item.isDuplicateLooking ? 'bg-purple-50/30' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                disabled={item.status === 'error'}
                                onChange={() => toggleSelectRow(previewRows.indexOf(item))}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>

                            {/* No */}
                            <td className="p-2.5 text-center font-mono text-slate-500">
                              {item.raw.raw_no}
                            </td>

                            {/* Semester */}
                            <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                              {item.raw.source_semester}
                            </td>

                            {/* Periode */}
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isGanjil ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {item.assignment.academic_period} (Otomatis)
                              </span>
                            </td>

                            {/* Mata Kuliah */}
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{item.assignment.base_course_name}</span>
                                {item.assignment.section && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    Kelas {item.assignment.section}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.raw.raw_course_name}
                              </div>
                            </td>

                            {/* SKS */}
                            <td className="p-2.5 text-center font-mono">
                              <span className="font-bold text-slate-800">{item.assignment.effective_sks}</span>
                              {item.raw.raw_sks !== String(item.assignment.effective_sks) && (
                                <span className="text-[10px] text-slate-400 block font-mono">({item.raw.raw_sks})</span>
                              )}
                            </td>

                            {/* W */}
                            <td className="p-2.5 text-center font-mono font-medium text-slate-700">
                              {item.raw.raw_w_code}
                            </td>

                            {/* Dosen (VERBATIM) */}
                            <td className="p-2.5">
                              <div className="font-semibold text-slate-900">
                                {verbatimLecturer || <span className="text-slate-400 italic">Dikelola LPPM / Belum Ditentukan</span>}
                              </div>
                              {item.assignment.is_coordinator && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  ★ Koordinator
                                </span>
                              )}
                              {item.matchedLecturerName && item.matchedLecturerName !== verbatimLecturer && (
                                <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                                  Linked Master: {item.matchedLecturerName}
                                </div>
                              )}
                            </td>

                            {/* Issues / Status */}
                            <td className="p-2.5">
                              {item.status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Siap Diimport
                                </span>
                              ) : item.status === 'warning' ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Warning ({item.issues.length})
                                  </span>
                                  <div className="text-[10px] text-amber-700 leading-tight">
                                    {item.issues.join('; ')}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    Error
                                  </span>
                                  <div className="text-[10px] text-rose-700 leading-tight">
                                    {item.issues.join('; ')}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                <strong>{metrics.selectedCount}</strong> dari <strong>{metrics.total}</strong> baris akan diimport ke sistem.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={metrics.selectedCount === 0 || isProcessing}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memproses Transaksi...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Import {metrics.selectedCount} Baris Data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS & AUTO SYNC OFFERINGS PROMPT */}
        {step === 'success' && (
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Import Master Dosen Berhasil!</h3>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Sebanyak <strong>{importSummary?.total || 0} baris data</strong> berhasil dimasukkan ke Master Dosen Pengampu secara aman dan terverifikasi.
              </p>
            </div>

            {/* Sync Offerings Banner */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-left max-w-lg mx-auto space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-indigo-950">
                    Sinkronkan ke Jadwal Perkuliahan Aktif?
                  </div>
                  <div className="text-xs text-indigo-700 mt-1">
                    Sistem dapat langsung mencocokkan dosen pengampu yang baru diimport ke dalam seluruh seksi <strong>Course Offering</strong> aktif (termasuk multi-dosen / team teaching).
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenSyncOfferings) {
                      onOpenSyncOfferings();
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sinkronkan ke Course Offering Sekarang
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-sm"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
