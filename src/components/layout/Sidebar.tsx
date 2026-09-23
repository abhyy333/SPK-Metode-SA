import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DoorOpen,
  Clock,
  Calendar,
  Zap,
  AlertCircle,
  FileText,
  Settings,
  Sparkles,
  RotateCcw,
  X,
  Building2,
  CalendarCheck,
  Layers,
  Package,
  Sliders,
  BarChart3,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  GraduationCap,
  LayoutGrid,
} from 'lucide-react';
import { CurrentUser, RolePermissions, ScheduleStatus } from '../../types';
import { Modal } from '../ui/Modal';

interface SidebarProps {
  activeView: string;
  onSelectView: (viewId: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onResetDemo: () => void;
  hasSchedule: boolean;
  conflictCount: number;
  currentUser: CurrentUser;
  permissions: RolePermissions;
  scheduleStatus: ScheduleStatus;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  onResetDemo,
  hasSchedule,
  conflictCount,
  currentUser,
  permissions,
  scheduleStatus,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
}) => {
  // Local collapsible state with persistence in localStorage
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('elektro_sidebar_collapsed') === 'true';
  });

  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalCollapsed;
      setInternalCollapsed(next);
      localStorage.setItem('elektro_sidebar_collapsed', String(next));
    }
  };

  // State for Reset Confirmation Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Lock body scroll safely when mobile drawer is open
  useEffect(() => {
    if (!isOpenMobile) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpenMobile]);

  const handleConfirmReset = () => {
    setIsResetModalOpen(false);
    onResetDemo();
  };

  const getNavigationGroups = () => {
    if (currentUser.role === 'student') {
      return [
        {
          group: 'PORTAL MAHASISWA',
          items: [
            { id: 'schedule', label: 'Jadwal Perkuliahan', icon: Calendar },
            { id: 'exam-scheduling', label: 'Jadwal Ujian (UTS / UAS)', icon: GraduationCap, badge: 'Ujian' },
            { id: 'packages', label: 'Kurikulum & Paket Semester', icon: Package },
            { id: 'rooms', label: 'Daftar Ruangan & Lab', icon: DoorOpen },
            { id: 'timeslots', label: 'Sesi Waktu Kuliah', icon: Clock },
          ],
        },
      ];
    }

    if (currentUser.role === 'lecturer') {
      return [
        {
          group: 'PORTAL DOSEN',
          items: [
            { id: 'lecturer-dashboard', label: 'Dashboard Dosen', icon: LayoutDashboard },
            { id: 'lecturer-schedule', label: 'Jadwal Mengajar Saya', icon: Calendar },
            { id: 'exam-scheduling', label: 'Jadwal Ujian & Pengawas', icon: GraduationCap, badge: 'Ujian' },
            { id: 'lecturer-availability', label: 'Ketersediaan & Preferensi', icon: CalendarCheck, badge: 'Penting' },
          ],
        },
        {
          group: 'JADWAL & REFERENSI',
          items: [
            { id: 'schedule', label: 'Hasil Jadwal Perkuliahan', icon: Calendar },
            { id: 'packages', label: 'Kurikulum & Paket Semester', icon: Package },
            { id: 'rooms', label: 'Daftar Ruangan & Lab', icon: DoorOpen },
            { id: 'timeslots', label: 'Sesi Waktu Kuliah', icon: Clock },
          ],
        },
      ];
    }

    // Default: ADMIN / TIM PENJADWALAN (Clear, Unified Structure)
    return [
      {
        group: 'PENJADWALAN',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          {
            id: 'scheduling',
            label: 'Penyusunan Jadwal',
            icon: Zap,
            badge: 'Kuliah',
            badgeColor: 'indigo',
          },
          {
            id: 'schedule',
            label: 'Jadwal',
            icon: Calendar,
            badge: hasSchedule && conflictCount > 0 ? `${conflictCount} Bentrok` : hasSchedule ? (scheduleStatus === 'published' ? 'Terbit' : 'Draft') : undefined,
            badgeColor: hasSchedule && conflictCount > 0 ? 'danger' : 'indigo',
          },
          {
            id: 'exam-scheduling',
            label: 'Jadwal Ujian',
            icon: GraduationCap,
            badge: 'UTS / UAS',
            badgeColor: 'indigo',
          },
          {
            id: 'schedule-history',
            label: 'Riwayat & Versi',
            icon: History,
          },
        ],
      },
      {
        group: 'DATA MASTER',
        items: [
          { id: 'master-lecturers', label: 'Master Dosen Pengampu', icon: UserCheck },
          { id: 'courses', label: 'Mata Kuliah', icon: BookOpen },
          { id: 'lecturers', label: 'Dosen', icon: Users },
          { id: 'rooms', label: 'Ruangan', icon: DoorOpen },
          { id: 'timeslots', label: 'Sesi Waktu', icon: Clock },
          { id: 'packages', label: 'Kurikulum & Paket', icon: Package },
        ],
      },
      {
        group: 'LAPORAN',
        items: [
          { id: 'report-schedule', label: 'Rekap Jadwal', icon: FileText },
          { id: 'report-lecturer-load', label: 'Rekap Beban Dosen', icon: BarChart3 },
          { id: 'report-room-usage', label: 'Rekap Penggunaan Ruangan', icon: DoorOpen },
        ],
      },
      {
        group: 'SISTEM',
        items: [
          { id: 'settings', label: 'Pengaturan / Bobot SA', icon: Sliders },
        ],
      },
    ];
  };

  const navigationItems = getNavigationGroups();

  const handleNavClick = (viewId: string) => {
    onSelectView(viewId);
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className={`flex flex-col h-full bg-white transition-all duration-200 ${isMobile ? 'w-full' : collapsed ? 'w-[68px]' : 'w-60'}`}>
        {/* Brand & Collapse Toggle Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between min-h-[56px]">
          <div className="flex items-center gap-2.5 min-w-0">
            {!collapsed && (
              <div className="min-w-0 overflow-hidden">
                <h1 className="font-bold text-xs uppercase tracking-wider text-slate-900 truncate">ELEKTRO-SCHEDULER</h1>
                <p className="text-[11px] text-slate-500 leading-tight truncate">
                  Teknik Elektro UNRAM
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button */}
          {!isMobile && (
            <button
              onClick={handleToggle}
              id="btn-toggle-sidebar"
              title={collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}

          {/* Mobile Close Button */}
          {isMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              aria-label="Tutup menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navigationItems.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-0.5">
              {!collapsed && (
                <h2 className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                  {group.group}
                </h2>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => handleNavClick(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center ${
                        collapsed ? 'justify-center px-2 py-2' : 'justify-between px-2.5 py-1.5'
                      } rounded-md text-xs transition-colors text-left group relative ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 font-semibold border-l-2 border-slate-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-medium rounded shrink-0 border ${
                            item.badgeColor === 'danger'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Hover Floating Tooltip when Collapsed */}
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-md whitespace-nowrap shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Reset Simulation & Info */}
        <div className="p-2.5 border-t border-slate-200 bg-white space-y-2">
          {!collapsed && (
            <div className="px-2 py-1 text-[11px] text-slate-500 flex items-center justify-between">
              <span>T.A. Ganjil:</span>
              <span className="font-semibold text-slate-700">2026/2027</span>
            </div>
          )}

          {currentUser.role === 'admin' && (
            <button
              onClick={() => setIsResetModalOpen(true)}
              id="btn-reset-simulation-modal"
              title="Reset Data Simulasi"
              className={`w-full flex items-center ${
                collapsed ? 'justify-center p-2' : 'justify-center gap-1.5 px-2.5 py-1.5'
              } rounded-md text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors bg-white`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {!collapsed && <span>Reset Simulasi</span>}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky/Fixed Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 h-screen sticky top-0 z-30 border-r border-slate-200 bg-white transition-all duration-200 ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (Responsive Overlay Portal) */}
      {isOpenMobile && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full h-[100dvh] bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200 overscroll-contain">
            {renderSidebarContent(true)}
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Modal for Reset Data Simulasi */}
      {isResetModalOpen && (
        <Modal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          title="Reset Data Simulasi Penjadwalan"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <p className="font-bold">Reset data simulasi?</p>
                <p className="mt-1 text-slate-600">
                  Data hasil generate rombel, alokasi dosen/ruangan sementara, dan riwayat optimasi Simulated Annealing akan dikembalikan ke kondisi awal.
                </p>
                <p className="mt-1 font-semibold text-emerald-700">
                  ✓ Master Mata Kuliah, Dosen, Ruangan, Sesi Waktu, dan Kurikulum tetap aman tersimpan.
                </p>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReset}
                id="btn-confirm-reset-simulation"
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shadow-xs"
              >
                Reset Data
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
