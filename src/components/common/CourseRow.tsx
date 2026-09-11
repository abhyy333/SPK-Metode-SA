import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Course, RolePermissions } from '../../types';
import { Badge } from '../ui/Badge';

interface CourseRowProps {
  course: Course;
  permissions?: RolePermissions;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
}

export const CourseRow: React.FC<CourseRowProps> = React.memo(({
  course,
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onEdit,
  onDelete,
}) => {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs">
        {course.code}
      </td>
      <td className="px-4 py-3.5">
        <div className="font-bold text-slate-900 text-xs">{course.name}</div>
        <div className="text-[11px] text-slate-500">
          {course.durationMinutes || course.sks * 50} Menit • {course.studentCount} Mahasiswa
        </div>
      </td>
      <td className="px-4 py-3.5 text-center font-bold text-slate-800 text-xs">
        {course.sks} SKS
      </td>
      <td className="px-4 py-3.5 text-center font-semibold text-slate-700 text-xs">
        Semester {course.semester}
      </td>
      <td className="px-4 py-3.5">
        <Badge variant={course.type === 'Wajib' ? 'indigo' : 'neutral'} size="sm">
          {course.type || 'Wajib'}
        </Badge>
      </td>
      <td className="px-4 py-3.5">
        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
          Kurikulum {course.curriculumYear || 2026}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {permissions.canEdit && (
            <button
              onClick={() => onEdit(course)}
              title="Edit Mata Kuliah"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {permissions.canDelete && (
            <button
              onClick={() => onDelete(course)}
              title="Hapus Mata Kuliah"
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

CourseRow.displayName = 'CourseRow';
