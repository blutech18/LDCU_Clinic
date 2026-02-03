import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { SidebarLayout } from '~/components/layout';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatLocalDate, getWeekBounds } from '~/lib/utils';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

const TIME_SLOTS = [
  { start: '08:00', end: '10:00', label: '8:00 AM - 10:00 AM' },
  { start: '10:00', end: '12:00', label: '10:00 AM - 12:00 PM' },
  { start: '13:00', end: '15:00', label: '1:00 PM - 3:00 PM' },
  { start: '15:00', end: '17:00', label: '3:00 PM - 5:00 PM' },
];

export function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { appointments, fetchAppointments, isLoading } = useAppointmentStore();
  const { campuses, fetchCampuses, selectedCampusId, setSelectedCampus } = useScheduleStore();

  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  useEffect(() => {
    const { start, end } = getWeekBounds(currentDate);
    fetchAppointments({
      dateRange: {
        start: formatLocalDate(start),
        end: formatLocalDate(end),
      },
      ...(selectedCampusId && { campusId: selectedCampusId }),
    });
  }, [currentDate, selectedCampusId, fetchAppointments]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForSlot = (date: Date, slotStart: string) => {
    const dateStr = formatLocalDate(date);
    return appointments.filter(
      (apt) => apt.appointment_date === dateStr && apt.start_time === slotStart
    );
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => addDays(prev, direction === 'next' ? 7 : -7));
  };

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

        {/* Calendar Navigation */}
        <div className="bg-white rounded-xl shadow-md mb-6">
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

          {/* Schedule Grid */}
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
                        const slotAppointments = getAppointmentsForSlot(day, slot.start);
                        return (
                          <td
                            key={`${day.toISOString()}-${slot.start}`}
                            className="p-2 min-w-[150px] align-top border-r last:border-r-0"
                          >
                            <div className="space-y-1">
                              {slotAppointments.map((apt) => (
                                <div
                                  key={apt.id}
                                  className={`p-2 rounded text-xs ${apt.appointment_type === 'physical_exam'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-green-100 text-green-800'
                                    }`}
                                >
                                  <p className="font-medium truncate">{apt.patient_name || 'Unknown'}</p>
                                  <p className="opacity-75 capitalize">
                                    {apt.appointment_type.replace('_', ' ')}
                                  </p>
                                </div>
                              ))}
                              {slotAppointments.length === 0 && (
                                <div className="h-16 flex items-center justify-center text-gray-400 text-xs">
                                  Available
                                </div>
                              )}
                            </div>
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
    </SidebarLayout>
  );
}
