import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  ChevronDown,
  Check,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { CurrentUser, UserRole, Lecturer, ScheduleStatus } from '../../types';

interface RoleSwitcherProps {
  currentUser: CurrentUser;
  lecturers: Lecturer[];
  scheduleStatus: ScheduleStatus;
  onSwitchRole: (role: UserRole, targetId?: string) => void;
  onPublishSchedule?: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentUser,
  lecturers,
  scheduleStatus,
  onSwitchRole,
  onPublishSchedule,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLecturer = lecturers.find(l => l.id === currentUser.lecturerId) || lecturers[0];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span>Admin Penjadwalan</span>
          </span>
        );
      case 'lecturer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-amber-700" />
            <span>Dosen</span>
          </span>
        );
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
            <span>Mahasiswa</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span>Admin</span>
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="btn-role-switcher"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-2xs"
        aria-label="Ganti Peran Pengguna"
      >
        <div className="flex items-center gap-2">
          {getRoleBadge(currentUser.role)}
          <div className="text-left hidden md:block">
            <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight flex items-center gap-1">
              <span>
                {currentUser.role === 'admin'
                  ? 'Jurusan Teknik Elektro'
                  : currentUser.role === 'lecturer'
                  ? activeLecturer?.name || 'Dosen Pengampu'
                  : 'Mahasiswa (View Only)'}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Role Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3.5 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PILIH PERAN PENGGUNA</p>
          </div>

          <div className="p-1 space-y-1">
            {/* Option 1: Administrator */}
            <button
              onClick={() => {
                onSwitchRole('admin');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                currentUser.role === 'admin' ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Admin Penjadwalan</div>
                  <div className="text-[10px] text-slate-500">Kelola master, optimasi SA, & jadwal</div>
                </div>
              </div>
              {currentUser.role === 'admin' && <Check className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Option 2: Dosen */}
            <button
              onClick={() => {
                onSwitchRole('lecturer', activeLecturer?.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                currentUser.role === 'lecturer' ? 'bg-amber-50 border border-amber-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Dosen Pengampu</div>
                  <div className="text-[10px] text-slate-500">Lihat jadwal mengajar & atur ketersediaan</div>
                </div>
              </div>
              {currentUser.role === 'lecturer' && <Check className="w-4 h-4 text-amber-600" />}
            </button>

            {/* Option 3: Mahasiswa */}
            <button
              onClick={() => {
                onSwitchRole('student');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                currentUser.role === 'student' ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">Mahasiswa</div>
                  <div className="text-[10px] text-slate-500">Melihat jadwal perkuliahan (View-only)</div>
                </div>
              </div>
              {currentUser.role === 'student' && <Check className="w-4 h-4 text-emerald-600" />}
            </button>
          </div>

          {/* If role is lecturer, allow quick lecturer switch */}
          {currentUser.role === 'lecturer' && (
            <div className="mt-2 pt-2 border-t border-slate-100 px-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ganti Dosen:</p>
              <select
                value={currentUser.lecturerId || ''}
                onChange={(e) => {
                  onSwitchRole('lecturer', e.target.value);
                  setIsOpen(false);
                }}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              >
                {lecturers.slice(0, 20).map((lec) => (
                  <option key={lec.id} value={lec.id}>
                    {lec.name} ({lec.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
