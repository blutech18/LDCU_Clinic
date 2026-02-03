import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, FileText } from 'lucide-react';
import { SidebarLayout } from '~/components/layout';
import { useAuthStore } from '~/modules/auth';
import { useAppointmentStore } from '~/modules/appointments';
import { formatDate, formatTime } from '~/lib/utils';

export function DashboardPage() {
  const { profile } = useAuthStore();
  const { appointments, fetchAppointments, isLoading } = useAppointmentStore();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchAppointments();
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, [fetchAppointments]);

  // Calculate stats from appointments
  const stats = {
    total: appointments.length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    upcoming: appointments.filter((a) => a.status === 'scheduled').length,
  };

  // Get upcoming appointments
  const upcomingAppointments = appointments
    .filter((a) => a.status === 'scheduled')
    .slice(0, 5);

  if (initialLoading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 animate-slide-up">
          Welcome, {profile?.first_name || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Manage your clinic appointments and schedule new ones.
        </p>
      </div>

      {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-maroon-800 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {isLoading ? '...' : stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-maroon-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-maroon-800" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {isLoading ? '...' : stats.completed}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {isLoading ? '...' : stats.upcoming}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
              <Link
                to="/appointments"
                className="text-sm text-maroon-800 hover:underline"
              >
                View all
              </Link>
            </div>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {appointment.patient_name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(appointment.appointment_date)} at{' '}
                        {formatTime(appointment.start_time)}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {appointment.appointment_type.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/schedule"
                className="flex flex-col items-center p-4 bg-maroon-50 rounded-lg hover:bg-maroon-100 transition-colors"
              >
                <Calendar className="w-8 h-8 text-maroon-800 mb-2" />
                <span className="text-sm font-medium text-maroon-800">View Schedule</span>
              </Link>
              <Link
                to="/appointments"
                className="flex flex-col items-center p-4 bg-gold-50 rounded-lg hover:bg-gold-100 transition-colors"
              >
                <FileText className="w-8 h-8 text-gold-700 mb-2" />
                <span className="text-sm font-medium text-gold-700">All Appointments</span>
              </Link>
            </div>
          </div>
        </div>
    </SidebarLayout>
  );
}
