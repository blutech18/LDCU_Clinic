import { useState, useMemo, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isBefore } from 'date-fns';
import { Header, Footer } from '~/components/layout';
import { SignInPromptModal } from '~/components/modals/SignInPromptModal';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { useAuthStore } from '~/modules/auth';
import { formatLocalDate } from '~/lib/utils';

export function LoginPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const { appointments, fetchAppointments, fetchBookingCounts, bookingCounts } = useAppointmentStore();
  const { scheduleConfig, fetchScheduleConfig, fetchBookingSetting, bookingSetting, campuses, fetchCampuses, dayOverrides, fetchDayOverrides } = useScheduleStore();
  const { profile, isInitialized } = useAuthStore();

  const today = new Date();

  // Fetch campuses and data on mount — must be above any early returns (Rules of Hooks)
  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  // Set default campus
  useEffect(() => {
    if (campuses.length > 0 && !selectedCampusId) {
      setSelectedCampusId(campuses[0].id);
    }
  }, [campuses, selectedCampusId]);

  // Fetch appointments and booking counts for current month
  useEffect(() => {
    if (!selectedCampusId) return;

    const start = startOfMonth(subMonths(currentMonth, 1));
    const end = endOfMonth(addMonths(currentMonth, 1));
    const startStr = formatLocalDate(start);
    const endStr = formatLocalDate(end);

    fetchAppointments({
      dateRange: { start: startStr, end: endStr },
      campusId: selectedCampusId
    });
    fetchBookingCounts(startStr, endStr, selectedCampusId);
    fetchDayOverrides(selectedCampusId, startStr, endStr);
    fetchScheduleConfig(selectedCampusId);
    fetchBookingSetting(selectedCampusId);
  }, [currentMonth, selectedCampusId, fetchAppointments, fetchBookingCounts, fetchDayOverrides, fetchScheduleConfig, fetchBookingSetting]);

  const globalMaxBookings = bookingSetting?.max_bookings_per_day || 50;

  // Get effective max bookings for a specific date
  const getMaxForDate = (dateStr: string) => {
    const override = dayOverrides[dateStr];
    if (override) return override.is_closed ? 0 : override.max_bookings;
    return globalMaxBookings;
  };

  // Generate calendar days (matching student page) — must be above early returns
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

  // Get booked slots for selected date — must be above early returns (Rules of Hooks)
  const bookedSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(apt => apt.appointment_date === dateStr && apt.status !== 'cancelled')
      .map(apt => apt.start_time);
  }, [selectedDate, appointments]);

  // Show loading screen while auth is being initialized to prevent flash
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-maroon-800">
        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect already logged-in users away from the login page
  if (profile) {
    if (profile.role === 'student') return <Navigate to="/student/booking" replace />;
    if (profile.role === 'staff') return <Navigate to="/staff/booking" replace />;
    return <Navigate to="/employee/dashboard" replace />;
  }

  const navigateMonth = (dir: number) => {
    setDirection(dir);
    if (dir === 1) {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };



  // Get booking count for a date
  const getBookingCount = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return bookingCounts[dateStr] || 0;
  };

  // Check if date is full
  const isDateFull = (date: Date) => {
    const dateStr = formatLocalDate(date);
    const max = getMaxForDate(dateStr);
    // If max is 0 (closed via override), it is effectively full/closed
    if (max === 0) return true;
    return getBookingCount(date) >= max;
  };

  // Check if date is a holiday
  const isHoliday = (date: Date) => {
    const dateStr = formatLocalDate(date);
    return (scheduleConfig?.holiday_dates || []).includes(dateStr);
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clinic Calendar</h1>
              <p className="text-gray-600 text-sm mt-1">View appointments and sign in to book</p>
            </div>

            {/* Campus Buttons */}
            <div className="w-full mt-2 md:w-auto md:mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                {campuses.map(campus => (
                  <button
                    key={campus.id}
                    onClick={() => setSelectedCampusId(campus.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm ${selectedCampusId === campus.id
                      ? 'bg-maroon-800 text-white border-maroon-800'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500 hover:text-maroon-700'
                      }`}
                  >
                    {campus.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Card */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden w-full">
            {/* Calendar Header */}
            <div className="bg-maroon-800 text-white p-3 flex items-center justify-between flex-shrink-0">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 rounded-lg hover:bg-maroon-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 rounded-lg hover:bg-maroon-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-xs sm:text-sm font-medium text-gray-600">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="relative overflow-hidden min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]">
              <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                  key={currentMonth.toISOString()}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="absolute inset-0 grid grid-cols-7"
                  style={{ gridTemplateRows: `repeat(${calendarDays.length / 7}, minmax(0, 1fr))` }}
                >
                  {calendarDays.map((day, index) => {
                    const dateStr = formatLocalDate(day);
                    const isToday = isSameDay(day, today);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const count = getBookingCount(day);
                    const full = isDateFull(day);
                    const holiday = isHoliday(day);

                    const override = dayOverrides[dateStr];
                    const isClosedOverride = override?.is_closed;
                    const effectiveMax = getMaxForDate(dateStr);

                    const dow = day.getDay();
                    const isSat = dow === 6;
                    const isSun = dow === 0;
                    const isOffDay = (isSun && !scheduleConfig?.include_sunday) || (isSat && !scheduleConfig?.include_saturday);
                    const isActiveDay = !isOffDay && !holiday && !isClosedOverride;
                    const isPast = isBefore(day, today);

                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(day)}
                        className={`
                          flex flex-col items-center justify-center p-1 border-b border-r border-gray-100
                          transition-all duration-200 cursor-pointer
                          ${!isCurrentMonth ? 'text-gray-300' : ''}
                          ${isOffDay || isClosedOverride ? 'bg-gray-50' : holiday && isCurrentMonth ? 'bg-orange-50' : 'bg-white'}
                          ${full && isCurrentMonth && isActiveDay && !isPast ? 'bg-red-50' : ''}
                          ${isCurrentMonth ? 'hover:bg-maroon-50' : ''}
                        `}
                      >
                        <span
                          className={`
                            w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full
                            text-sm sm:text-lg font-medium
                            ${isToday ? 'bg-maroon-800 text-white' : ''}
                            ${!isCurrentMonth ? 'text-gray-300' : ''}
                            ${holiday && isCurrentMonth && !isToday ? 'text-orange-600' : ''}
                            ${isClosedOverride && isCurrentMonth && !isToday ? 'text-gray-400 line-through' : ''}
                          `}
                        >
                          {format(day, 'd')}
                        </span>
                        {isCurrentMonth && holiday && (
                          <span className="mt-0.5 text-[9px] font-semibold text-orange-500 uppercase tracking-wide leading-none">
                            Holiday
                          </span>
                        )}
                        {isCurrentMonth && isClosedOverride && !holiday && (
                          <span className="mt-0.5 text-[9px] font-medium text-gray-400">Closed</span>
                        )}
                        {isCurrentMonth && isActiveDay && !isPast && (
                          <span className={`mt-0.5 text-[10px] font-medium no-underline ${full ? 'text-red-500' : count > 0 ? 'text-maroon-600' : 'text-gray-400'}`}>
                            {count}/{effectiveMax}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="p-3 border-t bg-gray-50 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-maroon-800 rounded-full shadow-sm"></span>
                <span className="text-gray-700 font-medium">Today</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-200 rounded shadow-sm"></span>
                <span className="text-gray-700 font-medium">Fully booked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-200 rounded shadow-sm"></span>
                <span className="text-gray-700 font-medium">Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-200 rounded shadow-sm"></span>
                <span className="text-gray-700 font-medium">Off day</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sign In Prompt Modal */}
      <SignInPromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        bookedSlots={bookedSlots}
        maxSlots={selectedDate ? getMaxForDate(formatLocalDate(selectedDate)) : 20}
        isHolidayDate={selectedDate ? isHoliday(selectedDate) : false}
      />

      <Footer />
    </div>
  );
}
