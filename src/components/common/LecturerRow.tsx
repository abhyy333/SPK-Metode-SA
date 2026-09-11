import React from 'react';
import { Edit2, Trash2, Calendar, Clock } from 'lucide-react';
import { Lecturer, RolePermissions } from '../../types';
import { Badge } from '../ui/Badge';

interface LecturerRowProps {
  lecturer: Lecturer;
  assignedCourseCount?: number;
  permissions?: RolePermissions;
  onEdit: (lecturer: Lecturer) => void;
  onDelete: (lecturer: Lecturer) => void;
}

export const LecturerRow: React.FC<LecturerRowProps> = React.memo(({
  lecturer,
  assignedCourseCount = 0,
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onEdit,
  onDelete,
}) => {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs">
        {lecturer.nip}
      </td>
      <td className="px-4 py-3.5">
        <div className="font-bold text-slate-900 text-xs">{lecturer.name}</div>
        <div className="text-[11px] text-slate-500">{lecturer.email}</div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1">
          {lecturer.availableDays.map(day => (
            <span
              key={day}
              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              {day}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={lecturer.timePreference === 'Pagi' ? 'indigo' : lecturer.timePreference === 'Siang' ? 'warning' : 'neutral'} size="sm">
          {lecturer.timePreference}
        </Badge>
      </td>
      <td className="px-4 py-3.5 text-center font-bold text-slate-800 text-xs">
        {assignedCourseCount} Rombel
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {permissions.canEdit && (
            <button
              onClick={() => onEdit(lecturer)}
              title="Edit Data Dosen"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {permissions.canDelete && (
            <button
              onClick={() => onDelete(lecturer)}
              title="Hapus Dosen"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
});

LecturerRow.displayName = 'LecturerRow';
