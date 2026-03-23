import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, FileText, AlertCircle } from 'lucide-react';
import { useAuthStore } from '~/modules/auth';
import { useAppointmentStore } from '~/modules/appointments';
import { formatDate, formatLocalDate } from '~/lib/utils';

export function DashboardPage() {
  const { profile } = useAuthStore();
  const { appointments, fetchAppointments, isLoading } = useAppointmentStore();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Nurses: auto-filter by their assigned campus
        const nurseCampus = profile?.role === 'nurse' && profile.assigned_campus_id
          ? profile.assigned_campus_id
          : undefined;
        await fetchAppointments(nurseCampus ? { campusId: nurseCampus } : undefined);
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, [fetchAppointments, profile?.role, profile?.assigned_campus_id]);

  // Calculate stats from appointments
  const todayStr = formatLocalDate(new Date());

  const stats = {
    today: appointments.filter((a) => a.status === 'scheduled' && a.appointment_date === todayStr).length,
    needsReschedule: appointments.filter((a) => a.status === 'scheduled' && a.appointment_date < todayStr).length,
    upcoming: appointments.filter((a) => a.status === 'scheduled' && a.appointment_date > todayStr).length,
    completed: appointments.filter((a) => a.status === 'completed').length,
  };

  // Appointments that are past their date but still "scheduled" — need rescheduling
  const needsRescheduleAppointments = appointments
    .filter((a) => a.status === 'scheduled' && a.appointment_date < todayStr)
    .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
    .slice(0, 5);

  // Get upcoming appointments (active future)
  const upcomingAppointments = appointments
    .filter((a) => a.status === 'scheduled' && a.appointment_date >= todayStr)
    .sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.start_time}`);
      const dateB = new Date(`${b.appointment_date}T${b.start_time}`);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 relative overflow-hidden rounded-3xl bg-maroon-800 text-white p-8 sm:p-10 shadow-lg">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-80 h-80 bg-red-400 opacity-10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 animate-slide-up">
            Welcome, {profile?.first_name || 'User'}!
          </h1>
          <p className="text-maroon-100 max-w-xl text-sm sm:text-base opacity-90">
            Here's what's happening at the clinic today. Manage your appointments and schedule effortlessly.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        {/* Today */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full transition-transform group-hover:scale-[2] duration-500 ease-out"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Today</p>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? '...' : stats.today}
              </h3>
            </div>
            <div className="flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-100 text-blue-600 items-center justify-center shadow-inner">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Needs Reschedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-50 rounded-full transition-transform group-hover:scale-[2] duration-500 ease-out"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="max-w-[60%] sm:max-w-none">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 truncate sm:whitespace-normal">Needs Resched</p>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? '...' : stats.needsReschedule}
              </h3>
            </div>
            <div className="flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 text-red-600 items-center justify-center shadow-inner">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-50 rounded-full transition-transform group-hover:scale-[2] duration-500 ease-out"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Upcoming</p>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? '...' : stats.upcoming}
              </h3>
            </div>
            <div className="flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-100 text-indigo-600 items-center justify-center shadow-inner">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full transition-transform group-hover:scale-[2] duration-500 ease-out"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Completed</p>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                {isLoading ? '...' : stats.completed}
              </h3>
            </div>
            <div className="flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-100 text-emerald-600 items-center justify-center shadow-inner">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              Upcoming Appointments
            </h2>
            <Link
              to="/appointments"
              className="text-sm font-semibold text-maroon-800 hover:text-maroon-600 transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <Calendar className="w-12 h-12 mb-3 opacity-30 text-gray-500" />
              <p className="font-medium">No upcoming appointments</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {(appointment.patient_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm group-hover:text-maroon-800 transition-colors">
                        {appointment.patient_name || 'Unknown Patient'}
                      </p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {formatDate(appointment.appointment_date)}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded-lg border border-blue-100/50">
                    {appointment.appointment_type.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Needs Reschedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[420px]">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Needs Reschedule
            </h2>
            <Link to="/appointments" className="text-sm font-semibold text-maroon-800 hover:text-maroon-600 transition-colors">
              View all &rarr;
            </Link>
          </div>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <div className="w-8 h-8 border-4 border-red-200 border-t-red-500 rounded-full animate-spin"></div>
            </div>
          ) : needsRescheduleAppointments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <AlertCircle className="w-12 h-12 mb-3 opacity-30 text-gray-500" />
              <p className="font-medium">No overdue appointments</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {needsRescheduleAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-xl hover:bg-red-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {(apt.patient_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-sm truncate">
                        {apt.patient_name || 'Unknown Patient'}
                      </p>
                      <p className="text-xs text-red-600 font-medium mt-0.5">
                        Overdue: {formatDate(apt.appointment_date)}
                      </p>
                    </div>
                  </div>
                  <span className="ml-3 shrink-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 rounded-lg border border-red-200/50">
                    {apt.appointment_type.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
