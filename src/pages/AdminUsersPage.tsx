import { useEffect, useState } from 'react';
import { Users, Check, X, Search, UserPlus, Mail, User, Phone, Shield, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminStore } from '~/modules/admin';
import { useScheduleStore } from '~/modules/schedule';
import { SearchableSelect } from '~/components/ui';
import { supabase } from '~/lib/supabase';

export function AdminUsersPage() {
    const { users, isLoadingUsers: isLoading, fetchUsers, verifyUser, changeRole } = useAdminStore();
    const { departments, fetchDepartments } = useScheduleStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
    
    const [newUser, setNewUser] = useState({
        email: '',
        first_name: '',
        last_name: '',
        middle_name: '',
        contact_number: '',
        role: 'student' as 'student' | 'staff' | 'nurse' | 'doctor' | 'supervisor' | 'admin',
        department_id: '',
    });

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, [fetchUsers, fetchDepartments]);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            !searchTerm ||
            user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter =
            filter === 'all' ||
            (filter === 'pending' && !user.is_verified) ||
            (filter === 'verified' && user.is_verified);

        return matchesSearch && matchesFilter;
    });

    const pendingCount = users.filter((u) => !u.is_verified).length;

    const handleCreateUser = async () => {
        setCreateError(null);
        
        // Validate email
        const fullEmail = `${newUser.email.trim()}@liceo.edu.ph`;
        if (!newUser.email.trim()) {
            setCreateError('Please enter email username.');
            return;
        }
        if (newUser.email.includes('@')) {
            setCreateError('Please enter only the username (without @liceo.edu.ph).');
            return;
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(newUser.email.trim())) {
            setCreateError('Please enter a valid email username.');
            return;
        }
        
        // Validate other fields
        if (!newUser.first_name.trim()) {
            setCreateError('Please enter first name.');
            return;
        }
        if (!newUser.last_name.trim()) {
            setCreateError('Please enter last name.');
            return;
        }
        if (newUser.contact_number && newUser.contact_number.length !== 11) {
            setCreateError('Contact number must be 11 digits.');
            return;
        }
        
        setIsCreatingUser(true);
        
        try {
            // Check if email already exists
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', fullEmail)
                .maybeSingle();
            
            if (existingUser) {
                setCreateError('A user with this email already exists.');
                setIsCreatingUser(false);
                return;
            }
            
            // Try Edge Function first (preferred method - no confirmation email)
            const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
            let userCreated = false;
            let userId: string | null = null;
            
            try {
                const response = await supabase.functions.invoke('create-user', {
                    body: {
                        email: fullEmail,
                        password: tempPassword,
                        first_name: newUser.first_name.trim(),
                        last_name: newUser.last_name.trim(),
                        middle_name: newUser.middle_name.trim(),
                        contact_number: newUser.contact_number.trim(),
                        role: newUser.role,
                        department_id: newUser.department_id || null,
                    }
                });
                
                console.log('Edge Function response:', response);
                
                if (!response.error && response.data?.success) {
                    userCreated = true;
                    userId = response.data.user?.id;
                } else {
                    console.warn('Edge Function failed, falling back to regular signup:', response.error || response.data);
                }
            } catch (edgeFunctionError) {
                console.warn('Edge Function not available, falling back to regular signup:', edgeFunctionError);
            }
            
            // Fallback: Use regular signup if Edge Function failed
            if (!userCreated) {
                console.log('Using fallback signup method...');
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: fullEmail,
                    password: tempPassword,
                    options: {
                        data: {
                            first_name: newUser.first_name.trim(),
                            last_name: newUser.last_name.trim(),
                            middle_name: newUser.middle_name.trim(),
                        }
                    }
                });
                
                if (authError) throw authError;
                if (!authData.user) throw new Error('Failed to create user');
                
                userId = authData.user.id;
                
                // Wait for the profile to be created by trigger
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check if profile exists
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle();
                
                if (!existingProfile) {
                    // Profile doesn't exist yet, insert it
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: userId,
                            email: fullEmail,
                            first_name: newUser.first_name.trim(),
                            last_name: newUser.last_name.trim(),
                            middle_name: newUser.middle_name.trim() || null,
                            contact_number: newUser.contact_number.trim() || null,
                            role: newUser.role,
                            department_id: newUser.department_id || null,
                            is_verified: true,
                            role_selected: true,
                        });
                    
                    if (insertError) {
                        console.error('Profile insert error:', insertError);
                        throw insertError;
                    }
                } else {
                    // Profile exists, update it
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                            first_name: newUser.first_name.trim(),
                            last_name: newUser.last_name.trim(),
                            middle_name: newUser.middle_name.trim() || null,
                            contact_number: newUser.contact_number.trim() || null,
                            role: newUser.role,
                            department_id: newUser.department_id || null,
                            is_verified: true,
                            role_selected: true,
                        })
                        .eq('id', userId);
                    
                    if (updateError) {
                        console.error('Profile update error:', updateError);
                        throw updateError;
                    }
                }
                
                // Verify the update worked
                const { data: verifyProfile } = await supabase
                    .from('profiles')
                    .select('role, role_selected, is_verified')
                    .eq('id', userId)
                    .single();
                
                console.log('Profile after update:', verifyProfile);
            }
            
            setCreateSuccess(true);
            setTimeout(() => {
                setShowAddUserModal(false);
                setCreateSuccess(false);
                setNewUser({
                    email: '',
                    first_name: '',
                    last_name: '',
                    middle_name: '',
                    contact_number: '',
                    role: 'student',
                    department_id: '',
                });
                fetchUsers();
            }, 1500);
            
        } catch (error: any) {
            console.error('Error creating user:', error);
            setCreateError(error.message || 'Failed to create user. Please try again.');
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        
        setDeletingUserId(userToDelete.id);
        
        try {
            // Call the delete-account Edge Function
            const { error } = await supabase.functions.invoke('delete-account', {
                body: { userId: userToDelete.id }
            });
            
            if (error) throw error;
            
            // Refresh users list
            await fetchUsers();
            
            setShowDeleteConfirm(false);
            setUserToDelete(null);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            alert(`Failed to delete user: ${error.message}`);
        } finally {
            setDeletingUserId(null);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600">Manage users and their roles</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                            <Users className="w-4 h-4" />
                            {pendingCount} pending
                        </div>
                    )}
                    <button
                        onClick={() => setShowAddUserModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-maroon-800 text-white rounded-lg font-medium hover:bg-maroon-900 transition-colors shadow-sm"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'pending', 'verified'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-colors ${filter === f
                                    ? 'bg-maroon-800 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
                {isLoading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center">
                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-600">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-maroon-100 rounded-full flex items-center justify-center">
                                                    <span className="text-maroon-800 font-medium">
                                                        {user.first_name?.[0]?.toUpperCase() || 'U'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 capitalize">{user.user_type || user.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-600">{user.email}</td>
                                        <td className="px-4 py-4 text-center">
                                            <select
                                                value={user.role}
                                                onChange={(e) => changeRole(user.id, e.target.value)}
                                                className="px-2 py-1 text-center border border-gray-300 rounded text-sm focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                            >
                                                <option value="supervisor">Supervisor</option>
                                                <option value="student">Student</option>
                                                <option value="staff">Staff</option>
                                                <option value="nurse">Nurse</option>
                                                <option value="doctor">Doctor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded ${user.is_verified
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                            >
                                                {user.is_verified ? 'Verified' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center gap-2">
                                                {!user.is_verified ? (
                                                    <button
                                                        onClick={() => verifyUser(user.id, true)}
                                                        className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        Verify
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => verifyUser(user.id, false)}
                                                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Revoke
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setUserToDelete({ 
                                                            id: user.id, 
                                                            name: `${user.first_name} ${user.last_name}` 
                                                        });
                                                        setShowDeleteConfirm(true);
                                                    }}
                                                    disabled={deletingUserId === user.id}
                                                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                                                >
                                                    {deletingUserId === user.id ? (
                                                        <div className="w-4 h-4 border-2 border-red-800/30 border-t-red-800 rounded-full animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            <AnimatePresence>
                {showAddUserModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isCreatingUser && setShowAddUserModal(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {createSuccess ? (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">User Created!</h3>
                                    <p className="text-gray-600">The user has been successfully created.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-maroon-100 rounded-lg flex items-center justify-center">
                                                <UserPlus className="w-5 h-5 text-maroon-800" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900">Add New User</h2>
                                                <p className="text-sm text-gray-500">Create a new user account</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowAddUserModal(false)}
                                            disabled={isCreatingUser}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                <Mail className="w-4 h-4 inline mr-1" />
                                                Email Address *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={newUser.email}
                                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value.replace(/@.*$/, '') })}
                                                    placeholder="username"
                                                    className="w-full px-3 py-2.5 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                                                    disabled={isCreatingUser}
                                                />
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <span className="text-gray-500 text-sm">@liceo.edu.ph</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Name Fields */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                    <User className="w-4 h-4 inline mr-1" />
                                                    First Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newUser.first_name}
                                                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                                                    placeholder="First name"
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                                                    disabled={isCreatingUser}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                                                <input
                                                    type="text"
                                                    value={newUser.last_name}
                                                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                                                    placeholder="Last name"
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                                                    disabled={isCreatingUser}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Middle Name</label>
                                                <input
                                                    type="text"
                                                    value={newUser.middle_name}
                                                    onChange={(e) => setNewUser({ ...newUser, middle_name: e.target.value })}
                                                    placeholder="Optional"
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                                                    disabled={isCreatingUser}
                                                />
                                            </div>
                                        </div>

                                        {/* Contact & Role */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                    <Phone className="w-4 h-4 inline mr-1" />
                                                    Contact Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={newUser.contact_number}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                        setNewUser({ ...newUser, contact_number: val });
                                                    }}
                                                    placeholder="09XXXXXXXXX"
                                                    maxLength={11}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                                                    disabled={isCreatingUser}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                                    <Shield className="w-4 h-4 inline mr-1" />
                                                    Role *
                                                </label>
                                                <select
                                                    value={newUser.role}
                                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm"
                                                    disabled={isCreatingUser}
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="staff">Staff</option>
                                                    <option value="nurse">Nurse</option>
                                                    <option value="doctor">Doctor</option>
                                                    <option value="supervisor">Supervisor</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Department */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                                            <SearchableSelect
                                                value={newUser.department_id}
                                                onChange={(value) => setNewUser({ ...newUser, department_id: value })}
                                                options={departments.map(d => ({ value: d.id, label: d.name }))}
                                                placeholder="Select Department (Optional)"
                                            />
                                        </div>

                                        {/* Error Message */}
                                        {createError && (
                                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
                                                <X className="w-5 h-5 flex-shrink-0" />
                                                <p className="text-sm">{createError}</p>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-3 pt-4">
                                            <button
                                                onClick={() => setShowAddUserModal(false)}
                                                disabled={isCreatingUser}
                                                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCreateUser}
                                                disabled={isCreatingUser}
                                                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-maroon-800 hover:bg-maroon-900 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isCreatingUser ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-4 h-4" />
                                                        Create User
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && userToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !deletingUserId && setShowDeleteConfirm(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
                                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                                </div>
                            </div>
                            
                            <p className="text-gray-700 mb-6">
                                Are you sure you want to delete <span className="font-semibold">{userToDelete.name}</span>? 
                                This will permanently remove the user from both the database and authentication system.
                            </p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setUserToDelete(null);
                                    }}
                                    disabled={!!deletingUserId}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUser}
                                    disabled={!!deletingUserId}
                                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deletingUserId ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Delete User
                                        </>
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
