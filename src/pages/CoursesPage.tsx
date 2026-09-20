import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, BookOpen, Filter, Check, X, Layers, Info } from 'lucide-react';
import { Course, Lecturer, ClassGroup, DayOfWeek, TimePreference, CourseType, ScheduleAssignment, RolePermissions } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { useToast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { Pagination } from '../components/ui/Pagination';

interface CoursesPageProps {
  courses: Course[];
  lecturers: Lecturer[];
  classes: ClassGroup[];
  schedule?: ScheduleAssignment[];
  permissions?: RolePermissions;
  onSaveCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({
  courses,
  lecturers,
  classes,
  schedule = [],
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onSaveCourse,
  onDeleteCourse,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCurriculum, setFilterCurriculum] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterSemester, filterType, filterCurriculum, pageSize]);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  // Form states (Master Course attributes only)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [sks, setSks] = useState<number>(3);
  const [curriculumYear, setCurriculumYear] = useState<number>(2026);
  const [type, setType] = useState<CourseType>('Wajib');
  const [kbkSelect, setKbkSelect] = useState<string>('umum');
  const [durationMinutes, setDurationMinutes] = useState<number>(150);
  const [studentCount, setStudentCount] = useState<number>(35);
  const [preferredDay, setPreferredDay] = useState<DayOfWeek | 'Bebas'>('Bebas');
  const [preferredTime, setPreferredTime] = useState<TimePreference>('Fleksibel');
  const [priority, setPriority] = useState<'Tinggi' | 'Normal'>('Normal');

  const openAddModal = () => {
    setEditingCourse(null);
    setCode(`MPS${Math.floor(1000000 + Math.random() * 9000000)}`);
    setName('');
    setSemester(1);
    setSks(3);
    setCurriculumYear(2026);
    setType('Wajib');
    setKbkSelect('umum');
    setDurationMinutes(150);
    setStudentCount(35);
    setPreferredDay('Bebas');
    setPreferredTime('Fleksibel');
    setPriority('Normal');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setCode(c.code);
    setName(c.name);
    setSemester(c.semester);
    setSks(c.sks);
    setCurriculumYear(c.curriculumYear || 2026);
    setType(c.type || (c.category === 'Wajib' ? 'Wajib' : 'Pilihan'));
    setKbkSelect(c.kbkIds && c.kbkIds.length > 0 ? c.kbkIds[0] : 'umum');
    setDurationMinutes(c.durationMinutes || c.sks * 50);
    setStudentCount(c.studentCount || 35);
    setPreferredDay(c.preferredDay || 'Bebas');
    setPreferredTime(c.preferredTime || 'Fleksibel');
    setPriority(c.priority || 'Normal');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('warning', 'Data belum lengkap', 'Harap isi kode dan nama mata kuliah.');
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const isWajib = cleanCode.startsWith('FBS') || cleanCode.startsWith('MPS') || cleanCode.startsWith('MWU');

    const courseData: Course = {
      id: editingCourse ? editingCourse.id : `crs-${Date.now().toString(36)}`,
      code: cleanCode,
      courseCode: cleanCode,
      name: name.trim(),
      courseName: name.trim(),
      semester,
      recommendedSemester: semester,
      sks,
      credits: sks,
      curriculumYear: (curriculumYear as 2022 | 2026),
      category: isWajib ? 'Wajib' : 'Pilihan',
      type,
      kbkIds: kbkSelect !== 'umum' ? [kbkSelect] : [],
      durationMinutes: sks * 50,
      studentCount,
      preferredDay,
      preferredTime,
      priority,
    };

    onSaveCourse(courseData);
    showToast(
      'success',
      editingCourse ? 'Mata Kuliah Diperbarui' : 'Mata Kuliah Ditambahkan',
      `${courseData.code} - ${courseData.name} berhasil disimpan dalam katalog kurikulum.`
    );
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteCourse(deleteTarget.id);
    showToast('info', 'Mata Kuliah Dihapus', `${deleteTarget.code} - ${deleteTarget.name} telah berhasil dihapus dari kurikulum.`);
    setDeleteTarget(null);
  };

  const filteredCourses = useMemo(() => {
    const q = (debouncedSearch || '').toLowerCase().trim();
    return courses.filter(c => {
      const matchesSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.code || '').toLowerCase().includes(q);
      const matchesSemester = filterSemester === 'all' || c.semester.toString() === filterSemester;
      const matchesType = filterType === 'all' || c.type === filterType;
      const matchesCurriculum = filterCurriculum === 'all' || (c.curriculumYear?.toString() === filterCurriculum);
      return matchesSearch && matchesSemester && matchesType && matchesCurriculum;
    });
  }, [courses, debouncedSearch, filterSemester, filterType, filterCurriculum]);

  const paginatedCourses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCourses.slice(start, start + pageSize);
  }, [filteredCourses, currentPage, pageSize]);

  // Check references for delete modal
  const scheduledAssignments = deleteTarget
    ? schedule.filter(a => a.courseId === deleteTarget.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Master Data Mata Kuliah Kurikulum</h2>
          <p className="text-xs text-slate-500">
            Katalog kurikulum resmi: Kode, Nama, SKS, Kurikulum, Semester, dan Peminatan KBK
          </p>
        </div>
        {permissions.canCreate && (
          <button
            onClick={openAddModal}
            id="btn-add-course"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Master Mata Kuliah</span>
          </button>
        )}
      </div>

      {/* Info Banner on Lecturer Decoupling Rule */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs text-indigo-950 space-y-1">
          <div className="font-bold text-sm text-indigo-900">
            Katalog Master Mata Kuliah Murni (Decoupled dari Dosen)
          </div>
          <p className="text-indigo-800 leading-relaxed">
            Master Mata Kuliah hanya menyimpan metadata akademik: <strong>Kode MK, Nama MK, SKS, Kurikulum, Semester Paket, dan KBK</strong>.
            Dosen pengampu <em>tidak ditetapkan di master</em>, melainkan ditetapkan secara spesifik per-kelas/rombel (misal Kelas A, B, C) pada menu{' '}
            <strong className="underline decoration-indigo-400">Course Offerings (Kelas / Rombel)</strong>.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kode atau nama mata kuliah..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterCurriculum}
            onChange={e => setFilterCurriculum(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Kurikulum</option>
            <option value="2026">Kurikulum 2026</option>
            <option value="2022">Kurikulum 2022</option>
          </select>

          <select
            value={filterSemester}
            onChange={e => setFilterSemester(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <option key={s} value={s.toString()}>
                Semester {s}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Semua Jenis</option>
            <option value="Wajib">Wajib</option>
            <option value="Praktikum">Praktikum</option>
            <option value="Pilihan">Pilihan</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredCourses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Kode & Nama Matkul</th>
                  <th className="px-3 py-3">Kurikulum</th>
                  <th className="px-3 py-3">Semester</th>
                  <th className="px-3 py-3">Bobot SKS</th>
                  <th className="px-3 py-3">Kategori & KBK</th>
                  <th className="px-3 py-3">Tipe Kuliah</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCourses.map(c => {
                  const kbkLabel = c.kbkIds?.includes('kbk-komputer')
                    ? 'KBK Komputer'
                    : c.kbkIds?.includes('kbk-stl')
                    ? 'KBK Tenaga Listrik'
                    : c.kbkIds?.includes('kbk-elkom') || c.kbkIds?.includes('kbk-elektronika-komunikasi')
                    ? 'KBK Elektronika & Telekom'
                    : 'Umum / Wajib Bersama';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 font-mono">{c.code}</div>
                        <div className="text-slate-700 text-xs font-medium">{c.name}</div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {c.curriculumYear || 2026}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">Semester {c.semester}</span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700">
                          {c.sks} SKS
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="text-xs font-medium text-slate-800">{c.category || 'Wajib'}</div>
                        <div className="text-[10px] text-slate-500">{kbkLabel}</div>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <Badge
                          variant={
                            c.type === 'Wajib'
                              ? 'primary'
                              : c.type === 'Praktikum'
                              ? 'warning'
                              : 'secondary'
                          }
                          size="sm"
                        >
                          {c.type || 'Teori'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {permissions.canEdit && (
                            <button
                              onClick={() => openEditModal(c)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Master Mata Kuliah"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {permissions.canDelete && (
                            <button
                              onClick={() => setDeleteTarget(c)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Master Mata Kuliah"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">Tidak ada data mata kuliah yang sesuai filter</p>
          </div>
        )}

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filteredCourses.length / pageSize) || 1}
          totalItems={filteredCourses.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 20, 50]}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
        title="Hapus Master Mata Kuliah"
        itemName={deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}` : ''}
        itemType="Mata Kuliah"
        isUsed={scheduledAssignments.length > 0}
        usedDetails={
          scheduledAssignments.length > 0
            ? [`Mata kuliah ini saat ini teralokasi pada ${scheduledAssignments.length} jadwal perkuliahan aktif.`]
            : []
        }
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? 'Edit Master Mata Kuliah' : 'Tambah Master Mata Kuliah'}
        subtitle="Definisi kurikulum resmi: Kode, Nama, SKS, Semester paket, dan KBK"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Mata Kuliah *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Misal: MPS1073116"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 uppercase font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Mata Kuliah *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Misal: Rangkaian Listrik II"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Kurikulum *</label>
              <select
                value={curriculumYear}
                onChange={e => setCurriculumYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={2026}>Kurikulum 2026 (Aktif)</option>
                <option value={2022}>Kurikulum 2022 (Transisi)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester Paket *</label>
              <select
                value={semester}
                onChange={e => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bobot SKS *</label>
              <select
                value={sks}
                onChange={e => {
                  const s = Number(e.target.value);
                  setSks(s);
                  setDurationMinutes(s * 50);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value={1}>1 SKS (50 Menit)</option>
                <option value={2}>2 SKS (100 Menit)</option>
                <option value={3}>3 SKS (150 Menit)</option>
                <option value={4}>4 SKS (200 Menit)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">KBK / Bidang Minat (Smtr 5–8)</label>
              <select
                value={kbkSelect}
                onChange={e => setKbkSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="umum">Umum / Paket Wajib Bersama (Smtr 1–4)</option>
                <option value="kbk-komputer">KBK Komputer &amp; Informatika</option>
                <option value="kbk-stl">KBK Sistem Tenaga Listrik (STL)</option>
                <option value="kbk-elkom">KBK Elektronika &amp; Telekomunikasi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kuliah *</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as CourseType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Wajib">Teori Wajib</option>
                <option value="Praktikum">Praktikum Laboratorium</option>
                <option value="Pilihan">Pilihan Bebas</option>
              </select>
            </div>
          </div>

          {/* Lecturer assignment explanation notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600">
            <strong>Penetapan Dosen Pengampu:</strong> Dosen pengampu tidak disimpan pada Master Mata Kuliah. Dosen ditentukan secara spesifik pada setiap kelas/rombel (misal Rangkaian Listrik II Kelas A → Dosen A, Kelas B → Dosen B) di menu <strong>Course Offerings</strong>.
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Simpan Master Mata Kuliah
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
