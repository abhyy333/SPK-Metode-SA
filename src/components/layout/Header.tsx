import React from 'react';
import { Menu, Zap, Sparkles, AlertCircle, CheckCircle2, Play, Globe } from 'lucide-react';
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
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all no-print">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden transition-colors"
          aria-label="Buka navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">{activeViewTitle}</h2>
            {scheduleStatus === 'published' ? (
              <Badge variant="success" size="sm">
                <Globe className="w-3 h-3" />
                Jadwal Dipublikasikan
              </Badge>
            ) : isOptimized ? (
              <Badge variant="indigo" size="sm">
                <CheckCircle2 className="w-3 h-3" />
                Optimasi Selesai ({totalConflicts} Konflik)
              </Badge>
            ) : hasSchedule ? (
              <Badge variant={totalConflicts > 0 ? 'warning' : 'success'} size="sm">
                <AlertCircle className="w-3 h-3" />
                Jadwal Awal ({totalConflicts} Konflik)
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Belum Ada Jadwal
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Jurusan Teknik Elektro • Universitas Mataram • T.A. {academicYear}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {currentUser.role === 'admin' && (
          <>
            {!hasSchedule && (
              <button
                onClick={onQuickGenerate}
                id="btn-quick-generate-header"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold border border-indigo-200 transition-colors"
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isOptimizing ? 'Mengoptimasi...' : 'Mulai SA'}</span>
              </button>
            )}
          </>
        )}

        {/* User Role Switcher Dropdown */}
        <RoleSwitcher
          currentUser={currentUser}
          lecturers={lecturers}
          classes={classes}
          scheduleStatus={scheduleStatus}
          onSwitchRole={onSwitchRole}
          onPublishSchedule={onPublishSchedule}
        />
      </div>
    </header>
  );
};
