import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWeekend, getDay } from 'date-fns';
import { Header, Footer } from '~/components/layout';
import { SignInPromptModal } from '~/components/modals/SignInPromptModal';
import { useAppointmentStore } from '~/modules/appointments';
import { useAuthStore } from '~/modules/auth';

export function LoginPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [direction, setDirection] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { appointments } = useAppointmentStore();
  const { loginWithGoogle } = useAuthStore();

  const today = new Date();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const startDay = getDay(monthStart);
    const paddingDays = Array(startDay).fill(null);

    return [...paddingDays, ...days];
  }, [currentMonth]);

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

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error('Failed to login with Google:', err);
      setIsGoogleLoading(false);
    }
  };

  // Get booked slots for selected date
  const bookedSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(apt => apt.appointment_date === dateStr && apt.status !== 'cancelled')
      .map(apt => apt.start_time);
  }, [selectedDate, appointments]);

  // Check if a date has appointments
  const hasAppointments = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.some(apt => apt.appointment_date === dateStr && apt.status !== 'cancelled');
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-6">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clinic Calendar</h1>
            <p className="text-gray-600 text-sm mt-1">View appointments and sign in to book</p>
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
          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentMonth.toISOString()}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.3 }}
                className="grid grid-cols-7"
                style={{ minHeight: '240px' }}
              >
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return (
                      <div key={`empty-${index}`} className="bg-gray-50 border-b border-r border-gray-100" />
                    );
                  }

                  const isToday = isSameDay(day, today);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isWeekendDay = isWeekend(day);
                  const hasAppts = hasAppointments(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateClick(day)}
                      className={`
                        flex flex-col items-center justify-center p-1 sm:p-2 border-b border-r border-gray-100
                        transition-all duration-200 hover:bg-maroon-50 cursor-pointer h-8 sm:h-10
                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                        ${isWeekendDay ? 'bg-gray-50' : 'bg-white'}
                      `}
                    >
                      <span
                        className={`
                          w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full
                          text-xs sm:text-sm font-medium
                          ${isToday ? 'bg-maroon-800 text-white' : ''}
                          ${hasAppts && !isToday ? 'ring-2 ring-maroon-300' : ''}
                        `}
                      >
                        {format(day, 'd')}
                      </span>
                      {hasAppts && (
                        <span className="mt-0.5 w-1 h-1 bg-maroon-600 rounded-full" />
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
              <span className="w-3 h-3 ring-2 ring-maroon-300 rounded-full shadow-sm"></span>
              <span className="text-gray-700 font-medium">Has appointments</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-200 rounded shadow-sm"></span>
              <span className="text-gray-700 font-medium">Weekend</span>
            </div>
          </div>
        </div>

          {/* Google Sign In Button */}
          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm"
            >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isGoogleLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
        </div>
      </main>

      {/* Sign In Prompt Modal */}
      <SignInPromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        bookedSlots={bookedSlots}
      />

      <Footer />
    </div>
  );
}
