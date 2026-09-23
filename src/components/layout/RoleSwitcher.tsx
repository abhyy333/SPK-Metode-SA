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
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
            <span>Admin</span>
          </span>
        );
      case 'lecturer':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Users className="w-3.5 h-3.5 text-slate-700" />
            <span>Dosen</span>
          </span>
        );
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <GraduationCap className="w-3.5 h-3.5 text-slate-700" />
            <span>Mahasiswa</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
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
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors text-xs text-slate-700 shrink-0"
        aria-label="Ganti Peran Pengguna"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div>
            {getRoleBadge(currentUser.role)}
          </div>

          <div className="text-left hidden lg:block border-l border-slate-200 pl-2">
            <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
              {currentUser.role === 'admin'
                ? 'Administrator'
                : currentUser.role === 'lecturer'
                ? activeLecturer?.name?.split(',')[0] || 'Dosen Pengampu'
                : 'Mahasiswa'}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Role Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-md shadow-md border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Peran Pengguna</p>
          </div>

          <div className="p-1 space-y-0.5">
            {/* Option 1: Administrator */}
            <button
              onClick={() => {
                onSwitchRole('admin');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors text-xs ${
                currentUser.role === 'admin' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="font-semibold text-slate-900">Admin Penjadwalan</div>
                  <div className="text-[10px] text-slate-500">Kelola master & jadwal</div>
                </div>
              </div>
              {currentUser.role === 'admin' && <Check className="w-3.5 h-3.5 text-slate-900" />}
            </button>

            {/* Option 2: Dosen */}
            <button
              onClick={() => {
                onSwitchRole('lecturer', activeLecturer?.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors text-xs ${
                currentUser.role === 'lecturer' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="font-semibold text-slate-900">Dosen Pengampu</div>
                  <div className="text-[10px] text-slate-500">Jadwal mengajar & ketersediaan</div>
                </div>
              </div>
              {currentUser.role === 'lecturer' && <Check className="w-3.5 h-3.5 text-slate-900" />}
            </button>

            {/* Option 3: Mahasiswa */}
            <button
              onClick={() => {
                onSwitchRole('student');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors text-xs ${
                currentUser.role === 'student' ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-600" />
                <div>
                  <div className="font-semibold text-slate-900">Mahasiswa</div>
                  <div className="text-[10px] text-slate-500">Lihat jadwal kuliah resmi</div>
                </div>
              </div>
              {currentUser.role === 'student' && <Check className="w-3.5 h-3.5 text-slate-900" />}
            </button>
          </div>

          {/* If role is lecturer, allow quick lecturer switch */}
          {currentUser.role === 'lecturer' && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-100 px-2.5">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Ganti Dosen:</p>
              <select
                value={currentUser.lecturerId || ''}
                onChange={(e) => {
                  onSwitchRole('lecturer', e.target.value);
                  setIsOpen(false);
                }}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded p-1 text-slate-700"
              >
                {lecturers.slice(0, 25).map((lec) => (
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
