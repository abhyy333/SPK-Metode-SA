import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import {
  ScheduleExportItem,
  ScheduleExportOptions,
  exportScheduleToPDF,
  exportScheduleToExcel,
} from '../../utils/scheduleExport';

interface DownloadScheduleButtonProps {
  options: ScheduleExportOptions;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  label?: string;
}

export const DownloadScheduleButton: React.FC<DownloadScheduleButtonProps> = ({
  options,
  variant = 'primary',
  className = '',
  label = 'Download Jadwal',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownloadPDF = () => {
    setIsOpen(false);
    exportScheduleToPDF(options);
  };

  const handleDownloadExcel = () => {
    setIsOpen(false);
    exportScheduleToExcel(options);
  };

  const baseStyle =
    'inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1';
  
  const variantStyles = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-emerald-700/20',
    secondary: 'bg-slate-800 hover:bg-slate-900 text-white focus:ring-slate-700 shadow-slate-900/20',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 focus:ring-slate-400',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="btn-download-schedule-dropdown"
        onClick={() => setIsOpen(!isOpen)}
        className={`${baseStyle} ${variantStyles[variant]}`}
        title="Download Jadwal (PDF / Excel)"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-50 py-1 divide-y divide-slate-100 border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1">
            <button
              type="button"
              id="btn-export-pdf"
              onClick={handleDownloadPDF}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-md transition-colors text-left group"
            >
              <FileText className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-semibold text-slate-800">Cetak Dokumen PDF</p>
                <p className="text-[10px] text-slate-500 font-normal">Kop Surat Resmi Universitas</p>
              </div>
            </button>
            <button
              type="button"
              id="btn-export-excel"
              onClick={handleDownloadExcel}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-700 rounded-md transition-colors text-left group"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              <div>
                <p className="font-semibold text-slate-800">Unduh Format Excel</p>
                <p className="text-[10px] text-slate-500 font-normal">Spreadsheet CSV / Tabel Data</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
