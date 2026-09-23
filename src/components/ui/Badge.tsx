import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'indigo';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-slate-100 text-slate-800 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200/80',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-slate-100 text-slate-700 border-slate-200',
    neutral: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded',
    md: 'text-xs px-2.5 py-1 font-medium rounded-md',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
