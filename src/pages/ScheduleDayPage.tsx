import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import {
  ArrowLeft, Calendar, RefreshCw, UserPlus, SlidersHorizontal,
  Users, Check, Mail, AlertCircle, Save, Sun, Moon, ChevronDown, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';
import { sendBulkReminders, sendBookingConfirmation } from '~/lib/email';
import { supabase } from '~/lib/supabase';
import { SearchableSelect } from '~/components/ui';
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
    departments, fetchCampuses, fetchDepartments,
    fetchBookingSetting, bookingSetting,
    fetchDayOverrides, dayOverrides,
    scheduleConfig, fetchScheduleConfig, updateScheduleConfig,
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

  // ── Appointments Kanban (AM/PM) ──
  const [draggedAptId, setDraggedAptId] = useState<string | null>(null);
  const [dragOverAptColumn, setDragOverAptColumn] = useState<'am' | 'pm' | null>(null);
  const [savingAptKanban, setSavingAptKanban] = useState<Set<string>>(new Set());

  // ── Patient Avatars ──
  const [patientAvatars, setPatientAvatars] = useState<Record<string, string>>({});

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

  // ── Appointments Kanban AM/PM handlers ──
  const handleDropToAM = async (id: string) => {
    const apt = appointments.find(a => a.id === id);
    if (!apt || apt.time_of_day === 'AM') return;
    setSavingAptKanban(prev => new Set([...prev, id]));
    try {
      await updateAppointment(id, { time_of_day: 'AM', start_time: '08:00', end_time: '12:00' });
    } catch (err) {
      console.error('Failed to move to AM:', err);
    } finally {
      setSavingAptKanban(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const handleDropToPM = async (id: string) => {
    const apt = appointments.find(a => a.id === id);
    if (!apt || apt.time_of_day === 'PM') return;
    setSavingAptKanban(prev => new Set([...prev, id]));
    try {
      await updateAppointment(id, { time_of_day: 'PM', start_time: '13:00', end_time: '17:00' });
    } catch (err) {
      console.error('Failed to move to PM:', err);
    } finally {
      setSavingAptKanban(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  // ── Email reminders ──
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [sendingTimeOfDay, setSendingTimeOfDay] = useState<'AM' | 'PM' | 'ALL' | null>(null);
  const [lastSentTimeOfDay, setLastSentTimeOfDay] = useState<'AM' | 'PM' | 'ALL' | null>(null);
  const [remindersSent, setRemindersSent] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  // Pre-send confirmation modal
  const [reminderModal, setReminderModal] = useState<{ timeOfDay: 'AM' | 'PM'; sessionStart: string; sessionEnd: string } | null>(null);

  // ── Custom email template ──
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [customSubject, setCustomSubject] = useState('Appointment Reminder – {{date}} | LDCU Clinic');
  const customBodyRef = useRef<HTMLTextAreaElement>(null);
  const [customBody, setCustomBody] = useState(
    'Hello {{name}},\n\nThis is a reminder about your upcoming appointment at the LDCU University Clinic.\n\nDate: {{date}}\nType: {{type}}\nSchedule: {{schedule}}\n\nPlease arrive 10–15 minutes before your scheduled time and bring a valid ID.\n\nThank you!'
  );
  const [templateSaveStatus, setTemplateSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const templateSaveTimerRef = useRef<number | null>(null);
  const templateStorageKey = useMemo(
    () => (campusId ? `ldcuclinic:email-reminder-template:${campusId}` : null),
    [campusId],
  );

  // Load saved template draft (per campus)
  useEffect(() => {
    if (!templateStorageKey) return;
    try {
      const raw = localStorage.getItem(templateStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { subject?: string; body?: string } | null;
      if (!parsed) return;
      if (typeof parsed.subject === 'string' && parsed.subject.trim()) setCustomSubject(parsed.subject);
      if (typeof parsed.body === 'string' && parsed.body.trim()) setCustomBody(parsed.body);
      setTemplateSaveStatus('saved');
    } catch {
      // ignore malformed storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateStorageKey]);

  // Auto-save template draft (Google Docs style)
  useEffect(() => {
    if (!templateStorageKey) return;
    setTemplateSaveStatus('saving');
    if (templateSaveTimerRef.current) globalThis.clearTimeout(templateSaveTimerRef.current);
    templateSaveTimerRef.current = globalThis.setTimeout(() => {
      try {
        localStorage.setItem(templateStorageKey, JSON.stringify({ subject: customSubject, body: customBody }));
        setTemplateSaveStatus('saved');
      } catch {
        setTemplateSaveStatus('error');
      }
    }, 600);

    return () => {
      if (templateSaveTimerRef.current) globalThis.clearTimeout(templateSaveTimerRef.current);
    };
  }, [templateStorageKey, customSubject, customBody]);

  // ── Walk-in ──
  const [walkInType, setWalkInType] = useState<AppointmentType>('consultation');
  const [walkInName, setWalkInName] = useState('');
  const [walkInContact, setWalkInContact] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInEmailDetecting, setWalkInEmailDetecting] = useState(false);
  const [walkInDepartment, setWalkInDepartment] = useState('');
  const [walkInNotes, setWalkInNotes] = useState('');
  const [walkInRole, setWalkInRole] = useState<'student' | 'staff'>('student');
  const [walkInTimeOfDay, setWalkInTimeOfDay] = useState<'AM' | 'PM'>('AM');
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [walkInSuccess, setWalkInSuccess] = useState(false);

  // ── Day Settings ──
  const [dayOverride, setDayOverride] = useState<DayOverride | null>(null);
  const [dayMaxBookings, setDayMaxBookings] = useState(50);
  const [dayMaxAmBookings, setDayMaxAmBookings] = useState<number | null>(null);
  const [dayMaxPmBookings, setDayMaxPmBookings] = useState<number | null>(null);
  const [customizeAmPm, setCustomizeAmPm] = useState(false);
  const [dayIsClosed, setDayIsClosed] = useState(false);
  const [dayNotes, setDayNotes] = useState('');
  const [savingDaySettings, setSavingDaySettings] = useState(false);
  const [daySettingsSaved, setDaySettingsSaved] = useState(false);
  const [removingDayOverride, setRemovingDayOverride] = useState(false);

  // ── Holiday ──
  const isHoliday = !!(scheduleConfig?.holiday_dates ?? []).includes(dateStr);
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);
  const [holidaySaved, setHolidaySaved] = useState(false);

  // PH holidays are auto-synced via the schedule store — no local state needed

  // ── Reference month for data range (centre on selected date's month) ──
  const refMonth = selectedDate ?? new Date();

  // ── Data loading ──
  useEffect(() => {
    fetchCampuses();
    // Fetch ALL departments (no campus filter)
    fetchDepartments();
    if (campusId) {
      fetchBookingSetting(campusId);
      fetchScheduleConfig(campusId);
    }
  }, [campusId, fetchCampuses, fetchBookingSetting, fetchDepartments, fetchScheduleConfig]);

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
      // Load AM/PM customization if it exists
      if (existing.max_am_bookings !== null && existing.max_am_bookings !== undefined) {
        setCustomizeAmPm(true);
        setDayMaxAmBookings(existing.max_am_bookings);
        setDayMaxPmBookings(existing.max_pm_bookings || 0);
      } else {
        setCustomizeAmPm(false);
        setDayMaxAmBookings(null);
        setDayMaxPmBookings(null);
      }
    } else {
      setDayOverride(null);
      setDayMaxBookings(maxBookingsPerDay);
      setDayIsClosed(false);
      setDayNotes('');
      setCustomizeAmPm(false);
      setDayMaxAmBookings(null);
      setDayMaxPmBookings(null);
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

  // Fetch patient avatars for appointments with a patient_id
  useEffect(() => {
    const ids = appointments
      .filter(a => a.appointment_date === dateStr && a.patient_id)
      .map(a => a.patient_id as string);
    if (ids.length === 0) return;
    const uniqueIds = [...new Set(ids)];
    supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', uniqueIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach(p => { if (p.avatar_url) map[p.id] = p.avatar_url; });
        setPatientAvatars(map);
      });
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

  const handleSendReminders = async (timeOfDay?: 'AM' | 'PM', overrideStartTime?: string, overrideEndTime?: string) => {
    if (!campusId) return;
    setReminderModal(null);
    setIsSendingReminders(true);
    setSendingTimeOfDay(timeOfDay ?? 'ALL');
    const template = customSubject.trim() && customBody.trim()
      ? { subject: customSubject.trim(), body: customBody.trim() }
      : undefined;
    try {
      const result = await sendBulkReminders(dateStr, campusId, template, timeOfDay, overrideStartTime, overrideEndTime);
      const msg = result.sent > 0
        ? `Sent ${result.sent} reminder(s)!${result.skipped ? ` (${result.skipped} skipped)` : ''}${result.failed ? ` (${result.failed} failed)` : ''}`
        : result.message || 'No reminders to send.';
      setToastMessage({ text: msg, type: result.sent > 0 ? 'success' : 'error' });
    } catch (e: any) { 
      setToastMessage({ text: `Failed: ${e.message || 'Unknown error'}`, type: 'error' });
    }
    setIsSendingReminders(false);
    setSendingTimeOfDay(null);
    setLastSentTimeOfDay(timeOfDay ?? 'ALL');
    setRemindersSent(true);
    setTimeout(() => {
      setRemindersSent(false);
      setToastMessage(null);
    }, 4000);
  };

  const handleWalkInBook = async () => {
    if (!campusId || !dateStr) return;
    if (!walkInName.trim()) { setWalkInError('Please enter patient name.'); return; }
    if (!walkInContact.trim() || walkInContact.trim().length !== 11) { setWalkInError('Please enter a valid 11-digit contact number.'); return; }
    if (!walkInEmail.trim()) { setWalkInError('Please enter email username.'); return; }
    
    // Construct full email with @liceo.edu.ph domain
    const fullEmail = `${walkInEmail.trim()}@liceo.edu.ph`;
    
    // Validate email format (should not contain @ since we're adding it)
    if (walkInEmail.includes('@')) { 
      setWalkInError('Please enter only your email username (without @liceo.edu.ph).'); 
      return; 
    }
    
    // Validate username format (alphanumeric, dots, underscores, hyphens)
    if (!/^[a-zA-Z0-9._-]+$/.test(walkInEmail.trim())) { 
      setWalkInError('Please enter a valid email username.'); 
      return; 
    }
    
    // Check for duplicate email with scheduled appointment
    try {
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, appointment_date, patient_name')
        .eq('patient_email', fullEmail)
        .eq('status', 'scheduled');
      
      if (checkError) throw checkError;
      
      if (existingAppointments && existingAppointments.length > 0) {
        const existingApt = existingAppointments[0];
        setWalkInError(`This email (${fullEmail}) already has a scheduled appointment on ${format(new Date(existingApt.appointment_date), 'MMMM d, yyyy')}. Please use a different email or cancel the existing appointment first.`);
        return;
      }
    } catch (err) {
      console.error('Error checking for duplicate email:', err);
      setWalkInError('Failed to verify email. Please try again.');
      return;
    }
    
    if ((bookingCounts[dateStr] || 0) >= maxBookingsPerDay) { setWalkInError('This date is fully booked.'); return; }
    
    try {
      setWalkInError(null);
      
      // Check if user exists in profiles table
      let patientId = null;
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', fullEmail)
        .maybeSingle();
      
      if (existingProfile) {
        patientId = existingProfile.id;
      }
      
      const dept = departments.find(d => d.id === walkInDepartment);
      await createAppointment({
        patient_id: patientId, // Link to profile if exists, otherwise null
        campus_id: campusId, appointment_type: walkInType, appointment_date: dateStr,
        start_time: walkInTimeOfDay === 'AM' ? '08:00' : '13:00',
        end_time: walkInTimeOfDay === 'AM' ? '12:00' : '17:00',
        status: 'scheduled',
        time_of_day: walkInTimeOfDay,
        notes: `Walk-in${dept ? ` | Department: ${dept.name}` : ''}${walkInNotes ? `\n${walkInNotes}` : ''}`,
        patient_name: walkInName.trim(), patient_phone: walkInContact.trim(), patient_email: fullEmail,
        booker_role: walkInRole,
      });
      
      // Send booking confirmation email
      try {
        await sendBookingConfirmation(
          fullEmail,
          walkInName.trim(),
          format(selectedDate!, 'MMMM d, yyyy'),
          walkInType.replace('_', ' ')
        );
      } catch (emailErr) {
        console.warn('Confirmation email failed (non-blocking):', emailErr);
      }
      
      setWalkInSuccess(true);
      await refreshData();
      setTimeout(() => { setWalkInSuccess(false); setWalkInName(''); setWalkInContact(''); setWalkInEmail(''); setWalkInNotes(''); }, 3000);
    } catch { setWalkInError('Failed to book walk-in appointment.'); }
  };

  // Auto-detect user name from email
  const handleEmailChange = async (emailUsername: string) => {
    // Remove @ and anything after it
    const cleanUsername = emailUsername.replace(/@.*$/, '');
    setWalkInEmail(cleanUsername);
  };

  // Debounced effect to fetch user data when email changes
  useEffect(() => {
    // If username is empty, don't fetch
    if (!walkInEmail.trim()) {
      setWalkInEmailDetecting(false);
      return;
    }
    
    setWalkInEmailDetecting(true);
    
    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      // Construct full email
      const fullEmail = `${walkInEmail.trim()}@liceo.edu.ph`;
      
      // Try to find existing user by email in profiles table
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, middle_name, last_name, contact_number, department_id')
          .eq('email', fullEmail)
          .maybeSingle();
        
        if (!error && profile) {
          // Auto-fill name from profile
          const fullName = `${profile.first_name || ''} ${profile.middle_name ? profile.middle_name + ' ' : ''}${profile.last_name || ''}`.trim();
          if (fullName) {
            setWalkInName(fullName);
          }
          // Auto-fill contact number if available
          if (profile.contact_number) {
            setWalkInContact(profile.contact_number);
          }
          // Auto-fill department if available
          if (profile.department_id) {
            setWalkInDepartment(profile.department_id);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setWalkInEmailDetecting(false);
      }
    }, 500); // Wait 500ms after user stops typing
    
    return () => {
      clearTimeout(timeoutId);
      setWalkInEmailDetecting(false);
    };
  }, [walkInEmail]);

  const handleSaveDaySettings = async () => {
    if (!campusId || !dateStr) return;
    setSavingDaySettings(true);
    try {
      const payload: any = { 
        campus_id: campusId, 
        override_date: dateStr, 
        max_bookings: dayMaxBookings, 
        is_closed: dayIsClosed, 
        notes: dayNotes,
        max_am_bookings: customizeAmPm ? dayMaxAmBookings : null,
        max_pm_bookings: customizeAmPm ? dayMaxPmBookings : null
      };
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

  // ── Holiday handlers ──
  const handleToggleHoliday = async () => {
    if (!campusId || !dateStr || !scheduleConfig) return;
    setIsSavingHoliday(true);
    try {
      const current = scheduleConfig.holiday_dates ?? [];
      const next = isHoliday
        ? current.filter((d) => d !== dateStr)
        : [...current, dateStr].sort();
      await updateScheduleConfig(campusId, {
        include_saturday: scheduleConfig.include_saturday,
        include_sunday: scheduleConfig.include_sunday,
        holiday_dates: next,
      });
      await fetchScheduleConfig(campusId);
      setHolidaySaved(true);
      setTimeout(() => setHolidaySaved(false), 3000);
    } catch (e) { console.error(e); }
    setIsSavingHoliday(false);
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
          <div className="p-4 sm:p-6 overflow-y-auto overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={(rescheduleSuccess || walkInSuccess) ? 'success' : activeTab}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
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
                    <div className="space-y-4">
                      {/* ── Kanban Board: Morning / Afternoon ── */}
                      <div className="flex flex-col md:flex-row gap-3" style={{ minHeight: 340 }}>

                        {/* ── Morning (AM) Column ── */}
                        {(() => {
                          const morningApts = allDateAppointments.filter(apt => apt.time_of_day === 'AM');
                          return (
                            <div
                              className={`flex-1 flex flex-col rounded-xl border-2 transition-colors duration-200 ${
                                dragOverAptColumn === 'am'
                                  ? 'border-amber-400 bg-amber-50/40'
                                  : 'border-dashed border-amber-200 bg-amber-50/20'
                              }`}
                              onDragOver={e => { e.preventDefault(); setDragOverAptColumn('am'); }}
                              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverAptColumn(null); }}
                              onDrop={e => { e.preventDefault(); if (draggedAptId) handleDropToAM(draggedAptId); setDragOverAptColumn(null); setDraggedAptId(null); }}
                            >
                              <div className="px-3 py-2 border-b border-amber-200 flex items-center gap-1.5">
                                <Sun className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Morning</span>
                                <span className="text-[10px] text-amber-500 font-medium ml-0.5">8:00 AM – 12:00 PM</span>
                                <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                                  {morningApts.length}
                                </span>
                              </div>
                              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[520px] content-start">
                                <AnimatePresence>
                                  {morningApts.map(apt => (
                                    <motion.div
                                      key={apt.id}
                                      layout
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      draggable
                                      onDragStart={() => setDraggedAptId(apt.id)}
                                      onDragEnd={() => setDraggedAptId(null)}
                                      className={`rounded-xl border overflow-hidden bg-white shadow-sm cursor-grab active:cursor-grabbing select-none transition-all duration-150 hover:shadow-md ${
                                        draggedAptId === apt.id ? 'opacity-40 scale-95' : ''
                                      } ${
                                        apt.status === 'completed' ? 'border-green-200' : apt.status === 'cancelled' ? 'border-red-200' : apt.booker_role === 'staff' ? 'border-amber-200' : 'border-gray-200'
                                      }`}
                                    >
                                      <div className={`px-3 py-2 flex items-start justify-between gap-2 ${apt.status === 'completed' ? 'bg-green-50' : apt.status === 'cancelled' ? 'bg-red-50' : apt.booker_role === 'staff' ? 'bg-amber-50' : 'bg-maroon-50'}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700">
                                            {apt.patient_id && patientAvatars[apt.patient_id] ? (
                                              <img src={patientAvatars[apt.patient_id]} alt={apt.patient_name || ''} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : (
                                              <span>{(apt.patient_name || '?')[0].toUpperCase()}</span>
                                            )}
                                          </div>
                                          <div className="min-w-0 flex flex-col gap-0.5">
                                            <p className="font-semibold text-gray-900 text-sm truncate capitalize">{apt.patient_name || 'Unknown Patient'}</p>
                                            {apt.patient_email && <span className="text-xs text-gray-500 truncate">{apt.patient_email}</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                          {savingAptKanban.has(apt.id)
                                            ? <span className="text-[9px] px-1.5 py-px bg-gray-100 text-gray-500 rounded-full font-bold flex items-center gap-0.5"><span className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />Moving</span>
                                            : <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{apt.status}</span>}
                                        </div>
                                      </div>
                                      <div className="px-3 py-2 flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Type</span>
                                            <span className="text-xs text-gray-700 font-medium capitalize">{apt.appointment_type.replace(/_/g, ' ')}</span>
                                          </div>
                                          <span className="text-gray-200">|</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Role</span>
                                            {apt.booker_role === 'staff' ? <span className="text-xs text-amber-700 font-medium">Staff</span> : <span className="text-xs text-blue-700 font-medium">Student</span>}
                                          </div>
                                        </div>
                                        {apt.patient_phone && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Phone</span>
                                            <span className="text-xs text-gray-600">{apt.patient_phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                                {morningApts.length === 0 && (
                                  <div className="col-span-2 flex flex-col items-center justify-center text-amber-400 text-xs py-8 gap-2">
                                    <Sun className="w-7 h-7 opacity-30" />
                                    <span>Drag cards here for Morning</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* ── Afternoon (PM) Column ── */}
                        {(() => {
                          const afternoonApts = allDateAppointments.filter(apt => apt.time_of_day === 'PM');
                          return (
                            <div
                              className={`flex-1 flex flex-col rounded-xl border-2 transition-colors duration-200 ${
                                dragOverAptColumn === 'pm'
                                  ? 'border-blue-400 bg-blue-50/40'
                                  : 'border-dashed border-blue-200 bg-blue-50/20'
                              }`}
                              onDragOver={e => { e.preventDefault(); setDragOverAptColumn('pm'); }}
                              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverAptColumn(null); }}
                              onDrop={e => { e.preventDefault(); if (draggedAptId) handleDropToPM(draggedAptId); setDragOverAptColumn(null); setDraggedAptId(null); }}
                            >
                              <div className="px-3 py-2 border-b border-blue-200 flex items-center gap-1.5">
                                <Moon className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Afternoon</span>
                                <span className="text-[10px] text-blue-500 font-medium ml-0.5">1:00 PM – 5:00 PM</span>
                                <span className="ml-auto px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                  {afternoonApts.length}
                                </span>
                              </div>
                              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[520px] content-start">
                                <AnimatePresence>
                                  {afternoonApts.map(apt => (
                                    <motion.div
                                      key={apt.id}
                                      layout
                                      initial={{ opacity: 0, scale: 0.95 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      draggable
                                      onDragStart={() => setDraggedAptId(apt.id)}
                                      onDragEnd={() => setDraggedAptId(null)}
                                      className={`rounded-xl border overflow-hidden bg-white shadow-sm cursor-grab active:cursor-grabbing select-none transition-all duration-150 hover:shadow-md ${
                                        draggedAptId === apt.id ? 'opacity-40 scale-95' : ''
                                      } ${
                                        apt.status === 'completed' ? 'border-green-200' : apt.status === 'cancelled' ? 'border-red-200' : apt.booker_role === 'staff' ? 'border-amber-200' : 'border-gray-200'
                                      }`}
                                    >
                                      <div className={`px-3 py-2 flex items-start justify-between gap-2 ${apt.status === 'completed' ? 'bg-green-50' : apt.status === 'cancelled' ? 'bg-red-50' : apt.booker_role === 'staff' ? 'bg-amber-50' : 'bg-maroon-50'}`}>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700">
                                            {apt.patient_id && patientAvatars[apt.patient_id] ? (
                                              <img src={patientAvatars[apt.patient_id]} alt={apt.patient_name || ''} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                            ) : (
                                              <span>{(apt.patient_name || '?')[0].toUpperCase()}</span>
                                            )}
                                          </div>
                                          <div className="min-w-0 flex flex-col gap-0.5">
                                            <p className="font-semibold text-gray-900 text-sm truncate capitalize">{apt.patient_name || 'Unknown Patient'}</p>
                                            {apt.patient_email && <span className="text-xs text-gray-500 truncate">{apt.patient_email}</span>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                          {savingAptKanban.has(apt.id)
                                            ? <span className="text-[9px] px-1.5 py-px bg-gray-100 text-gray-500 rounded-full font-bold flex items-center gap-0.5"><span className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />Moving</span>
                                            : <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{apt.status}</span>}
                                        </div>
                                      </div>
                                      <div className="px-3 py-2 flex flex-col gap-1">
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Type</span>
                                            <span className="text-xs text-gray-700 font-medium capitalize">{apt.appointment_type.replace(/_/g, ' ')}</span>
                                          </div>
                                          <span className="text-gray-200">|</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Role</span>
                                            {apt.booker_role === 'staff' ? <span className="text-xs text-amber-700 font-medium">Staff</span> : <span className="text-xs text-blue-700 font-medium">Student</span>}
                                          </div>
                                        </div>
                                        {apt.patient_phone && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Phone</span>
                                            <span className="text-xs text-gray-600">{apt.patient_phone}</span>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                                {afternoonApts.length === 0 && (
                                  <div className="col-span-2 flex flex-col items-center justify-center text-blue-400 text-xs py-8 gap-2">
                                    <Moon className="w-7 h-7 opacity-30" />
                                    <span>Drag cards here for Afternoon</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                      </div>

                      {/* ── Email Template Editor ── */}
                      {/* ── Email Template Editor (always active) ── */}
                      <div className="rounded-xl border border-gray-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowTemplateEditor(v => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-700">Email Reminder Template</span>
                            {showTemplateEditor && (
                              <>
                                <span className="text-gray-200">·</span>
                                {templateSaveStatus === 'saving' ? (
                                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Saving…
                                  </span>
                                ) : templateSaveStatus === 'saved' ? (
                                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                    Saved
                                  </span>
                                ) : templateSaveStatus === 'error' ? (
                                  <span className="flex items-center gap-1.5 text-xs text-red-500">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Not saved
                                  </span>
                                ) : null}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{showTemplateEditor ? 'Hide' : 'Edit'}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showTemplateEditor ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {showTemplateEditor && (
                          <div className="p-4 space-y-4 border-t border-gray-200">

                            {/* Subject */}
                            <div>
                              <label htmlFor="custom-subject" className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Subject</label>
                              {/* Mirror container — mirror div renders styled text, input captures keystrokes */}
                              <div className="relative h-10 w-full rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-maroon-500/20 focus-within:border-maroon-500 transition-all">
                                <div aria-hidden className="absolute inset-0 px-3 flex items-center text-sm overflow-hidden whitespace-nowrap pointer-events-none select-none">
                                  {customSubject.split(/({{[^}]+}})/g).map((part, i) =>
                                    /^{{[^}]+}}$/.test(part)
                                      // eslint-disable-next-line react/no-array-index-key
                                      ? <span key={`ph-${i}`} className="text-gray-400 font-mono">{part}</span>
                                      // eslint-disable-next-line react/no-array-index-key
                                      : <span key={`tx-${i}`} className="text-gray-800">{part}</span>
                                  )}
                                </div>
                                <input
                                  id="custom-subject"
                                  type="text"
                                  value={customSubject}
                                  onChange={e => setCustomSubject(e.target.value)}
                                  className="absolute inset-0 w-full h-full px-3 bg-transparent outline-none text-transparent text-sm leading-10 py-0"
                                  style={{ caretColor: '#111827' }}
                                  spellCheck={false}
                                />
                              </div>
                            </div>

                            {/* Body */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label htmlFor="custom-body" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Body</label>
                                <button
                                  type="button"
                                  onClick={() => setShowResetConfirm(true)}
                                  className="text-[11px] text-gray-400 hover:text-maroon-700 transition-colors flex items-center gap-1 flex-shrink-0"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  Reset to default
                                </button>
                              </div>
                              {/* Mirror container — mirror div drives height and renders styled text */}
                              <div className="relative w-full rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-maroon-500/20 focus-within:border-maroon-500 transition-all">
                                {/* In-flow mirror — drives container height */}
                                <div
                                  aria-hidden
                                  className="px-3 py-2 text-sm font-mono whitespace-pre-wrap break-words pointer-events-none select-none"
                                  style={{ minHeight: '7rem', wordBreak: 'break-word' }}
                                >
                                  {customBody.split(/({{[^}]+}})/g).map((part, i) =>
                                    /^{{[^}]+}}$/.test(part)
                                      // eslint-disable-next-line react/no-array-index-key
                                      ? <span key={`ph-${i}`} className="text-gray-400">{part}</span>
                                      // eslint-disable-next-line react/no-array-index-key
                                      : <span key={`tx-${i}`} className="text-gray-800">{part}</span>
                                  )}
                                  {'\u00a0'}
                                </div>
                                {/* Transparent textarea overlays mirror — captures all input */}
                                <textarea
                                  id="custom-body"
                                  ref={customBodyRef}
                                  value={customBody}
                                  onChange={e => setCustomBody(e.target.value)}
                                  className="absolute inset-0 w-full h-full px-3 py-2 text-sm font-mono bg-transparent resize-none outline-none"
                                  style={{ caretColor: '#111827', color: 'transparent' }}
                                  spellCheck={false}
                                />
                              </div>
                            </div>

                          </div>
                        )}
                      </div>

                      {/* Legacy appointments without time_of_day */}
                      {(() => {
                        const legacyApts = allDateAppointments.filter(apt => !apt.time_of_day);
                        return legacyApts.length > 0 && (
                          <div key="legacy" className="mt-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg font-semibold text-sm">Unassigned</div>
                              <span className="text-sm text-gray-500">{legacyApts.length} appointment{legacyApts.length !== 1 ? 's' : ''}</span>
                              <span className="text-xs text-gray-400 ml-1">Drag to Morning or Afternoon</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {legacyApts.map(apt => (
                                <motion.div
                                  key={apt.id}
                                  layout
                                  draggable
                                  onDragStart={() => setDraggedAptId(apt.id)}
                                  onDragEnd={() => setDraggedAptId(null)}
                                  className={`rounded-xl border overflow-hidden bg-white shadow-sm cursor-grab active:cursor-grabbing select-none transition-all duration-150 hover:shadow-md ${
                                    draggedAptId === apt.id ? 'opacity-40 scale-95' : ''
                                  } ${
                                    apt.status === 'completed' ? 'border-green-200' : apt.status === 'cancelled' ? 'border-red-200' : apt.booker_role === 'staff' ? 'border-amber-200' : 'border-gray-200'
                                  }`}
                                >
                                  <div className={`px-3 py-2 flex items-start justify-between gap-2 ${apt.status === 'completed' ? 'bg-green-50' : apt.status === 'cancelled' ? 'bg-red-50' : apt.booker_role === 'staff' ? 'bg-amber-50' : 'bg-maroon-50'}`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold bg-blue-100 text-blue-700">
                                        {apt.patient_id && patientAvatars[apt.patient_id] ? (
                                          <img src={patientAvatars[apt.patient_id]} alt={apt.patient_name || ''} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                          <span>{(apt.patient_name || '?')[0].toUpperCase()}</span>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex flex-col gap-0.5">
                                        <p className="font-semibold text-gray-900 text-sm truncate capitalize">{apt.patient_name || 'Unknown Patient'}</p>
                                        {apt.patient_email && <span className="text-xs text-gray-500 truncate">{apt.patient_email}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                                      {savingAptKanban.has(apt.id)
                                        ? <span className="text-[9px] px-1.5 py-px bg-gray-100 text-gray-500 rounded-full font-bold flex items-center gap-0.5"><span className="w-2 h-2 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />Moving</span>
                                        : <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold capitalize ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : apt.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{apt.status}</span>}
                                    </div>
                                  </div>
                                  <div className="px-3 py-2 flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Type</span>
                                        <span className="text-xs text-gray-700 font-medium capitalize">{apt.appointment_type.replace(/_/g, ' ')}</span>
                                      </div>
                                      <span className="text-gray-200">|</span>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Role</span>
                                        {apt.booker_role === 'staff' ? <span className="text-xs text-amber-700 font-medium">Staff</span> : <span className="text-xs text-blue-700 font-medium">Student</span>}
                                      </div>
                                    </div>
                                    {apt.patient_phone && (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide flex-shrink-0">Phone</span>
                                        <span className="text-xs text-gray-600">{apt.patient_phone}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
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
                                  <div className="px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-wide flex-shrink-0">Type</span>
                                      <span className="text-[10px] text-gray-700 font-medium capitalize truncate">{apt.appointment_type.replace(/_/g, ' ')}</span>
                                    </div>
                                    <span className="text-gray-200 text-[10px] flex-shrink-0">|</span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-wide">Role</span>
                                      {apt.booker_role === 'staff'
                                        ? <span className="text-[10px] text-amber-700 font-medium">Staff</span>
                                        : <span className="text-[10px] text-blue-700 font-medium">Student</span>}
                                    </div>
                                    {apt.time_of_day && (
                                      <>
                                        <span className="text-gray-200 text-[10px] flex-shrink-0">|</span>
                                        <span className={`text-[10px] font-bold flex-shrink-0 ${apt.time_of_day === 'AM' ? 'text-amber-600' : 'text-blue-600'}`}>
                                          {apt.time_of_day === 'AM' ? 'Morning' : 'Afternoon'}
                                        </span>
                                      </>
                                    )}
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
                                  <div className="px-2.5 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-wide flex-shrink-0">Type</span>
                                      <span className="text-[10px] text-gray-700 font-medium capitalize truncate">{apt.appointment_type.replace(/_/g, ' ')}</span>
                                    </div>
                                    <span className="text-gray-200 text-[10px] flex-shrink-0">|</span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span className="text-[9px] text-gray-400 uppercase tracking-wide">Role</span>
                                      {apt.booker_role === 'staff'
                                        ? <span className="text-[10px] text-amber-700 font-medium">Staff</span>
                                        : <span className="text-[10px] text-blue-700 font-medium">Student</span>}
                                    </div>
                                    {apt.time_of_day && (
                                      <>
                                        <span className="text-gray-200 text-[10px] flex-shrink-0">|</span>
                                        <span className={`text-[10px] font-bold flex-shrink-0 ${apt.time_of_day === 'AM' ? 'text-amber-600' : 'text-blue-600'}`}>
                                          {apt.time_of_day === 'AM' ? 'Morning' : 'Afternoon'}
                                        </span>
                                      </>
                                    )}
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
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${apt.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-maroon-100 text-maroon-700'
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
                                      className={`flex-1 px-2.5 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all ${!targetDate ? 'border-maroon-300 bg-maroon-50/30' : overLimit ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-white'
                                        }`}
                                    />
                                    {targetDate && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${overLimit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
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
                    {/* Time of Day (AM/PM) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Preferred Time</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setWalkInTimeOfDay('AM')}
                          className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${walkInTimeOfDay === 'AM' ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500'}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">Morning</span>
                            <span className="text-xs mt-0.5 opacity-80">8:00 AM - 12:00 PM</span>
                          </div>
                        </button>
                        <button
                          onClick={() => setWalkInTimeOfDay('PM')}
                          className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${walkInTimeOfDay === 'PM' ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500'}`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">Afternoon</span>
                            <span className="text-xs mt-0.5 opacity-80">1:00 PM - 5:00 PM</span>
                          </div>
                        </button>
                      </div>
                    </div>
                    {/* Email + Full Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={walkInEmail} 
                            onChange={e => handleEmailChange(e.target.value)} 
                            placeholder="username"
                            className="w-full px-3 py-2.5 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" 
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none gap-2">
                            {walkInEmailDetecting && (
                              <div className="w-4 h-4 border-2 border-maroon-300 border-t-maroon-800 rounded-full animate-spin"></div>
                            )}
                            <span className="text-gray-500 text-sm">@liceo.edu.ph</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                        <input type="text" value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="Enter patient name"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                      </div>
                    </div>
                    {/* Contact Number + Department */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number *</label>
                        <input type="tel" value={walkInContact} onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setWalkInContact(val);
                        }} placeholder="09XXXXXXXXX" maxLength={11}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                        <SearchableSelect
                          value={walkInDepartment}
                          onChange={setWalkInDepartment}
                          options={departments.map(d => ({ value: d.id, label: d.name }))}
                          placeholder="Select Department"
                        />
                      </div>
                    </div>
                    {/* Person Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Person Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['student', 'staff'] as const).map(role => (
                          <button key={role} type="button"
                            onClick={() => setWalkInRole(role)}
                            className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all capitalize
                              ${walkInRole === role ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm' : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500'}`}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                      <textarea value={walkInNotes} onChange={e => setWalkInNotes(e.target.value)} placeholder="Any additional information…"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none text-sm" rows={3} />
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
                  <div className="space-y-4">

                    {/* ——— DAY OFF / CLOSE SECTION ——— */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">Close This Day (Day Off)</h4>
                          <p className="text-xs text-gray-500 mt-0.5">No bookings allowed — saves as a day override</p>
                        </div>
                        <button
                          onClick={() => setDayIsClosed(!dayIsClosed)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 flex-shrink-0 ml-4 ${dayIsClosed ? 'bg-red-500' : 'bg-gray-300'
                            }`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${dayIsClosed ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      {/* Expanded day off options */}
                      {!dayIsClosed && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-semibold text-gray-700">Max Slots for This Day</label>
                            <span className="text-xs text-gray-400">Default: {maxBookingsPerDay}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input type="range" min={1} max={200} value={dayMaxBookings}
                              onChange={e => setDayMaxBookings(parseInt(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-maroon-800" />
                            <input type="number" min={1} max={500} value={dayMaxBookings}
                              onChange={e => setDayMaxBookings(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold text-maroon-800 focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm" />
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {[10, 25, 50, 75, 100].map(v => (
                              <button key={v} onClick={() => setDayMaxBookings(v)}
                                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${dayMaxBookings === v ? 'bg-maroon-800 text-white border-maroon-800' : 'bg-white text-gray-600 border-gray-300 hover:border-maroon-400'}`}>
                                {v}
                              </button>
                            ))}
                          </div>

                          {/* AM/PM Customization Toggle */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700">Customize AM/PM Slots</h5>
                                <p className="text-xs text-gray-500 mt-0.5">Set different limits for morning and afternoon</p>
                              </div>
                              <button
                                onClick={() => {
                                  setCustomizeAmPm(!customizeAmPm);
                                  if (!customizeAmPm) {
                                    setDayMaxAmBookings(Math.floor(dayMaxBookings / 2));
                                    setDayMaxPmBookings(Math.floor(dayMaxBookings / 2));
                                  }
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${customizeAmPm ? 'bg-maroon-800' : 'bg-gray-300'}`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${customizeAmPm ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>

                            {customizeAmPm && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Morning Slots (8 AM - 12 PM)</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="range"
                                      min={0}
                                      max={dayMaxBookings}
                                      value={dayMaxAmBookings || 0}
                                      onChange={e => setDayMaxAmBookings(parseInt(e.target.value))}
                                      className="flex-1 h-2 bg-amber-200 rounded-full appearance-none cursor-pointer accent-amber-600"
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      max={dayMaxBookings}
                                      value={dayMaxAmBookings || 0}
                                      onChange={e => setDayMaxAmBookings(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center font-semibold text-amber-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Afternoon Slots (1 PM - 5 PM)</label>
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="range"
                                      min={0}
                                      max={dayMaxBookings}
                                      value={dayMaxPmBookings || 0}
                                      onChange={e => setDayMaxPmBookings(parseInt(e.target.value))}
                                      className="flex-1 h-2 bg-blue-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <input
                                      type="number"
                                      min={0}
                                      max={dayMaxBookings}
                                      value={dayMaxPmBookings || 0}
                                      onChange={e => setDayMaxPmBookings(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-center font-semibold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-2">
                                  <strong>Total:</strong> {(dayMaxAmBookings || 0) + (dayMaxPmBookings || 0)} slots ({dayMaxAmBookings || 0} AM + {dayMaxPmBookings || 0} PM)
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ——— HOLIDAY SECTION ——— */}
                    <div className="rounded-xl border border-orange-200 bg-orange-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Sun className="w-4 h-4 text-orange-500" />
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">Mark as Holiday</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Blocks all bookings and shows on the public calendar</p>
                          </div>
                        </div>
                        <button
                          onClick={handleToggleHoliday}
                          disabled={isSavingHoliday || !scheduleConfig}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 flex-shrink-0 ml-4 disabled:opacity-50 ${isHoliday ? 'bg-orange-500' : 'bg-gray-300'
                            }`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isHoliday ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {isHoliday && (
                        <div className="px-4 pb-3">
                          <p className="text-xs text-orange-600 font-medium flex items-center gap-1.5">
                            <Sun className="w-3.5 h-3.5" /> {dateStr} is marked as a holiday
                            {holidaySaved && <span className="text-green-600 ml-1">✓ Saved</span>}
                          </p>
                        </div>
                      )}
                    </div>


                    {/* Notes */}
                    <textarea
                      value={dayNotes}
                      onChange={e => setDayNotes(e.target.value)}
                      placeholder="Notes (optional) — e.g. Special event, limited staffing…"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none text-sm"
                      rows={2}
                    />

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
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer Actions ── */}
          {!rescheduleSuccess && !walkInSuccess && activeTab !== 'walkin' && (
            <div className="border-t border-gray-200 bg-gray-50/50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">

              {activeTab === 'appointments' && allDateAppointments.filter(a => a.status === 'scheduled').length > 0 && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-sm text-gray-500">
                    <span>
                      {allDateAppointments.filter(a => a.status === 'scheduled' && a.patient_email && a.time_of_day === 'AM').length} morning with email
                    </span>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <span>
                      {allDateAppointments.filter(a => a.status === 'scheduled' && a.patient_email && a.time_of_day === 'PM').length} afternoon with email
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setReminderModal({ timeOfDay: 'AM', sessionStart: '08:00', sessionEnd: '' })}
                      disabled={isSendingReminders}
                      className="px-3 py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      {isSendingReminders && sendingTimeOfDay === 'AM'
                        ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending AM…</>)
                        : remindersSent && lastSentTimeOfDay === 'AM'
                          ? (<><Check className="w-4 h-4" />Morning Sent</>)
                          : (<><Sun className="w-4 h-4" />Morning Reminders</>)}
                    </button>
                    <button
                      onClick={() => setReminderModal({ timeOfDay: 'PM', sessionStart: '13:00', sessionEnd: '' })}
                      disabled={isSendingReminders}
                      className="px-3 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                    >
                      {isSendingReminders && sendingTimeOfDay === 'PM'
                        ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending PM…</>)
                        : remindersSent && lastSentTimeOfDay === 'PM'
                          ? (<><Check className="w-4 h-4" />Afternoon Sent</>)
                          : (<><Moon className="w-4 h-4" />Afternoon Reminders</>)}
                    </button>
                  </div>
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

      {/* ── Pre-send Reminder Confirmation Modal ── */}
      <AnimatePresence>
        {reminderModal && (() => {
          const isAM = reminderModal.timeOfDay === 'AM';
          const sessionName = isAM ? 'Morning' : 'Afternoon';
          const recipientCount = allDateAppointments.filter(
            a => a.status === 'scheduled' && a.patient_email && a.time_of_day === reminderModal.timeOfDay
          ).length;

          const fmtT = (t: string): string => {
            if (!t) return '';
            const parts = t.split(':');
            const hr = Number.parseInt(parts[0], 10);
            const mn = Number.parseInt(parts[1], 10);
            if (Number.isNaN(hr) || Number.isNaN(mn)) return '';
            const p = hr >= 12 ? ' PM' : ' AM';
            const dh = hr % 12 === 0 ? 12 : hr % 12;
            return `${dh}:${parts[1]}${p}`;
          };

          const startFmt = fmtT(reminderModal.sessionStart);
          const endFmt = reminderModal.sessionEnd ? fmtT(reminderModal.sessionEnd) : '';
          const previewLabel = endFmt
            ? `${sessionName} – ${startFmt} to ${endFmt}`
            : `${sessionName} – ${startFmt}`;

          const accent = isAM
            ? { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', light: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', ring: 'focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400', icon: 'bg-amber-100 text-amber-600' }
            : { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', ring: 'focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400', icon: 'bg-blue-100 text-blue-600' };

          return (
            <motion.div
              key="reminder-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* ── Header ── */}
                <div className={`relative px-6 pt-6 pb-5 ${accent.light} border-b ${accent.border}`}>
                  <button
                    type="button"
                    onClick={() => setReminderModal(null)}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/70 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.icon}`}>
                      {isAM ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Send {sessionName} Reminders</h2>
                      <p className={`text-xs mt-0.5 font-medium ${accent.text}`}>
                        {recipientCount} recipient{recipientCount !== 1 ? 's' : ''} &middot; {format(new Date(`${dateStr}T12:00:00`), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="px-6 py-5 space-y-5">
                  {/* Session window */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Session Window</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="modal-session-start" className="block text-xs text-gray-600 font-medium mb-1.5">
                          Starts at <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="modal-session-start"
                          type="time"
                          value={reminderModal.sessionStart}
                          onChange={e => setReminderModal(prev => prev ? { ...prev, sessionStart: e.target.value } : null)}
                          className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50 outline-none transition-all focus:bg-white ${accent.ring}`}
                        />
                      </div>
                      <div>
                        <label htmlFor="modal-session-end" className="block text-xs text-gray-600 font-medium mb-1.5">
                          Ends at <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          id="modal-session-end"
                          type="time"
                          value={reminderModal.sessionEnd}
                          onChange={e => setReminderModal(prev => prev ? { ...prev, sessionEnd: e.target.value } : null)}
                          className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50 outline-none transition-all focus:bg-white ${accent.ring}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${accent.light} border ${accent.border}`}>
                    <span className="text-xs text-gray-500 font-medium">Preview in email</span>
                    <code className={`text-sm font-bold font-mono ${accent.text}`}>{previewLabel}</code>
                  </div>

                  {/* Zero-recipient warning */}
                  {recipientCount === 0 && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>No scheduled {isAM ? 'morning' : 'afternoon'} students with a valid email address were found.</span>
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setReminderModal(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={recipientCount === 0 || isSendingReminders}
                    onClick={() => handleSendReminders(reminderModal.timeOfDay, reminderModal.sessionStart, reminderModal.sessionEnd || undefined)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${accent.bg} ${accent.hover}`}
                  >
                    <Mail className="w-4 h-4" />
                    Send Reminders
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Reset Template Confirmation Modal ── */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            key="reset-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-6 pt-6 pb-5 bg-red-50 border-b border-red-100">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white/70 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100 text-red-600">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Reset Email Template?</h2>
                    <p className="text-xs mt-0.5 font-medium text-red-600">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <p className="text-sm text-gray-600 leading-relaxed">
                  The subject and body will be restored to their default values. Any customizations you&apos;ve made will be lost.
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomSubject('Appointment Reminder – {{date}} | LDCU Clinic');
                    setCustomBody('Hello {{name}},\n\nThis is a reminder about your upcoming appointment at the LDCU University Clinic.\n\nDate: {{date}}\nType: {{type}}\nSchedule: {{schedule}}\n\nPlease arrive 10–15 minutes before your scheduled time and bring a valid ID.\n\nThank you!');
                    setShowResetConfirm(false);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 shadow-xl rounded-xl border bg-white ${
              toastMessage.type === 'success' ? 'border-green-200' : 'border-red-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              toastMessage.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {toastMessage.type === 'success' ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
            <p className="text-sm font-semibold text-gray-800 pr-2">{toastMessage.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
