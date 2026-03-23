import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWeekend, getDay } from 'date-fns';
import { Header, Footer } from '~/components/layout';
import { SignInPromptModal } from '~/components/modals/SignInPromptModal';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';

export function PublicCalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [direction, setDirection] = useState(0);
    const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
    const { fetchBookingCounts, bookingCounts } = useAppointmentStore();
    const { campuses, fetchCampuses, fetchScheduleConfig, bookingSetting, fetchBookingSetting, dayOverrides, fetchDayOverrides } = useScheduleStore();

    const today = new Date();

    // Fetch campuses on mount
    useEffect(() => {
        fetchCampuses();
    }, [fetchCampuses]);

    // Set default campus
    useEffect(() => {
        if (campuses.length > 0 && !selectedCampusId) {
            setSelectedCampusId(campuses[0].id);
        }
    }, [campuses, selectedCampusId]);

    // Fetch booking counts when month or campus changes
    useEffect(() => {
        if (!selectedCampusId) return;
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        const startStr = formatLocalDate(start);
        const endStr = formatLocalDate(end);
        fetchBookingCounts(startStr, endStr, selectedCampusId);
        fetchScheduleConfig(selectedCampusId);
        fetchBookingSetting(selectedCampusId);
        fetchDayOverrides(selectedCampusId, startStr, endStr);
    }, [currentMonth, selectedCampusId, fetchBookingCounts, fetchScheduleConfig, fetchBookingSetting, fetchDayOverrides]);

    const globalMaxBookings = bookingSetting?.max_bookings_per_day || 50;

    const getMaxForDate = (dateStr: string) => {
        const override = dayOverrides[dateStr];
        if (override) {
            if (override.is_closed) return 0;
            if (override.max_am_bookings !== null && override.max_am_bookings !== undefined) {
                return override.max_am_bookings + (override.max_pm_bookings || 0);
            }
            return override.max_bookings;
        }
        return globalMaxBookings;
    };

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

    // Public page: no individual appointment details
    const bookedSlots: string[] = [];

    // Check if a date has bookings using counts
    const hasAppointments = (date: Date) => {
        const dateStr = formatLocalDate(date);
        return (bookingCounts[dateStr] || 0) > 0;
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

                    {/* Campus Selector */}
                    {campuses.length > 1 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                            {campuses.map(campus => (
                                <button
                                    key={campus.id}
                                    onClick={() => setSelectedCampusId(campus.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm ${
                                        selectedCampusId === campus.id
                                            ? 'bg-maroon-800 text-white border-maroon-800'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500 hover:text-maroon-700'
                                    }`}
                                >
                                    {campus.name}
                                </button>
                            ))}
                        </div>
                    )}

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

                                        const dateStr = formatLocalDate(day);
                                        const isToday = isSameDay(day, today);
                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                        const isWeekendDay = isWeekend(day);
                                        const hasAppts = hasAppointments(day);
                                        const count = bookingCounts[dateStr] || 0;
                                        const effectiveMax = getMaxForDate(dateStr);
                                        const isFull = effectiveMax > 0 && count >= effectiveMax;

                                        return (
                                            <button
                                                key={day.toISOString()}
                                                onClick={() => handleDateClick(day)}
                                                className={`
                          bg-white p-2.5 min-h-[57px] flex flex-col items-center justify-center
                          transition-all duration-200 hover:bg-maroon-50 cursor-pointer
                          ${!isCurrentMonth ? 'text-gray-300' : ''}
                          ${isWeekendDay ? 'bg-gray-50' : ''}
                          ${isFull && isCurrentMonth ? 'bg-red-50' : ''}
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
                                                {isCurrentMonth && count > 0 && (
                                                    <span className={`mt-0.5 text-[10px] font-medium ${isFull ? 'text-red-500' : 'text-maroon-600'}`}>
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
