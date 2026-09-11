import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, GraduationCap, Users } from 'lucide-react';
import { ClassGroup, Course, RolePermissions } from '../types';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { useToast } from '../components/ui/Toast';

interface ClassesPageProps {
  classes: ClassGroup[];
  courses?: Course[];
  permissions?: RolePermissions;
  onSaveClass: (cls: ClassGroup) => void;
  onDeleteClass: (id: string) => void;
}

export const ClassesPage: React.FC<ClassesPageProps> = ({
  classes,
  courses = [],
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onSaveClass,
  onDeleteClass,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ClassGroup | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [studentCount, setStudentCount] = useState<number>(36);
  const [program, setProgram] = useState('S1 Teknik Elektro');

  const openAddModal = () => {
    setEditingClass(null);
    setCode(`ELK-${classes.length + 1}A`);
    setName(`Teknik Elektro Rombel ${classes.length + 1}A`);
    setSemester(1);
    setStudentCount(35);
    setProgram('S1 Teknik Elektro');
    setIsModalOpen(true);
  };

  const openEditModal = (cl: ClassGroup) => {
    setEditingClass(cl);
    setCode(cl.code);
    setName(cl.name);
    setSemester(cl.semester);
    setStudentCount(cl.studentCount);
    setProgram(cl.program);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast('warning', 'Data belum lengkap', 'Kode dan nama rombel wajib diisi.');
      return;
    }

    const classData: ClassGroup = {
      id: editingClass ? editingClass.id : `cls-${Date.now().toString(36)}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      semester,
      studentCount,
      program,
    };

    onSaveClass(classData);
    showToast(
      'success',
      editingClass ? 'Kelas Diperbarui' : 'Kelas Ditambahkan',
      `${classData.code} berhasil disimpan.`
    );
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteClass(deleteTarget.id);
    showToast('info', 'Kelas Dihapus', `${deleteTarget.code} berhasil dihapus dari data rombel.`);
    setDeleteTarget(null);
  };

  const filtered = classes.filter(c => {
    const q = (searchTerm || '').toLowerCase();
    return (
      (c.code || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q)
    );
  });

  // Courses enrolled for this class
  const classCourses = deleteTarget
    ? courses.filter(c => c.classId === deleteTarget.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Data Kelas & Rombongan Belajar</h2>
          <p className="text-xs text-slate-500">
            Daftar kelompok mahasiswa (rombel) per semester untuk pemisahan jadwal
          </p>
        </div>
        {permissions.canCreate && (
          <button
            onClick={openAddModal}
            id="btn-add-class"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama kelas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(cl => (
          <div
            key={cl.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="text-base font-bold text-slate-900">{cl.code}</span>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100">
                  Smtr {cl.semester}
                </span>
              </div>
              <h3 className="text-xs font-medium text-slate-600 mt-1">{cl.name}</h3>
              <div className="text-[11px] text-slate-400 mt-0.5">{cl.program}</div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>{cl.studentCount} Mahasiswa</span>
              </div>
              <div className="flex items-center gap-1">
                {permissions.canEdit && (
                  <button
                    onClick={() => openEditModal(cl)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Kelas"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {permissions.canDelete && (
                  <button
                    onClick={() => setDeleteTarget(cl)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus Kelas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirmDelete={handleConfirmDelete}
        title="Hapus Rombel Kelas"
        itemName={deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}` : ''}
        itemType="Kelas"
        isUsed={classCourses.length > 0}
        usedDetails={
          classCourses.length > 0
            ? classCourses.map(c => `Terdaftar pada kurikulum matkul: ${c.code} - ${c.name} (${c.sks} SKS)`)
            : []
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
        subtitle="Identitas kelompok belajar mahasiswa"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Kelas *</label>
            <input
              type="text"
              required
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Contoh: ELK-3A"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Rombel *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Teknik Elektro 3A"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
              <select
                value={semester}
                onChange={e => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
                <option value={3}>Semester 3</option>
                <option value={4}>Semester 4</option>
                <option value={5}>Semester 5</option>
                <option value={6}>Semester 6</option>
                <option value={7}>Semester 7</option>
                <option value={8}>Semester 8</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jumlah Mahasiswa *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={studentCount}
                onChange={e => setStudentCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              Simpan Kelas
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
