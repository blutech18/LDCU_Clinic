import { useState, useEffect } from 'react';
import { Users, MapPin, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '~/modules/auth';
import { supabase } from '~/lib/supabase';
import type { Profile, Campus } from '~/types';

export function NurseAssignmentPage() {
  const { profile } = useAuthStore();
  const [nurses, setNurses] = useState<Profile[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<Profile | null>(null);
  const [pendingCampusId, setPendingCampusId] = useState<string | null>(null);
  const [isSavingCampus, setIsSavingCampus] = useState(false);

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

  const handleSaveCampus = async () => {
    if (!selectedNurse) return;
    const nurseId = selectedNurse.id;
    const campusId = pendingCampusId;

    try {
      setIsSavingCampus(true);

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
      setIsCampusModalOpen(false);
    } catch (error) {
      console.error('Error assigning campus:', error);
      alert('Failed to assign campus. Please try again.');
    } finally {
      setIsSavingCampus(false);
    }
  };

  const openCampusModal = (nurse: Profile) => {
    setSelectedNurse(nurse);
    setPendingCampusId(nurse.assigned_campus_id || null);
    setIsCampusModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
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
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[280px] max-w-[280px]">
                  Nurse
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Assigned Campus
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {nurses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No nurses found. Create nurse accounts in the Admin page first.
                  </td>
                </tr>
              ) : (
                nurses.map((nurse) => {
                  const assignedCampus = campuses.find(c => c.id === nurse.assigned_campus_id);

                  return (
                    <tr key={nurse.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {nurse.avatar_url ? (
                              <img
                                src={nurse.avatar_url}
                                alt={`${nurse.first_name} ${nurse.last_name}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <span>{(nurse.first_name || 'U').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {nurse.first_name} {nurse.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                        <p className="text-gray-600 text-sm truncate">{nurse.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center">
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
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => openCampusModal(nurse)}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 transition-opacity hover:opacity-80 active:scale-95 ${nurse.assigned_campus_id
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          <span className="uppercase tracking-wider font-bold">
                            {assignedCampus ? assignedCampus.name : 'UNASSIGNED'}
                          </span>
                          <Edit2 className="w-3 h-3 opacity-60" />
                        </button>
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

      {/* ── Campus Assignment Modal ── */}
      <AnimatePresence>
        {isCampusModalOpen && selectedNurse && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingCampus && setIsCampusModalOpen(false)}
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
                <h3 className="text-lg font-bold text-gray-900 shrink-0">Assign Campus</h3>
                <p className="text-lg text-gray-500 truncate min-w-0">
                  for <span className="font-bold text-gray-800 uppercase">
                    {(selectedNurse.first_name || '').split(' ').pop() || 'Nurse'}
                  </span>
                </p>
              </div>

              {/* Body */}
              <div className="px-5 py-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPendingCampusId(null)}
                    className={`col-span-2 flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${pendingCampusId === null
                      ? 'bg-gray-100 border-gray-500 text-gray-800 shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">Unassigned</span>
                  </button>
                  {campuses.map((campus) => (
                    <button
                      key={campus.id}
                      onClick={() => setPendingCampusId(campus.id)}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${pendingCampusId === campus.id
                        ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50/30'
                        }`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wider text-center">{campus.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 flex gap-3 mt-1 bg-gray-50/80 border-t border-gray-100">
                <button
                  disabled={isSavingCampus}
                  onClick={() => setIsCampusModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={isSavingCampus || pendingCampusId === (selectedNurse.assigned_campus_id || null)}
                  onClick={handleSaveCampus}
                  className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex justify-center items-center text-sm"
                >
                  {isSavingCampus ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Save Campus'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
