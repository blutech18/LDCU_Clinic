import { useEffect, useState, useMemo } from 'react';
import { Calendar, Search, X } from 'lucide-react';
import { SidebarLayout } from '~/components/layout';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { formatDate, formatTime } from '~/lib/utils';
import type { AppointmentStatus, AppointmentType } from '~/types';

export function AppointmentsPage() {
  const { appointments, fetchAppointments, isLoading, updateAppointment, deleteAppointment } = useAppointmentStore();
  const { campuses, fetchCampuses } = useScheduleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AppointmentType | ''>('');
  const [campusFilter, setCampusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchCampuses();
  }, [fetchAppointments, fetchCampuses]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((apt) => {
        const matchesSearch = !searchTerm ||
          apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apt.patient_email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !statusFilter || apt.status === statusFilter;
        const matchesType = !typeFilter || apt.appointment_type === typeFilter;
        const matchesCampus = !campusFilter || apt.campus_id === campusFilter;
        const matchesStartDate = !startDate || apt.appointment_date >= startDate;
        const matchesEndDate = !endDate || apt.appointment_date <= endDate;
        return matchesSearch && matchesStatus && matchesType && matchesCampus && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => {
        // Sort newest to oldest
        const dateCompare = b.appointment_date.localeCompare(a.appointment_date);
        if (dateCompare !== 0) return dateCompare;
        return (b.start_time || '').localeCompare(a.start_time || '');
      });
  }, [appointments, searchTerm, statusFilter, typeFilter, campusFilter, startDate, endDate]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await updateAppointment(id, { status });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      try {
        await deleteAppointment(id);
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  const hasActiveFilters = searchTerm || statusFilter || typeFilter || campusFilter || startDate || endDate;

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTypeFilter('');
    setCampusFilter('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-600 text-sm">Manage all clinic appointments</p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-maroon-700 hover:text-maroon-900 font-medium flex items-center gap-1 self-start sm:self-auto"
          >
            <X className="w-3.5 h-3.5" />
            Clear all filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
          >
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AppointmentType | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
          >
            <option value="">All Types</option>
            <option value="physical_exam">Physical Exam</option>
            <option value="consultation">Consultation</option>
            <option value="dental">Dental</option>
          </select>
          <select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
          >
            <option value="">All Campuses</option>
            {campuses.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading appointments...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">No appointments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{apt.patient_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{apt.patient_email || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-gray-900 text-sm">{formatDate(apt.appointment_date)}</p>
                      <p className="text-xs text-gray-500">
                        {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
                      </p>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="px-2 py-1 text-xs font-medium bg-gold-100 text-gold-800 rounded capitalize">
                        {apt.appointment_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={apt.status}
                        onChange={(e) => handleStatusChange(apt.id, e.target.value as AppointmentStatus)}
                        className={`px-2 py-1 text-xs font-medium rounded border-0 ${getStatusBadge(apt.status)}`}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
