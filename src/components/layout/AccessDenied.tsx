import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, Users, GraduationCap } from 'lucide-react';
import { UserRole } from '../../types';

interface AccessDeniedProps {
  currentRole: UserRole;
  viewName: string;
  onGoToDashboard: () => void;
  onSwitchToAdmin: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  currentRole,
  viewName,
  onGoToDashboard,
  onSwitchToAdmin,
}) => {
  const roleName = currentRole === 'lecturer' ? 'Dosen' : currentRole === 'student' ? 'Mahasiswa' : 'Pengguna';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {currentRole === 'lecturer' ? <Users className="w-3.5 h-3.5 text-amber-600" /> : <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />}
            <span>Peran Saat Ini: {roleName}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman <strong>{viewName}</strong> hanya dapat diakses oleh peran <strong>Administrator</strong> (Ketua Jurusan / Tim SPK).
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGoToDashboard}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>
          <button
            onClick={onSwitchToAdmin}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Beralih ke Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};
