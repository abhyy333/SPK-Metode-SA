import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
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
  ShieldCheck,
  Award,
  UserCheck,
  Layers,
  Package,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { CurrentUser, RolePermissions, ScheduleStatus } from '../../types';

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
}) => {
  // Define navigation items depending on active role
  const getNavigationGroups = () => {
    if (currentUser.role === 'lecturer') {
      return [
        {
          group: 'PORTAL DOSEN',
          items: [
            { id: 'lecturer-dashboard', label: 'Dashboard Dosen', icon: LayoutDashboard },
            { id: 'lecturer-schedule', label: 'Jadwal Mengajar Saya', icon: Calendar },
            { id: 'lecturer-availability', label: 'Ketersediaan & Preferensi', icon: CalendarCheck, badge: 'Penting' },
            {
              id: 'conflicts',
              label: 'Cek Bentrokan Jadwal',
              icon: AlertCircle,
              badge: hasSchedule && conflictCount > 0 ? `${conflictCount}` : undefined,
              badgeColor: 'danger',
            },
          ],
        },
        {
          group: 'DATA AKADEMIK & REFERENSI',
          items: [
            { id: 'curriculum', label: 'Struktur Kurikulum & KBK', icon: BookOpen },
            { id: 'packages', label: 'Paket Semester Kurikulum', icon: Package },
            { id: 'rooms', label: 'Ruangan & Lab', icon: DoorOpen },
            { id: 'timeslots', label: 'Slot Waktu Kuliah', icon: Clock },
          ],
        },
      ];
    }

    if (currentUser.role === 'student') {
      return [
        {
          group: 'PORTAL MAHASISWA',
          items: [
            { id: 'student-dashboard', label: 'Dashboard Mahasiswa', icon: LayoutDashboard },
            { id: 'student-schedule', label: 'Jadwal Kuliah Rombel', icon: Calendar, badge: scheduleStatus === 'published' ? 'Resmi' : 'Draft' },
          ],
        },
        {
          group: 'KURIKULUM & KAMPUS',
          items: [
            { id: 'curriculum', label: 'Kurikulum & Klasifikasi KBK', icon: BookOpen },
            { id: 'packages', label: 'Paket Semester Mahasiswa', icon: Package },
            { id: 'rooms', label: 'Ruangan & Lab', icon: DoorOpen },
            { id: 'timeslots', label: 'Slot Waktu Perkuliahan', icon: Clock },
          ],
        },
      ];
    }

    // Default: ADMIN
    return [
      {
        group: 'UTAMA & SPK OPTIMASI',
        items: [
          { id: 'dashboard', label: 'Dashboard SPK', icon: LayoutDashboard },
          { id: 'optimization', label: 'Simulated Annealing', icon: Zap, badge: 'Inti SPK' },
          { id: 'schedule', label: 'Jadwal Kuliah (Timetable)', icon: Calendar },
          {
            id: 'conflicts',
            label: 'Analisis Konflik',
            icon: AlertCircle,
            badge: hasSchedule && conflictCount > 0 ? `${conflictCount}` : undefined,
            badgeColor: 'danger',
          },
          { id: 'research', label: 'Mode Riset & Analisis TA', icon: Award, badge: 'TA' },
        ],
      },
      {
        group: 'MANAJEMEN KURIKULUM & KBK',
        items: [
          { id: 'curriculum', label: 'Struktur Kurikulum & KBK', icon: BookOpen, badge: '2026/2022' },
          { id: 'packages', label: 'Paket Semester & KBK', icon: Package, badge: 'Peminatan' },
          { id: 'curriculum-analysis', label: 'Analisis Kurikulum', icon: TrendingUp, badge: 'Audit' },
          { id: 'offerings', label: 'Course Offerings (Rombel)', icon: Layers },
        ],
      },
      {
        group: 'DATA MASTER ENTITAS',
        items: [
          { id: 'students', label: 'Mahasiswa & SKS Kurikulum', icon: UserCheck, badge: '165' },
          { id: 'courses', label: 'Master Mata Kuliah', icon: BookOpen },
          { id: 'lecturers', label: 'Dosen Pengampu', icon: Users, badge: '52' },
          { id: 'classes', label: 'Kelas Rombel', icon: GraduationCap },
          { id: 'rooms', label: 'Ruangan & Lab', icon: DoorOpen },
          { id: 'timeslots', label: 'Slot Waktu', icon: Clock },
        ],
      },
      {
        group: 'OUTPUT & SISTEM',
        items: [
          { id: 'reports', label: 'Laporan & Ekspor', icon: FileText },
          { id: 'settings', label: 'Bobot & Parameter SA', icon: Settings },
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

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-700 to-indigo-900 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
            <Zap className="w-5 h-5 text-indigo-200 fill-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base tracking-tight text-slate-900">ELEKTRO-SCHEDULER</h1>
            </div>
            <p className="text-[11px] font-medium text-indigo-600 leading-tight">
              SPK Penjadwalan Perkuliahan
            </p>
            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span>Teknik Elektro — Univ. Mataram</span>
            </div>
          </div>
        </div>

        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationItems.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            <h2 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.group}
            </h2>
            <div className="space-y-0.5 pt-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-xs border border-indigo-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-tight shrink-0 ${
                          item.badgeColor === 'danger'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info & Quick Reset */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-2">
        <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Metode: Simulated Annealing
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Prototype Penelitian Tugas Akhir S1</p>
        </div>

        {currentUser.role === 'admin' && (
          <button
            onClick={onResetDemo}
            id="btn-reset-demo-sidebar"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-dashed border-slate-200 hover:border-rose-200 transition-colors"
            title="Kembalikan dataset awal Teknik Elektro UNRAM"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-screen fixed top-0 left-0 z-30 flex-col shrink-0 no-print">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-4/5 max-w-xs h-full bg-white shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
