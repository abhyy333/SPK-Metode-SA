import React from 'react';
import { ShieldAlert, ArrowLeft, UserCheck, Lock } from 'lucide-react';
import { CurrentUser } from '../../types';

interface AccessDeniedProps {
  currentUser: CurrentUser;
  requiredRole?: string;
  onNavigateHome: () => void;
  onSwitchToAdmin?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentUser,
  requiredRole = 'Administrator',
  onNavigateHome,
  onSwitchToAdmin,
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="w-6 h-6" />
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900">Akses Terbatas</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Halaman ini khusus untuk <span className="font-semibold text-slate-700">{requiredRole}</span>. 
            Anda saat ini login sebagai{' '}
            <span className="font-semibold text-indigo-600 capitalize">{currentUser.role}</span> ({currentUser.name}).
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-xs space-y-1.5">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Peran Anda Saat Ini:</div>
          <div className="flex items-center justify-between text-slate-700">
            <span>Nama:</span>
            <span className="font-semibold">{currentUser.name}</span>
          </div>
          {currentUser.nip && (
            <div className="flex items-center justify-between text-slate-700">
              <span>NIP:</span>
              <span className="font-mono">{currentUser.nip}</span>
            </div>
          )}
          {currentUser.className && (
            <div className="flex items-center justify-between text-slate-700">
              <span>Kelas:</span>
              <span className="font-semibold">{currentUser.className}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Dashboard</span>
          </button>
          {onSwitchToAdmin && (
            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="flex-1 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Simulasi Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
