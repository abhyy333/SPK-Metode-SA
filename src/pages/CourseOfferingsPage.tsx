import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  Users,
  Building,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  BookOpen,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Zap,
  Info,
  ChevronDown,
  X,
  Check,
  Clock,
  CheckSquare,
  Square,
} from 'lucide-react';
import { CourseOffering, Course, Lecturer, ClassGroup, Room, Timeslot } from '../types';
import { StorageService } from '../services/storageService';
import { classifyCourseCategory } from '../data/curriculumDataset';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

export const CourseOfferingsPage: React.FC = () => {
  const { showToast } = useToast();

  const [offerings, setOfferings] = useState<CourseOffering[]>(() => StorageService.getCourseOfferings());
  const [courses, setCourses] = useState<Course[]>(() => StorageService.getCourses());
  const [lecturers, setLecturers] = useState<Lecturer[]>(() => StorageService.getLecturers());
  const [classes, setClasses] = useState<ClassGroup[]>(() => StorageService.getClasses());

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedLecturerStatus, setSelectedLecturerStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedOfferingStatus, setSelectedOfferingStatus] = useState<'all' | 'draft' | 'ready' | 'scheduled' | 'published'>('all');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetOffering, setTargetOffering] = useState<CourseOffering | null>(null);
  const [selectedLecturerIds, setSelectedLecturerIds] = useState<string[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCourseId, setNewCourseId] = useState<string>('');
  const [newClassId, setNewClassId] = useState<string>('');
  const [newLecturerIds, setNewLecturerIds] = useState<string[]>([]);
  const [newCapacity, setNewCapacity] = useState<number>(40);
  const [newEnrolledCount, setNewEnrolledCount] = useState<number>(35);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const courseCodeMap = useMemo(() => new Map(courses.map((c) => [c.code, c])), [courses]);
  const lecturerMap = useMemo(() => new Map(lecturers.map((l) => [l.id, l])), [lecturers]);
  const classMap = useMemo(() => new Map(classes.map((cl) => [cl.id, cl])), [classes]);

  // Save changes to storage & update local state
  const updateOfferings = (newOfferings: CourseOffering[]) => {
    setOfferings(newOfferings);
    StorageService.saveCourseOfferings(newOfferings);
  };

  // Open Assign Lecturer Modal
  const openAssignModal = (off: CourseOffering) => {
    setTargetOffering(off);
    const initialLecIds = (off.lecturerIds && off.lecturerIds.length > 0)
      ? [...off.lecturerIds]
      : (off.lecturerId ? [off.lecturerId] : []);
    setSelectedLecturerIds(initialLecIds);
    setIsAssignModalOpen(true);
  };

  const toggleLecturerSelection = (lecId: string) => {
    setSelectedLecturerIds((prev) =>
      prev.includes(lecId) ? prev.filter((id) => id !== lecId) : [...prev, lecId]
    );
  };

  const handleSaveLecturerAssignment = () => {
    if (!targetOffering) return;

    const assignedLecs = selectedLecturerIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];
    const primaryLec = assignedLecs[0] || null;

    const newStatus: 'draft' | 'ready' | 'scheduled' | 'published' =
      targetOffering.roomId && targetOffering.timeslotId
        ? 'scheduled'
        : assignedLecs.length > 0
        ? 'ready'
        : 'draft';

    const updated = offerings.map((off) => {
      if (off.id === targetOffering.id) {
        return {
          ...off,
          lecturerIds: selectedLecturerIds,
          lecturerId: primaryLec ? primaryLec.id : null,
          lecturerName: primaryLec ? primaryLec.name : null,
          lecturerCode: primaryLec ? primaryLec.code : null,
          lecturerNames: assignedLecs.map((l) => l.name),
          lecturerCodes: assignedLecs.map((l) => l.code),
          status: newStatus,
        };
      }
      return off;
    });

    updateOfferings(updated);
    setIsAssignModalOpen(false);

    const course = courseMap.get(targetOffering.courseId) || courseCodeMap.get(targetOffering.courseId);
    const classObj = targetOffering.classId ? classMap.get(targetOffering.classId) : null;

    if (assignedLecs.length > 0) {
      showToast(
        'success',
        'Dosen Pengampu Ditetapkan',
        `${assignedLecs.map((l) => l.name).join(', ')} ditugaskan untuk ${course?.name || targetOffering.courseId} (${classObj?.code || 'Rombel'}).`
      );
    } else {
      showToast(
        'info',
        'Dosen Dikosongkan',
        `Status dosen untuk ${course?.name || targetOffering.courseId} diubah menjadi "Belum Ditentukan".`
      );
    }
  };

  // Quick reset lecturer to null
  const handleRemoveLecturers = (off: CourseOffering) => {
    const updated = offerings.map((item) => {
      if (item.id === off.id) {
        return {
          ...item,
          lecturerIds: [],
          lecturerId: null,
          lecturerName: null,
          lecturerCode: null,
          lecturerNames: [],
          lecturerCodes: [],
          status: (item.roomId && item.timeslotId ? 'scheduled' : 'draft') as CourseOffering['status'],
        };
      }
      return item;
    });

    updateOfferings(updated);
    const course = courseMap.get(off.courseId) || courseCodeMap.get(off.courseId);
    showToast('info', 'Dosen Direset', `Dosen pengampu untuk ${course?.name || off.courseId} telah dikosongkan.`);
  };

  // Open Add Offering Modal
  const openAddOfferingModal = () => {
    setNewCourseId(courses[0]?.id || '');
    setNewClassId(classes[0]?.id || '');
    setNewLecturerIds([]);
    setNewCapacity(40);
    setNewEnrolledCount(35);
    setIsAddModalOpen(true);
  };

  const handleSaveNewOffering = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseId || !newClassId) {
      showToast('warning', 'Data Tidak Lengkap', 'Pilih mata kuliah dan rombel/kelas.');
      return;
    }

    const course = courseMap.get(newCourseId) || courseCodeMap.get(newCourseId);
    const classObj = classMap.get(newClassId);
    const assignedLecs = newLecturerIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];
    const primaryLec = assignedLecs[0] || null;

    const newOff: CourseOffering = {
      id: `off-${course?.code || newCourseId}-${classObj?.code || 'CLS'}-${Date.now().toString(36)}`,
      code: `${course?.code || newCourseId}-${classObj?.code || 'A'}`,
      courseId: course?.id || newCourseId,
      courseCode: course?.code,
      courseName: course?.name,
      sks: course?.sks,
      credits: course?.sks,
      category: course?.category,
      curriculumYear: course?.curriculumYear || 2026,
      semester: course?.semester,
      kbkId: course?.kbkIds && course.kbkIds.length > 0 ? course.kbkIds[0] : null,
      classId: newClassId,
      className: classObj?.name,
      classCode: classObj?.code,
      lecturerIds: newLecturerIds,
      lecturerId: primaryLec ? primaryLec.id : null,
      lecturerName: primaryLec ? primaryLec.name : null,
      lecturerCode: primaryLec ? primaryLec.code : null,
      lecturerNames: assignedLecs.map((l) => l.name),
      lecturerCodes: assignedLecs.map((l) => l.code),
      capacity: newCapacity,
      enrolledCount: newEnrolledCount,
      academicYear: '2026/2027 Ganjil',
      term: (course?.semester || 1) % 2 === 1 ? 'Ganjil' : 'Genap',
      status: assignedLecs.length > 0 ? 'ready' : 'draft',
    };

    updateOfferings([...offerings, newOff]);
    setIsAddModalOpen(false);
    showToast('success', 'Rombel Baru Dibuat', `Course Offering ${newOff.code} berhasil ditambahkan.`);
  };

  // Delete offering
  const handleDeleteOffering = (offId: string) => {
    const updated = offerings.filter((off) => off.id !== offId);
    updateOfferings(updated);
    showToast('info', 'Rombel Dihapus', 'Course offering telah berhasil dihapus.');
  };

  // Generate Rombel Otomatis untuk Semester 1–4
  const handleAutoGenerateLowerSemesterRombel = () => {
    const lowerCourses = courses.filter((c) => c.semester <= 4);
    if (lowerCourses.length === 0) {
      showToast('warning', 'Tidak Ada Mata Kuliah', 'Tidak ditemukan mata kuliah semester 1–4.');
      return;
    }

    const classA = classes.find((cl) => cl.code.includes('1A') || cl.code.includes('3A') || cl.name.includes('A')) || classes[0];
    const classB = classes.find((cl) => cl.code.includes('1B') || cl.code.includes('3B') || cl.name.includes('B')) || classes[1];

    let createdCount = 0;
    const nextOfferings = [...offerings];

    lowerCourses.forEach((c) => {
      // Check if offering for Class A exists
      const hasA = nextOfferings.some((o) => (o.courseId === c.id || o.courseId === c.code) && o.classId === classA?.id);
      if (!hasA && classA) {
        nextOfferings.push({
          id: `off-${c.code}-A-${Date.now().toString(36)}`,
          code: `${c.code}-A`,
          courseId: c.id,
          courseCode: c.code,
          courseName: c.name,
          sks: c.sks,
          credits: c.sks,
          category: c.category || 'Wajib',
          curriculumYear: c.curriculumYear || 2026,
          semester: c.semester,
          classId: classA.id,
          className: classA.name,
          classCode: classA.code,
          lecturerIds: [], // Belum ditentukan
          lecturerId: null,
          lecturerName: null,
          capacity: 45,
          enrolledCount: Math.min(40, c.studentCount || 38),
          academicYear: '2026/2027 Ganjil',
          term: c.semester % 2 === 1 ? 'Ganjil' : 'Genap',
          status: 'draft',
        });
        createdCount++;
      }

      // Check if offering for Class B exists
      const hasB = nextOfferings.some((o) => (o.courseId === c.id || o.courseId === c.code) && o.classId === classB?.id);
      if (!hasB && classB) {
        nextOfferings.push({
          id: `off-${c.code}-B-${Date.now().toString(36)}`,
          code: `${c.code}-B`,
          courseId: c.id,
          courseCode: c.code,
          courseName: c.name,
          sks: c.sks,
          credits: c.sks,
          category: c.category || 'Wajib',
          curriculumYear: c.curriculumYear || 2026,
          semester: c.semester,
          classId: classB.id,
          className: classB.name,
          classCode: classB.code,
          lecturerIds: [], // Belum ditentukan
          lecturerId: null,
          lecturerName: null,
          capacity: 45,
          enrolledCount: Math.min(38, c.studentCount || 36),
          academicYear: '2026/2027 Ganjil',
          term: c.semester % 2 === 1 ? 'Ganjil' : 'Genap',
          status: 'draft',
        });
        createdCount++;
      }
    });

    updateOfferings(nextOfferings);
    showToast(
      'success',
      'Rombel Semester 1–4 Terbentuk',
      `Berhasil membuat ${createdCount} rombel kelas baru (Status Draft, Dosen: Belum Ditentukan).`
    );
  };

  // Filtered offerings
  const filteredOfferings = useMemo(() => {
    return offerings.filter((off) => {
      const course = courseMap.get(off.courseId) || courseCodeMap.get(off.courseId);
      const assignedLecIds = (off.lecturerIds && off.lecturerIds.length > 0)
        ? off.lecturerIds
        : (off.lecturerId ? [off.lecturerId] : []);
      const classGrp = off.classId ? classMap.get(off.classId) : null;

      if (selectedSemester !== 'all' && course && course.semester !== selectedSemester) {
        return false;
      }

      if (selectedClass !== 'all' && off.classId !== selectedClass) {
        return false;
      }

      if (selectedLecturerStatus === 'assigned' && assignedLecIds.length === 0) {
        return false;
      }

      if (selectedLecturerStatus === 'unassigned' && assignedLecIds.length > 0) {
        return false;
      }

      if (selectedOfferingStatus !== 'all' && off.status !== selectedOfferingStatus) {
        return false;
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCode = (course?.code || off.courseId || off.code || '').toLowerCase().includes(term);
        const matchName = (course?.name || off.courseName || '').toLowerCase().includes(term);
        const matchLec = assignedLecIds.some((lid) => {
          const lec = lecturerMap.get(lid);
          return (lec?.name || '').toLowerCase().includes(term) || (lec?.code || '').toLowerCase().includes(term);
        });
        const matchCl = (classGrp?.name || classGrp?.code || '').toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchLec && !matchCl) return false;
      }

      return true;
    });
  }, [offerings, courseMap, courseCodeMap, lecturerMap, classMap, selectedSemester, selectedClass, selectedLecturerStatus, selectedOfferingStatus, searchTerm]);

  // Statistics
  const totalOfferings = offerings.length;
  const assignedCount = offerings.filter((o) => (o.lecturerIds && o.lecturerIds.length > 0) || Boolean(o.lecturerId)).length;
  const unassignedCount = totalOfferings - assignedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Course Offering Architecture (Multi-Dosen &amp; Rombel)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Course Offerings &amp; Penetapan Dosen Pengampu
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Master Mata Kuliah hanya menyimpan data kurikulum. Penetapan dosen pengampu (mendukung multi-dosen tim per kelas), rombel, dan kuota dilakukan pada Course Offering untuk semester aktif.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleAutoGenerateLowerSemesterRombel}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
              title="Buat Rombel Kelas A dan B untuk Semester 1–4"
            >
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Generate Rombel Smtr 1–4</span>
            </button>

            <button
              onClick={openAddOfferingModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Course Offering</span>
            </button>
          </div>
        </div>

        {/* Statistical Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Total Course Offerings</div>
              <div className="text-xl font-extrabold text-slate-900">{totalOfferings} Rombel</div>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-emerald-800">Dosen Telah Ditetapkan</div>
              <div className="text-xl font-extrabold text-emerald-700">{assignedCount} Rombel</div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-amber-800">Belum Ada Dosen Pengampu</div>
              <div className="text-xl font-extrabold text-amber-700">{unassignedCount} Rombel</div>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode MK, nama mata kuliah, dosen, rombel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Dosen Filter */}
          <select
            value={selectedLecturerStatus}
            onChange={(e) => setSelectedLecturerStatus(e.target.value as 'all' | 'assigned' | 'unassigned')}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">Semua Status Dosen ({totalOfferings})</option>
            <option value="assigned">Sudah Ada Dosen ({assignedCount})</option>
            <option value="unassigned">Belum Ada Dosen ({unassignedCount})</option>
          </select>

          {/* Status Offering Filter */}
          <select
            value={selectedOfferingStatus}
            onChange={(e) => setSelectedOfferingStatus(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">Semua Status Rombel</option>
            <option value="draft">Draft (Draft)</option>
            <option value="ready">Ready (Siap Dijadwalkan)</option>
            <option value="scheduled">Scheduled (Terjadwal)</option>
            <option value="published">Published (Dipublikasi)</option>
          </select>

          {/* Semester Filter */}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">Semua Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>

          {/* Class Filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">Semua Rombel</option>
            {classes.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.code} - {cl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Offerings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {filteredOfferings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4 w-12">No</th>
                  <th className="py-3 px-4 w-32">Kode &amp; Rombel</th>
                  <th className="py-3 px-4">Mata Kuliah &amp; Kurikulum</th>
                  <th className="py-3 px-4 w-28 text-center">Kelas Rombel</th>
                  <th className="py-3 px-4 w-20 text-center">SKS</th>
                  <th className="py-3 px-4">Dosen Pengampu (Tim Teaching)</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4 w-32 text-center">Peserta / Kuota</th>
                  <th className="py-3 px-4 w-32 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOfferings.map((off, idx) => {
                  const course = courseMap.get(off.courseId) || courseCodeMap.get(off.courseId);
                  const assignedLecIds = (off.lecturerIds && off.lecturerIds.length > 0)
                    ? off.lecturerIds
                    : (off.lecturerId ? [off.lecturerId] : []);
                  const assignedLecs = assignedLecIds.map((id) => lecturerMap.get(id)).filter(Boolean) as Lecturer[];
                  const classGrp = off.classId ? classMap.get(off.classId) : null;
                  const cat = course ? course.category || classifyCourseCategory(course.code) : 'Wajib';

                  return (
                    <tr key={off.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {off.code || `${course?.code || off.courseId}-${classGrp?.code || 'A'}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{course?.name || off.courseName || 'Mata Kuliah'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-slate-700">Smtr {course?.semester || off.semester || 1}</span>
                          <span>•</span>
                          <span className="text-slate-600">Kurikulum {course?.curriculumYear || off.curriculumYear || 2026}</span>
                          <span>•</span>
                          <span className={cat === 'Wajib' ? 'text-indigo-600 font-semibold' : 'text-slate-600'}>
                            {cat}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                          {classGrp?.code || classGrp?.name || 'Kelas A'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                          {course?.sks || off.sks || 3} SKS
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {assignedLecs.length > 0 ? (
                          <div className="space-y-1">
                            {assignedLecs.map((lec) => (
                              <div key={lec.id} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center border border-emerald-200 shrink-0">
                                  {lec.code || 'DSN'}
                                </div>
                                <div className="text-xs font-semibold text-slate-900 leading-tight">
                                  {lec.name}
                                </div>
                              </div>
                            ))}
                            {assignedLecs.length > 1 && (
                              <div className="text-[10px] text-indigo-600 font-semibold">
                                ({assignedLecs.length} Dosen Pengampu / Team Teaching)
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Belum Ada Dosen Pengampu</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {off.status === 'published' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Published
                          </span>
                        ) : off.status === 'scheduled' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Scheduled
                          </span>
                        ) : off.status === 'ready' || assignedLecs.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          {off.enrolledCount || 35} / {off.capacity || 40}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openAssignModal(off)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                            title="Tugaskan / Pilih Dosen Pengampu"
                          >
                            {assignedLecs.length > 0 ? 'Edit Dosen' : 'Pilih Dosen'}
                          </button>

                          {assignedLecs.length > 0 && (
                            <button
                              onClick={() => handleRemoveLecturers(off)}
                              className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Kosongkan Dosen (Set Belum Ditentukan)"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteOffering(off.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Course Offering"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-medium">Tidak ada rombel mata kuliah yang sesuai filter</p>
          </div>
        )}
      </div>

      {/* Modal: Assign / Change Multiple Lecturers */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Penetapan Dosen Pengampu Rombel"
        subtitle={
          targetOffering
            ? `${targetOffering.code || targetOffering.courseId} — ${
                courseMap.get(targetOffering.courseId)?.name || 'Mata Kuliah'
              }`
            : ''
        }
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Dukungan Multi-Dosen (Team Teaching)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Centang satu atau lebih dosen yang akan mengampu kelas ini. Sistem akan mengecek jadwal &amp; ketersediaan seluruh dosen terpilih saat optimasi.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Pilih Dosen Pengampu ({selectedLecturerIds.length} Terpilih)
              </label>
              {selectedLecturerIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedLecturerIds([])}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  Kosongkan Semua Dosen
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
              {lecturers.map((l) => {
                const isSelected = selectedLecturerIds.includes(l.id);
                return (
                  <div
                    key={l.id}
                    onClick={() => toggleLecturerSelection(l.id)}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{l.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono">NIP: {l.nip}</span>
                          <span>•</span>
                          <span>KBK: {l.expertise}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {l.code}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveLecturerAssignment}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Simpan Dosen Pengampu ({selectedLecturerIds.length})
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add New Offering */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Course Offering / Rombel Baru"
        subtitle="Buka kelas baru untuk mata kuliah kurikulum aktif"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveNewOffering} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Master Mata Kuliah *
            </label>
            <select
              value={newCourseId}
              onChange={(e) => setNewCourseId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name} — Smtr {c.semester} ({c.sks} SKS)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Rombel / Kelas *
              </label>
              <select
                value={newClassId}
                onChange={(e) => setNewClassId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {classes.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.code} — {cl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kapasitas Maksimal Kelas
              </label>
              <input
                type="number"
                min={5}
                max={100}
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Simpan Course Offering
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
