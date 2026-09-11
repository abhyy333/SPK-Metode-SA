import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import { ConflictItem } from '../../types';
import { Badge } from '../ui/Badge';

interface ConflictCardProps {
  conflict: ConflictItem;
  onNavigateToSchedule?: (assignmentId?: string) => void;
}

export const ConflictCard: React.FC<ConflictCardProps> = React.memo(({
  conflict,
  onNavigateToSchedule,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        conflict.isHardConstraint
          ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
          : 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {conflict.isHardConstraint ? (
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              conflict.isHardConstraint ? 'text-rose-900' : 'text-amber-900'
            }`}
          >
            {conflict.categoryName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={conflict.isHardConstraint ? 'danger' : 'warning'} size="sm">
            Penalty: {conflict.penalty}
          </Badge>
        </div>
      </div>

      <h4 className="text-sm font-bold text-slate-900 mb-1">{conflict.title}</h4>
      <p className="text-xs text-slate-700 leading-relaxed mb-3">{conflict.description}</p>

      {onNavigateToSchedule && (conflict.assignment1Id || conflict.assignment2Id) && (
        <button
          onClick={() => onNavigateToSchedule(conflict.assignment1Id || conflict.assignment2Id)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>Buka Jadwal Terkait</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

ConflictCard.displayName = 'ConflictCard';
