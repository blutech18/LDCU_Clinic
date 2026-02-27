import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ChevronLeft, ChevronRight, Check, Settings, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';



export function SchedulePage() {
  // ── Stores ──
  const { fetchAppointments, fetchBookingCounts, bookingCounts, isLoading } = useAppointmentStore();
  const { campuses, fetchCampuses, selectedCampusId, setSelectedCampus, fetchBookingSetting, bookingSetting, updateBookingSetting, fetchEmailTemplates, emailTemplates, upsertEmailTemplate, fetchScheduleConfig, dayOverrides, fetchDayOverrides } = useScheduleStore();

  const maxBookingsPerDay = bookingSetting?.max_bookings_per_day || 50;

  // ── Navigate ──
  const navigate = useNavigate();

  // ── Calendar state ──
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [direction, setDirection] = useState(0);

  // ── Email template ──
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // ── Settings ──
  const [tempMaxBookings, setTempMaxBookings] = useState<number | string>(50);

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
      fetchScheduleConfig(selectedCampusId);
    }
  }, [selectedCampusId, fetchBookingSetting, fetchEmailTemplates, fetchScheduleConfig]);

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
    if (selectedCampusId) {
      fetchDayOverrides(selectedCampusId, startStr, endStr);
    }
  }, [currentMonth, selectedCampusId, fetchAppointments, fetchBookingCounts, fetchDayOverrides]);

  useEffect(() => { setTempMaxBookings(maxBookingsPerDay); }, [maxBookingsPerDay]);

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

  const handleDateClick = (date: Date) => {
    navigate(`/schedule/day/${formatLocalDate(date)}?campus=${selectedCampusId || ''}`);
  };

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

  const handleSaveMaxBookings = async () => {
    if (!selectedCampusId) return;

    let newValue = typeof tempMaxBookings === 'string' ? parseInt(tempMaxBookings) : tempMaxBookings;
    if (isNaN(newValue) || newValue < 1) {
      setTempMaxBookings(maxBookingsPerDay);
      return;
    }

    try { await updateBookingSetting(selectedCampusId, newValue); }
    catch (error) { console.error('Error:', error); }
  };

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

  // ── Dynamic Legend Visibility ──
  const hasClosedDays = useMemo(() => calendarDays.some(d => isSameMonth(d, currentMonth) && dayOverrides[formatLocalDate(d)]?.is_closed), [calendarDays, dayOverrides, currentMonth]);

  // ── RENDER ──
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600 text-sm mt-1">View and manage clinic schedule</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Campus Buttons */}
          {campuses.map(campus => (
            <button
              key={campus.id}
              onClick={() => setSelectedCampus(campus.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm ${selectedCampusId === campus.id
                ? 'bg-maroon-800 text-white border-maroon-800 ring-2 ring-maroon-200 ring-offset-1'
                : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500 hover:text-maroon-700'
                }`}
            >
              {campus.name}
            </button>
          ))}

          {/* Max bookings editor */}
          {selectedCampusId && (
            <div className="ml-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white shadow-sm transition-all duration-200 border-gray-300 focus-within:border-maroon-800 focus-within:ring-2 focus-within:ring-maroon-200 focus-within:ring-offset-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider select-none">Capacity:</span>
                <input
                  type="number"
                  value={tempMaxBookings}
                  onChange={(e) => setTempMaxBookings(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      e.currentTarget.blur();
                      setTempMaxBookings(maxBookingsPerDay);
                    }
                  }}
                  onBlur={handleSaveMaxBookings}
                  className="w-[4ch] bg-transparent p-0 border-none outline-none text-sm font-bold text-gray-900 placeholder-gray-300 focus:ring-0 text-center [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          )}
        </div>
      </div >

      {/* Calendar */}
      < div className="bg-white rounded-xl shadow-md overflow-hidden" >
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
                        <span className={`mt-0.5 text-[10px] font-medium ${full ? 'text-red-500' : count > 0 ? 'text-maroon-600' : 'text-gray-400'}`}>
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
          {hasClosedDays && (
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-300 rounded shadow-sm line-through text-[6px] text-gray-500 flex items-center justify-center">x</span><span className="text-gray-700 font-medium">Closed</span></div>
          )}
        </div>
      </div >

      {/* Email Template Editor */}
      < div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden" >
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
      </div >
    </>
  );
}
