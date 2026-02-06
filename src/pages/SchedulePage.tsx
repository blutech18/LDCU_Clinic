import { useEffect, useState, useMemo, useCallback } from 'react';
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
import { ChevronLeft, ChevronRight, X, Users, Mail, Check, Settings, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarLayout } from '~/components/layout';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';
import { sendBulkReminders } from '~/lib/email';

export function SchedulePage() {
  const { appointments, fetchAppointments, fetchBookingCounts, bookingCounts, isLoading } = useAppointmentStore();
  const { campuses, fetchCampuses, selectedCampusId, setSelectedCampus, fetchBookingSetting, bookingSetting, fetchEmailTemplates, emailTemplates, upsertEmailTemplate } = useScheduleStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [remindersSent, setRemindersSent] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentMonth(newDirection > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1));
  };

  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  useEffect(() => {
    if (selectedCampusId) {
      fetchBookingSetting(selectedCampusId);
      fetchEmailTemplates(selectedCampusId);
    }
  }, [selectedCampusId, fetchBookingSetting, fetchEmailTemplates]);

  // Load reminder template into editor when templates are fetched
  useEffect(() => {
    const reminderTemplate = emailTemplates.find(t => t.template_type === 'appointment_reminder');
    if (reminderTemplate) {
      setTemplateSubject(reminderTemplate.subject);
      setTemplateBody(reminderTemplate.body);
    } else {
      setTemplateSubject('Appointment Reminder - {{date}} | LDCU Clinic');
      setTemplateBody('Hello {{name}},\n\nThis is a friendly reminder about your upcoming appointment at the LDCU University Clinic.\n\nDate: {{date}}\nType: {{type}}\n\nPlease arrive 10-15 minutes before your scheduled time. Bring a valid ID and any relevant medical documents.\n\nIf you need to reschedule, please contact us as soon as possible.\n\nThank you,\nLDCU University Clinic');
    }
  }, [emailTemplates]);

  const handleSaveTemplate = async () => {
    const campusId = selectedCampusId || (campuses.length > 0 ? campuses[0].id : null);
    if (!campusId) {
      alert('Please select a campus first.');
      return;
    }
    setSavingTemplate(true);
    try {
      await upsertEmailTemplate({
        campus_id: campusId,
        template_type: 'appointment_reminder',
        subject: templateSubject,
        body: templateBody,
      });
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save template.');
    }
    setSavingTemplate(false);
  };

  useEffect(() => {
    const start = startOfMonth(subMonths(currentMonth, 1));
    const end = endOfMonth(addMonths(currentMonth, 1));
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);
    fetchAppointments({
      dateRange: { start: startStr, end: endStr },
      ...(selectedCampusId && { campusId: selectedCampusId }),
    });
    fetchBookingCounts(startStr, endStr, selectedCampusId || undefined);
  }, [currentMonth, selectedCampusId, fetchAppointments, fetchBookingCounts]);

  const maxBookingsPerDay = bookingSetting?.max_bookings_per_day || 50;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getBookingCount = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return bookingCounts[dateStr] || 0;
  };

  const getDateAppointments = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return appointments.filter(
      (apt) => apt.appointment_date === dateStr && apt.status !== 'cancelled'
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const selectedDateAppointments = selectedDate ? getDateAppointments(selectedDate) : [];

  const handleSendReminders = useCallback(async () => {
    if (!selectedDate || selectedDateAppointments.length === 0) return;

    const campusId = selectedCampusId || (campuses.length > 0 ? campuses[0].id : null);
    if (!campusId) {
      alert('No campus available. Please select a campus first.');
      return;
    }

    setIsSendingReminders(true);
    setRemindersSent(false);

    try {
      const dateStr = formatLocalDate(selectedDate);
      const customTemplate = templateSubject && templateBody
        ? { subject: templateSubject, body: templateBody }
        : undefined;
      const result = await sendBulkReminders(dateStr, campusId, customTemplate);
      console.log('Reminders result:', result);
      if (result.sent > 0) {
        alert(`Successfully sent ${result.sent} reminder(s)!${result.skipped ? ` (${result.skipped} skipped - no email)` : ''}${result.failed ? ` (${result.failed} failed)` : ''}`);
      } else {
        alert(result.message || 'No reminders to send.');
      }
    } catch (err: any) {
      console.error('Failed to send reminders:', err);
      alert(`Failed to send reminders: ${err.message || 'Unknown error'}`);
    }

    setIsSendingReminders(false);
    setRemindersSent(true);
    setTimeout(() => setRemindersSent(false), 3000);
  }, [selectedDate, selectedDateAppointments, selectedCampusId, campuses]);

  return (
    <SidebarLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600">View and manage clinic schedule</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedCampusId || ''}
            onChange={(e) => setSelectedCampus(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
          >
            <option value="">All Campuses</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-maroon-800 text-white p-3 flex items-center justify-between">
          <button
            onClick={() => paginate(-1)}
            className="p-2 hover:bg-maroon-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => paginate(1)}
            className="p-2 hover:bg-maroon-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="relative overflow-hidden" style={{ minHeight: '480px' }}>
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentMonth.toString()}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="absolute inset-0 grid grid-cols-7 auto-rows-fr"
            >
              {calendarDays.map((day, idx) => {
                const count = getBookingCount(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
                const full = count >= maxBookingsPerDay;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = isBefore(day, today);

                return (
                  <button
                    key={idx}
                    onClick={() => isCurrentMonth && handleDateClick(day)}
                    disabled={!isCurrentMonth}
                    className={`
                      flex flex-col items-center justify-center p-1 border-b border-r border-gray-100
                      transition-all duration-200 cursor-pointer
                      ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-maroon-50'}
                      ${(day.getDay() === 0 || day.getDay() === 6) ? 'bg-gray-50' : 'bg-white'}
                      ${full && isCurrentMonth && isWeekday && !isPast ? 'bg-red-50' : ''}
                    `}
                  >
                    <span
                      className={`
                        w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full
                        text-sm sm:text-lg font-medium
                        ${isToday(day) ? 'bg-maroon-800 text-white' : ''}
                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                        ${count > 0 && !isToday(day) && isCurrentMonth ? 'ring-2 ring-maroon-300' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    {isCurrentMonth && isWeekday && (
                      <span className={`mt-0.5 text-[10px] font-medium ${full ? 'text-red-500' : count > 0 ? 'text-maroon-600' : 'text-gray-400'}`}>
                        {count}/{maxBookingsPerDay}
                      </span>
                    )}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Legend */}
        <div className="p-3 border-t bg-gray-50 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-maroon-800 rounded-full shadow-sm"></span>
            <span className="text-gray-700 font-medium">Today</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 ring-2 ring-maroon-300 rounded-full shadow-sm"></span>
            <span className="text-gray-700 font-medium">Has bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-200 rounded shadow-sm"></span>
            <span className="text-gray-700 font-medium">Fully booked</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-200 rounded shadow-sm"></span>
            <span className="text-gray-700 font-medium">Weekend</span>
          </div>
        </div>
      </div>

      {/* Email Template Settings */}
      <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
        <button
          onClick={() => setShowTemplateEditor(!showTemplateEditor)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-maroon-700" />
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Email Reminder Template</h3>
              <p className="text-sm text-gray-500">Customize the message sent to patients</p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showTemplateEditor ? 'rotate-90' : ''}`} />
        </button>

        {showTemplateEditor && (
          <div className="border-t p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
              <input
                type="text"
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                placeholder="Appointment Reminder - {{date}} | LDCU Clinic"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
              <textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={8}
                placeholder="Hello {{name}},&#10;&#10;This is a reminder about your appointment on {{date}}..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm resize-y"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Available placeholders: <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{date}}'}</code> <code className="bg-gray-100 px-1 rounded">{'{{type}}'}</code>
              </p>
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="px-4 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
              >
                {savingTemplate ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : templateSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Template
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Date Detail Modal */}
      <AnimatePresence>
        {showModal && selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-maroon-900 text-white rounded-t-xl">
                <div>
                  <h3 className="text-lg font-semibold">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <p className="text-sm text-maroon-200 flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                    {selectedDateAppointments.length} appointment{selectedDateAppointments.length !== 1 ? 's' : ''} booked
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-maroon-800 rounded transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {selectedDateAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No appointments on this date</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={`p-3 rounded-lg border-l-4 ${
                          apt.status === 'completed'
                            ? 'bg-green-50 border-green-500'
                            : apt.status === 'cancelled'
                            ? 'bg-red-50 border-red-400'
                            : 'bg-gray-50 border-maroon-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 text-sm">
                            {apt.patient_name || 'Unknown Patient'}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            apt.status === 'completed' ? 'bg-green-100 text-green-700' :
                            apt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs px-1.5 py-0.5 bg-maroon-100 text-maroon-700 rounded capitalize">
                            {apt.appointment_type.replace('_', ' ')}
                          </span>
                          {apt.patient_email && (
                            <span className="text-xs text-gray-400">{apt.patient_email}</span>
                          )}
                          {apt.patient_phone && (
                            <span className="text-xs text-gray-400">{apt.patient_phone}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Reminders Footer */}
              {selectedDateAppointments.filter(a => a.status === 'scheduled').length > 0 && (
                <div className="flex-shrink-0 p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {selectedDateAppointments.filter(a => a.status === 'scheduled' && a.patient_email).length} patient{selectedDateAppointments.filter(a => a.status === 'scheduled' && a.patient_email).length !== 1 ? 's' : ''} with email
                  </p>
                  <button
                    onClick={handleSendReminders}
                    disabled={isSendingReminders}
                    className="px-4 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
                  >
                    {isSendingReminders ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : remindersSent ? (
                      <>
                        <Check className="w-4 h-4" />
                        Reminders Sent!
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Reminders
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SidebarLayout>
  );
}
