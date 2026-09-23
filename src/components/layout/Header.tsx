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
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center transition-all no-print">
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Left: Hamburger + Title + Context Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onOpenMobileSidebar}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden transition-colors shrink-0"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight truncate max-w-[180px] sm:max-w-none">
                {activeViewTitle}
              </h2>

              {/* Status Badge: Compact on mobile, restrained */}
              {scheduleStatus === 'published' ? (
                <Badge variant="success" size="sm" className="shrink-0">
                  <Globe className="w-3 h-3" />
                  <span>Terbit</span>
                </Badge>
              ) : isOptimized ? (
                <Badge variant="indigo" size="sm" className="shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Optimal ({totalConflicts} Konflik)</span>
                </Badge>
              ) : hasSchedule ? (
                <Badge variant={totalConflicts > 0 ? 'warning' : 'neutral'} size="sm" className="shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  <span>Draft ({totalConflicts} Konflik)</span>
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm" className="shrink-0 hidden xs:inline-flex">
                  <span>Belum Terbit</span>
                </Badge>
              )}
            </div>

            <p className="text-[11px] text-slate-500 hidden sm:block truncate">
              Teknik Elektro UNRAM • Semester Ganjil {academicYear}
            </p>
          </div>
        </div>

        {/* Right: Role Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <RoleSwitcher
            currentUser={currentUser}
            lecturers={lecturers}
            scheduleStatus={scheduleStatus}
            onSwitchRole={onSwitchRole}
            onPublishSchedule={onPublishSchedule}
          />
        </div>
      </div>
    </header>
  );
};
