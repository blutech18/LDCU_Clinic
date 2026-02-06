import { useEffect, useState, useMemo } from 'react';
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
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, CheckSquare, Square, AlertCircle, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarLayout } from '~/components/layout';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';
import type { Appointment } from '~/types';

const TIME_SLOTS = [
    { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
    { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
    { start: '13:00', end: '15:00', label: '1:00 PM - 3:00 PM' },
    { start: '15:00', end: '17:00', label: '3:00 PM - 5:00 PM' },
];

export function ReschedulePage() {
    const { appointments, fetchAppointments, fetchBookingCounts, bookingCounts, updateAppointment, rescheduleDate, isSaving } = useAppointmentStore();
    const { campuses, fetchCampuses, fetchBookingSetting, bookingSetting } = useScheduleStore();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedCampus, setSelectedCampus] = useState('');
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
    const [rescheduleError, setRescheduleError] = useState<string | null>(null);
    const [direction, setDirection] = useState(0);

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
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
        if (campuses.length > 0 && !selectedCampus) {
            setSelectedCampus(campuses[0].id);
        }
    }, [campuses, selectedCampus]);

    useEffect(() => {
        if (selectedCampus) {
            fetchBookingSetting(selectedCampus);
        }
    }, [selectedCampus, fetchBookingSetting]);

    useEffect(() => {
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        const startStr = formatLocalDate(start);
        const endStr = formatLocalDate(end);
        fetchAppointments({
            dateRange: { start: startStr, end: endStr },
            ...(selectedCampus && { campusId: selectedCampus }),
        });
        fetchBookingCounts(startStr, endStr, selectedCampus || undefined);
    }, [currentMonth, selectedCampus, fetchAppointments, fetchBookingCounts]);

    const maxBookingsPerDay = bookingSetting?.max_bookings_per_day || 50;

    // Generate calendar days
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

    // Get appointments for a specific date
    const getDateAppointments = (date: Date): Appointment[] => {
        const dateStr = formatLocalDate(date);
        return appointments.filter(
            (apt) => apt.appointment_date === dateStr && apt.status !== 'cancelled'
        );
    };

    const getBookingCount = (date: Date) => {
        const dateStr = formatLocalDate(date);
        return bookingCounts[dateStr] || 0;
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setCompletedIds(new Set());
        setRescheduleSuccess(false);
        setRescheduleError(null);

        // Pre-check already completed appointments
        const dateAppts = getDateAppointments(date);
        const alreadyCompleted = new Set<string>();
        dateAppts.forEach(apt => {
            if (apt.status === 'completed') {
                alreadyCompleted.add(apt.id);
            }
        });
        setCompletedIds(alreadyCompleted);
        setShowRescheduleModal(true);
    };

    const toggleCompleted = (id: string) => {
        setCompletedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSaveChecklist = async () => {
        if (!selectedDate) return;
        try {
            const dateAppts = getDateAppointments(selectedDate);
            // Mark checked ones as completed, uncheck ones back to scheduled
            for (const apt of dateAppts) {
                if (completedIds.has(apt.id) && apt.status !== 'completed') {
                    await updateAppointment(apt.id, { status: 'completed' });
                } else if (!completedIds.has(apt.id) && apt.status === 'completed') {
                    await updateAppointment(apt.id, { status: 'scheduled' });
                }
            }
        } catch (error) {
            console.error('Error saving checklist:', error);
        }
    };

    const handleReschedule = async () => {
        if (!selectedDate || !selectedCampus) return;

        try {
            setRescheduleError(null);

            // Save checklist first
            await handleSaveChecklist();

            const dateAppts = getDateAppointments(selectedDate);
            // Get IDs of unchecked (not completed) appointments
            const unfinishedIds = dateAppts
                .filter(apt => !completedIds.has(apt.id) && apt.status !== 'cancelled')
                .map(apt => apt.id);

            if (unfinishedIds.length === 0) {
                setRescheduleError('No appointments to reschedule. All appointments are marked as completed.');
                return;
            }

            await rescheduleDate(formatLocalDate(selectedDate), unfinishedIds, selectedCampus);

            setRescheduleSuccess(true);

            // Refresh data
            const start = startOfMonth(subMonths(currentMonth, 1));
            const end = endOfMonth(addMonths(currentMonth, 1));
            const startStr = formatLocalDate(start);
            const endStr = formatLocalDate(end);
            await fetchAppointments({
                dateRange: { start: startStr, end: endStr },
                ...(selectedCampus && { campusId: selectedCampus }),
            });
            await fetchBookingCounts(startStr, endStr, selectedCampus || undefined);

            setTimeout(() => {
                setShowRescheduleModal(false);
                setRescheduleSuccess(false);
                setSelectedDate(null);
            }, 2000);
        } catch (error) {
            console.error('Error rescheduling:', error);
            setRescheduleError('Failed to reschedule appointments. Please try again.');
        }
    };

    const closeModal = () => {
        setShowRescheduleModal(false);
        setSelectedDate(null);
        setRescheduleError(null);
        setRescheduleSuccess(false);
    };

    const selectedDateAppointments = selectedDate ? getDateAppointments(selectedDate) : [];
    const scheduledAppointments = selectedDateAppointments.filter(apt => apt.status !== 'cancelled');

    return (
        <SidebarLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Reschedule Appointments</h1>
                <p className="text-gray-600">Select a date to manage and reschedule appointments</p>
            </div>

            {/* Campus Filter */}
            <div className="mb-4 flex items-center gap-4">
                <select
                    value={selectedCampus}
                    onChange={(e) => setSelectedCampus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                >
                    {campuses.map((campus) => (
                        <option key={campus.id} value={campus.id}>
                            {campus.name}
                        </option>
                    ))}
                </select>
                <div className="text-sm text-gray-500">
                    Max bookings per day: <span className="font-medium text-gray-700">{maxBookingsPerDay}</span>
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
                <div className="relative overflow-hidden" style={{ minHeight: '400px' }}>
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
                                const hasAppointments = count > 0;

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => isCurrentMonth && isWeekday && handleDateClick(day)}
                                        disabled={!isCurrentMonth || !isWeekday}
                                        className={`
                                            flex flex-col items-center justify-center p-1 border-b border-r border-gray-100
                                            transition-all duration-200 cursor-pointer
                                            ${!isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : ''}
                                            ${(day.getDay() === 0 || day.getDay() === 6) ? 'bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-maroon-50'}
                                        `}
                                    >
                                        <span
                                            className={`
                                                w-10 h-10 flex items-center justify-center rounded-full
                                                text-lg font-medium
                                                ${isToday(day) ? 'bg-maroon-800 text-white' : ''}
                                                ${!isCurrentMonth ? 'text-gray-300' : ''}
                                                ${hasAppointments && !isToday(day) && isCurrentMonth ? 'ring-2 ring-maroon-300' : ''}
                                            `}
                                        >
                                            {format(day, 'd')}
                                        </span>
                                        {isCurrentMonth && isWeekday && (
                                            <span className={`mt-0.5 text-[10px] font-medium ${count > 0 ? 'text-maroon-600' : 'text-gray-400'}`}>
                                                {count} booked
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
                        <span className="text-gray-700 font-medium">Has appointments</span>
                    </div>
                </div>
            </div>

            {/* Reschedule Modal */}
            <AnimatePresence>
                {showRescheduleModal && selectedDate && (
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
                            className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-maroon-900 text-white rounded-t-xl">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Manage Appointments - {format(selectedDate, 'MMMM d, yyyy')}
                                    </h3>
                                    <p className="text-sm text-maroon-200 flex items-center gap-1 mt-0.5">
                                        <Users className="w-3.5 h-3.5" />
                                        {scheduledAppointments.length} appointments | {completedIds.size} completed
                                    </p>
                                </div>
                                <button onClick={closeModal} className="p-1 hover:bg-maroon-800 rounded transition-colors text-white">
                                    ✕
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                                {rescheduleSuccess ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Check className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-gray-900">Appointments Rescheduled!</h4>
                                        <p className="text-gray-600 mt-1">Uncompleted appointments have been spread to available dates.</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Check the boxes for patients who have <span className="font-semibold">completed</span> their appointments.
                                            Unchecked patients will be rescheduled to the nearest available dates when you press "Reschedule".
                                        </p>

                                        {scheduledAppointments.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No appointments on this date</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* Select All / Deselect All */}
                                                <div className="flex items-center justify-between mb-3 pb-3 border-b">
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {completedIds.size} of {scheduledAppointments.length} marked as completed
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => setCompletedIds(new Set(scheduledAppointments.map(a => a.id)))}
                                                            className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                                                        >
                                                            Select All
                                                        </button>
                                                        <button
                                                            onClick={() => setCompletedIds(new Set())}
                                                            className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                                        >
                                                            Deselect All
                                                        </button>
                                                    </div>
                                                </div>

                                                {scheduledAppointments.map((apt) => {
                                                    const isChecked = completedIds.has(apt.id);
                                                    const slot = TIME_SLOTS.find(s => s.start === apt.start_time);

                                                    return (
                                                        <button
                                                            key={apt.id}
                                                            onClick={() => toggleCompleted(apt.id)}
                                                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                                                                isChecked
                                                                    ? 'bg-green-50 border-green-300'
                                                                    : 'bg-white border-gray-200 hover:border-maroon-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {isChecked ? (
                                                                <CheckSquare className="w-5 h-5 text-green-600 flex-shrink-0" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`font-medium text-sm ${isChecked ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                                                                    {apt.patient_name || 'Unknown Patient'}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-0.5">
                                                                    <span className="text-xs text-gray-500">
                                                                        {slot?.label || apt.start_time}
                                                                    </span>
                                                                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded capitalize">
                                                                        {apt.appointment_type.replace('_', ' ')}
                                                                    </span>
                                                                    {apt.patient_phone && (
                                                                        <span className="text-xs text-gray-400">{apt.patient_phone}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isChecked && (
                                                                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                                                                    Done
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Error Message */}
                                        {rescheduleError && (
                                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg mt-4">
                                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                                <p className="text-sm">{rescheduleError}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {!rescheduleSuccess && scheduledAppointments.length > 0 && (
                                <div className="flex-shrink-0 p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between gap-3">
                                    <button
                                        onClick={handleSaveChecklist}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors text-sm"
                                    >
                                        Save Checklist
                                    </button>
                                    <button
                                        onClick={handleReschedule}
                                        disabled={isSaving}
                                        className="px-6 py-2 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Rescheduling...</span>
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="w-4 h-4" />
                                                <span>Reschedule Uncompleted ({scheduledAppointments.length - completedIds.size})</span>
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
