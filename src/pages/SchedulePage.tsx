import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isBefore,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Mail, Check, Settings, Save, RefreshCw, Calendar, AlertCircle, UserPlus, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarLayout } from '~/components/layout';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';
import { sendBulkReminders } from '~/lib/email';
import { supabase } from '~/lib/supabase';
import type { Appointment, AppointmentType } from '~/types';

const APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'physical_exam', label: 'Physical Exam' },
  { value: 'dental', label: 'Dental' },
];

type ModalTab = 'appointments' | 'reschedule' | 'walkin' | 'daysettings';

interface DayOverride {
  id?: string;
  campus_id: string;
  override_date: string;
  max_bookings: number;
  is_closed: boolean;
  notes: string;
}

export function SchedulePage() {
  // ── Stores ──
  const { appointments, fetchAppointments, fetchBookingCounts, bookingCounts, isLoading, createAppointment, updateAppointment, rescheduleDate, isSaving } = useAppointmentStore();
  const { campuses, departments, fetchCampuses, fetchDepartments, selectedCampusId, setSelectedCampus, fetchBookingSetting, bookingSetting, updateBookingSetting, fetchEmailTemplates, emailTemplates, upsertEmailTemplate, fetchScheduleConfig } = useScheduleStore();

  // ── Calendar state ──
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [direction, setDirection] = useState(0);

  // ── Modal tab ──
  const [modalTab, setModalTab] = useState<ModalTab>('appointments');

  // ── Email reminders ──
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [remindersSent, setRemindersSent] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // ── Reschedule state ──
  const [rescheduleMode, setRescheduleMode] = useState<'auto' | 'manual'>('auto');
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [manualTargetDates, setManualTargetDates] = useState<Record<string, string>>({});

  // ── Settings ──
  const [editingMaxBookings, setEditingMaxBookings] = useState(false);
  const [tempMaxBookings, setTempMaxBookings] = useState(50);
  const [savingMaxBookings, setSavingMaxBookings] = useState(false);

  // ── Walk-in state ──
  const [walkInType, setWalkInType] = useState<AppointmentType>('consultation');
  const [walkInName, setWalkInName] = useState('');
  const [walkInContact, setWalkInContact] = useState('');
  const [walkInDepartment, setWalkInDepartment] = useState('');
  const [walkInCampus, setWalkInCampus] = useState('');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [walkInSuccess, setWalkInSuccess] = useState(false);

  // ── Day Settings state ──
  const [dayOverride, setDayOverride] = useState<DayOverride | null>(null);
  const [dayMaxBookings, setDayMaxBookings] = useState(50);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [dayOverrides, setDayOverrides] = useState<Record<string, DayOverride>>({});
  const [savingDaySettings, setSavingDaySettings] = useState(false);
  const [daySettingsSaved, setDaySettingsSaved] = useState(false);
  const [removingDayOverride, setRemovingDayOverride] = useState(false);

  // ── Calendar animation ──
  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (d: number) => ({ zIndex: 0, x: d < 0 ? 1000 : -1000, opacity: 0 }),
  };
  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentMonth(newDirection > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  // ── Data fetching ──
  useEffect(() => { fetchCampuses(); }, [fetchCampuses]);
  useEffect(() => { if (campuses.length > 0 && !selectedCampusId) setSelectedCampus(campuses[0].id); }, [campuses, selectedCampusId, setSelectedCampus]);
  useEffect(() => {
    if (selectedCampusId) {
      fetchBookingSetting(selectedCampusId);
      fetchEmailTemplates(selectedCampusId);
      fetchDepartments(selectedCampusId);
      fetchScheduleConfig(selectedCampusId);
    }
  }, [selectedCampusId, fetchBookingSetting, fetchEmailTemplates, fetchDepartments, fetchScheduleConfig]);

  useEffect(() => {
    const t = emailTemplates.find(t => t.template_type === 'appointment_reminder');
    if (t) { setTemplateSubject(t.subject); setTemplateBody(t.body); }
    else {
      setTemplateSubject('Appointment Reminder - {{date}} | LDCU Clinic');
      setTemplateBody('Hello {{name}},\n\nThis is a friendly reminder about your upcoming appointment at the LDCU University Clinic.\n\nDate: {{date}}\nType: {{type}}\n\nPlease arrive 10-15 minutes before your scheduled time. Bring a valid ID and any relevant medical documents.\n\nIf you need to reschedule, please contact us as soon as possible.\n\nThank you,\nLDCU University Clinic');
    }
  }, [emailTemplates]);

  useEffect(() => {
    const start = startOfMonth(subMonths(currentMonth, 1));
    const end = endOfMonth(addMonths(currentMonth, 1));
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);
    fetchAppointments({ dateRange: { start: startStr, end: endStr }, ...(selectedCampusId && { campusId: selectedCampusId }) });
    fetchBookingCounts(startStr, endStr, selectedCampusId || undefined);
  }, [currentMonth, selectedCampusId, fetchAppointments, fetchBookingCounts]);

  // Fetch day overrides for the visible month range
  useEffect(() => {
    const fetchDayOverrides = async () => {
      const start = formatLocalDate(startOfMonth(subMonths(currentMonth, 1)));
      const end = formatLocalDate(endOfMonth(addMonths(currentMonth, 1)));
      let query = supabase.from('day_overrides').select('*').gte('override_date', start).lte('override_date', end);
      if (selectedCampusId) query = query.eq('campus_id', selectedCampusId);
      const { data } = await query;
      const map: Record<string, DayOverride> = {};
      (data || []).forEach((d: DayOverride) => { map[d.override_date] = d; });
      setDayOverrides(map);
    };
    fetchDayOverrides();
  }, [currentMonth, selectedCampusId]);

  const maxBookingsPerDay = bookingSetting?.max_bookings_per_day || 50;
  useEffect(() => { setTempMaxBookings(maxBookingsPerDay); }, [maxBookingsPerDay]);
  useEffect(() => { if (selectedCampusId) setWalkInCampus(selectedCampusId); }, [selectedCampusId]);

  // Get effective max for a date (per-day override or global default)
  const getMaxForDate = (dateStr: string) => {
    const override = dayOverrides[dateStr];
    if (override) return override.is_closed ? 0 : override.max_bookings;
    return maxBookingsPerDay;
  };

  // ── Calendar helpers ──
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) { days.push(day); day = addDays(day, 1); }
    return days;
  }, [currentMonth]);

  const getBookingCount = (date: Date) => bookingCounts[formatLocalDate(date)] || 0;
  const getBookingCountStr = (dateStr: string) => bookingCounts[dateStr] || 0;
  const getDateAppointments = (date: Date): Appointment[] => {
    const dateStr = formatLocalDate(date);
    return appointments.filter(apt => apt.appointment_date === dateStr && apt.status !== 'cancelled');
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
    setModalTab('appointments');
    setCompletedIds(new Set());
    setRescheduleSuccess(false);
    setRescheduleError(null);
    setRescheduleMode('auto');
    setManualTargetDates({});
    setWalkInName(''); setWalkInContact(''); setWalkInDepartment(''); setWalkInNotes('');
    setWalkInType('consultation'); setWalkInError(null); setWalkInSuccess(false);
    // Load day override for clicked date
    const dateStr = formatLocalDate(date);
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
    setDaySettingsSaved(false);
    const dateAppts = getDateAppointments(date);
    const alreadyCompleted = new Set<string>();
    dateAppts.forEach(apt => { if (apt.status === 'completed') alreadyCompleted.add(apt.id); });
    setCompletedIds(alreadyCompleted);
  };

  const selectedDateAppointments = selectedDate ? getDateAppointments(selectedDate) : [];
  const scheduledAppointments = selectedDateAppointments.filter(apt => apt.status !== 'cancelled');
  const unfinishedCount = scheduledAppointments.length - completedIds.size;

  // ── Email template ──
  const handleSaveTemplate = async () => {
    const campusId = selectedCampusId || (campuses.length > 0 ? campuses[0].id : null);
    if (!campusId) { alert('Please select a campus first.'); return; }
    setSavingTemplate(true);
    try {
      await upsertEmailTemplate({ campus_id: campusId, template_type: 'appointment_reminder', subject: templateSubject, body: templateBody });
      setTemplateSaved(true); setTimeout(() => setTemplateSaved(false), 3000);
    } catch (err) { console.error('Failed:', err); alert('Failed to save template.'); }
    setSavingTemplate(false);
  };

  const templateEditorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (showTemplateEditor && templateEditorRef.current) setTimeout(() => templateEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
  }, [showTemplateEditor]);

  const handleSendReminders = useCallback(async () => {
    if (!selectedDate || selectedDateAppointments.length === 0) return;
    const campusId = selectedCampusId || (campuses.length > 0 ? campuses[0].id : null);
    if (!campusId) { alert('No campus available.'); return; }
    setIsSendingReminders(true); setRemindersSent(false);
    try {
      const dateStr = formatLocalDate(selectedDate);
      const customTemplate = templateSubject && templateBody ? { subject: templateSubject, body: templateBody } : undefined;
      const result = await sendBulkReminders(dateStr, campusId, customTemplate);
      if (result.sent > 0) alert(`Successfully sent ${result.sent} reminder(s)!${result.skipped ? ` (${result.skipped} skipped)` : ''}${result.failed ? ` (${result.failed} failed)` : ''}`);
      else alert(result.message || 'No reminders to send.');
    } catch (err: any) { console.error('Failed:', err); alert(`Failed: ${err.message || 'Unknown error'}`); }
    setIsSendingReminders(false); setRemindersSent(true);
    setTimeout(() => setRemindersSent(false), 3000);
  }, [selectedDate, selectedDateAppointments, selectedCampusId, campuses, templateSubject, templateBody]);

  // ── Reschedule ──
  const toggleCompleted = (id: string) => {
    setCompletedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const handleSaveChecklist = async () => {
    if (!selectedDate) return;
    const dateAppts = getDateAppointments(selectedDate);
    for (const apt of dateAppts) {
      if (completedIds.has(apt.id) && apt.status !== 'completed') await updateAppointment(apt.id, { status: 'completed' });
      else if (!completedIds.has(apt.id) && apt.status === 'completed') await updateAppointment(apt.id, { status: 'scheduled' });
    }
  };

  const handleSaveMaxBookings = async () => {
    if (!selectedCampusId || tempMaxBookings < 1) return;
    setSavingMaxBookings(true);
    try { await updateBookingSetting(selectedCampusId, tempMaxBookings); setEditingMaxBookings(false); }
    catch (error) { console.error('Error:', error); }
    finally { setSavingMaxBookings(false); }
  };

  const refreshData = async () => {
    const start = startOfMonth(subMonths(currentMonth, 1));
    const end = endOfMonth(addMonths(currentMonth, 1));
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);
    await fetchAppointments({ dateRange: { start: startStr, end: endStr }, ...(selectedCampusId && { campusId: selectedCampusId }) });
    await fetchBookingCounts(startStr, endStr, selectedCampusId || undefined);
  };

  const handleAutoReschedule = async () => {
    if (!selectedDate || !selectedCampusId) return;
    try {
      setRescheduleError(null); await handleSaveChecklist();
      const unfinishedIds = getDateAppointments(selectedDate).filter(apt => !completedIds.has(apt.id) && apt.status !== 'cancelled').map(apt => apt.id);
      if (unfinishedIds.length === 0) { setRescheduleError('No appointments to reschedule.'); return; }
      await rescheduleDate(formatLocalDate(selectedDate), unfinishedIds, selectedCampusId);
      setRescheduleSuccess(true); await refreshData();
      setTimeout(() => { setShowModal(false); setRescheduleSuccess(false); setSelectedDate(null); }, 2000);
    } catch (error) { console.error('Error:', error); setRescheduleError('Failed to reschedule.'); }
  };

  const handleManualReschedule = async () => {
    if (!selectedDate || !selectedCampusId) return;
    try {
      setRescheduleError(null); await handleSaveChecklist();
      const unfinished = getDateAppointments(selectedDate).filter(apt => !completedIds.has(apt.id) && apt.status !== 'cancelled');
      if (unfinished.length === 0) { setRescheduleError('No appointments to reschedule.'); return; }
      const missing = unfinished.filter(apt => !manualTargetDates[apt.id]);
      if (missing.length > 0) { setRescheduleError(`Please select a date for all ${missing.length} uncompleted appointment(s).`); return; }
      for (const apt of unfinished) {
        const targetDate = manualTargetDates[apt.id];
        if (targetDate) { const { error } = await supabase.from('appointments').update({ appointment_date: targetDate, status: 'scheduled' }).eq('id', apt.id); if (error) throw error; }
      }
      setRescheduleSuccess(true); await refreshData();
      setTimeout(() => { setShowModal(false); setRescheduleSuccess(false); setSelectedDate(null); }, 2000);
    } catch (error) { console.error('Error:', error); setRescheduleError('Failed to reschedule.'); }
  };

  // ── Walk-in ──
  const handleWalkInBook = async () => {
    if (!selectedDate || !walkInCampus) return;
    if (!walkInName.trim()) { setWalkInError('Please enter patient name.'); return; }
    if (!walkInContact.trim()) { setWalkInError('Please enter contact number.'); return; }
    const dateStr = formatLocalDate(selectedDate);
    const currentCount = bookingCounts[dateStr] || 0;
    if (currentCount >= maxBookingsPerDay) { setWalkInError('This date is fully booked.'); return; }
    try {
      setWalkInError(null);
      const dept = departments.find(d => d.id === walkInDepartment);
      await createAppointment({
        patient_id: '00000000-0000-0000-0000-000000000000',
        campus_id: walkInCampus, appointment_type: walkInType, appointment_date: dateStr,
        start_time: '08:00', end_time: '17:00', status: 'scheduled',
        notes: `Walk-in${dept ? ` | Department: ${dept.name}` : ''}${walkInNotes ? `\n${walkInNotes}` : ''}`,
        patient_name: walkInName.trim(), patient_phone: walkInContact.trim(),
      });
      setWalkInSuccess(true); await refreshData();
      setTimeout(() => { setShowModal(false); setWalkInSuccess(false); setSelectedDate(null); }, 2000);
    } catch (error) { console.error('Error:', error); setWalkInError('Failed to book walk-in appointment.'); }
  };

  const closeModal = () => {
    setShowModal(false); setSelectedDate(null);
    setRescheduleError(null); setRescheduleSuccess(false);
    setManualTargetDates({}); setWalkInSuccess(false); setWalkInError(null);
    setDaySettingsSaved(false);
  };

  // ── Day Settings handlers ──
  const handleSaveDaySettings = async () => {
    if (!selectedDate || !selectedCampusId) return;
    setSavingDaySettings(true);
    const dateStr = formatLocalDate(selectedDate);
    try {
      const payload = { campus_id: selectedCampusId, override_date: dateStr, max_bookings: dayMaxBookings, is_closed: dayIsClosed, notes: dayNotes };
      if (dayOverride?.id) {
        await supabase.from('day_overrides').update(payload).eq('id', dayOverride.id);
      } else {
        const { data } = await supabase.from('day_overrides').upsert(payload, { onConflict: 'campus_id,override_date' }).select().single();
        if (data) setDayOverride(data);
      }
      setDayOverrides(prev => ({ ...prev, [dateStr]: { ...payload, id: dayOverride?.id } }));
      setDaySettingsSaved(true);
      setTimeout(() => setDaySettingsSaved(false), 3000);
      await refreshData();
    } catch (error) { console.error('Error saving day settings:', error); }
    setSavingDaySettings(false);
  };

  const handleRemoveDayOverride = async () => {
    if (!selectedDate || !dayOverride?.id) return;
    setRemovingDayOverride(true);
    const dateStr = formatLocalDate(selectedDate);
    try {
      await supabase.from('day_overrides').delete().eq('id', dayOverride.id);
      setDayOverride(null);
      setDayMaxBookings(maxBookingsPerDay);
      setDayIsClosed(false);
      setDayNotes('');
      setDayOverrides(prev => { const next = { ...prev }; delete next[dateStr]; return next; });
      setDaySettingsSaved(true);
      setTimeout(() => setDaySettingsSaved(false), 3000);
      await refreshData();
    } catch (error) { console.error('Error removing override:', error); }
    setRemovingDayOverride(false);
  };

  const manualTargetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.values(manualTargetDates).forEach(d => { if (d) counts[d] = (counts[d] || 0) + 1; });
    return counts;
  }, [manualTargetDates]);

  const renderTemplateVars = (text: string) =>
    text
      .replace(/\{\{name\}\}/g, '<span class="template-var" contenteditable="false" style="background-color:#f3f4f6;color:#9ca3af;padding:2px 4px;border-radius:4px;user-select:none;cursor:not-allowed;">{{name}}</span>')
      .replace(/\{\{date\}\}/g, '<span class="template-var" contenteditable="false" style="background-color:#f3f4f6;color:#9ca3af;padding:2px 4px;border-radius:4px;user-select:none;cursor:not-allowed;">{{date}}</span>')
      .replace(/\{\{type\}\}/g, '<span class="template-var" contenteditable="false" style="background-color:#f3f4f6;color:#9ca3af;padding:2px 4px;border-radius:4px;user-select:none;cursor:not-allowed;">{{type}}</span>');

  const preventTemplateVarDeletion = (e: React.KeyboardEvent) => {
    const selection = window.getSelection();
    if (selection && (e.key === 'Backspace' || e.key === 'Delete')) {
      const range = selection.getRangeAt(0);
      const node = range.startContainer.parentElement;
      if (node?.classList.contains('template-var')) e.preventDefault();
    }
  };

  // ── RENDER ──
  return (
    <SidebarLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600 text-sm">View and manage clinic schedule</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCampusId || ''}
            onChange={(e) => setSelectedCampus(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
          >
            <option value="">All Campuses</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Max bookings editor */}
          {selectedCampusId && (
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 hidden sm:inline">Max/day:</span>
              {editingMaxBookings ? (
                <div className="flex items-center gap-1">
                  <input type="number" min={1} max={500} value={tempMaxBookings}
                    onChange={(e) => setTempMaxBookings(parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-maroon-500 outline-none" />
                  <button onClick={handleSaveMaxBookings} disabled={savingMaxBookings} className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingMaxBookings(false); setTempMaxBookings(maxBookingsPerDay); }} className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors text-xs">✕</button>
                </div>
              ) : (
                <button onClick={() => setEditingMaxBookings(true)} className="font-semibold text-maroon-800 hover:underline text-sm">{maxBookingsPerDay}</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-maroon-800 text-white p-3 flex items-center justify-between">
          <button onClick={() => paginate(-1)} className="p-2 hover:bg-maroon-700 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <button onClick={() => paginate(1)} className="p-2 hover:bg-maroon-700 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs sm:text-sm font-medium text-gray-600">{day}</div>
          ))}
        </div>

        <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div key={currentMonth.toString()} custom={direction} variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
              className="absolute inset-0 grid grid-cols-7 auto-rows-fr"
            >
              {calendarDays.map((day, idx) => {
                const count = getBookingCount(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
                const dateStr = formatLocalDate(day);
                const dayMax = getMaxForDate(dateStr);
                const override = dayOverrides[dateStr];
                const isClosed = override?.is_closed || false;
                const full = count >= dayMax && dayMax > 0;
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const isPast = isBefore(day, today);

                return (
                  <button key={idx} onClick={() => isCurrentMonth && handleDateClick(day)} disabled={!isCurrentMonth}
                    className={`flex flex-col items-center justify-center p-1 border-b border-r border-gray-100 transition-all duration-200 cursor-pointer
                      ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-maroon-50'}
                      ${(day.getDay() === 0 || day.getDay() === 6) ? 'bg-gray-50' : 'bg-white'}
                      ${isClosed && isCurrentMonth ? 'bg-gray-100' : ''}
                      ${full && isCurrentMonth && isWeekday && !isPast && !isClosed ? 'bg-red-50' : ''}
                      ${override && !isClosed && isCurrentMonth ? 'bg-amber-50/50' : ''}`}
                  >
                    <span className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-sm sm:text-lg font-medium
                      ${isToday(day) ? 'bg-maroon-800 text-white' : ''} ${!isCurrentMonth ? 'text-gray-300' : ''}
                      ${isClosed && isCurrentMonth ? 'line-through text-gray-400' : ''}
                      ${count > 0 && !isToday(day) && isCurrentMonth && !isClosed ? 'ring-2 ring-maroon-300' : ''}`}
                    >{format(day, 'd')}</span>
                    {isCurrentMonth && isWeekday && (
                      isClosed ? (
                        <span className="mt-0.5 text-[10px] font-medium text-gray-400">Closed</span>
                      ) : (
                        <span className={`mt-0.5 text-[10px] font-medium ${full ? 'text-red-500' : count > 0 ? 'text-maroon-600' : 'text-gray-400'} ${override ? 'underline decoration-amber-400' : ''}`}>
                          {count}/{dayMax}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="p-3 border-t bg-gray-50 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-maroon-800 rounded-full shadow-sm"></span><span className="text-gray-700 font-medium">Today</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 ring-2 ring-maroon-300 rounded-full shadow-sm"></span><span className="text-gray-700 font-medium">Has bookings</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-200 rounded shadow-sm"></span><span className="text-gray-700 font-medium">Fully booked</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-200 rounded shadow-sm"></span><span className="text-gray-700 font-medium">Weekend</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-300 rounded shadow-sm line-through text-[6px] text-gray-500 flex items-center justify-center">x</span><span className="text-gray-700 font-medium">Closed</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-100 border border-amber-300 rounded shadow-sm"></span><span className="text-gray-700 font-medium">Custom slots</span></div>
        </div>
      </div>

      {/* Email Template Editor */}
      <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
        <button onClick={() => setShowTemplateEditor(!showTemplateEditor)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-maroon-700" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Email Reminder Template</h3>
              <p className="text-xs sm:text-sm text-gray-500">Customize the message sent to patients</p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showTemplateEditor ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {showTemplateEditor && (
            <motion.div ref={templateEditorRef} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="border-t p-4 sm:p-6 space-y-5 bg-gray-50/50">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Subject Line</label>
                  <div contentEditable suppressContentEditableWarning
                    onInput={(e) => setTemplateSubject(e.currentTarget.textContent || '')}
                    onKeyDown={(e) => { preventTemplateVarDeletion(e); if (e.key === 'Enter') e.preventDefault(); }}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-all shadow-sm hover:border-maroon-200"
                    dangerouslySetInnerHTML={{ __html: renderTemplateVars(templateSubject) }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message Body</label>
                  <div className="relative">
                    <div contentEditable suppressContentEditableWarning
                      onInput={(e) => setTemplateBody(e.currentTarget.textContent || '')}
                      onKeyDown={preventTemplateVarDeletion}
                      className="w-full min-h-[200px] px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm resize-y transition-all shadow-sm hover:border-maroon-200 font-mono whitespace-pre-wrap"
                      style={{ overflowY: 'auto' }}
                      dangerouslySetInnerHTML={{ __html: renderTemplateVars(templateBody) }}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">Markdown supported</div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={handleSaveTemplate} disabled={savingTemplate}
                    className="px-6 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-sm min-w-[140px]">
                    {savingTemplate ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>) :
                      templateSaved ? (<><Check className="w-4 h-4" />Saved!</>) : (<><Save className="w-4 h-4" />Save Template</>)}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── UNIFIED MODAL ── */}
      <AnimatePresence>
        {showModal && selectedDate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] sm:h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-maroon-800 flex items-center justify-between bg-maroon-900 text-white">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-bold truncate">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h3>
                  <p className="text-xs sm:text-sm text-maroon-100 mt-0.5 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />{scheduledAppointments.length} appointment{scheduledAppointments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-maroon-800 rounded-full transition-colors text-maroon-100 hover:text-white flex-shrink-0">✕</button>
              </div>

              {/* Modal Tabs */}
              {!rescheduleSuccess && !walkInSuccess && (
                <div className="flex border-b border-gray-200 px-4 sm:px-6 bg-white shrink-0 overflow-x-auto">
                  {([
                    { key: 'appointments' as ModalTab, icon: Calendar, label: 'Appointments' },
                    { key: 'reschedule' as ModalTab, icon: RefreshCw, label: 'Reschedule' },
                    { key: 'walkin' as ModalTab, icon: UserPlus, label: 'Walk-in' },
                    { key: 'daysettings' as ModalTab, icon: SlidersHorizontal, label: 'Day Settings' },
                  ]).map(tab => (
                    <button key={tab.key} onClick={() => setModalTab(tab.key)}
                      className={`pb-3 pt-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${modalTab === tab.key ? 'border-maroon-800 text-maroon-800' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                      <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Modal Content */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                {/* Success state */}
                {(rescheduleSuccess || walkInSuccess) ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="w-8 h-8 text-green-600" /></div>
                    <h4 className="text-xl font-bold text-gray-900 mb-2">{walkInSuccess ? 'Walk-in Booked!' : 'Reschedule Complete!'}</h4>
                    <p className="text-gray-600 max-w-md mx-auto text-sm">
                      {walkInSuccess ? 'The walk-in appointment has been successfully created.' :
                        rescheduleMode === 'auto' ? 'Unmarked appointments have been automatically distributed.' : 'Appointments have been moved to their new dates.'}
                    </p>
                  </div>

                  /* ── Appointments Tab ── */
                ) : modalTab === 'appointments' ? (
                  <>
                    {selectedDateAppointments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500"><Users className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No appointments on this date</p></div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDateAppointments.map(apt => (
                          <div key={apt.id} className={`p-3 rounded-lg border-l-4 ${apt.status === 'completed' ? 'bg-green-50 border-green-500' : apt.status === 'cancelled' ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-maroon-600'}`}>
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900 text-sm">{apt.patient_name || 'Unknown Patient'}</p>
                              <span className={`text-xs px-2 py-0.5 rounded font-medium ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{apt.status}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs px-1.5 py-0.5 bg-maroon-100 text-maroon-700 rounded capitalize">{apt.appointment_type.replace('_', ' ')}</span>
                              {apt.patient_email && <span className="text-xs text-gray-400">{apt.patient_email}</span>}
                              {apt.patient_phone && <span className="text-xs text-gray-400">{apt.patient_phone}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>

                  /* ── Walk-in Tab ── */
                ) : modalTab === 'walkin' ? (
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {APPOINTMENT_TYPES.map(type => (
                          <button key={type.value} onClick={() => setWalkInType(type.value as AppointmentType)}
                            className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${walkInType === type.value ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500'}`}>
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input type="text" value={walkInName} onChange={(e) => setWalkInName(e.target.value)} placeholder="Enter patient name"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                      <input type="tel" value={walkInContact} onChange={(e) => setWalkInContact(e.target.value)} placeholder="Enter contact number"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <select value={walkInDepartment} onChange={(e) => setWalkInDepartment(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm">
                        <option value="">Select Department</option>
                        {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                      <select value={walkInCampus} onChange={(e) => setWalkInCampus(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm">
                        {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                      <textarea value={walkInNotes} onChange={(e) => setWalkInNotes(e.target.value)} placeholder="Any additional information..."
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none text-sm" rows={3} />
                    </div>
                    {walkInError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p className="text-sm">{walkInError}</p></div>
                    )}
                    <button onClick={handleWalkInBook} disabled={isSaving}
                      className="w-full py-3 px-4 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.99] flex items-center justify-center gap-2">
                      {isSaving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Booking...</>) : (<><UserPlus className="w-4 h-4" />Book Walk-in Appointment</>)}
                    </button>
                  </div>

                  /* ── Reschedule Tab ── */
                ) : modalTab === 'daysettings' ? (
                  <div className="max-w-lg mx-auto space-y-6">
                    {/* Closed toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm">Close this day</h4>
                        <p className="text-xs text-gray-500 mt-0.5">No bookings will be allowed</p>
                      </div>
                      <button onClick={() => setDayIsClosed(!dayIsClosed)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:ring-2 focus:ring-maroon-500 focus:ring-offset-2 ${dayIsClosed ? 'bg-red-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${dayIsClosed ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {/* Max slots */}
                    {!dayIsClosed && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-gray-700">Max Slots for This Day</label>
                          <span className="text-xs text-gray-500">Global default: {maxBookingsPerDay}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <input type="range" min={1} max={200} value={dayMaxBookings}
                            onChange={(e) => setDayMaxBookings(parseInt(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-maroon-800" />
                          <input type="number" min={1} max={500} value={dayMaxBookings}
                            onChange={(e) => setDayMaxBookings(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold text-maroon-800 focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none" />
                        </div>
                        <div className="flex gap-2">
                          {[10, 25, 50, 75, 100].map(v => (
                            <button key={v} onClick={() => setDayMaxBookings(v)}
                              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${dayMaxBookings === v ? 'bg-maroon-800 text-white border-maroon-800' : 'bg-white text-gray-600 border-gray-300 hover:border-maroon-400'}`}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                      <textarea value={dayNotes} onChange={(e) => setDayNotes(e.target.value)}
                        placeholder="e.g. Special event, limited staffing..."
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none text-sm" rows={3} />
                    </div>

                    {/* Current status info */}
                    {dayOverride && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          This day has a custom override active
                          {dayOverride.notes && <span className="text-amber-600"> — {dayOverride.notes}</span>}
                        </p>
                      </div>
                    )}

                    {daySettingsSaved && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                        <Check className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">Settings saved successfully!</p>
                      </div>
                    )}
                  </div>

                  /* ── Reschedule Tab ── */
                ) : (
                  <>
                    {/* Auto / Manual toggle */}
                    <div className="flex items-center gap-2 mb-4">
                      <button onClick={() => setRescheduleMode('auto')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${rescheduleMode === 'auto' ? 'bg-maroon-800 text-white border-maroon-800' : 'bg-white text-gray-600 border-gray-300 hover:border-maroon-400'}`}>
                        Auto Spread
                      </button>
                      <button onClick={() => setRescheduleMode('manual')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${rescheduleMode === 'manual' ? 'bg-maroon-800 text-white border-maroon-800' : 'bg-white text-gray-600 border-gray-300 hover:border-maroon-400'}`}>
                        Manual Pick
                      </button>
                    </div>

                    {scheduledAppointments.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-white"><Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500 font-medium">No active appointments for this date</p></div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            Appointment List <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs normal-case">{scheduledAppointments.length}</span>
                          </h4>
                          <div className="flex gap-2">
                            <button onClick={() => setCompletedIds(new Set(scheduledAppointments.map(a => a.id)))}
                              className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-maroon-700 rounded-md hover:bg-maroon-50 hover:border-maroon-200 transition-all font-medium shadow-sm flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5" />Mark All
                            </button>
                            <button onClick={() => setCompletedIds(new Set())}
                              className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all font-medium shadow-sm">
                              Unmark All
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                          {scheduledAppointments.map(apt => {
                            const isChecked = completedIds.has(apt.id);
                            const targetDate = manualTargetDates[apt.id] || '';
                            const targetCount = targetDate ? (getBookingCountStr(targetDate) + (manualTargetCounts[targetDate] || 0)) : 0;
                            const overLimit = targetDate && targetCount > maxBookingsPerDay;

                            return (
                              <div key={apt.id} onClick={() => toggleCompleted(apt.id)}
                                className={`group relative rounded-xl border transition-all duration-200 flex flex-col overflow-hidden cursor-pointer select-none ${isChecked ? 'bg-green-50/30 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:border-maroon-300 hover:shadow-md'}`}>
                                <div className="p-3 flex flex-col h-full relative">
                                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 z-10 ${isChecked ? 'bg-green-500 border-green-500 text-white scale-110 shadow-sm' : 'border-gray-200 text-transparent group-hover:border-maroon-300'}`}>
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                  </div>
                                  <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-2 pt-1 pb-1">
                                    <h4 className={`text-sm sm:text-base font-bold truncate leading-tight transition-colors w-full mb-1 ${isChecked ? 'text-green-800' : 'text-gray-900'}`} title={apt.patient_name}>
                                      {apt.patient_name || 'Unknown Patient'}
                                    </h4>
                                    <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500 font-medium tracking-wide uppercase flex-wrap">
                                      {apt.patient_phone && (<><div className="flex items-center gap-1"><Users className="w-3 h-3 text-gray-400" /><span>{apt.patient_phone}</span></div><span className="text-gray-300">•</span></>)}
                                      <span className={isChecked ? 'opacity-75' : ''}>{apt.appointment_type.replace(/_/g, ' ')}</span>
                                    </div>
                                  </div>
                                  {(!isChecked && rescheduleMode === 'manual') && (
                                    <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-center w-full">
                                      <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-2 w-full">
                                        <div className="flex items-center justify-between mb-1">
                                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" />New Date</label>
                                          {targetDate && (<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${overLimit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{targetCount}/{maxBookingsPerDay} slots</span>)}
                                        </div>
                                        <input type="date" value={targetDate} onChange={(e) => setManualTargetDates(prev => ({ ...prev, [apt.id]: e.target.value }))}
                                          className={`w-full px-2 py-1 bg-white border rounded text-xs focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all ${!targetDate ? 'border-maroon-200 ring-2 ring-maroon-50' : 'border-gray-200'}`} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {rescheduleError && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl mt-4">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /><p className="text-sm font-medium">{rescheduleError}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              {!rescheduleSuccess && !walkInSuccess && (
                <div className="flex-shrink-0 p-4 sm:p-5 border-t border-gray-200 bg-white">
                  {modalTab === 'appointments' && selectedDateAppointments.filter(a => a.status === 'scheduled').length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <p className="text-sm text-gray-500">{selectedDateAppointments.filter(a => a.status === 'scheduled' && a.patient_email).length} with email</p>
                      <button onClick={handleSendReminders} disabled={isSendingReminders}
                        className="px-4 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm w-full sm:w-auto justify-center">
                        {isSendingReminders ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>) :
                          remindersSent ? (<><Check className="w-4 h-4" />Sent!</>) : (<><Mail className="w-4 h-4" />Send Reminders</>)}
                      </button>
                    </div>
                  )}
                  {modalTab === 'reschedule' && scheduledAppointments.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <button onClick={handleSaveChecklist} disabled={isSaving}
                        className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm shadow-sm active:scale-[0.98] w-full sm:w-auto">
                        Save Status Only
                      </button>
                      <button onClick={rescheduleMode === 'auto' ? handleAutoReschedule : handleManualReschedule}
                        disabled={isSaving || unfinishedCount === 0}
                        className="px-6 py-2.5 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center gap-2.5 w-full sm:w-auto justify-center">
                        {isSaving ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span className="font-semibold">Processing...</span></>) : (
                          <><RefreshCw className={`w-4 h-4 ${rescheduleMode === 'auto' ? '' : 'rotate-90'}`} />
                            <span className="font-semibold">{rescheduleMode === 'auto' ? `Auto Spread (${unfinishedCount})` : `Move Selection (${unfinishedCount})`}</span></>
                        )}
                      </button>
                    </div>
                  )}
                  {modalTab === 'daysettings' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      {dayOverride && (
                        <button onClick={handleRemoveDayOverride} disabled={removingDayOverride}
                          className="px-4 py-2.5 bg-white border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 hover:border-red-400 transition-all text-sm shadow-sm active:scale-[0.98] w-full sm:w-auto flex items-center justify-center gap-2">
                          {removingDayOverride ? 'Removing...' : 'Remove Override'}
                        </button>
                      )}
                      <button onClick={handleSaveDaySettings} disabled={savingDaySettings}
                        className="px-6 py-2.5 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center gap-2 w-full sm:w-auto justify-center ml-auto">
                        {savingDaySettings ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>) :
                          daySettingsSaved ? (<><Check className="w-4 h-4" />Saved!</>) : (<><Save className="w-4 h-4" />Save Day Settings</>)}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarLayout>
  );
}
