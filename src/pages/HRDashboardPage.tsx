import { useEffect, useState, useCallback } from 'react';
import { Search, CheckCircle, XCircle, Clock, Users, RefreshCw, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '~/lib/supabase';
import { useAuthStore } from '~/modules/auth';
import type { Profile } from '~/types';

interface PendingUser extends Profile {
    requested_role: string;
}

export function HRDashboardPage() {
    const { profile, logout } = useAuthStore();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const fetchPending = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .not('requested_role', 'is', null)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setPendingUsers((data || []) as PendingUser[]);
        } catch (error) {
            console.error('Failed to fetch pending users:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    const handleApprove = async (user: PendingUser) => {
        setActionLoading(user.id);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: user.requested_role, requested_role: null })
                .eq('id', user.id);

            if (error) throw error;

            setPendingUsers(prev => prev.filter(u => u.id !== user.id));
            setMessage({ type: 'success', text: `Approved ${user.first_name} ${user.last_name} as ${user.requested_role}.` });
        } catch (error) {
            console.error('Failed to approve:', error);
            setMessage({ type: 'error', text: 'Failed to approve. Please try again.' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (user: PendingUser) => {
        setActionLoading(user.id);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ requested_role: null })
                .eq('id', user.id);

            if (error) throw error;

            setPendingUsers(prev => prev.filter(u => u.id !== user.id));
            setMessage({ type: 'success', text: `Rejected role request from ${user.first_name} ${user.last_name}.` });
        } catch (error) {
            console.error('Failed to reject:', error);
            setMessage({ type: 'error', text: 'Failed to reject. Please try again.' });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = pendingUsers.filter(user => {
        const q = search.toLowerCase();
        return (
            user.first_name?.toLowerCase().includes(q) ||
            user.last_name?.toLowerCase().includes(q) ||
            user.email?.toLowerCase().includes(q) ||
            user.requested_role?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Header Bar */}
            <header className="bg-maroon-800 text-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo / Title */}
                        <div className="flex items-center gap-3">
                            <img src="/ldcu-logo.png" alt="LDCU" className="w-8 h-8 object-contain" />
                            <div>
                                <h1 className="text-base sm:text-lg font-bold leading-tight">LDCU Clinic</h1>
                                <p className="text-[10px] sm:text-xs text-maroon-200 font-medium leading-none">HR Dashboard</p>
                            </div>
                        </div>

                        {/* User Info + Logout */}
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-semibold leading-tight">{profile?.first_name} {profile?.last_name}</p>
                                <p className="text-[10px] text-maroon-200 uppercase font-bold">HR</p>
                            </div>
                            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </div>
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg transition-all"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Logout Confirmation */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowLogoutConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
                        >
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Sign Out?</h3>
                            <p className="text-sm text-gray-600 mb-6">Are you sure you want to sign out of the HR dashboard?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => logout()}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="w-10 h-10 bg-maroon-100 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-maroon-800" />
                            </div>
                            Pending Verifications
                        </h2>
                        <p className="text-gray-500 text-sm mt-1 ml-[52px]">Review and approve staff role requests</p>
                    </div>
                    <button
                        onClick={fetchPending}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-maroon-800 bg-maroon-50 hover:bg-maroon-100 border border-maroon-200 rounded-xl transition-all duration-300 shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Message Banner */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`mb-6 p-4 rounded-xl text-sm font-medium shadow-sm flex items-center gap-3 ${message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-100'
                                : 'bg-red-50 text-red-800 border border-red-100'
                                }`}
                        >
                            {message.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                            )}
                            {message.text}
                            <button
                                onClick={() => setMessage(null)}
                                className="ml-auto text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or role..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{pendingUsers.length}</p>
                                <p className="text-xs text-gray-500 font-medium">Pending Requests</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {pendingUsers.filter(u => u.requested_role === 'staff').length}
                                </p>
                                <p className="text-xs text-gray-500 font-medium">Staff Requests</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
                                <p className="text-xs text-gray-500 font-medium">Showing</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-8 h-8 border-3 border-maroon-800 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">All caught up!</h3>
                            <p className="text-sm text-gray-500">No pending role requests to review.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Current Role</th>
                                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Requested Role</th>
                                            <th className="text-right px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-gradient-to-br from-maroon-500 to-maroon-700 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                            {user.first_name?.[0]}{user.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold uppercase">
                                                        {user.role === 'pending' ? 'Pending' : user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold uppercase">
                                                        {user.requested_role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleApprove(user)}
                                                            disabled={actionLoading === user.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all disabled:opacity-50"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(user)}
                                                            disabled={actionLoading === user.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all disabled:opacity-50"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <div key={user.id} className="p-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-maroon-500 to-maroon-700 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{user.first_name} {user.last_name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-bold uppercase">
                                                {user.role === 'pending' ? 'Pending' : user.role}
                                            </span>
                                            <span className="text-gray-400">→</span>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold uppercase">
                                                {user.requested_role}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleApprove(user)}
                                                disabled={actionLoading === user.id}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(user)}
                                                disabled={actionLoading === user.id}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all disabled:opacity-50"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
