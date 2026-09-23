import React from 'react';
import { Users, DoorOpen, AlertTriangle } from 'lucide-react';
import { ScheduleAssignment, Course, Lecturer, Room, ClassGroup, ConflictItem } from '../../types';

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
      className={`p-2.5 rounded-md border bg-white transition-colors cursor-pointer text-left relative group ${
        status === 'bentrok'
          ? 'border-slate-200 border-l-4 border-l-rose-600 hover:border-slate-300 shadow-2xs'
          : status === 'perhatian'
          ? 'border-slate-200 border-l-4 border-l-amber-500 hover:border-slate-300 shadow-2xs'
          : 'border-slate-200 border-l-4 border-l-slate-400 hover:border-slate-300 shadow-2xs'
      }`}
    >
      {/* Course header */}
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
            {course?.name || 'Mata Kuliah'}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            {course?.code || assignment.courseId} • Kelas {cls?.code || assignment.classId}
          </div>
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={`truncate ${!lecturer ? 'text-amber-800 font-medium' : 'text-slate-700'}`}>
            {lecturer?.name || 'Belum Ada Dosen'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-800 font-medium">{room?.code || assignment.roomId}</span>
          </span>
          <span className="text-slate-400 text-[10px]">
            {course?.sks || 2} SKS
          </span>
        </div>
      </div>

      {/* Conflict warning preview badge */}
      {status === 'bentrok' && (
        <div className="mt-1.5 text-[11px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
          <span className="truncate font-semibold">{specificConflicts[0]?.description || 'Bentrok terdeteksi'}</span>
        </div>
      )}
      {status === 'perhatian' && (
        <div className="mt-1.5 text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1">
          <span className="truncate">{specificConflicts[0]?.description || 'Perlu perhatian'}</span>
        </div>
      )}
    </div>
  );
});

ScheduleCard.displayName = 'ScheduleCard';
