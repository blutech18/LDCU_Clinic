import { useState, useEffect } from 'react';
import { Users, MapPin, Edit2, UserPlus, X, Trash2, AlertTriangle, Clock, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '~/modules/auth';
import { supabase } from '~/lib/supabase';
import type { Profile, Campus } from '~/types';

interface NurseInvitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  assigned_campus_id: string | null;
  invited_by: string | null;
  created_at: string;
  used_at: string | null;
}

export function NurseAssignmentPage() {
  const { profile } = useAuthStore();
  const [nurses, setNurses] = useState<Profile[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<NurseInvitation[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState<Profile | null>(null);
  const [pendingCampusId, setPendingCampusId] = useState<string | null>(null);
  const [isSavingCampus, setIsSavingCampus] = useState(false);

  // Add Nurse Modal State
  const [isAddNurseModalOpen, setIsAddNurseModalOpen] = useState(false);
  const [newNurseEmail, setNewNurseEmail] = useState('');
  const [newNurseFirstName, setNewNurseFirstName] = useState('');
  const [newNurseLastName, setNewNurseLastName] = useState('');
  const [newNurseCampusId, setNewNurseCampusId] = useState<string | null>(null);
  const [isAddingNurse, setIsAddingNurse] = useState(false);
  const [addNurseError, setAddNurseError] = useState<string | null>(null);

  // Delete Nurse Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [nurseToDelete, setNurseToDelete] = useState<Profile | null>(null);
  const [isDeletingNurse, setIsDeletingNurse] = useState(false);

  // Delete Invitation Modal State
  const [isDeleteInvitationModalOpen, setIsDeleteInvitationModalOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<NurseInvitation | null>(null);
  const [isDeletingInvitation, setIsDeletingInvitation] = useState(false);

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

      // Fetch pending nurse invitations (not yet used)
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('nurse_invitations')
        .select('*')
        .is('used_at', null)
        .order('created_at', { ascending: false });

      if (invitationsError && invitationsError.code !== '42P01') {
        // 42P01 = table doesn't exist yet, ignore this error
        console.error('Error fetching invitations:', invitationsError);
      }

      setNurses(nursesData || []);
      setCampuses(campusesData || []);
      setPendingInvitations(invitationsData || []);
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

  const handleAddNurse = async () => {
    if (!newNurseEmail.trim()) {
      setAddNurseError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newNurseEmail.trim())) {
      setAddNurseError('Please enter a valid email address');
      return;
    }

    if (!newNurseFirstName.trim() || !newNurseLastName.trim()) {
      setAddNurseError('First name and last name are required');
      return;
    }

    try {
      setIsAddingNurse(true);
      setAddNurseError(null);

      const emailLower = newNurseEmail.trim().toLowerCase();

      // Check if email already exists in profiles
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('email', emailLower)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingProfile) {
        if (existingProfile.role === 'nurse') {
          setAddNurseError('This email is already registered as a nurse');
          return;
        }
        setAddNurseError(`This email is already registered with role: ${existingProfile.role}`);
        return;
      }

      // Check if email already has a pending invitation
      const { data: existingInvitation, error: inviteCheckError } = await supabase
        .from('nurse_invitations')
        .select('id')
        .eq('email', emailLower)
        .is('used_at', null)
        .maybeSingle();

      if (inviteCheckError && inviteCheckError.code !== '42P01') throw inviteCheckError;

      if (existingInvitation) {
        setAddNurseError('This email already has a pending invitation');
        return;
      }

      // Create a nurse invitation
      const { data: newInvitation, error: insertError } = await supabase
        .from('nurse_invitations')
        .insert({
          email: emailLower,
          first_name: newNurseFirstName.trim(),
          last_name: newNurseLastName.trim(),
          assigned_campus_id: newNurseCampusId,
          invited_by: profile?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log the action
      if (profile) {
        await supabase.rpc('log_user_action', {
          p_user_id: profile.id,
          p_action: 'CREATE',
          p_resource_type: 'nurse_invitation',
          p_resource_id: newInvitation.id,
          p_campus_id: newNurseCampusId,
          p_details: {
            nurse_email: emailLower,
            nurse_name: `${newNurseFirstName.trim()} ${newNurseLastName.trim()}`,
            assigned_campus: campuses.find(c => c.id === newNurseCampusId)?.name || 'Unassigned'
          }
        });
      }

      // Add to local state
      setPendingInvitations([newInvitation, ...pendingInvitations]);

      // Reset form and close modal
      setNewNurseEmail('');
      setNewNurseFirstName('');
      setNewNurseLastName('');
      setNewNurseCampusId(null);
      setIsAddNurseModalOpen(false);
    } catch (error: any) {
      console.error('Error adding nurse:', error);
      setAddNurseError(error.message || 'Failed to add nurse. Please try again.');
    } finally {
      setIsAddingNurse(false);
    }
  };

  const openDeleteModal = (nurse: Profile) => {
    setNurseToDelete(nurse);
    setIsDeleteModalOpen(true);
  };

  const openDeleteInvitationModal = (invitation: NurseInvitation) => {
    setInvitationToDelete(invitation);
    setIsDeleteInvitationModalOpen(true);
  };

  const handleDeleteInvitation = async () => {
    if (!invitationToDelete) return;

    try {
      setIsDeletingInvitation(true);

      const { error } = await supabase
        .from('nurse_invitations')
        .delete()
        .eq('id', invitationToDelete.id);

      if (error) throw error;

      // Log the action
      if (profile) {
        await supabase.rpc('log_user_action', {
          p_user_id: profile.id,
          p_action: 'DELETE',
          p_resource_type: 'nurse_invitation',
          p_resource_id: invitationToDelete.id,
          p_campus_id: invitationToDelete.assigned_campus_id || null,
          p_details: {
            nurse_email: invitationToDelete.email,
            nurse_name: `${invitationToDelete.first_name} ${invitationToDelete.last_name}`
          }
        });
      }

      // Remove from local state
      setPendingInvitations(pendingInvitations.filter(i => i.id !== invitationToDelete.id));
      setIsDeleteInvitationModalOpen(false);
      setInvitationToDelete(null);
    } catch (error) {
      console.error('Error deleting invitation:', error);
      alert('Failed to delete invitation. Please try again.');
    } finally {
      setIsDeletingInvitation(false);
    }
  };

  const handleDeleteNurse = async () => {
    if (!nurseToDelete) return;

    try {
      setIsDeletingNurse(true);

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', nurseToDelete.id);

      if (error) throw error;

      // Log the action
      if (profile) {
        await supabase.rpc('log_user_action', {
          p_user_id: profile.id,
          p_action: 'DELETE',
          p_resource_type: 'nurse',
          p_resource_id: nurseToDelete.id,
          p_campus_id: nurseToDelete.assigned_campus_id || null,
          p_details: {
            nurse_email: nurseToDelete.email,
            nurse_name: `${nurseToDelete.first_name} ${nurseToDelete.last_name}`
          }
        });
      }

      // Remove from local state
      setNurses(nurses.filter(n => n.id !== nurseToDelete.id));
      setIsDeleteModalOpen(false);
      setNurseToDelete(null);
    } catch (error) {
      console.error('Error deleting nurse:', error);
      alert('Failed to delete nurse. Please try again.');
    } finally {
      setIsDeletingNurse(false);
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>{nurses.length} Nurses</span>
          </div>
          <button
            onClick={() => setIsAddNurseModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-maroon-800 text-white text-sm font-medium rounded-lg hover:bg-maroon-900 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Nurse
          </button>
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
                    No active nurses found. Click "Add Nurse" to invite a nurse by email.
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
                        <div className="flex items-center justify-center gap-2">
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
                          <button
                            onClick={() => openDeleteModal(nurse)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Remove nurse"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200">
          <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">Pending Invitations ({pendingInvitations.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-[280px]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Campus
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingInvitations.map((invitation) => {
                  const assignedCampus = campuses.find(c => c.id === invitation.assigned_campus_id);

                  return (
                    <tr key={invitation.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3.5 max-w-[280px]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {invitation.first_name} {invitation.last_name}
                            </p>
                            <p className="text-xs text-amber-600">Awaiting sign-in</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                        <p className="text-gray-600 text-sm truncate">{invitation.email}</p>
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
                          onClick={() => openDeleteInvitationModal(invitation)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Cancel invitation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* ── Add Nurse Modal ── */}
      <AnimatePresence>
        {isAddNurseModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isAddingNurse && setIsAddNurseModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-maroon-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-maroon-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Add New Nurse</h3>
                    <p className="text-sm text-gray-500">Register a nurse by email</p>
                  </div>
                </div>
                <button
                  onClick={() => !isAddingNurse && setIsAddNurseModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong> Enter the nurse's email address. When they sign in with Google using this email, they will automatically be logged in as a nurse.
                  </p>
                </div>

                {addNurseError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{addNurseError}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="nurse-first-name" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="nurse-first-name"
                      type="text"
                      value={newNurseFirstName}
                      onChange={(e) => setNewNurseFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="nurse-last-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="nurse-last-name"
                      type="text"
                      value={newNurseLastName}
                      onChange={(e) => setNewNurseLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="nurse-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="nurse-email"
                    type="email"
                    value={newNurseEmail}
                    onChange={(e) => setNewNurseEmail(e.target.value)}
                    placeholder="nurse@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The nurse will sign in using Google with this email
                  </p>
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Campus (Optional)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewNurseCampusId(null)}
                      className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border transition-all text-xs ${newNurseCampusId === null
                        ? 'bg-gray-100 border-gray-500 text-gray-800 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                    >
                      <span className="font-bold uppercase tracking-wider">Unassigned</span>
                    </button>
                    {campuses.map((campus) => (
                      <button
                        type="button"
                        key={campus.id}
                        onClick={() => setNewNurseCampusId(campus.id)}
                        className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg border transition-all text-xs ${newNurseCampusId === campus.id
                          ? 'bg-green-50 border-green-500 text-green-700 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50/30'
                          }`}
                      >
                        <span className="font-bold uppercase tracking-wider text-center">{campus.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button
                  disabled={isAddingNurse}
                  onClick={() => {
                    setIsAddNurseModalOpen(false);
                    setAddNurseError(null);
                    setNewNurseEmail('');
                    setNewNurseFirstName('');
                    setNewNurseLastName('');
                    setNewNurseCampusId(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={isAddingNurse || !newNurseEmail.trim() || !newNurseFirstName.trim() || !newNurseLastName.trim()}
                  onClick={handleAddNurse}
                  className="flex-1 px-4 py-2.5 bg-maroon-800 text-white font-medium rounded-xl hover:bg-maroon-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex justify-center items-center text-sm"
                >
                  {isAddingNurse ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Add Nurse'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {isDeleteModalOpen && nurseToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingNurse && setIsDeleteModalOpen(false)}
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
              <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Remove Nurse</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">
                  Are you sure you want to remove <strong>{nurseToDelete.first_name} {nurseToDelete.last_name}</strong> ({nurseToDelete.email}) from the system?
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  They will no longer be able to sign in as a nurse.
                </p>
              </div>

              {/* Actions */}
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button
                  disabled={isDeletingNurse}
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setNurseToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={isDeletingNurse}
                  onClick={handleDeleteNurse}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex justify-center items-center text-sm"
                >
                  {isDeletingNurse ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Remove Nurse'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Invitation Confirmation Modal ── */}
      <AnimatePresence>
        {isDeleteInvitationModalOpen && invitationToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingInvitation && setIsDeleteInvitationModalOpen(false)}
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
              <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Cancel Invitation</h3>
                  <p className="text-sm text-gray-500">Remove pending invitation</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                <p className="text-sm text-gray-700">
                  Are you sure you want to cancel the invitation for <strong>{invitationToDelete.first_name} {invitationToDelete.last_name}</strong> ({invitationToDelete.email})?
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  They will not be able to sign in as a nurse unless invited again.
                </p>
              </div>

              {/* Actions */}
              <div className="p-5 flex gap-3 bg-gray-50/80 border-t border-gray-100">
                <button
                  disabled={isDeletingInvitation}
                  onClick={() => {
                    setIsDeleteInvitationModalOpen(false);
                    setInvitationToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
                >
                  Keep Invitation
                </button>
                <button
                  disabled={isDeletingInvitation}
                  onClick={handleDeleteInvitation}
                  className="flex-1 px-4 py-2.5 bg-amber-600 text-white font-medium rounded-xl hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex justify-center items-center text-sm"
                >
                  {isDeletingInvitation ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Cancel Invitation'
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
