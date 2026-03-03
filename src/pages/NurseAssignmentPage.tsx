import { useState, useEffect } from 'react';
import { Users, MapPin } from 'lucide-react';
import { useAuthStore } from '~/modules/auth';
import { supabase } from '~/lib/supabase';
import type { Profile, Campus } from '~/types';

export function NurseAssignmentPage() {
  const { profile } = useAuthStore();
  const [nurses, setNurses] = useState<Profile[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all nurses
      const { data: nursesData, error: nursesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'nurse')
        .order('first_name');

      if (nursesError) throw nursesError;

      // Fetch all campuses
      const { data: campusesData, error: campusesError } = await supabase
        .from('campuses')
        .select('*')
        .order('name');

      if (campusesError) throw campusesError;

      setNurses(nursesData || []);
      setCampuses(campusesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCampus = async (nurseId: string, campusId: string | null) => {
    try {
      setSaving(nurseId);

      const { error } = await supabase
        .from('profiles')
        .update({ assigned_campus_id: campusId })
        .eq('id', nurseId);

      if (error) throw error;

      // Log the assignment
      if (profile) {
        await supabase.rpc('log_user_action', {
          p_user_id: profile.id,
          p_action: 'ASSIGN',
          p_resource_type: 'nurse_campus',
          p_resource_id: nurseId,
          p_campus_id: campusId,
          p_details: {
            assigned_campus: campuses.find(c => c.id === campusId)?.name || 'Unassigned'
          }
        });
      }

      // Update local state
      setNurses(nurses.map(n => 
        n.id === nurseId ? { ...n, assigned_campus_id: campusId || undefined } : n
      ));
    } catch (error) {
      console.error('Error assigning campus:', error);
      alert('Failed to assign campus. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nurse Assignment</h1>
          <p className="text-gray-600 mt-1">Assign nurses to specific campuses</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{nurses.length} Nurses</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nurse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Campus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {nurses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No nurses found. Create nurse accounts in the Admin page first.
                  </td>
                </tr>
              ) : (
                nurses.map((nurse) => {
                  const assignedCampus = campuses.find(c => c.id === nurse.assigned_campus_id);
                  const isSaving = saving === nurse.id;

                  return (
                    <tr key={nurse.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {nurse.first_name} {nurse.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {nurse.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignedCampus ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700">
                              {assignedCampus.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={nurse.assigned_campus_id || ''}
                          onChange={(e) => handleAssignCampus(nurse.id, e.target.value || null)}
                          disabled={isSaving}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none disabled:opacity-50"
                        >
                          <option value="">Unassigned</option>
                          {campuses.map((campus) => (
                            <option key={campus.id} value={campus.id}>
                              {campus.name}
                            </option>
                          ))}
                        </select>
                        {isSaving && (
                          <span className="ml-2 text-xs text-gray-500">Saving...</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">How Nurse Assignment Works</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Nurses can only view and manage appointments for their assigned campus</li>
          <li>Unassigned nurses have no campus access until assigned by a supervisor</li>
          <li>Supervisors can view and manage all campuses regardless of assignment</li>
          <li>All assignment changes are logged in the audit system</li>
        </ul>
      </div>
    </div>
  );
}
