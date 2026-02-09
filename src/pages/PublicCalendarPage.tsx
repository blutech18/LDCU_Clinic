import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWeekend, getDay } from 'date-fns';
import { Header, Footer } from '~/components/layout';
import { SignInPromptModal } from '~/components/modals/SignInPromptModal';
import { useAppointmentStore } from '~/modules/appointments';

export function PublicCalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [direction, setDirection] = useState(0);
    const { appointments } = useAppointmentStore();

    const today = new Date();

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

        // Add padding for days before the first of the month
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
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Clinic Calendar</h1>
                            <p className="text-gray-600">View available appointment slots</p>
                        </div>
                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-maroon-800 text-white rounded-lg hover:bg-maroon-700 transition-colors font-medium"
                        >
                            <LogIn className="w-5 h-5" />
                            Sign In to Book
                        </Link>
                    </div>

                    {/* Calendar Card */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        {/* Calendar Header */}
                        <div className="bg-maroon-800 text-white p-4 flex items-center justify-between">
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
                                <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="relative overflow-hidden min-h-[304px]">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={currentMonth.toISOString()}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'tween', duration: 0.3 }}
                                    className="grid grid-cols-7 gap-px bg-gray-200"
                                >
                                    {calendarDays.map((day, index) => {
                                        if (!day) {
                                            return (
                                                <div key={`empty-${index}`} className="bg-gray-50 p-2.5 min-h-[57px]" />
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
                          bg-white p-2.5 min-h-[57px] flex flex-col items-center justify-center
                          transition-all duration-200 hover:bg-maroon-50 cursor-pointer
                          ${!isCurrentMonth ? 'text-gray-300' : ''}
                          ${isWeekendDay ? 'bg-gray-50' : ''}
                        `}
                                            >
                                                <span
                                                    className={`
                            w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full
                            text-sm sm:text-base font-medium
                            ${isToday ? 'bg-maroon-800 text-white' : ''}
                            ${hasAppts && !isToday ? 'ring-2 ring-maroon-300' : ''}
                          `}
                                                >
                                                    {format(day, 'd')}
                                                </span>
                                                {hasAppts && (
                                                    <span className="mt-1 w-1.5 h-1.5 bg-maroon-600 rounded-full" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Legend */}
                        <div className="p-3 border-t bg-gray-50 flex flex-wrap justify-center items-center gap-4 text-xs sm:text-sm">
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

                    {/* Info Card */}
                    <div className="mt-6 bg-gold-50 border border-gold-200 rounded-lg p-4">
                        <p className="text-sm text-gray-700">
                            <strong>Note:</strong> Click on any date to view booked time slots.
                            To schedule an appointment, please sign in with your Google account.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />

            {/* Sign In Prompt Modal */}
            <SignInPromptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedDate={selectedDate}
                bookedSlots={bookedSlots}
            />
        </div>
    );
}
