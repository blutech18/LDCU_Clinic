import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import {
  ArrowLeft, Calendar, RefreshCw, UserPlus, SlidersHorizontal,
  Users, Check, Mail, AlertCircle, Save,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';
import { sendBulkReminders } from '~/lib/email';
import { supabase } from '~/lib/supabase';
import type { AppointmentType, DayOverride } from '~/types';

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'physical_exam', label: 'Physical Exam' },
  { value: 'dental', label: 'Dental' },
];

type DayTab = 'appointments' | 'reschedule' | 'walkin' | 'daysettings';

export function ScheduleDayPage() {
  const { date: dateStr = '' } = useParams<{ date: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const campusId = searchParams.get('campus') || '';

  const {
    appointments, fetchAppointments, fetchBookingCounts, bookingCounts,
    createAppointment, updateAppointment, rescheduleDate, isSaving,
  } = useAppointmentStore();

  const {
    campuses, departments, fetchCampuses, fetchDepartments,
    fetchBookingSetting, bookingSetting,
    fetchDayOverrides, dayOverrides,
  } = useScheduleStore();

  const maxBookingsPerDay = bookingSetting?.max_bookings_per_day || 50;

  const selectedDate = useMemo(() => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [dateStr]);

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<DayTab>('appointments');

  // ── Reschedule ──
  const [rescheduleMode, setRescheduleMode] = useState<'auto' | 'manual'>('auto');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [manualTargetDates, setManualTargetDates] = useState<Record<string, string>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<'todo' | 'done' | null>(null);
  const [savingKanban, setSavingKanban] = useState<Set<string>>(new Set());

  // ── Kanban auto-save handlers ──
  const handleDropToDone = async (id: string) => {
    setCompletedIds(prev => new Set([...prev, id]));
    setSavingKanban(prev => new Set([...prev, id]));
    try {
      await updateAppointment(id, { status: 'completed' });
    } catch (err) {
      // revert on failure
      setCompletedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      console.error('Failed to mark as completed:', err);
    } finally {
      setSavingKanban(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDropToPending = async (id: string) => {
    setCompletedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    setSavingKanban(prev => new Set([...prev, id]));
    try {
      await updateAppointment(id, { status: 'scheduled' });
    } catch (err) {
      // revert on failure
      setCompletedIds(prev => new Set([...prev, id]));
      console.error('Failed to revert to scheduled:', err);
    } finally {
      setSavingKanban(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  // ── Email reminders ──
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [remindersSent, setRemindersSent] = useState(false);

  // ── Walk-in ──
  const [walkInType, setWalkInType] = useState<AppointmentType>('consultation');
  const [walkInName, setWalkInName] = useState('');
  const [walkInContact, setWalkInContact] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInDepartment, setWalkInDepartment] = useState('');
  const [walkInCampusId, setWalkInCampusId] = useState(campusId);
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [walkInSuccess, setWalkInSuccess] = useState(false);

  // ── Day Settings ──
  const [dayOverride, setDayOverride] = useState<DayOverride | null>(null);
  const [dayMaxBookings, setDayMaxBookings] = useState(50);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [savingDaySettings, setSavingDaySettings] = useState(false);
  const [daySettingsSaved, setDaySettingsSaved] = useState(false);
  const [removingDayOverride, setRemovingDayOverride] = useState(false);

  // ── Reference month for data range (centre on selected date's month) ──
  const refMonth = selectedDate ?? new Date();

  // ── Data loading ──
  useEffect(() => {
    fetchCampuses();
    if (campusId) {
      fetchBookingSetting(campusId);
      fetchDepartments(campusId);
    }
  }, [campusId, fetchCampuses, fetchBookingSetting, fetchDepartments]);

  useEffect(() => {
    const start = startOfMonth(subMonths(refMonth, 1));
    const end = endOfMonth(addMonths(refMonth, 1));
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);
    fetchAppointments({ dateRange: { start: startStr, end: endStr }, ...(campusId && { campusId }) });
    fetchBookingCounts(startStr, endStr, campusId || undefined);
    if (campusId) fetchDayOverrides(campusId, startStr, endStr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campusId]);

  // Sync day override state when dayOverrides loads
  useEffect(() => {
    if (!dateStr) return;
    const existing = dayOverrides[dateStr];
    if (existing) {
      setDayOverride(existing);
      setDayMaxBookings(existing.max_bookings);
      setDayIsClosed(existing.is_closed);
      setDayNotes(existing.notes || '');
    } else {
      setDayOverride(null);
      setDayMaxBookings(maxBookingsPerDay);
      setDayIsClosed(false);
      setDayNotes('');
    }
  }, [dayOverrides, dateStr, maxBookingsPerDay]);

  // Seed completedIds from existing completed appointments
  useEffect(() => {
    if (!dateStr) return;
    const seeded = new Set<string>();
    appointments
      .filter(a => a.appointment_date === dateStr && a.status === 'completed')
      .forEach(a => seeded.add(a.id));
    setCompletedIds(seeded);
  }, [appointments, dateStr]);

  // ── Derived lists ──
  const allDateAppointments = useMemo(
    () => appointments.filter(a => a.appointment_date === dateStr),
    [appointments, dateStr],
  );

  const scheduledAppointments = useMemo(
    () => appointments.filter(a => a.appointment_date === dateStr && a.status !== 'cancelled'),
    [appointments, dateStr],
  );

  const unfinishedCount = scheduledAppointments.length - completedIds.size;

  const manualTargetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(manualTargetDates).forEach(d => { if (d) counts[d] = (counts[d] || 0) + 1; });
    return counts;
  }, [manualTargetDates]);

  const getBookingCountStr = (d: string) => bookingCounts[d] || 0;

  const refreshData = async () => {
    const start = startOfMonth(subMonths(refMonth, 1));
    const end = endOfMonth(addMonths(refMonth, 1));
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);
    await fetchAppointments({ dateRange: { start: startStr, end: endStr }, ...(campusId && { campusId }) });
    await fetchBookingCounts(startStr, endStr, campusId || undefined);
  };

  // ── Handlers ──
  const handleSaveChecklist = async () => {
    for (const apt of scheduledAppointments) {
      if (completedIds.has(apt.id) && apt.status !== 'completed')
        await updateAppointment(apt.id, { status: 'completed' });
      else if (!completedIds.has(apt.id) && apt.status === 'completed')
        await updateAppointment(apt.id, { status: 'scheduled' });
    }
  };

  const handleAutoReschedule = async () => {
    if (!campusId) return;
    try {
      setRescheduleError(null);
      await handleSaveChecklist();
      const ids = scheduledAppointments
        .filter(a => !completedIds.has(a.id) && a.status !== 'cancelled')
        .map(a => a.id);
      if (ids.length === 0) { setRescheduleError('No appointments to reschedule.'); return; }
      await rescheduleDate(dateStr, ids, campusId);
      setRescheduleSuccess(true);
      await refreshData();
      setTimeout(() => navigate('/schedule'), 2000);
    } catch { setRescheduleError('Failed to reschedule.'); }
  };

  const handleManualReschedule = async () => {
    if (!campusId) return;
    try {
      setRescheduleError(null);
      await handleSaveChecklist();
      const unfinished = scheduledAppointments.filter(a => !completedIds.has(a.id) && a.status !== 'cancelled');
      if (unfinished.length === 0) { setRescheduleError('No appointments to reschedule.'); return; }
      const missing = unfinished.filter(a => !manualTargetDates[a.id]);
      if (missing.length > 0) { setRescheduleError(`Please select a date for all ${missing.length} uncompleted appointment(s).`); return; }
      for (const apt of unfinished) {
        const td = manualTargetDates[apt.id];
        if (td) {
          const { error } = await supabase.from('appointments').update({ appointment_date: td, status: 'scheduled' }).eq('id', apt.id);
          if (error) throw error;
        }
      }
      setRescheduleSuccess(true);
      await refreshData();
      setTimeout(() => navigate('/schedule'), 2000);
    } catch { setRescheduleError('Failed to reschedule.'); }
  };

  const handleSendReminders = async () => {
    if (!campusId) return;
    setIsSendingReminders(true);
    try {
      const result = await sendBulkReminders(dateStr, campusId);
      alert(result.sent > 0
        ? `Sent ${result.sent} reminder(s)!${result.skipped ? ` (${result.skipped} skipped)` : ''}${result.failed ? ` (${result.failed} failed)` : ''}`
        : result.message || 'No reminders to send.');
    } catch (e: any) { alert(`Failed: ${e.message || 'Unknown error'}`); }
    setIsSendingReminders(false);
    setRemindersSent(true);
    setTimeout(() => setRemindersSent(false), 3000);
  };

  const handleWalkInBook = async () => {
    if (!walkInCampusId || !dateStr) return;
    if (!walkInName.trim()) { setWalkInError('Please enter patient name.'); return; }
    if (!walkInContact.trim()) { setWalkInError('Please enter contact number.'); return; }
    if (!walkInEmail.trim()) { setWalkInError('Please enter email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(walkInEmail.trim())) { setWalkInError('Please enter a valid email address.'); return; }
    if ((bookingCounts[dateStr] || 0) >= maxBookingsPerDay) { setWalkInError('This date is fully booked.'); return; }
    try {
      setWalkInError(null);
      const dept = departments.find(d => d.id === walkInDepartment);
      await createAppointment({
        patient_id: '00000000-0000-0000-0000-000000000000',
        campus_id: walkInCampusId, appointment_type: walkInType, appointment_date: dateStr,
        start_time: '08:00', end_time: '17:00', status: 'scheduled',
        notes: `Walk-in${dept ? ` | Department: ${dept.name}` : ''}${walkInNotes ? `\n${walkInNotes}` : ''}`,
        patient_name: walkInName.trim(), patient_phone: walkInContact.trim(), patient_email: walkInEmail.trim(),
      });
      setWalkInSuccess(true);
      await refreshData();
      setTimeout(() => { setWalkInSuccess(false); setWalkInName(''); setWalkInContact(''); setWalkInEmail(''); setWalkInNotes(''); }, 3000);
    } catch { setWalkInError('Failed to book walk-in appointment.'); }
  };

  const handleSaveDaySettings = async () => {
    if (!campusId || !dateStr) return;
    setSavingDaySettings(true);
    try {
      const payload = { campus_id: campusId, override_date: dateStr, max_bookings: dayMaxBookings, is_closed: dayIsClosed, notes: dayNotes };
      if (dayOverride?.id) {
        await supabase.from('day_overrides').update(payload).eq('id', dayOverride.id);
      } else {
        const { data } = await supabase.from('day_overrides').upsert(payload, { onConflict: 'campus_id,override_date' }).select().single();
        if (data) setDayOverride(data as DayOverride);
      }
      const start = startOfMonth(subMonths(refMonth, 1));
      const end = endOfMonth(addMonths(refMonth, 1));
      await fetchDayOverrides(campusId, formatLocalDate(start), formatLocalDate(end));
      setDaySettingsSaved(true);
      setTimeout(() => setDaySettingsSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSavingDaySettings(false);
  };

  const handleRemoveDayOverride = async () => {
    if (!dayOverride?.id || !campusId) return;
    setRemovingDayOverride(true);
    try {
      await supabase.from('day_overrides').delete().eq('id', dayOverride.id);
      setDayOverride(null); setDayMaxBookings(maxBookingsPerDay); setDayIsClosed(false); setDayNotes('');
      const start = startOfMonth(subMonths(refMonth, 1));
      const end = endOfMonth(addMonths(refMonth, 1));
      await fetchDayOverrides(campusId, formatLocalDate(start), formatLocalDate(end));
      setDaySettingsSaved(true);
      setTimeout(() => setDaySettingsSaved(false), 3000);
    } catch (e) { console.error(e); }
    setRemovingDayOverride(false);
  };

  if (!selectedDate) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500">Invalid date.</p>
      </div>
    );
  }

  const formattedDate = format(selectedDate, 'EEEE, MMMM d, yyyy');

  const tabs: { key: DayTab; icon: React.ElementType; label: string }[] = [
    { key: 'appointments', icon: Calendar, label: 'Appointments' },
    { key: 'reschedule', icon: RefreshCw, label: 'Reschedule' },
    { key: 'walkin', icon: UserPlus, label: 'Walk-in' },
    { key: 'daysettings', icon: SlidersHorizontal, label: 'Day Settings' },
  ];

  return (
    <>
      <div className="flex flex-col flex-1">

        {/* ── Page Header ── */}
        <div className="flex items-start gap-3 mb-6">
          <button
            onClick={() => navigate('/schedule')}
            className="mt-0.5 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{formattedDate}</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
              <Users className="w-3.5 h-3.5" />
              {scheduledAppointments.length} appointment{scheduledAppointments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* ── Main Card ── */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col flex-1">

          {/* Tabs */}
          {!rescheduleSuccess && !walkInSuccess && (
            <div className="flex border-b border-gray-200 overflow-x-auto shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 pt-3 px-4 sm:px-5 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === tab.key
                    ? 'border-maroon-800 text-maroon-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Tab Content ── */}
          <div className="p-4 sm:p-6 overflow-y-auto">

            {/* Success state */}
            {(rescheduleSuccess || walkInSuccess) ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {walkInSuccess ? 'Walk-in Booked!' : 'Reschedule Complete!'}
                </h4>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  {walkInSuccess
                    ? 'The walk-in appointment has been successfully created.'
                    : rescheduleMode === 'auto'
                      ? 'Unmarked appointments have been automatically distributed.'
                      : 'Appointments have been moved to their new dates.'}
                </p>
                <p className="text-xs text-gray-400 mt-3">Returning to schedule…</p>
              </div>

            /* ── Appointments Tab ── */
            ) : activeTab === 'appointments' ? (
              allDateAppointments.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No appointments on this date</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {allDateAppointments.map(apt => (
                    <div
                      key={apt.id}
                      className={`rounded-xl border overflow-hidden bg-white shadow-sm
                        ${apt.status === 'completed' ? 'border-green-200'
                          : apt.status === 'cancelled' ? 'border-red-200'
                          : apt.booker_role === 'staff' ? 'border-amber-200'
                          : 'border-gray-200'}`}
                    >
                      {/* Card header */}
                      <div className={`px-3 py-2 flex items-start justify-between gap-2
                        ${apt.status === 'completed' ? 'bg-green-50'
                          : apt.status === 'cancelled' ? 'bg-red-50'
                          : apt.booker_role === 'staff' ? 'bg-amber-50'
                          : 'bg-maroon-50'}`}
                      >
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <p className="font-semibold text-gray-900 text-sm truncate capitalize">
                            {apt.patient_name || 'Unknown Patient'}
                          </p>
                          {apt.patient_email && (
                            <span className="text-xs text-gray-500 truncate">{apt.patient_email}</span>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 capitalize mt-0.5
                          ${apt.status === 'completed' ? 'bg-green-100 text-green-700'
                            : apt.status === 'cancelled' ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'}`}>
                          {apt.status}
                        </span>
                      </div>
                      {/* Card body */}
                      <div className="px-3 py-2 flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Type</span>
                            <span className="text-xs text-gray-700 font-medium capitalize">{apt.appointment_type.replace(/_/g, ' ')}</span>
                          </div>
                          <span className="text-gray-200">|</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Role</span>
                            {apt.booker_role === 'staff'
                              ? <span className="text-xs text-amber-700 font-medium">Staff</span>
                              : <span className="text-xs text-blue-700 font-medium">Student</span>}
                          </div>
                        </div>
                        {apt.patient_phone && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Phone</span>
                            <span className="text-xs text-gray-600">{apt.patient_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )

            /* ── Reschedule Tab ── */
            ) : activeTab === 'reschedule' ? (
              <>
                {/* Auto / Manual toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Reschedule Mode</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {rescheduleMode === 'auto'
                        ? 'Pending cards are evenly distributed to future dates automatically.'
                        : 'Choose a specific new date for each appointment card manually.'}
                    </p>
                  </div>
                  <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-1 flex-shrink-0 self-start sm:self-auto shadow-sm">
                    <button
                      onClick={() => setRescheduleMode('auto')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${rescheduleMode === 'auto' ? 'bg-maroon-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                      <RefreshCw className="w-3 h-3" />
                      Reschedule
                    </button>
                    <button
                      onClick={() => setRescheduleMode('manual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${rescheduleMode === 'manual' ? 'bg-maroon-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                      <Calendar className="w-3 h-3" />
                      Manual Pick
                    </button>
                  </div>
                </div>

                {scheduledAppointments.length === 0 ? (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-400 font-medium">No active appointments for this date</p>
                  </div>
                ) : rescheduleMode === 'auto' ? (
                  /* ── Kanban Board (Auto Spread) ── */
                  <div className="flex flex-col md:flex-row gap-3" style={{ minHeight: 300 }}>

                    {/* Pending column */}
                    <div
                      className={`flex-1 flex flex-col rounded-xl border-2 transition-colors duration-200 ${dragOverColumn === 'todo' ? 'border-maroon-400 bg-maroon-50/40' : 'border-dashed border-gray-200 bg-gray-50/50'}`}
                      onDragOver={e => { e.preventDefault(); setDragOverColumn('todo'); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
                      onDrop={e => { e.preventDefault(); if (draggedId) handleDropToPending(draggedId); setDragOverColumn(null); setDraggedId(null); }}
                    >
                      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Pending</span>
                        <span className="ml-auto px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-semibold">
                          {scheduledAppointments.filter(a => !completedIds.has(a.id)).length}
                        </span>
                      </div>
                      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[480px] content-start">
                        <AnimatePresence>
                          {scheduledAppointments.filter(a => !completedIds.has(a.id)).map(apt => (
                            <motion.div
                              key={apt.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              draggable
                              onDragStart={() => setDraggedId(apt.id)}
                              onDragEnd={() => setDraggedId(null)}
                              className={`rounded-lg border bg-white border-gray-200 hover:border-maroon-300 hover:shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing select-none overflow-hidden ${draggedId === apt.id ? 'opacity-40 scale-95' : ''}`}
                            >
                              <div className="px-2.5 py-1.5 bg-maroon-50 border-b border-maroon-100 flex items-start justify-between gap-1">
                                <p className="text-xs font-semibold text-gray-900 truncate capitalize" title={apt.patient_name}>
                                  {apt.patient_name || 'Unknown Patient'}
                                </p>
                                {savingKanban.has(apt.id)
                                  ? <span className="text-[9px] px-1.5 py-px bg-gray-100 text-gray-500 rounded-full font-bold flex-shrink-0 flex items-center gap-0.5"><span className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />Saving</span>
                                  : <span className="text-[9px] px-1.5 py-px bg-maroon-100 text-maroon-700 rounded-full font-bold flex-shrink-0">Pending</span>}
                              </div>
                              <div className="px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Type</span>
                                <span className="text-[10px] text-gray-700 font-medium capitalize">{apt.appointment_type.replace(/_/g, ' ')}</span>
                                <span className="text-gray-200 text-[10px]">|</span>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Role</span>
                                {apt.booker_role === 'staff'
                                  ? <span className="text-[10px] text-amber-700 font-medium">Staff</span>
                                  : <span className="text-[10px] text-blue-700 font-medium">Student</span>}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {scheduledAppointments.filter(a => !completedIds.has(a.id)).length === 0 && (
                          <div className="col-span-2 flex items-center justify-center text-gray-400 text-xs py-8">All moved!</div>
                        )}
                      </div>
                    </div>

                    {/* Done column */}
                    <div
                      className={`flex-1 flex flex-col rounded-xl border-2 transition-colors duration-200 ${dragOverColumn === 'done' ? 'border-green-400 bg-green-50/60' : 'border-dashed border-green-200 bg-green-50/20'}`}
                      onDragOver={e => { e.preventDefault(); setDragOverColumn('done'); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
                      onDrop={e => { e.preventDefault(); if (draggedId) handleDropToDone(draggedId); setDragOverColumn(null); setDraggedId(null); }}
                    >
                      <div className="px-3 py-2 border-b border-green-100 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-green-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-green-600">Done</span>
                        <span className="ml-auto px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{completedIds.size}</span>
                      </div>
                      <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[480px] content-start">
                        <AnimatePresence>
                          {scheduledAppointments.filter(a => completedIds.has(a.id)).map(apt => (
                            <motion.div
                              key={apt.id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              draggable
                              onDragStart={() => setDraggedId(apt.id)}
                              onDragEnd={() => setDraggedId(null)}
                              className={`rounded-lg border bg-white border-green-200 transition-all duration-150 cursor-grab active:cursor-grabbing select-none overflow-hidden ${draggedId === apt.id ? 'opacity-40 scale-95' : ''}`}
                            >
                              <div className="px-2.5 py-1.5 bg-green-50 border-b border-green-100 flex items-start justify-between gap-1">
                                <p className="text-xs font-semibold text-green-900 truncate capitalize">
                                  {apt.patient_name || 'Unknown Patient'}
                                </p>
                                {savingKanban.has(apt.id)
                                  ? <span className="text-[9px] px-1.5 py-px bg-gray-100 text-gray-500 rounded-full font-bold flex-shrink-0 flex items-center gap-0.5"><span className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />Saving</span>
                                  : <span className="text-[9px] px-1.5 py-px bg-green-100 text-green-700 rounded-full font-bold flex-shrink-0">Done</span>}
                              </div>
                              <div className="px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Type</span>
                                <span className="text-[10px] text-gray-700 font-medium capitalize">{apt.appointment_type.replace(/_/g, ' ')}</span>
                                <span className="text-gray-200 text-[10px]">|</span>
                                <span className="text-[9px] text-gray-400 uppercase tracking-wide">Role</span>
                                {apt.booker_role === 'staff'
                                  ? <span className="text-[10px] text-amber-700 font-medium">Staff</span>
                                  : <span className="text-[10px] text-blue-700 font-medium">Student</span>}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {completedIds.size === 0 && (
                          <div className="col-span-2 flex flex-col items-center justify-center text-green-400 text-xs py-8 gap-2">
                            <Check className="w-7 h-7 opacity-30" />
                            <span>Drag cards here when done</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                ) : (
                  /* ── Manual Pick Table ── */
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    {/* Table header — hidden on mobile */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <span>Patient</span>
                      <span className="w-24 text-center">Role</span>
                      <span className="w-32 text-center">Type</span>
                      <span className="w-44 text-center">New Date</span>
                    </div>
                    <div className="divide-y divide-gray-100 overflow-y-auto max-h-[520px]">
                      <AnimatePresence>
                        {scheduledAppointments.map((apt, idx) => {
                          const targetDate = manualTargetDates[apt.id] || '';
                          const targetCount = targetDate ? (getBookingCountStr(targetDate) + (manualTargetCounts[targetDate] || 0)) : 0;
                          const overLimit = !!targetDate && targetCount > maxBookingsPerDay;
                          return (
                            <motion.div
                              key={apt.id}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15, delay: idx * 0.03 }}
                              className="flex flex-col sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-gray-50/70 transition-colors"
                            >
                              {/* Patient */}
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-maroon-100 text-maroon-700'
                                }`}>
                                  {(apt.patient_name || '?')[0].toUpperCase()}
                                </span>
                                <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-semibold text-gray-900 truncate flex-shrink-0">{apt.patient_name || 'Unknown Patient'}</p>
                                  {apt.patient_email && (
                                    <>
                                      <span className="text-gray-300 text-xs flex-shrink-0">·</span>
                                      <span className="text-xs text-gray-500 truncate">{apt.patient_email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {/* Role */}
                              <div className="w-24 flex justify-center">
                                {apt.booker_role === 'staff'
                                  ? <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-lg font-semibold uppercase">Staff</span>
                                  : <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold uppercase">Student</span>}
                              </div>
                              {/* Type */}
                              <div className="w-32 flex justify-center">
                                <span className="text-xs px-2 py-1 bg-maroon-50 text-maroon-700 rounded-lg font-medium capitalize text-center">
                                  {apt.appointment_type.replace(/_/g, ' ')}
                                </span>
                              </div>
                              {/* Date picker */}
                              <div className="flex items-center gap-2 w-44">
                                <input
                                  type="date"
                                  value={targetDate}
                                  onChange={e => setManualTargetDates(prev => ({ ...prev, [apt.id]: e.target.value }))}
                                  className={`flex-1 px-2.5 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all ${
                                    !targetDate ? 'border-maroon-300 bg-maroon-50/30' : overLimit ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-white'
                                  }`}
                                />
                                {targetDate && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${
                                    overLimit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                  }`}>
                                    {targetCount}/{maxBookingsPerDay}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                    {/* Summary footer */}
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-maroon-700">{Object.values(manualTargetDates).filter(Boolean).length}</span> of {scheduledAppointments.length} assigned
                      </p>
                      {Object.values(manualTargetDates).some(d => {
                        const c = getBookingCountStr(d) + (manualTargetCounts[d] || 0);
                        return c > maxBookingsPerDay;
                      }) && (
                        <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Some dates exceed capacity
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {rescheduleError && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl mt-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{rescheduleError}</p>
                  </div>
                )}
              </>

            /* ── Walk-in Tab ── */
            ) : activeTab === 'walkin' ? (
              <div className="space-y-4">
                {walkInSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl border border-green-100">
                    <Check className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">Walk-in booked successfully!</p>
                  </div>
                )}
                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Appointment Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {APPOINTMENT_TYPES.map(t => (
                      <button key={t.value} onClick={() => setWalkInType(t.value)}
                        className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${walkInType === t.value ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Name + Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                    <input type="text" value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="Enter patient name"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number *</label>
                    <input type="tel" value={walkInContact} onChange={e => setWalkInContact(e.target.value)} placeholder="Enter contact number"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                  </div>
                </div>
                {/* Email + Department */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                    <input type="email" value={walkInEmail} onChange={e => setWalkInEmail(e.target.value)} placeholder="Enter email address"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                    <select value={walkInDepartment} onChange={e => setWalkInDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm">
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                {/* Campus + Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Campus</label>
                    <select value={walkInCampusId} onChange={e => setWalkInCampusId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm">
                      {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                    <textarea value={walkInNotes} onChange={e => setWalkInNotes(e.target.value)} placeholder="Any additional information…"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none text-sm" rows={3} />
                  </div>
                </div>
                {walkInError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{walkInError}</p>
                  </div>
                )}
                <button onClick={handleWalkInBook} disabled={isSaving}
                  className="w-full sm:w-auto sm:px-8 py-3 px-4 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2">
                  {isSaving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Booking…</>) : (<><UserPlus className="w-4 h-4" />Book Walk-in Appointment</>)}
                </button>
              </div>

            /* ── Day Settings Tab ── */
            ) : (
              <div className="space-y-5">
                {/* Top row: Close toggle + Notes side by side on lg */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {/* Closed toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">Close this day</h4>
                      <p className="text-xs text-gray-500 mt-0.5">No bookings will be allowed on this date</p>
                    </div>
                    <button onClick={() => setDayIsClosed(!dayIsClosed)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:ring-2 focus:ring-maroon-500 focus:ring-offset-2 flex-shrink-0 ml-4 ${dayIsClosed ? 'bg-red-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${dayIsClosed ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Notes */}
                  <textarea value={dayNotes} onChange={e => setDayNotes(e.target.value)}
                    placeholder="Notes (optional) — e.g. Special event, limited staffing…"
                    className="w-full h-full min-h-[72px] px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none text-sm" />
                </div>

                {/* Max Slots */}
                {!dayIsClosed && (
                  <div className="p-4 bg-gray-50 rounded-xl border space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">Max Slots for This Day</label>
                      <span className="text-xs text-gray-500">Global default: {maxBookingsPerDay}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input type="range" min={1} max={200} value={dayMaxBookings}
                        onChange={e => setDayMaxBookings(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-maroon-800" />
                      <input type="number" min={1} max={500} value={dayMaxBookings}
                        onChange={e => setDayMaxBookings(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold text-maroon-800 focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none" />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[10, 25, 50, 75, 100].map(v => (
                        <button key={v} onClick={() => setDayMaxBookings(v)}
                          className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${dayMaxBookings === v ? 'bg-maroon-800 text-white border-maroon-800' : 'bg-white text-gray-600 border-gray-300 hover:border-maroon-400'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {dayOverride && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      This day has a custom override active
                      {dayOverride.notes && <span className="text-amber-600"> — {dayOverride.notes}</span>}
                    </p>
                  </div>
                )}

                {daySettingsSaved && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl border border-green-100">
                    <Check className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">Settings saved successfully!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer Actions ── */}
          {!rescheduleSuccess && !walkInSuccess && activeTab !== 'walkin' && (
            <div className="border-t border-gray-200 bg-gray-50/50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">

              {activeTab === 'appointments' && allDateAppointments.filter(a => a.status === 'scheduled').length > 0 && (
                <>
                  <p className="text-sm text-gray-500">
                    {allDateAppointments.filter(a => a.status === 'scheduled' && a.patient_email).length} with email
                  </p>
                  <button onClick={handleSendReminders} disabled={isSendingReminders}
                    className="px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm">
                    {isSendingReminders ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>) :
                      remindersSent ? (<><Check className="w-4 h-4" />Sent!</>) : (<><Mail className="w-4 h-4" />Send Reminders</>)}
                  </button>
                </>
              )}

              {activeTab === 'reschedule' && scheduledAppointments.length > 0 && (
                <>
                  <button onClick={handleSaveChecklist} disabled={isSaving}
                    className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all text-sm shadow-sm active:scale-[0.98]">
                    Save Status Only
                  </button>
                  <button onClick={rescheduleMode === 'auto' ? handleAutoReschedule : handleManualReschedule}
                    disabled={isSaving || unfinishedCount === 0}
                    className="px-6 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
                    {isSaving
                      ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Processing…</span></>)
                      : (<><RefreshCw className={`w-4 h-4 ${rescheduleMode === 'manual' ? 'rotate-90' : ''}`} />
                        <span>{rescheduleMode === 'auto' ? `Reschedule (${unfinishedCount})` : `Move Selection (${unfinishedCount})`}</span></>)}
                  </button>
                </>
              )}

              {activeTab === 'daysettings' && (
                <>
                  {dayOverride && (
                    <button onClick={handleRemoveDayOverride} disabled={removingDayOverride}
                      className="px-4 py-2.5 bg-white border border-red-300 text-red-600 font-medium rounded-xl hover:bg-red-50 hover:border-red-400 transition-all text-sm shadow-sm active:scale-[0.98] flex items-center justify-center gap-2">
                      {removingDayOverride ? 'Removing…' : 'Remove Override'}
                    </button>
                  )}
                  <button onClick={handleSaveDaySettings} disabled={savingDaySettings}
                    className="ml-auto px-6 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2">
                    {savingDaySettings
                      ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>)
                      : daySettingsSaved
                        ? (<><Check className="w-4 h-4" />Saved!</>)
                        : (<><Save className="w-4 h-4" />Save Day Settings</>)}
                  </button>
                </>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
