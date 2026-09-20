import React from 'react';
import { ScheduleAssignment, Course, Lecturer, Room, ClassGroup, Timeslot } from '../../types';

interface TimetableCellProps {
  assignment?: ScheduleAssignment;
  course?: Course;
  lecturer?: Lecturer;
  room?: Room;
  cls?: ClassGroup;
  timeslot: Timeslot;
  status: 'bentrok' | 'perhatian' | 'aman';
  onClick?: (assignment: ScheduleAssignment) => void;
}

export const TimetableCell: React.FC<TimetableCellProps> = React.memo(({
  assignment,
  course,
  lecturer,
  room,
  cls,
  status,
  onClick,
}) => {
  if (!assignment) {
    return (
      <td className="p-2 text-center text-slate-300 font-light select-none">
        -
      </td>
    );
  }

  return (
    <td className="p-2">
      <div
        onClick={() => onClick && onClick(assignment)}
        className={`p-2 rounded-xl border cursor-pointer transition-all ${
          status === 'bentrok'
            ? 'bg-rose-50 border-rose-300 text-rose-950 hover:border-rose-400'
            : status === 'perhatian'
            ? 'bg-amber-50 border-amber-300 text-amber-950 hover:border-amber-400'
            : 'bg-white border-slate-200 hover:border-indigo-300'
        }`}
      >
        <div className="font-bold text-[11px] text-slate-900 line-clamp-1 leading-tight">{course?.name || assignment.courseId}</div>
        <div className="text-[10px] font-mono font-medium text-slate-500 mt-0.5">{course?.code || ''}</div>
        <div className="text-[10px] text-slate-600 line-clamp-1 mt-1">
          {cls?.code || assignment.classId} • {lecturer?.name || 'Belum Ada Dosen'}
        </div>
      </div>
    </td>
  );
});

TimetableCell.displayName = 'TimetableCell';
