import React from 'react';
import { Edit2, Trash2, BookOpen, Layers } from 'lucide-react';
import { Student, ClassGroup, RolePermissions } from '../../types';
import { Badge } from '../ui/Badge';

interface StudentRowProps {
  student: Student;
  classGroup?: ClassGroup;
  permissions?: RolePermissions;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onViewDetail?: (student: Student) => void;
}

export const StudentRow: React.FC<StudentRowProps> = React.memo(({
  student,
  classGroup,
  permissions = { canCreate: true, canEdit: true, canDelete: true, canOptimize: true, canManageSchedule: true },
  onEdit,
  onDelete,
  onViewDetail,
}) => {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="px-4 py-3.5 font-mono font-bold text-slate-800 text-xs">
        {student.nim}
      </td>
      <td className="px-4 py-3.5">
        <div className="font-bold text-slate-900 text-xs">{student.name}</div>
        <div className="text-[11px] text-slate-500">{student.email || `${student.nim.toLowerCase()}@unram.ac.id`}</div>
      </td>
      <td className="px-4 py-3.5">
        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
          {classGroup?.code || student.classId}
        </span>
      </td>
      <td className="px-4 py-3.5 text-center font-bold text-slate-800 text-xs">
        {student.semester}
      </td>
      <td className="px-4 py-3.5">
        {student.curriculumYear ? (
          <Badge variant="neutral" size="sm">
            Kurikulum {student.curriculumYear}
          </Badge>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>{student.enrolledCourseIds?.length || 0} Mata Kuliah</span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {onViewDetail && (
            <button
              onClick={() => onViewDetail(student)}
              title="Lihat Detail KRS"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}
          {permissions.canEdit && (
            <button
              onClick={() => onEdit(student)}
              title="Edit Data Mahasiswa"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {permissions.canDelete && (
            <button
              onClick={() => onDelete(student)}
              title="Hapus Mahasiswa"
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

StudentRow.displayName = 'StudentRow';
