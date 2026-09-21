import React, { useState, useRef, useEffect } from 'react';
import { Menu, Zap, Sparkles, AlertCircle, CheckCircle2, Globe, MoreVertical } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { RoleSwitcher } from './RoleSwitcher';
import { CurrentUser, Lecturer, ClassGroup, ScheduleStatus, UserRole } from '../../types';

interface HeaderProps {
  activeViewTitle: string;
  onOpenMobileSidebar: () => void;
  hasSchedule: boolean;
  isOptimized: boolean;
  totalConflicts: number;
  onQuickGenerate: () => void;
  onQuickOptimize: () => void;
  isOptimizing: boolean;
  currentUser: CurrentUser;
  lecturers: Lecturer[];
  classes: ClassGroup[];
  scheduleStatus: ScheduleStatus;
  academicYear: string;
  onSwitchRole: (role: UserRole, targetId?: string) => void;
  onPublishSchedule?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeViewTitle,
  onOpenMobileSidebar,
  hasSchedule,
  isOptimized,
  totalConflicts,
  onQuickGenerate,
  onQuickOptimize,
  isOptimizing,
  currentUser,
  lecturers,
  classes,
  scheduleStatus,
  academicYear,
  onSwitchRole,
  onPublishSchedule,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-3 sm:px-6 py-2 sm:py-2.5 transition-all no-print">
      <div className="flex items-center justify-between gap-2">
        {/* Left: Hamburger + Title + Context Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden transition-colors shrink-0"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
              <h2 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight truncate max-w-[150px] sm:max-w-[280px] lg:max-w-none">
                {activeViewTitle}
              </h2>

              {/* Status Badge: Compact on mobile, full text on desktop */}
              {scheduleStatus === 'published' ? (
                <Badge variant="success" size="sm" className="shrink-0">
                  <Globe className="w-3 h-3" />
                  <span className="hidden sm:inline">Jadwal Dipublikasikan</span>
                  <span className="sm:hidden">Terbit</span>
                </Badge>
              ) : isOptimized ? (
                <Badge variant="indigo" size="sm" className="shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Optimasi Selesai ({totalConflicts} Konflik)</span>
                  <span className="sm:hidden">Optimal ({totalConflicts})</span>
                </Badge>
              ) : hasSchedule ? (
                <Badge variant={totalConflicts > 0 ? 'warning' : 'success'} size="sm" className="shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Jadwal Awal ({totalConflicts} Konflik)</span>
                  <span className="sm:hidden">Awal ({totalConflicts})</span>
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" className="shrink-0 hidden xs:inline-flex">
                  <span className="hidden sm:inline">Belum Ada Jadwal</span>
                  <span className="sm:hidden">Draft</span>
                </Badge>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block truncate">
              Jurusan Teknik Elektro • Universitas Mataram • T.A. {academicYear}
            </p>
          </div>
        </div>

        {/* Right: Actions & Role Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {currentUser.role === 'admin' && (
            <>
              {!hasSchedule && (
                <button
                  onClick={onQuickGenerate}
                  id="btn-quick-generate-header"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold border border-indigo-200 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Awal</span>
                </button>
              )}

              {hasSchedule && !isOptimized && (
                <button
                  onClick={onQuickOptimize}
                  id="btn-quick-optimize-header"
                  disabled={isOptimizing}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>{isOptimizing ? 'Mengoptimasi...' : 'Mulai SA'}</span>
                </button>
              )}
            </>
          )}

          {/* User Role Switcher */}
          <RoleSwitcher
            currentUser={currentUser}
            lecturers={lecturers}
            scheduleStatus={scheduleStatus}
            onSwitchRole={onSwitchRole}
            onPublishSchedule={onPublishSchedule}
          />

          {/* Mobile Secondary More Actions Menu */}
          {currentUser.role === 'admin' && (
            <div className="relative md:hidden" ref={moreMenuRef}>
              <button
                type="button"
                id="btn-mobile-more-actions"
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                aria-label="Aksi Lainnya"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMoreOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    AKSI CEPAT
                  </div>
                  {!hasSchedule && (
                    <button
                      onClick={() => {
                        setIsMoreOpen(false);
                        onQuickGenerate();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-semibold"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Generate Jadwal Awal</span>
                    </button>
                  )}
                  {hasSchedule && !isOptimized && (
                    <button
                      onClick={() => {
                        setIsMoreOpen(false);
                        onQuickOptimize();
                      }}
                      disabled={isOptimizing}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-semibold disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4 text-indigo-600" />
                      <span>{isOptimizing ? 'Sedang Optimasi...' : 'Jalankan Optimasi SA'}</span>
                    </button>
                  )}
                  {onPublishSchedule && (
                    <button
                      onClick={() => {
                        setIsMoreOpen(false);
                        onPublishSchedule();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold"
                    >
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span>Publikasikan Jadwal</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
