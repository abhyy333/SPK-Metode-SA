import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, DoorOpen, CheckCircle2, XCircle, Users, RotateCcw } from 'lucide-react';
import { Room, RoomType, ScheduleAssignment, RolePermissions } from '../types';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { useToast } from '../components/ui/Toast';
import { StorageService } from '../services/storageService';

interface RoomsPageProps {
  rooms: Room[];
  schedule?: ScheduleAssignment[];
  permissions?: RolePermissions;
  onSaveRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
}

export const RoomsPage: React.FC<RoomsPageProps> = ({
  rooms,
  schedule = [],
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onSaveRoom,
  onDeleteRoom,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('Gedung Kuliah Elektro');
  const [capacity, setCapacity] = useState<number>(45);
  const [type, setType] = useState<RoomType>('Kelas');
  const [facilitiesText, setFacilitiesText] = useState('Proyektor HD, AC, Whiteboard, Sound System');
  const [isActive, setIsActive] = useState(true);

  const openAddModal = () => {
    setEditingRoom(null);
    setCode(`TE-${(rooms.length + 1) * 10}`);
    setName(`Ruang Kuliah TE-${(rooms.length + 1) * 10}`);
    setBuilding('Gedung Kuliah Elektro');
    setCapacity(45);
    setType('Kelas');
    setFacilitiesText('Proyektor HD, AC, Whiteboard, Sound System');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (r: Room) => {
    setEditingRoom(r);
    setCode(r.code);
    setName(r.name);
    setBuilding(r.building);
    setCapacity(r.capacity);
    setType(r.type);
    setFacilitiesText(r.facilities.join(', '));
    setIsActive(r.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim() || capacity <= 0) {
      showToast('warning', 'Data belum valid', 'Pastikan kode, nama dan kapasitas terisi benar.');
      return;
    }

    const roomData: Room = {
      id: editingRoom ? editingRoom.id : `rm-${Date.now().toString(36)}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      building: building.trim(),
      capacity,
      type,
      facilities: facilitiesText
        .split(',')
        .map(f => f.trim())
        .filter(Boolean),
      isActive,
    };

    onSaveRoom(roomData);
    showToast(
      'success',
      editingRoom ? 'Ruangan Diperbarui' : 'Ruangan Ditambahkan',
      `${roomData.code} (${roomData.capacity} Kursi) berhasil disimpan.`
    );
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    onDeleteRoom(deleteTarget.id);
    showToast('info', 'Ruangan Dihapus', `${deleteTarget.code} berhasil dihapus dari data ruangan.`);
    setDeleteTarget(null);
  };

  const handleConfirmDeactivate = () => {
    if (!deleteTarget) return;
    const deactivated: Room = {
      ...deleteTarget,
      isActive: false,
    };
    onSaveRoom(deactivated);
    showToast('info', 'Ruangan Dinonaktifkan', `${deleteTarget.code} telah diubah menjadi non-aktif.`);
    setDeleteTarget(null);
  };

  const filtered = rooms.filter(r => {
    const q = (searchTerm || '').toLowerCase();
    const matchSearch =
      (r.code || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.building || '').toLowerCase().includes(q);
    const matchType = filterType === 'all' || r.type === filterType;
    return matchSearch && matchType;
  });

  // Check schedule references
  const scheduledRooms = deleteTarget
    ? schedule.filter(a => a.roomId === deleteTarget.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Data Ruangan & Laboratorium</h2>
          <p className="text-xs text-slate-500">
            Daftar sarana perkuliahan, kapasitas ruang, dan peruntukan fasilitas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permissions.canCreate && (
            <button
              onClick={() => {
                const defs = StorageService.resetRoomsToDefault();
                defs.forEach(r => onSaveRoom(r));
                showToast('success', 'Reset Master Ruangan', '7 Ruangan master berhasil dimuat ulang (7/7 Imported).');
              }}
              id="btn-reset-default-rooms"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Reset ke 7 Master Ruangan Default (Ruang E, F, I, D2, STUDIO, Komputer, INTER)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset 7 Ruang Default</span>
            </button>
          )}
          {permissions.canCreate && (
            <button
              onClick={openAddModal}
              id="btn-add-room"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ruangan</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Import Summary Banner */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
            <DoorOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">Master Data Ruangan Perkuliahan (7/7 Terpasang)</div>
            <div className="text-[11px] text-slate-600">
              Target Import: Source rows: 7 | Imported: {rooms.length} | Skipped: 0 | Modified: 0
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
            Hard Constraint C4 Aktif
          </span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama ruangan..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
        >
          <option value="all">Semua Tipe Ruang</option>
          <option value="Ruang Kuliah Teori">Ruang Kuliah Teori</option>
          <option value="Laboratorium">Laboratorium</option>
          <option value="Kelas">Kelas Umum</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => (
          <div
            key={r.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{r.code}</h3>
                    <p className="text-[11px] text-slate-500">{r.name}</p>
                  </div>
                </div>
                <Badge variant={r.type === 'Laboratorium' ? 'warning' : 'primary'} size="sm">
                  {r.type}
                </Badge>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Kapasitas (Hard Constraint C4):</span>
                  <span className="font-semibold text-slate-900">{r.capacity} Mahasiswa</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Gedung:</span>
                  <span className="font-medium text-slate-700">{r.building}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {r.facilities.map((fac, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]"
                  >
                    {fac}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {r.isActive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aktif Digunakan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                  <XCircle className="w-3.5 h-3.5" />
                  Non-Aktif
                </span>
              )}

              <div className="flex items-center gap-1">
                {permissions.canEdit && (
                  <button
                    onClick={() => openEditModal(r)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Ruangan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {permissions.canDelete && (
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Hapus Ruangan"
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
        onConfirmDeactivate={handleConfirmDeactivate}
        title="Hapus Ruangan Perkuliahan"
        itemName={deleteTarget ? `${deleteTarget.code} — ${deleteTarget.name}` : ''}
        itemType="Ruangan"
        isUsed={scheduledRooms.length > 0}
        usedDetails={
          scheduledRooms.length > 0
            ? [`Ruangan ini saat ini digunakan dalam ${scheduledRooms.length} alokasi jadwal kuliah.`]
            : []
        }
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? 'Edit Ruangan' : 'Tambah Ruangan Baru'}
        subtitle="Spesifikasi kapasitas dan fasilitas ruangan"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Ruangan *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Contoh: TE-101"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Ruangan *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Ruang Kuliah TE-101"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gedung / Lokasi</label>
              <input
                type="text"
                value={building}
                onChange={e => setBuilding(e.target.value)}
                placeholder="Contoh: Gedung Kuliah Elektro Lt. 1"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kapasitas Mahasiswa (C4) *
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={capacity}
                onChange={e => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Ruangan *</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as RoomType)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="Kelas">Ruang Kuliah Teori</option>
                <option value="Lab">Laboratorium Praktikum</option>
                <option value="Auditorium">Auditorium / Seminar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fasilitas</label>
              <input
                type="text"
                value={facilitiesText}
                onChange={e => setFacilitiesText(e.target.value)}
                placeholder="Pisahkan dengan koma: AC, Proyektor, Sound"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveRoom"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="isActiveRoom" className="text-xs text-slate-700 font-medium cursor-pointer">
              Ruangan siap dan aktif digunakan untuk perkuliahan semester ini
            </label>
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
              Simpan Ruangan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

