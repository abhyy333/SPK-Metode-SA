import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="space-y-2">
          <div className="h-7 bg-slate-200 rounded-lg w-56"></div>
          <div className="h-4 bg-slate-100 rounded-md w-80"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 bg-slate-200 rounded-xl w-32"></div>
          <div className="h-10 bg-slate-200 rounded-xl w-28"></div>
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-100 rounded w-24"></div>
              <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
            </div>
            <div className="h-8 bg-slate-200 rounded-lg w-16"></div>
            <div className="h-3 bg-slate-100 rounded w-32"></div>
          </div>
        ))}
      </div>

      {/* Main Table / Content Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="h-5 bg-slate-200 rounded w-40"></div>
          <div className="h-9 bg-slate-100 rounded-xl w-64"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl w-full"></div>
          ))}
        </div>
      </div>
    </div>
  );
};
