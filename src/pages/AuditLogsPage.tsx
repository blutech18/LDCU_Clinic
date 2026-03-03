import { useState, useEffect } from 'react';
import { Filter, Calendar, User, MapPin, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '~/lib/supabase';
import type { Campus } from '~/types';

interface UserOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  campus_id: string | null;
  details: any;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  campus?: {
    name: string;
  };
}

export function AuditLogsPage() {
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]); // Store all logs
  const [logs, setLogs] = useState<AuditLog[]>([]); // Filtered logs for display
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    campusId: '',
    action: '',
    role: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchCampuses();
    fetchUsers();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  // Live search and filter effect
  useEffect(() => {
    applyFilters();
  }, [searchTerm, allLogs]);

  const fetchCampuses = async () => {
    try {
      const { data, error } = await supabase
        .from('campuses')
        .select('*')
        .order('name');

      if (error) throw error;
      setCampuses(data || []);
    } catch (error) {
      console.error('Error fetching campuses:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:profiles!audit_logs_user_id_fkey(first_name, last_name, email, role),
          campus:campuses(name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.campusId) {
        query = query.eq('campus_id', filters.campusId);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by role and userId if specified (client-side since they're nested fields)
      let filteredData = data || [];
      if (filters.role) {
        filteredData = filteredData.filter(log => log.user?.role === filters.role);
      }
      if (filters.userId) {
        filteredData = filteredData.filter(log => log.user_id === filters.userId);
      }

      setAllLogs(filteredData);
      applyFilters(filteredData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (logsToFilter?: AuditLog[]) => {
    const sourceData = logsToFilter || allLogs;
    let filteredData = [...sourceData];

    // Filter by search term
    if (searchTerm) {
      filteredData = filteredData.filter(log => {
        const searchLower = searchTerm.toLowerCase();
        return (
          log.user?.first_name?.toLowerCase().includes(searchLower) ||
          log.user?.last_name?.toLowerCase().includes(searchLower) ||
          log.user?.email?.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower) ||
          log.resource_type.toLowerCase().includes(searchLower)
        );
      });
    }

    setLogs(filteredData);
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'ASSIGN':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDetails = (log: AuditLog) => {
    if (!log.details || Object.keys(log.details).length === 0) return null;

    const details = log.details;
    const items: string[] = [];

    // Format based on resource type and action
    if (log.resource_type === 'appointment') {
      if (log.action === 'CREATE') {
        if (details.appointment_type) items.push(`Type: ${details.appointment_type.replace('_', ' ')}`);
        if (details.appointment_date) items.push(`Date: ${details.appointment_date}`);
        if (details.patient_name) items.push(`Patient: ${details.patient_name}`);
      } else if (log.action === 'UPDATE') {
        if (details.previous_status && details.new_status) {
          items.push(`Status changed from "${details.previous_status}" to "${details.new_status}"`);
        }
      } else if (log.action === 'DELETE') {
        if (details.patient_name) items.push(`Patient: ${details.patient_name}`);
        if (details.appointment_date) items.push(`Date: ${details.appointment_date}`);
      }
    } else if (log.resource_type === 'profile') {
      if (details.updated_fields) {
        items.push(`Updated: ${details.updated_fields.join(', ')}`);
      }
      if (details.previous_campus && details.new_campus && details.previous_campus !== details.new_campus) {
        items.push(`Campus changed`);
      }
    } else if (log.resource_type === 'nurse_campus') {
      if (details.assigned_campus) {
        items.push(`Assigned to: ${details.assigned_campus}`);
      }
    }

    return items.length > 0 ? items : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Monitor all user activities across the system</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-maroon-800 text-white rounded-lg hover:bg-maroon-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filters</h2>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user name, email, action, or resource..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus</label>
            <select
              value={filters.campusId}
              onChange={(e) => setFilters({ ...filters, campusId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
            >
              <option value="">All Campuses</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="ASSIGN">Assign</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
            >
              <option value="">All Roles</option>
              <option value="supervisor">Supervisor</option>
              <option value="nurse">Nurse</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No audit logs found matching the filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {log.user?.first_name} {log.user?.last_name}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{log.user?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.resource_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.campus ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {log.campus.name}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(() => {
                        const formattedDetails = formatDetails(log);
                        if (formattedDetails && formattedDetails.length > 0) {
                          return (
                            <div className="space-y-1">
                              {formattedDetails.map((detail, idx) => (
                                <div key={idx} className="text-sm text-gray-700">
                                  • {detail}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return <span className="text-gray-400">-</span>;
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-500 text-center">
        Showing {logs.length} most recent logs (max 100)
      </div>
    </div>
  );
}
