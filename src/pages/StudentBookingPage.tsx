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
    isBefore,
    parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, X, Check, AlertCircle, LogOut, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StudentLayout } from '~/components/layout';
import { LogoutModal } from '~/components/modals/LogoutModal';
import { useAuthStore } from '~/modules/auth';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate } from '~/lib/utils';
import type { AppointmentType } from '~/types';

const TIME_SLOTS = [
    { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
    { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
    { start: '13:00', end: '15:00', label: '1:00 PM - 3:00 PM' },
    { start: '15:00', end: '17:00', label: '3:00 PM - 5:00 PM' },
];

const APPOINTMENT_TYPES = [
    { value: 'consultation', label: 'Consultation' },
    { value: 'physical_exam', label: 'Physical Exam' },
    { value: 'dental', label: 'Dental' },
];

export function StudentBookingPage() {
    const { profile, logout } = useAuthStore();
    const { appointments, fetchAppointments, fetchBookingCounts, bookingCounts, createAppointment, isLoading, isSaving } = useAppointmentStore();
    const { campuses, departments, fetchCampuses, fetchDepartments, fetchBookingSetting, bookingSetting } = useScheduleStore();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [appointmentType, setAppointmentType] = useState<AppointmentType>('consultation');
    const [selectedCampus, setSelectedCampus] = useState<string>('');
    const [fullName, setFullName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [notes, setNotes] = useState('');
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [direction, setDirection] = useState(0);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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
        // Fetch appointments for current month + buffer
        const start = startOfMonth(subMonths(currentMonth, 1));
        const end = endOfMonth(addMonths(currentMonth, 1));
        const startStr = formatLocalDate(start);
        const endStr = formatLocalDate(end);
        fetchAppointments({
            dateRange: { start: startStr, end: endStr },
        });
        fetchBookingCounts(startStr, endStr, selectedCampus || undefined);
    }, [currentMonth, fetchAppointments, fetchBookingCounts, selectedCampus]);

    // Set default campus and fetch related data
    useEffect(() => {
        if (campuses.length > 0 && !selectedCampus) {
            const campusId = profile?.campus_id || campuses[0].id;
            setSelectedCampus(campusId);
        }
    }, [campuses, selectedCampus, profile?.campus_id]);

    // Fetch departments and booking settings when campus changes
    useEffect(() => {
        if (selectedCampus) {
            fetchDepartments(selectedCampus);
            fetchBookingSetting(selectedCampus);
        }
    }, [selectedCampus, fetchDepartments, fetchBookingSetting]);

    // Pre-fill form fields from profile
    useEffect(() => {
        if (profile) {
            setFullName(`${profile.first_name || ''} ${profile.middle_name ? profile.middle_name + ' ' : ''}${profile.last_name || ''}`.trim());
            setContactNumber(profile.contact_number || profile.phone || '');
            if (profile.department_id) {
                setSelectedDepartment(profile.department_id);
            }
        }
    }, [profile]);

    const maxBookingsPerDay = bookingSetting?.max_bookings_per_day || 50;

    // Get user's appointments
    const myAppointments = useMemo(() => {
        return appointments.filter((apt) => apt.patient_id === profile?.id);
    }, [appointments, profile?.id]);

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

    // Check if date has user's appointment
    const getDateAppointments = (date: Date) => {
        const dateStr = formatLocalDate(date);
        return myAppointments.filter((apt) => apt.appointment_date === dateStr);
    };

    // Get booking count for a date
    const getBookingCount = (date: Date) => {
        const dateStr = formatLocalDate(date);
        return bookingCounts[dateStr] || 0;
    };

    // Check if date is full
    const isDateFull = (date: Date) => {
        return getBookingCount(date) >= maxBookingsPerDay;
    };

    // Check if date is bookable (not in past, not weekend, not full)
    const isDateBookable = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = date.getDay();
        return !isBefore(date, today) && dayOfWeek !== 0 && dayOfWeek !== 6 && !isDateFull(date);
    };

    // Get available slots for a date
    const getAvailableSlots = (date: Date) => {
        const dateStr = formatLocalDate(date);
        const bookedSlots = appointments
            .filter((apt) => apt.appointment_date === dateStr && apt.status !== 'cancelled')
            .map((apt) => apt.start_time);

        return TIME_SLOTS.filter((slot) => !bookedSlots.includes(slot.start));
    };

    const handleDateClick = (date: Date) => {
        if (!isDateBookable(date)) return;
        setSelectedDate(date);
        setSelectedSlot(null);
        setShowBookingModal(true);
        setBookingError(null);
        setBookingSuccess(false);
    };

    const handleBookAppointment = async () => {
        if (!selectedDate || !selectedSlot || !selectedCampus || !profile) return;

        if (!fullName.trim()) {
            setBookingError('Please enter your full name.');
            return;
        }
        if (!contactNumber.trim()) {
            setBookingError('Please enter your contact number.');
            return;
        }
        if (!selectedDepartment) {
            setBookingError('Please select your department.');
            return;
        }

        // Check booking limit again before submitting
        const dateStr = formatLocalDate(selectedDate);
        const currentCount = bookingCounts[dateStr] || 0;
        if (currentCount >= maxBookingsPerDay) {
            setBookingError('This date is fully booked. Please select another date.');
            return;
        }

        try {
            setBookingError(null);
            const slot = TIME_SLOTS.find((s) => s.start === selectedSlot);

            const dept = departments.find(d => d.id === selectedDepartment);

            await createAppointment({
                patient_id: profile.id,
                campus_id: selectedCampus,
                appointment_type: appointmentType,
                appointment_date: dateStr,
                start_time: selectedSlot,
                end_time: slot?.end || '',
                status: 'scheduled',
                notes: notes ? `Department: ${dept?.name || selectedDepartment}\n${notes}` : `Department: ${dept?.name || selectedDepartment}`,
                patient_name: fullName.trim(),
                patient_email: profile.email,
                patient_phone: contactNumber.trim(),
            });

            setBookingSuccess(true);
            setNotes('');

            // Refresh appointments and counts
            const start = startOfMonth(subMonths(currentMonth, 1));
            const end = endOfMonth(addMonths(currentMonth, 1));
            const startStr = formatLocalDate(start);
            const endStr = formatLocalDate(end);
            await fetchAppointments({
                dateRange: { start: startStr, end: endStr },
            });
            await fetchBookingCounts(startStr, endStr, selectedCampus || undefined);

            // Close modal after delay
            setTimeout(() => {
                setShowBookingModal(false);
                setBookingSuccess(false);
                setSelectedDate(null);
                setSelectedSlot(null);
            }, 2000);
        } catch (error) {
            console.error('Error booking appointment:', error);
            setBookingError('Failed to book appointment. Please try again.');
        }
    };

    const closeModal = () => {
        setShowBookingModal(false);
        setSelectedDate(null);
        setSelectedSlot(null);
        setBookingError(null);
        setBookingSuccess(false);
    };

    const handleLogout = () => {
        logout();
        setIsLogoutModalOpen(false);
    };

    return (
        <StudentLayout>

            <div className="lg:h-[calc(100vh-4rem)] h-auto flex flex-col max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Header */}
                <div className="mb-4 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Book an Appointment</h1>
                    <span className="hidden sm:inline text-gray-400">-</span>
                    <p className="text-gray-600 text-sm">Select a date on the calendar to book your clinic appointment</p>
                </div>

                <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 flex-1 lg:h-full lg:overflow-hidden">
                    {/* Calendar */}
                    <div className="lg:col-span-2 flex flex-col overflow-hidden h-auto lg:h-full">
                        <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-full">
                            {/* Calendar Header */}
                            <div className="bg-maroon-800 text-white p-3 flex items-center justify-between flex-shrink-0 z-10 relative">
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
                            <div className="grid grid-cols-7 bg-gray-50 border-b flex-shrink-0 z-10 relative">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="p-2 text-center text-xs sm:text-sm font-medium text-gray-600">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="flex-1 relative overflow-hidden min-h-[300px] sm:min-h-0 bg-white">
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
                                            const dateAppointments = getDateAppointments(day);
                                            const hasAppointment = dateAppointments.length > 0;
                                            const bookable = isDateBookable(day);
                                            const isCurrentMonth = isSameMonth(day, currentMonth);
                                            const count = getBookingCount(day);
                                            const full = isDateFull(day);
                                            const isWeekday = day.getDay() !== 0 && day.getDay() !== 6;
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const isPast = isBefore(day, today);

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleDateClick(day)}
                                                    disabled={!bookable || !isCurrentMonth}
                                                    className={`
                                                        flex flex-col items-center justify-center p-1 border-b border-r border-gray-100
                                                        transition-all duration-200 cursor-pointer
                                                        ${!isCurrentMonth ? 'text-gray-300' : ''}
                                                        ${(day.getDay() === 0 || day.getDay() === 6) ? 'bg-gray-50' : 'bg-white'}
                                                        ${full && isCurrentMonth && isWeekday && !isPast ? 'bg-red-50' : ''}
                                                        ${!bookable || !isCurrentMonth ? 'cursor-not-allowed' : 'hover:bg-maroon-50'}
                                                    `}
                                                >
                                                    <span
                                                        className={`
                                                            w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full
                                                            text-sm sm:text-lg font-medium
                                                            ${isToday(day) ? 'bg-maroon-800 text-white' : ''}
                                                            ${!isCurrentMonth ? 'text-gray-300' : ''}
                                                            ${hasAppointment && !isToday(day) && isCurrentMonth ? 'ring-2 ring-maroon-300' : ''}
                                                        `}
                                                    >
                                                        {format(day, 'd')}
                                                    </span>
                                                    {isCurrentMonth && isWeekday && !isPast && (
                                                        <span className={`mt-0.5 text-[10px] font-medium ${full ? 'text-red-500' : count > 0 ? 'text-maroon-600' : 'text-gray-400'}`}>
                                                            {count}/{maxBookingsPerDay}
                                                        </span>
                                                    )}
                                                    {hasAppointment && isCurrentMonth && (
                                                        <span className="w-1.5 h-1.5 bg-maroon-600 rounded-full"></span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            {/* Legend */}
                            <div className="p-3 border-t bg-gray-50 flex flex-wrap items-center gap-4 text-xs sm:text-sm flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-maroon-800 rounded-full shadow-sm"></span>
                                    <span className="text-gray-700 font-medium">Today</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 ring-2 ring-maroon-300 rounded-full shadow-sm"></span>
                                    <span className="text-gray-700 font-medium">Has appointments</span>
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
                    </div>

                    {/* My Appointments Sidebar */}
                    <div className="lg:col-span-1 flex flex-col overflow-hidden h-full flex-1">
                        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full overflow-hidden">
                            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2 flex-shrink-0">
                                <Calendar className="w-4 h-4 text-maroon-800" />
                                My Appointments
                            </h3>

                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                </div>
                            ) : myAppointments.filter((apt) => apt.status === 'scheduled').length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No upcoming appointments</p>
                                </div>
                            ) : (
                                <div className="space-y-2 overflow-y-auto flex-1">
                                    {myAppointments
                                        .filter((apt) => apt.status === 'scheduled')
                                        .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
                                        .map((apt) => (
                                            <div
                                                key={apt.id}
                                                className="p-2.5 bg-gray-50 rounded-lg border-l-4 border-maroon-800"
                                            >
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {format(parseISO(apt.appointment_date), 'MMM d, yyyy')}
                                                </p>
                                                <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {TIME_SLOTS.find((s) => s.start === apt.start_time)?.label || apt.start_time}
                                                </p>
                                                <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize">
                                                    {apt.appointment_type.replace('_', ' ')}
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Mobile Logout Button */}
                        <button
                            onClick={() => setIsLogoutModalOpen(true)}
                            className="mt-6 w-full bg-maroon-800 text-white py-3 rounded-lg font-medium shadow-sm hover:bg-maroon-900 transition-colors flex items-center justify-center gap-2 sm:hidden flex-shrink-0"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            <AnimatePresence>
                {showBookingModal && selectedDate && (
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
                            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-maroon-900 text-white rounded-t-xl">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Book Appointment - {format(selectedDate, 'MMM d, yyyy')}
                                    </h3>
                                    <p className="text-sm text-maroon-200 flex items-center gap-1 mt-0.5">
                                        <Users className="w-3.5 h-3.5" />
                                        {getBookingCount(selectedDate)} / {maxBookingsPerDay} booked
                                    </p>
                                </div>
                                <button onClick={closeModal} className="p-1 hover:bg-maroon-800 rounded transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                                {bookingSuccess ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Check className="w-8 h-8 text-green-600" />
                                        </div>
                                        <h4 className="text-lg font-semibold text-gray-900">Appointment Booked!</h4>
                                        <p className="text-gray-600 mt-1">We'll see you on {format(selectedDate, 'MMMM d, yyyy')}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Appointment Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {APPOINTMENT_TYPES.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => setAppointmentType(type.value as AppointmentType)}
                                                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${appointmentType === type.value
                                                            ? 'bg-maroon-800 text-white border-maroon-800 shadow-sm'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Full Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Enter your full name"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none transition-shadow"
                                            />
                                        </div>

                                        {/* Contact Number */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                                            <input
                                                type="tel"
                                                value={contactNumber}
                                                onChange={(e) => setContactNumber(e.target.value)}
                                                placeholder="Enter your contact number"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none transition-shadow"
                                            />
                                        </div>

                                        {/* Department */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                            <select
                                                value={selectedDepartment}
                                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none transition-shadow"
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map((dept) => (
                                                    <option key={dept.id} value={dept.id}>
                                                        {dept.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Campus Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
                                            <select
                                                value={selectedCampus}
                                                onChange={(e) => setSelectedCampus(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none transition-shadow"
                                            >
                                                {campuses.map((campus) => (
                                                    <option key={campus.id} value={campus.id}>
                                                        {campus.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Time Slot Selection */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Available Time Slots</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {getAvailableSlots(selectedDate).length === 0 ? (
                                                    <div className="col-span-full text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                                                        <Clock className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                                        <p className="text-gray-500 text-sm">No available slots for this date</p>
                                                    </div>
                                                ) : (
                                                    getAvailableSlots(selectedDate).map((slot) => (
                                                        <button
                                                            key={slot.start}
                                                            onClick={() => setSelectedSlot(slot.start)}
                                                            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${selectedSlot === slot.start
                                                                ? 'bg-maroon-800 text-white border-maroon-800 shadow-md transform scale-[1.02]'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:border-maroon-500 hover:bg-gray-50 hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <Clock className="w-4 h-4" />
                                                            {slot.label}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                placeholder="Any additional information..."
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none resize-none transition-shadow"
                                                rows={3}
                                            />
                                        </div>

                                        {/* Error Message */}
                                        {bookingError && (
                                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg animate-fade-in">
                                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                                <p className="text-sm">{bookingError}</p>
                                            </div>
                                        )}

                                        {/* Book Button */}
                                        <div className="pt-2">
                                            <button
                                                onClick={handleBookAppointment}
                                                disabled={!selectedSlot || isSaving}
                                                className="w-full py-3 px-4 bg-maroon-800 text-white font-medium rounded-lg hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.99]"
                                            >
                                                {isSaving ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        <span>Booking...</span>
                                                    </div>
                                                ) : (
                                                    'Book Appointment'
                                                )}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <LogoutModal
                isOpen={isLogoutModalOpen}
                onClose={() => setIsLogoutModalOpen(false)}
                onConfirm={handleLogout}
            />
        </StudentLayout>
    );
}
