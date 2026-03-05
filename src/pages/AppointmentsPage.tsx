import { useEffect, useState, useMemo } from 'react';
import { Calendar, Search, X, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppointmentStore } from '~/modules/appointments';
import { useScheduleStore } from '~/modules/schedule';
import { useAuthStore } from '~/modules/auth';
import { formatDate } from '~/lib/utils';
import type { AppointmentStatus, AppointmentType } from '~/types';
import { supabase } from '~/lib/supabase';

export function AppointmentsPage() {
  const { appointments, fetchAppointments, isLoading, updateAppointment, deleteAppointment } = useAppointmentStore();
  const { campuses, fetchCampuses } = useScheduleStore();
  const { profile } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AppointmentType | ''>('');
  const [campusFilter, setCampusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState<'appointment_date' | 'patient_name' | 'status' | 'appointment_type'>('appointment_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [patientAvatars, setPatientAvatars] = useState<Record<string, string>>({});

  // Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [pendingStatus, setPendingStatus] = useState<AppointmentStatus | ''>('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Fetch patient avatars for appointments that have a linked profile
  useEffect(() => {
    const ids = appointments
      .filter((a) => a.patient_id)
      .map((a) => a.patient_id as string);

    if (ids.length === 0) {
      setPatientAvatars({});
      return;
    }

    const uniqueIds = Array.from(new Set(ids));

    supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', uniqueIds)
      .then(({ data, error }) => {
        if (error || !data) return;
        const map: Record<string, string> = {};
        data.forEach((p) => {
          if (p.avatar_url) map[p.id] = p.avatar_url;
        });
        setPatientAvatars(map);
      });
  }, [appointments]);

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

  const openStatusModal = (apt: any) => {
    setSelectedAppointment(apt);
    setPendingStatus(apt.status);
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedAppointment || !pendingStatus) return;
    setIsSavingStatus(true);
    try {
      await updateAppointment(selectedAppointment.id, { status: pendingStatus as AppointmentStatus });
      setIsStatusModalOpen(false);
    } catch (error) {
      console.error('Failed to save status:', error);
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteAppointment(deleteTarget.id);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
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
        <div className="flex flex-col xl:flex-row gap-3 w-full">
          {/* Search Bar */}
          <div className="relative h-[42px] w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-9 pr-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow"
            />
          </div>

          {/* Filters Wrap */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap lg:flex-nowrap gap-3 items-center w-full xl:w-auto">
            {profile?.role !== 'nurse' && (
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                className="h-[42px] px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow cursor-pointer appearance-none w-full md:w-[150px]"
              >
                <option value="">All Campuses</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AppointmentStatus | '')}
              className="h-[42px] px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow cursor-pointer appearance-none w-full md:w-[150px]"
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
              className="h-[42px] px-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow cursor-pointer appearance-none w-full md:w-[150px]"
            >
              <option value="">All Types</option>
              <option value="physical_exam">Physical Exam</option>
              <option value="consultation">Consultation</option>
              <option value="dental">Dental</option>
            </select>

            {/* Date Range Wrapper */}
            <div className="col-span-2 md:col-span-auto grid grid-cols-2 sm:flex sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative border border-gray-300 rounded-lg h-[42px] bg-white focus-within:ring-2 focus-within:ring-maroon-500 focus-within:border-maroon-500 transition-shadow flex items-center flex-1 lg:w-[200px] xl:w-[220px] overflow-hidden">
                <span className="w-10 sm:w-12 text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap select-none border-r border-gray-100 h-full flex items-center justify-center bg-gray-50/50 rounded-l-lg shrink-0">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 h-full bg-transparent px-2 sm:px-3 outline-none text-sm text-gray-700 cursor-pointer min-w-0 w-full"
                />
              </div>
              <div className="relative border border-gray-300 rounded-lg h-[42px] bg-white focus-within:ring-2 focus-within:ring-maroon-500 focus-within:border-maroon-500 transition-shadow flex items-center flex-1 lg:w-[200px] xl:w-[220px] overflow-hidden">
                <span className="w-10 sm:w-12 text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider whitespace-nowrap select-none border-r border-gray-100 h-full flex items-center justify-center bg-gray-50/50 rounded-l-lg shrink-0">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 h-full bg-transparent px-2 sm:px-3 outline-none text-sm text-gray-700 cursor-pointer min-w-0 w-full"
                />
              </div>
            </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[280px] max-w-[280px]">
                    Patient
                  </th>

                  {/* Sortable: Date */}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <button
                      onClick={() => toggleSort('appointment_date')}
                      className="inline-flex items-center justify-center gap-1 hover:text-gray-800 transition-colors"
                    >
                      Date
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
                    <td className="px-4 py-3.5 max-w-[280px]">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        {(() => {
                          const avatarUrl =
                            (apt as any).profiles?.avatar_url ||
                            (apt.patient_id ? patientAvatars[apt.patient_id] : undefined);
                          const initials = (apt.patient_name || '?')[0].toUpperCase();
                          const colors = ['bg-violet-100 text-violet-700', 'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700'];
                          const colorClass = colors[(apt.patient_name?.charCodeAt(0) || 0) % colors.length];
                          return avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={apt.patient_name || ''}
                              className="w-9 h-9 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${colorClass}`}>
                              {initials}
                            </div>
                          );
                        })()}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{apt.patient_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{apt.patient_email || '-'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Date — centered */}
                    <td className="px-4 py-3.5 text-center">
                      <p className="text-gray-900 text-sm font-medium">{formatDate(apt.appointment_date)}</p>
                    </td>

                    {/* Type — centered */}
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <span className="inline-block px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full capitalize">
                        {apt.appointment_type.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Status — centered */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => openStatusModal(apt)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border-0 transition-opacity hover:opacity-80 active:scale-95 ${getStatusBadge(apt.status)}`}
                      >
                        <span className="capitalize">{apt.status.replace('_', ' ')}</span>
                        <Edit2 className="w-3 h-3 opacity-60" />
                      </button>
                    </td>

                    {/* Actions — centered */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleDelete(apt.id, apt.patient_name || 'this appointment')}
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

      {/* ── Status Update Modal ── */}
      <AnimatePresence>
        {isStatusModalOpen && selectedAppointment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingStatus && setIsStatusModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex flex-wrap sm:flex-nowrap items-baseline gap-2">
                <h3 className="text-lg font-bold text-gray-900 shrink-0">Update Status</h3>
                <p className="text-lg text-gray-500 truncate min-w-0">
                  for <span className="font-bold text-gray-800 uppercase">
                    {(selectedAppointment.patient_name || '').split(' ').pop() || 'Unknown'}
                  </span>
                </p>
              </div>

              {/* Body */}
              <div className="px-5 py-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPendingStatus('scheduled')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${pendingStatus === 'scheduled' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Scheduled</span>
                  </button>
                  <button
                    onClick={() => setPendingStatus('completed')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${pendingStatus === 'completed' ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50/30'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
                  </button>
                  <button
                    onClick={() => setPendingStatus('cancelled')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${pendingStatus === 'cancelled' ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50/30'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Cancelled</span>
                  </button>
                  <button
                    onClick={() => setPendingStatus('no_show')}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${pendingStatus === 'no_show' ? 'bg-gray-100 border-gray-500 text-gray-800 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">No Show</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 flex gap-3 mt-1 bg-gray-50/80 border-t border-gray-100">
                <button
                  disabled={isSavingStatus}
                  onClick={() => setIsStatusModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={isSavingStatus || pendingStatus === selectedAppointment.status}
                  onClick={handleSaveStatus}
                  className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex justify-center items-center text-sm"
                >
                  {isSavingStatus ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Save Status'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setDeleteTarget(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Appointment?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You are about to permanently delete the appointment for{' '}
                  <span className="font-semibold text-gray-800">{deleteTarget.name}</span>.
                  This action cannot be undone.
                </p>
              </div>
              <div className="p-5 flex gap-3 mt-2 bg-gray-50/80 border-t border-gray-100">
                <button
                  disabled={isDeleting}
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex justify-center items-center text-sm"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
