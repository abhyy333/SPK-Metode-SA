import React from 'react';
import { Users, ShieldAlert, AlertTriangle } from 'lucide-react';
import { ScheduleAssignment, Course, Lecturer, Room, ClassGroup, ConflictItem } from '../../types';
import { Badge } from '../ui/Badge';

interface ScheduleCardProps {
  assignment: ScheduleAssignment;
  course?: Course;
  lecturer?: Lecturer;
  room?: Room;
  cls?: ClassGroup;
  status: 'bentrok' | 'perhatian' | 'aman';
  specificConflicts?: ConflictItem[];
  onClick?: (assignment: ScheduleAssignment) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = React.memo(({
  assignment,
  course,
  lecturer,
  room,
  cls,
  status,
  specificConflicts = [],
  onClick,
}) => {
  return (
    <div
      onClick={() => onClick && onClick(assignment)}
      className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left relative group ${
        status === 'bentrok'
          ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400 shadow-2xs'
          : status === 'perhatian'
          ? 'bg-amber-50/90 border-amber-300 hover:border-amber-400 shadow-2xs'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
      }`}
    >
      {/* Status indicator and course header */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
            {course?.name || 'Mata Kuliah'}
          </div>
          <div className="text-[11px] font-mono font-medium text-slate-500 tracking-tight mt-0.5">
            {course?.code || assignment.courseId}
          </div>
        </div>
        {status === 'bentrok' ? (
          <Badge variant="danger" size="sm" className="shrink-0">
            <ShieldAlert className="w-2.5 h-2.5 animate-pulse" />
            BENTROK
          </Badge>
        ) : status === 'perhatian' ? (
          <Badge variant="warning" size="sm" className="shrink-0">
            <AlertTriangle className="w-2.5 h-2.5" />
            Perhatian
          </Badge>
        ) : (
          <Badge variant="success" size="sm" className="shrink-0">
            AMAN
          </Badge>
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-slate-400 shrink-0" />
          <span className={`truncate ${!lecturer ? 'text-amber-700 font-medium' : ''}`}>
            {lecturer?.name || 'Belum Ada Dosen'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
            {cls?.code || assignment.classId}
          </span>
          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
            {room?.code || assignment.roomId}
          </span>
        </div>
      </div>

      {/* Conflict warning preview badge */}
      {specificConflicts.length > 0 && (
        <div className="mt-2 text-[10px] text-rose-700 font-medium bg-rose-100/80 px-2 py-1 rounded-md line-clamp-1">
          {specificConflicts[0].description}
        </div>
      )}
    </div>
  );
});

ScheduleCard.displayName = 'ScheduleCard';
