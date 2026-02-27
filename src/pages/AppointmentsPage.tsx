import { useEffect, useState, useMemo } from 'react';
import { Calendar, Search, X, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
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
  const [sortField, setSortField] = useState<'appointment_date' | 'patient_name' | 'status' | 'appointment_type'>('appointment_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-maroon-700" /> : <ChevronDown className="w-3 h-3 text-maroon-700" />;
  };

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
        let cmp = 0;
        if (sortField === 'appointment_date') {
          cmp = a.appointment_date.localeCompare(b.appointment_date) || (a.start_time || '').localeCompare(b.start_time || '');
        } else if (sortField === 'patient_name') {
          cmp = (a.patient_name || '').localeCompare(b.patient_name || '');
        } else if (sortField === 'status') {
          cmp = a.status.localeCompare(b.status);
        } else if (sortField === 'appointment_type') {
          cmp = a.appointment_type.localeCompare(b.appointment_type);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [appointments, searchTerm, statusFilter, typeFilter, campusFilter, startDate, endDate, sortField, sortDir]);

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
    <>
      {/* Page Header */}
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
        {/* Results count */}
        {!isLoading && (
          <div className="px-4 py-2 border-b bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {filteredAppointments.length}{' '}
              {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found
            </span>
          </div>
        )}

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
                  {/* First column — left-aligned, no sort */}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[200px] max-w-[200px]">
                    Patient
                  </th>

                  {/* Sortable: Date & Time */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <button
                      onClick={() => toggleSort('appointment_date')}
                      className="inline-flex items-center justify-center gap-1 hover:text-gray-800 transition-colors"
                    >
                      Date &amp; Time
                      <SortIcon field="appointment_date" />
                    </button>
                  </th>

                  {/* Sortable: Type */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    <button
                      onClick={() => toggleSort('appointment_type')}
                      className="inline-flex items-center justify-center gap-1 hover:text-gray-800 transition-colors"
                    >
                      Type
                      <SortIcon field="appointment_type" />
                    </button>
                  </th>

                  {/* Sortable: Status */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <button
                      onClick={() => toggleSort('status')}
                      className="inline-flex items-center justify-center gap-1 hover:text-gray-800 transition-colors"
                    >
                      Status
                      <SortIcon field="status" />
                    </button>
                  </th>

                  {/* Actions — centered, no sort */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                    {/* Patient — left-aligned */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="font-medium text-gray-900 text-sm truncate">{apt.patient_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{apt.patient_email || '-'}</p>
                    </td>

                    {/* Date & Time — centered */}
                    <td className="px-4 py-3.5 text-center">
                      <p className="text-gray-900 text-sm font-medium">{formatDate(apt.appointment_date)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatTime(apt.start_time)} – {formatTime(apt.end_time)}
                      </p>
                    </td>

                    {/* Type — centered */}
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <span className="inline-block px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full capitalize">
                        {apt.appointment_type.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Status — centered */}
                    <td className="px-4 py-3.5 text-center">
                      <select
                        value={apt.status}
                        onChange={(e) => handleStatusChange(apt.id, e.target.value as AppointmentStatus)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${getStatusBadge(apt.status)}`}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </td>

                    {/* Actions — centered */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Delete appointment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
