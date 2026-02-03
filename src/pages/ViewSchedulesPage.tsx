import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Header, Footer } from '~/components/layout';
import { supabase } from '~/lib/supabase';
import { formatLocalDate, getWeekBounds } from '~/lib/utils';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import type { Appointment, Campus } from '~/types';

const TIME_SLOTS = [
    { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
    { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
    { start: '13:00', end: '15:00', label: '1:00 PM - 3:00 PM' },
    { start: '15:00', end: '17:00', label: '3:00 PM - 5:00 PM' },
];

export function ViewSchedulesPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [selectedCampusId, setSelectedCampusId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCampuses = async () => {
            const { data } = await supabase.from('campuses').select('*').order('name');
            if (data) {
                setCampuses(data);
                if (data.length > 0) setSelectedCampusId(data[0].id);
            }
        };
        fetchCampuses();
    }, []);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!selectedCampusId) return;

            setIsLoading(true);
            const { start, end } = getWeekBounds(currentDate);

            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('campus_id', selectedCampusId)
                .gte('appointment_date', formatLocalDate(start))
                .lte('appointment_date', formatLocalDate(end))
                .order('appointment_date')
                .order('start_time');

            if (!error && data) {
                setAppointments(data);
            }
            setIsLoading(false);
        };

        fetchAppointments();
    }, [currentDate, selectedCampusId]);

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

    const getSlotCount = (date: Date, slotStart: string) => {
        const dateStr = formatLocalDate(date);
        return appointments.filter(
            (apt) =>
                apt.appointment_date === dateStr &&
                apt.start_time === slotStart &&
                apt.status === 'scheduled'
        ).length;
    };

    const navigateWeek = (direction: 'prev' | 'next') => {
        setCurrentDate((prev) => addDays(prev, direction === 'next' ? 7 : -7));
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <main className="flex-1 py-8 pt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Clinic Schedule</h1>
                            <p className="text-gray-600">View available appointment slots</p>
                        </div>
                        <Link
                            to="/login"
                            className="px-4 py-2 bg-maroon-800 text-white rounded-lg font-medium hover:bg-maroon-700 transition-colors"
                        >
                            Staff Login
                        </Link>
                    </div>

                    {/* Campus Selector */}
                    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Campus</label>
                        <select
                            value={selectedCampusId}
                            onChange={(e) => setSelectedCampusId(e.target.value)}
                            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                        >
                            {campuses.map((campus) => (
                                <option key={campus.id} value={campus.id}>
                                    {campus.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Calendar */}
                    <div className="bg-white rounded-xl shadow-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <button
                                onClick={() => navigateWeek('prev')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-maroon-800" />
                                <span className="font-semibold">
                                    {format(weekDays[0], 'MMM d')} - {format(weekDays[4], 'MMM d, yyyy')}
                                </span>
                            </div>
                            <button
                                onClick={() => navigateWeek('next')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="w-32 p-3 text-left text-sm font-medium text-gray-500">Time</th>
                                        {weekDays.map((day) => (
                                            <th
                                                key={day.toISOString()}
                                                className={`p-3 text-center text-sm font-medium ${isSameDay(day, new Date())
                                                        ? 'bg-maroon-50 text-maroon-800'
                                                        : 'text-gray-700'
                                                    }`}
                                            >
                                                <div>{format(day, 'EEE')}</div>
                                                <div className="text-lg font-bold">{format(day, 'd')}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center">
                                                <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                                <p className="text-gray-600">Loading schedule...</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        TIME_SLOTS.map((slot) => (
                                            <tr key={slot.start} className="border-b">
                                                <td className="p-3 text-sm font-medium text-gray-600 border-r">
                                                    {slot.label}
                                                </td>
                                                {weekDays.map((day) => {
                                                    const count = getSlotCount(day, slot.start);
                                                    const maxPerSlot = 10;
                                                    const available = maxPerSlot - count;
                                                    const isPast = day < new Date() && !isSameDay(day, new Date());

                                                    return (
                                                        <td
                                                            key={`${day.toISOString()}-${slot.start}`}
                                                            className="p-3 text-center border-r last:border-r-0"
                                                        >
                                                            {isPast ? (
                                                                <span className="text-gray-400 text-sm">-</span>
                                                            ) : (
                                                                <div
                                                                    className={`p-2 rounded-lg text-sm font-medium ${available > 5
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : available > 0
                                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                                : 'bg-red-100 text-red-800'
                                                                        }`}
                                                                >
                                                                    {available > 0 ? `${available} available` : 'Full'}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        <p>To book an appointment, please visit the clinic in person or contact the clinic staff.</p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
