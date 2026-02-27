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
import { ChevronLeft, ChevronRight, Calendar, RefreshCw, AlertCircle, Check, Users, Save, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';
import { supabase } from '~/lib/supabase';
import type { Appointment } from '~/types';

export function ReschedulePage() {
    const { appointments, fetchAppointments, fetchBookingCounts, bookingCounts, updateAppointment, rescheduleDate, isSaving } = useAppointmentStore();
    const { campuses, fetchCampuses, fetchBookingSetting, bookingSetting, updateBookingSetting } = useScheduleStore();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedCampus, setSelectedCampus] = useState('');
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleSuccess, setRescheduleSuccess] = useState(false);
    const [rescheduleError, setRescheduleError] = useState<string | null>(null);
    const [direction, setDirection] = useState(0);
    const [rescheduleMode, setRescheduleMode] = useState<'auto' | 'manual'>('auto');
    const [manualTargetDates, setManualTargetDates] = useState<Record<string, string>>({});
    const [editingMaxBookings, setEditingMaxBookings] = useState(false);
    const [tempMaxBookings, setTempMaxBookings] = useState(50);
    const [savingMaxBookings, setSavingMaxBookings] = useState(false);

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

    useEffect(() => {
        setTempMaxBookings(maxBookingsPerDay);
    }, [maxBookingsPerDay]);

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

    const getBookingCountStr = (dateStr: string) => {
        return bookingCounts[dateStr] || 0;
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        setCompletedIds(new Set());
        setRescheduleSuccess(false);
        setRescheduleError(null);
        setRescheduleMode('auto');
        setManualTargetDates({});

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
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSaveChecklist = async () => {
        if (!selectedDate) return;
        try {
            const dateAppts = getDateAppointments(selectedDate);
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

    const handleSaveMaxBookings = async () => {
        if (!selectedCampus || tempMaxBookings < 1) return;
        setSavingMaxBookings(true);
        try {
            await updateBookingSetting(selectedCampus, tempMaxBookings);
            setEditingMaxBookings(false);
        } catch (error) {
            console.error('Error saving max bookings:', error);
        } finally {
            setSavingMaxBookings(false);
        }
    };

    const refreshData = async () => {
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        const startStr = formatLocalDate(start);
        const endStr = formatLocalDate(end);
        await fetchAppointments({
            dateRange: { start: startStr, end: endStr },
            ...(selectedCampus && { campusId: selectedCampus }),
        });
        await fetchBookingCounts(startStr, endStr, selectedCampus || undefined);
    };

    const handleAutoReschedule = async () => {
        if (!selectedDate || !selectedCampus) return;
        try {
            setRescheduleError(null);
            await handleSaveChecklist();

            const dateAppts = getDateAppointments(selectedDate);
            const unfinishedIds = dateAppts
                .filter(apt => !completedIds.has(apt.id) && apt.status !== 'cancelled')
                .map(apt => apt.id);

            if (unfinishedIds.length === 0) {
                setRescheduleError('No appointments to reschedule. All are marked as completed.');
                return;
            }

            await rescheduleDate(formatLocalDate(selectedDate), unfinishedIds, selectedCampus);
            setRescheduleSuccess(true);
            await refreshData();
            setTimeout(() => { setShowRescheduleModal(false); setRescheduleSuccess(false); setSelectedDate(null); }, 2000);
        } catch (error) {
            console.error('Error rescheduling:', error);
            setRescheduleError('Failed to reschedule appointments. Please try again.');
        }
    };

    const handleManualReschedule = async () => {
        if (!selectedDate || !selectedCampus) return;
        try {
            setRescheduleError(null);
            await handleSaveChecklist();

            const dateAppts = getDateAppointments(selectedDate);
            const unfinished = dateAppts.filter(apt => !completedIds.has(apt.id) && apt.status !== 'cancelled');

            if (unfinished.length === 0) {
                setRescheduleError('No appointments to reschedule. All are marked as completed.');
                return;
            }

            // Check that all unfinished have a target date
            const missing = unfinished.filter(apt => !manualTargetDates[apt.id]);
            if (missing.length > 0) {
                setRescheduleError(`Please select a target date for all ${missing.length} uncompleted appointment(s).`);
                return;
            }

            // Move each appointment to its target date
            for (const apt of unfinished) {
                const targetDate = manualTargetDates[apt.id];
                if (targetDate) {
                    const { error } = await supabase
                        .from('appointments')
                        .update({ appointment_date: targetDate, status: 'scheduled' })
                        .eq('id', apt.id);
                    if (error) throw error;
                }
            }

            setRescheduleSuccess(true);
            await refreshData();
            setTimeout(() => { setShowRescheduleModal(false); setRescheduleSuccess(false); setSelectedDate(null); }, 2000);
        } catch (error) {
            console.error('Error manual rescheduling:', error);
            setRescheduleError('Failed to reschedule appointments. Please try again.');
        }
    };

    const closeModal = () => {
        setShowRescheduleModal(false);
        setSelectedDate(null);
        setRescheduleError(null);
        setRescheduleSuccess(false);
        setManualTargetDates({});
    };

    const selectedDateAppointments = selectedDate ? getDateAppointments(selectedDate) : [];
    const scheduledAppointments = selectedDateAppointments.filter(apt => apt.status !== 'cancelled');
    const unfinishedCount = scheduledAppointments.length - completedIds.size;

    // Count how many manual targets go to each date (for warning)
    const manualTargetCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        Object.values(manualTargetDates).forEach(d => {
            if (d) counts[d] = (counts[d] || 0) + 1;
        });
        return counts;
    }, [manualTargetDates]);

    return (
        <>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Reschedule Appointments</h1>
                <p className="text-gray-600">Select a date to manage and reschedule appointments</p>
            </div>

            {/* Campus Filter + Max Bookings */}
            <div className="mb-4 flex flex-wrap items-center gap-4">
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

                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5">
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Max bookings/day:</span>
                    {editingMaxBookings ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min={1}
                                max={500}
                                value={tempMaxBookings}
                                onChange={(e) => setTempMaxBookings(parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-0.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-maroon-500 outline-none"
                            />
                            <button
                                onClick={handleSaveMaxBookings}
                                disabled={savingMaxBookings}
                                className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => { setEditingMaxBookings(false); setTempMaxBookings(maxBookingsPerDay); }}
                                className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors text-xs"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setEditingMaxBookings(true)}
                            className="font-semibold text-maroon-800 hover:underline text-sm"
                        >
                            {maxBookingsPerDay}
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-maroon-800 text-white p-3 flex items-center justify-between">
                    <button onClick={() => paginate(-1)} className="p-2 hover:bg-maroon-700 rounded-lg transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
                    <button onClick={() => paginate(1)} className="p-2 hover:bg-maroon-700 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-7 bg-gray-50 border-b">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">{day}</div>
                    ))}
                </div>

                <div className="relative overflow-hidden" style={{ minHeight: '400px' }}>
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                            key={currentMonth.toString()}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                            className="absolute inset-0 grid grid-cols-7 auto-rows-fr"
                        >
                            {calendarDays.map((day, idx) => {
                                const count = getBookingCount(day);
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const hasAppointments = count > 0;

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
                                        `}
                                    >
                                        <span className={`
                                            w-10 h-10 flex items-center justify-center rounded-full text-lg font-medium
                                            ${isToday(day) ? 'bg-maroon-800 text-white' : ''}
                                            ${!isCurrentMonth ? 'text-gray-300' : ''}
                                            ${hasAppointments && !isToday(day) && isCurrentMonth ? 'ring-2 ring-maroon-300' : ''}
                                        `}>
                                            {format(day, 'd')}
                                        </span>
                                        {isCurrentMonth && (
                                            <span className={`mt-0.5 text-[10px] font-medium ${count >= maxBookingsPerDay ? 'text-red-500' : count > 0 ? 'text-maroon-600' : 'text-gray-400'}`}>
                                                {count}/{maxBookingsPerDay}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>
                </div>

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
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex-shrink-0 px-6 py-4 border-b border-maroon-800 flex items-center justify-between bg-maroon-900 text-white">
                                <div>
                                    <h3 className="text-xl font-bold">
                                        Manage Appointments
                                    </h3>
                                    <p className="text-sm text-maroon-100 mt-1 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                        <span className="w-1 h-1 bg-maroon-400 rounded-full mx-1"></span>
                                        <Users className="w-4 h-4" />
                                        {scheduledAppointments.length} total
                                    </p>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="p-2 hover:bg-maroon-800 rounded-full transition-colors text-maroon-100 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Tabs */}
                            {!rescheduleSuccess && (
                                <div className="flex border-b border-gray-200 px-6 bg-white shrink-0">
                                    <button
                                        onClick={() => setRescheduleMode('auto')}
                                        className={`pb-4 pt-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${rescheduleMode === 'auto'
                                            ? 'border-maroon-800 text-maroon-800'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Auto Spread
                                    </button>
                                    <button
                                        onClick={() => setRescheduleMode('manual')}
                                        className={`pb-4 pt-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${rescheduleMode === 'manual'
                                            ? 'border-maroon-800 text-maroon-800'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <Calendar className="w-4 h-4" />
                                        Manual Pick
                                    </button>
                                </div>
                            )}

                            {/* Modal Content */}
                            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                                {rescheduleSuccess ? (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
                                            <Check className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">Reschedule Complete!</h4>
                                        <p className="text-gray-600 max-w-md mx-auto">
                                            {rescheduleMode === 'auto'
                                                ? 'Unmarked appointments have been automatically distributed to the nearest available future slots.'
                                                : 'Appointments have been successfully moved to their new selected dates.'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {scheduledAppointments.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                <p className="text-gray-500 font-medium">No active appointments for this date</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="sticky top-0 bg-gray-50/95 backdrop-blur-sm z-10 py-3 border-b border-gray-200 flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                                        Appointment List
                                                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs normal-case">{scheduledAppointments.length}</span>
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setCompletedIds(new Set(scheduledAppointments.map(a => a.id))); }}
                                                            className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-maroon-700 rounded-md hover:bg-maroon-50 hover:border-maroon-200 transition-all font-medium shadow-sm flex items-center gap-1.5"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Mark All Done
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setCompletedIds(new Set()); }}
                                                            className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all font-medium shadow-sm"
                                                        >
                                                            Unmark All
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                                                    {scheduledAppointments.map((apt) => {
                                                        const isChecked = completedIds.has(apt.id);
                                                        const targetDate = manualTargetDates[apt.id] || '';
                                                        const targetCount = targetDate ? (getBookingCountStr(targetDate) + (manualTargetCounts[targetDate] || 0)) : 0;
                                                        const overLimit = targetDate && targetCount > maxBookingsPerDay;

                                                        return (
                                                            <div
                                                                key={apt.id}
                                                                onClick={() => toggleCompleted(apt.id)}
                                                                className={`group relative rounded-xl border transition-all duration-200 flex flex-col overflow-hidden cursor-pointer select-none ${isChecked
                                                                    ? 'bg-green-50/30 border-green-200 shadow-sm'
                                                                    : 'bg-white border-gray-200 hover:border-maroon-300 hover:shadow-md'
                                                                    }`}
                                                            >
                                                                <div className="p-3 flex flex-col h-full relative">
                                                                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 z-10 ${isChecked
                                                                        ? 'bg-green-500 border-green-500 text-white scale-110 shadow-sm'
                                                                        : 'border-gray-200 text-transparent group-hover:border-maroon-300'
                                                                        }`}>
                                                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                                    </div>

                                                                    <div className="flex-1 flex flex-col items-center justify-center text-center w-full px-2 pt-1 pb-1">
                                                                        <h4 className={`text-base font-bold truncate leading-tight transition-colors w-full mb-1 ${isChecked ? 'text-green-800' : 'text-gray-900'}`} title={apt.patient_name}>
                                                                            {apt.patient_name || 'Unknown Patient'}
                                                                        </h4>

                                                                        <div className="flex items-center justify-center gap-2 text-[10px] md:text-[11px] text-gray-500 font-medium tracking-wide uppercase">
                                                                            {apt.patient_phone && (
                                                                                <>
                                                                                    <div className="flex items-center gap-1">
                                                                                        <Users className="w-3 h-3 text-gray-400" />
                                                                                        <span>{apt.patient_phone}</span>
                                                                                    </div>
                                                                                    <span className="text-gray-300">•</span>
                                                                                </>
                                                                            )}
                                                                            <span className={`${isChecked ? 'opacity-75' : ''}`}>
                                                                                {apt.appointment_type.replace(/_/g, ' ')}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {(!isChecked && rescheduleMode === 'manual') && (
                                                                        <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-center w-full">
                                                                            <div onClick={(e) => e.stopPropagation()} className="animate-in fade-in slide-in-from-top-1 duration-200 flex flex-col gap-2 w-full">
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                                                        <Calendar className="w-3 h-3" />
                                                                                        New Date
                                                                                    </label>
                                                                                    {targetDate && (
                                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${overLimit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                                                            {targetCount}/{maxBookingsPerDay} slots
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <input
                                                                                    type="date"
                                                                                    value={targetDate}
                                                                                    onChange={(e) => setManualTargetDates(prev => ({ ...prev, [apt.id]: e.target.value }))}
                                                                                    className={`w-full px-2 py-1 bg-white border rounded text-xs focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all ${!targetDate ? 'border-maroon-200 ring-2 ring-maroon-50' : 'border-gray-200'}`}
                                                                                />
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
                                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl mt-6 animate-shake">
                                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm font-medium">{rescheduleError}</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            {!rescheduleSuccess && scheduledAppointments.length > 0 && (
                                <div className="flex-shrink-0 p-5 border-t border-gray-200 bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSaveChecklist}
                                            disabled={isSaving}
                                            className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all text-sm shadow-sm active:scale-[0.98]"
                                        >
                                            Save Status Only
                                        </button>
                                    </div>
                                    <button
                                        onClick={rescheduleMode === 'auto' ? handleAutoReschedule : handleManualReschedule}
                                        disabled={isSaving || unfinishedCount === 0}
                                        className="px-6 py-2.5 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center gap-2.5"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span className="font-semibold">Processing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className={`w-4 h-4 ${rescheduleMode === 'auto' ? '' : 'rotate-90'}`} />
                                                <span className="font-semibold">
                                                    {rescheduleMode === 'auto'
                                                        ? `Auto Spread Remaining (${unfinishedCount})`
                                                        : `Move Selection (${unfinishedCount})`}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
