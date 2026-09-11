import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  ChevronDown,
  Check,
  Sparkles,
  Info,
  UserCheck,
  Building,
} from 'lucide-react';
import { CurrentUser, UserRole, Lecturer, ClassGroup, ScheduleStatus } from '../../types';
import { Badge } from '../ui/Badge';

interface RoleSwitcherProps {
  currentUser: CurrentUser;
  lecturers: Lecturer[];
  classes: ClassGroup[];
  scheduleStatus: ScheduleStatus;
  onSwitchRole: (role: UserRole, targetId?: string) => void;
  onPublishSchedule?: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentUser,
  lecturers,
  classes,
  scheduleStatus,
  onSwitchRole,
  onPublishSchedule,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
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
  const activeClass = classes.find(c => c.id === currentUser.classId) || classes[0];

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
            <span>Admin SPK</span>
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
              <span>{currentUser.role === 'admin' ? 'Ketua Jurusan / Panitia' : currentUser.role === 'lecturer' ? activeLecturer?.expertise || 'Teknik Elektro' : activeClass?.code || 'S1 Elektro'}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Role Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="p-3.5 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Simulasi Peran Pengguna (RBAC)
              </span>
              <Badge
                variant={scheduleStatus === 'published' ? 'success' : scheduleStatus === 'optimized' ? 'indigo' : 'warning'}
                size="sm"
              >
                Status: {scheduleStatus.toUpperCase()}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Pilih peran untuk mensimulasikan hak akses, tampilan antarmuka, dan workflow penjadwalan.
            </p>
          </div>

          <div className="p-2 space-y-1.5 max-h-[75vh] overflow-y-auto">
            {/* 1. ADMIN ROLE */}
            <div
              onClick={() => {
                onSwitchRole('admin');
                setIsOpen(false);
              }}
              className={`p-3 rounded-xl cursor-pointer transition-all border ${
                currentUser.role === 'admin'
                  ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                  : 'border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Administrator (Ketua Jurusan / Tim SPK)</span>
                      {currentUser.role === 'admin' && <Check className="w-3.5 h-3.5 text-indigo-600 font-bold" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Akses penuh: Kelola Master Data, SA Optimizer, Evaluasi Bobot, Edit Jadwal, Publikasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. LECTURER ROLE */}
            <div
              className={`p-3 rounded-xl transition-all border ${
                currentUser.role === 'lecturer'
                  ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                  : 'border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div
                onClick={() => {
                  onSwitchRole('lecturer', activeLecturer?.id);
                  setIsOpen(false);
                }}
                className="flex items-start justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Dosen Pengampu</span>
                      {currentUser.role === 'lecturer' && <Check className="w-3.5 h-3.5 text-amber-600 font-bold" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Melihat jadwal mengajar pribadi, atur ketersediaan slot waktu, cek bentrokan jadwal.
                    </p>
                  </div>
                </div>
              </div>

              {/* Selector which lecturer is logged in */}
              <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-amber-900 shrink-0">Profil Dosen:</span>
                <select
                  value={currentUser.lecturerId || activeLecturer?.id || ''}
                  onChange={e => {
                    onSwitchRole('lecturer', e.target.value);
                  }}
                  className="w-full text-xs px-2 py-1 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  {lecturers.map(lec => (
                    <option key={lec.id} value={lec.id}>
                      {lec.code ? `[${lec.code}] ` : ''}{lec.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. STUDENT ROLE */}
            <div
              className={`p-3 rounded-xl transition-all border ${
                currentUser.role === 'student'
                  ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                  : 'border-slate-100 hover:bg-slate-50'
              }`}
            >
              <div
                onClick={() => {
                  onSwitchRole('student', activeClass?.id);
                  setIsOpen(false);
                }}
                className="flex items-start justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Mahasiswa</span>
                      {currentUser.role === 'student' && <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Melihat jadwal kuliah sesuai rombel/kelas & semester (read-only).
                    </p>
                  </div>
                </div>
              </div>

              {/* Selector which class/semester is logged in */}
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-emerald-900 shrink-0">Kelas Rombel:</span>
                <select
                  value={currentUser.classId || activeClass?.id || ''}
                  onChange={e => {
                    onSwitchRole('student', e.target.value);
                  }}
                  className="w-full text-xs px-2 py-1 rounded-lg border border-emerald-300 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                >
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code} • Smtr {cls.semester} ({cls.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Publish Action for Admin */}
          {currentUser.role === 'admin' && onPublishSchedule && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-600">Publikasi ke Mahasiswa & Dosen</span>
              <button
                onClick={() => {
                  onPublishSchedule();
                  setIsOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors"
              >
                {scheduleStatus === 'published' ? 'Jadwal Terpublikasi ✓' : 'Publikasikan Jadwal'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
