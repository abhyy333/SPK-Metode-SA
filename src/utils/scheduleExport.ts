import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ScheduleExportItem {
  no?: number;
  dayOrDate: string;
  time: string;
  courseCode: string;
  courseName: string;
  sks?: number;
  sectionOrClass: string;
  room: string;
  lecturerOrSupervisor: string;
  semester?: number | string;
  kbk?: string;
  participantCount?: number;
}

export interface ScheduleExportOptions {
  title: string; // e.g. "JADWAL PERKULIAHAN" or "JADWAL UJIAN TENGAH SEMESTER (UTS)"
  academicYear?: string; // e.g. "2026/2027"
  academicTerm?: string; // e.g. "Ganjil"
  filterSubtitle?: string; // e.g. "Semester 3 • Semua KBK • Angkatan 2025" or "Dosen: Prof. Dr. Eng. I Made..."
  items: ScheduleExportItem[];
  filename?: string;
  isExam?: boolean;
}

/**
 * Generate formal academic PDF document matching Universitas Mataram official standard
 */
export function exportScheduleToPDF(options: ScheduleExportOptions): void {
  const {
    title,
    academicYear = '2026/2027',
    academicTerm = 'Ganjil',
    filterSubtitle,
    items,
    filename,
    isExam = false,
  } = options;

  // Use landscape orientation for comprehensive schedule tables
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Formal Academic Letterhead
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(12);
  doc.text('UNIVERSITAS MATARAM — FAKULTAS TEKNIK', pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(14);
  doc.text('JURUSAN TEKNIK ELEKTRO', pageWidth / 2, 25, { align: 'center' });

  doc.setLineWidth(0.6);
  doc.line(14, 28, pageWidth - 14, 28);
  doc.setLineWidth(0.2);
  doc.line(14, 29, pageWidth - 14, 29);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), pageWidth / 2, 36, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `Semester ${academicTerm} Tahun Akademik ${academicYear}`,
    pageWidth / 2,
    41,
    { align: 'center' }
  );

  if (filterSubtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text(`[ Filter: ${filterSubtitle} ]`, pageWidth / 2, 46, { align: 'center' });
  }

  // Table Columns
  const headColumns = isExam
    ? [
        ['No', 'Hari / Tanggal', 'Waktu', 'Kode MK', 'Nama Mata Kuliah', 'Smt', 'Kelas', 'Ruang', 'Pengawas Ujian', 'Peserta'],
      ]
    : [
        ['No', 'Hari', 'Jam Kuliah', 'Kode MK', 'Nama Mata Kuliah', 'SKS', 'Kelas', 'Ruang', 'Dosen Pengampu'],
      ];

  const bodyRows = items.map((item, index) => {
    if (isExam) {
      return [
        (item.no ?? index + 1).toString(),
        item.dayOrDate,
        item.time,
        item.courseCode,
        item.courseName,
        item.semester?.toString() || '-',
        item.sectionOrClass,
        item.room,
        item.lecturerOrSupervisor,
        item.participantCount ? `${item.participantCount} Mhs` : '-',
      ];
    } else {
      return [
        (item.no ?? index + 1).toString(),
        item.dayOrDate,
        item.time,
        item.courseCode,
        item.courseName,
        item.sks ? `${item.sks}` : '-',
        item.sectionOrClass,
        item.room,
        item.lecturerOrSupervisor,
      ];
    }
  });

  const startY = filterSubtitle ? 50 : 45;

  autoTable(doc, {
    head: headColumns,
    body: bodyRows,
    startY,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: 2,
      textColor: [20, 20, 20],
      lineColor: [180, 180, 180],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate-800 formal header
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: isExam
      ? {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 24, halign: 'center' },
          3: { cellWidth: 24, halign: 'center' },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 16, halign: 'center' },
          7: { cellWidth: 24 },
          8: { cellWidth: 55 },
          9: { cellWidth: 18, halign: 'center' },
        }
      : {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 26, halign: 'center' },
          4: { cellWidth: 'auto' },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 18, halign: 'center' },
          7: { cellWidth: 26 },
          8: { cellWidth: 65 },
        },
    didDrawPage: (data) => {
      // Footer page numbering and timestamp
      const str = `Halaman ${data.pageNumber} • Dicetak melalui Sistem Elektro-Scheduler Universitas Mataram pada ${new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text(str, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    },
  });

  const finalName = filename || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${academicYear.replace('/', '-')}.pdf`;
  doc.save(finalName);
}

/**
 * Generate formatted Excel CSV document
 */
export function exportScheduleToExcel(options: ScheduleExportOptions): void {
  const {
    title,
    academicYear = '2026/2027',
    academicTerm = 'Ganjil',
    filterSubtitle,
    items,
    filename,
    isExam = false,
  } = options;

  const headerRows = [
    ['UNIVERSITAS MATARAM - FAKULTAS TEKNIK - JURUSAN TEKNIK ELEKTRO'],
    [title.toUpperCase()],
    [`Semester ${academicTerm} Tahun Akademik ${academicYear}`],
    [filterSubtitle ? `Filter: ${filterSubtitle}` : ''],
    [`Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}`],
    [''], // blank line
  ];

  const tableHeader = isExam
    ? ['No', 'Hari/Tanggal', 'Waktu', 'Kode MK', 'Nama Mata Kuliah', 'Semester', 'Kelas', 'Ruangan', 'Pengawas Ujian', 'Jumlah Peserta']
    : ['No', 'Hari', 'Jam Kuliah', 'Kode MK', 'Nama Mata Kuliah', 'SKS', 'Kelas', 'Ruangan', 'Dosen Pengampu'];

  const rows = items.map((item, idx) => {
    if (isExam) {
      return [
        (item.no ?? idx + 1).toString(),
        `"${item.dayOrDate}"`,
        `"${item.time}"`,
        `"${item.courseCode}"`,
        `"${item.courseName.replace(/"/g, '""')}"`,
        item.semester?.toString() || '',
        `"${item.sectionOrClass}"`,
        `"${item.room}"`,
        `"${item.lecturerOrSupervisor.replace(/"/g, '""')}"`,
        item.participantCount ? `${item.participantCount}` : '',
      ];
    } else {
      return [
        (item.no ?? idx + 1).toString(),
        `"${item.dayOrDate}"`,
        `"${item.time}"`,
        `"${item.courseCode}"`,
        `"${item.courseName.replace(/"/g, '""')}"`,
        item.sks ? `${item.sks}` : '',
        `"${item.sectionOrClass}"`,
        `"${item.room}"`,
        `"${item.lecturerOrSupervisor.replace(/"/g, '""')}"`,
      ];
    }
  });

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel
    headerRows.map((r) => r.join(',')).join('\n') +
    tableHeader.join(',') +
    '\n' +
    rows.map((r) => r.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const finalName =
    filename?.replace('.pdf', '.csv') ||
    `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${academicYear.replace('/', '-')}.csv`;
  link.setAttribute('download', finalName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
