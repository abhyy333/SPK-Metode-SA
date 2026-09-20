import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Ban,
  Heart,
  Minus,
} from 'lucide-react';
import {
  Lecturer,
  DayOfWeek,
  TimePreference,
  Timeslot,
  LecturerPreference,
} from '../../types';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';

interface LecturerAvailabilityPageProps {
  lecturer: Lecturer;
  timeslots: Timeslot[];
  onSaveAvailability: (updatedLecturer: Lecturer) => void;
}

const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const TIME_CATEGORIES: ('Pagi' | 'Siang' | 'Sore')[] = ['Pagi', 'Siang', 'Sore'];

export const LecturerAvailabilityPage: React.FC<LecturerAvailabilityPageProps> = ({
  lecturer,
  timeslots,
  onSaveAvailability,
}) => {
  const { showToast } = useToast();

  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>(lecturer.availableDays || ALL_DAYS);
  const [timePreference, setTimePreference] = useState<TimePreference>(lecturer.timePreference || 'Fleksibel');
  const [unavailableSlotIds, setUnavailableSlotIds] = useState<string[]>(lecturer.unavailableSlotIds || []);

  const [dayPreferences, setDayPreferences] = useState<Record<DayOfWeek, 'preferred' | 'neutral' | 'avoid'>>(
    lecturer.preferences?.dayPreferences || {
      Senin: 'neutral',
      Selasa: 'neutral',
      Rabu: 'neutral',
      Kamis: 'neutral',
      Jumat: 'neutral',
      Sabtu: 'neutral',
      Minggu: 'neutral',
    }
  );

  const [timePreferences, setTimePreferences] = useState<Record<'Pagi' | 'Siang' | 'Sore', 'preferred' | 'neutral' | 'avoid'>>(
    lecturer.preferences?.timePreferences || {
      Pagi: 'neutral',
      Siang: 'neutral',
      Sore: 'neutral',
    }
  );

  const toggleDayAvailability = (day: DayOfWeek) => {
    if (availableDays.includes(day)) {
      if (availableDays.length === 1) {
        showToast('warning', 'Peringatan', 'Minimal harus memilih 1 hari ketersediaan mengajar.');
        return;
      }
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const toggleSlotAvailability = (slotId: string) => {
    if (unavailableSlotIds.includes(slotId)) {
      setUnavailableSlotIds(unavailableSlotIds.filter(id => id !== slotId));
    } else {
      setUnavailableSlotIds([...unavailableSlotIds, slotId]);
    }
  };

  // Preset Shortcuts
  const setAllAvailable = () => {
    setAvailableDays([...ALL_DAYS]);
    setUnavailableSlotIds([]);
    showToast('info', 'Preset Diterapkan', 'Semua slot waktu diatur TERSEDIA.');
  };

  const setMorningOnly = () => {
    setAvailableDays([...ALL_DAYS]);
    const afternoonSlots = timeslots.filter(t => t.slotIndex > 2).map(t => t.id);
    setUnavailableSlotIds(afternoonSlots);
    setTimePreference('Pagi');
    showToast('info', 'Preset Diterapkan', 'Slot siang & sore ditandai tidak tersedia.');
  };

  const setAfternoonOnly = () => {
    setAvailableDays([...ALL_DAYS]);
    const morningSlots = timeslots.filter(t => t.slotIndex <= 2).map(t => t.id);
    setUnavailableSlotIds(morningSlots);
    setTimePreference('Siang');
    showToast('info', 'Preset Diterapkan', 'Slot pagi ditandai tidak tersedia.');
  };

  const handleSave = () => {
    const updatedPreferences: LecturerPreference = {
      dayPreferences,
      timePreferences,
    };

    const updatedLecturer: Lecturer = {
      ...lecturer,
      availableDays,
      timePreference,
      unavailableSlotIds,
      preferences: updatedPreferences,
    };

    onSaveAvailability(updatedLecturer);
    showToast(
      'success',
      'Ketersediaan Disimpan',
      'Matriks ketersediaan dan preferensi mengajar Anda telah berhasil diperbarui dan disinkronkan ke sistem SPK.'
    );
  };

  // Group timeslots by slotIndex
  const uniqueSlotIndices = Array.from(new Set(timeslots.map(t => t.slotIndex))).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pengaturan Ketersediaan & Preferensi Mengajar</h2>
          <p className="text-xs text-slate-500">
            Dosen: <span className="font-bold text-slate-800">{lecturer.name}</span> • Tentukan hari dan slot waktu Anda agar sistem Simulated Annealing tidak menjadwalkan di waktu bentrok.
          </p>
        </div>

        <button
          onClick={handleSave}
          id="btn-save-availability"
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Ketersediaan</span>
        </button>
      </div>

      {/* Quick Presets */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Template Cepat:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={setAllAvailable}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Tersedia Penuh (Senin - Jumat)
          </button>
          <button
            type="button"
            onClick={setMorningOnly}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
          >
            Prioritas Pagi Saja
          </button>
          <button
            type="button"
            onClick={setAfternoonOnly}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
          >
            Prioritas Siang Saja
          </button>
        </div>
      </div>

      {/* SECTION 1: Hari Ketersediaan (Hard Constraint) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>1. Hari Ketersediaan Mengajar (Hard Constraint)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Hari yang tidak Anda pilih akan dianggap sebagai batasan mutlak (Hard Constraint C5).
            </p>
          </div>
          <Badge variant="indigo" size="sm">
            {availableDays.length} / 5 Hari Tersedia
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ALL_DAYS.map(day => {
            const isAvail = availableDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDayAvailability(day)}
                className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                  isAvail
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <span className="text-sm">{day}</span>
                <span className={`text-[11px] flex items-center gap-1 ${isAvail ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {isAvail ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{isAvail ? 'Bersedia' : 'Tidak Bersedia'}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Interactive Timeslot Availability Matrix */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>2. Matriks Detail Slot Waktu (Klik Kotak untuk Toggle)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Klik pada slot waktu spesifik jika Anda memiliki halangan jam tertentu (misal rapat, bimbingan, dinas).
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500"></span>
              <span>Tersedia</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500"></span>
              <span>Tidak Tersedia (Blokir)</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                <th className="p-3 text-left w-32">Slot Waktu</th>
                {ALL_DAYS.map(day => (
                  <th key={day} className="p-3">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uniqueSlotIndices.map(slotIdx => {
                const sampleSlot = timeslots.find(t => t.slotIndex === slotIdx);
                const slotLabel = sampleSlot?.label || `Sesi ${slotIdx}`;

                return (
                  <tr key={slotIdx} className="hover:bg-slate-50/50">
                    <td className="p-3 text-left font-mono font-semibold text-slate-800 bg-slate-50/30 whitespace-nowrap">
                      <div>Sesi {slotIdx}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{slotLabel}</div>
                    </td>

                    {ALL_DAYS.map(day => {
                      const daySlot = timeslots.find(t => t.day === day && t.slotIndex === slotIdx);
                      const isDayDisabled = !availableDays.includes(day);
                      const isSlotBlocked = daySlot ? unavailableSlotIds.includes(daySlot.id) : false;
                      const isAvail = !isDayDisabled && !isSlotBlocked;

                      return (
                        <td key={day} className="p-2">
                          {daySlot ? (
                            <button
                              type="button"
                              onClick={() => !isDayDisabled && toggleSlotAvailability(daySlot.id)}
                              disabled={isDayDisabled}
                              className={`w-full py-2.5 px-2 rounded-xl text-xs font-semibold transition-all border ${
                                isDayDisabled
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-40 cursor-not-allowed'
                                  : isSlotBlocked
                                  ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {isDayDisabled ? (
                                  <Minus className="w-3.5 h-3.5" />
                                ) : isSlotBlocked ? (
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                                <span className="text-[11px]">
                                  {isDayDisabled ? 'Hari Libur' : isSlotBlocked ? 'Blokir' : 'Tersedia'}
                                </span>
                              </div>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Preferensi Soft Constraints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Day Preference */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Preferensi Hari (Soft Constraint S2)</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Tandai hari yang paling Anda sukai atau ingin dihindari jika memungkinkan.
          </p>

          <div className="space-y-2 pt-1">
            {ALL_DAYS.map(day => (
              <div key={day} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-bold text-slate-800">{day}</span>
                <div className="flex items-center gap-1">
                  {(['preferred', 'neutral', 'avoid'] as const).map(pref => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setDayPreferences({ ...dayPreferences, [day]: pref })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        dayPreferences[day] === pref
                          ? pref === 'preferred'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : pref === 'avoid'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-slate-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pref === 'preferred' ? 'Disukai' : pref === 'avoid' ? 'Hindari' : 'Netral'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Category Preference */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Preferensi Jam Kuliah (Soft Constraint S3)</span>
          </h3>
          <p className="text-[11px] text-slate-500">
            Pilihan waktu umum (Pagi: 07:30-10:00, Siang: 10:30-15:00, Sore: 15:30-18:00).
          </p>

          <div className="space-y-2 pt-1">
            {TIME_CATEGORIES.map(timeCat => (
              <div key={timeCat} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-800">{timeCat}</span>
                  <div className="text-[10px] text-slate-400">
                    {timeCat === 'Pagi' ? 'Sesi 1 - 2' : timeCat === 'Siang' ? 'Sesi 3 - 4' : 'Sesi 5'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(['preferred', 'neutral', 'avoid'] as const).map(pref => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setTimePreferences({ ...timePreferences, [timeCat]: pref })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        timePreferences[timeCat] === pref
                          ? pref === 'preferred'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : pref === 'avoid'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-slate-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pref === 'preferred' ? 'Disukai' : pref === 'avoid' ? 'Hindari' : 'Netral'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            Perubahan ketersediaan akan langsung diperhitungkan oleh fungsi evaluasi fitness SPK dan deteksi konflik.
          </span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Simpan & Terapkan</span>
        </button>
      </div>
    </div>
  );
};
