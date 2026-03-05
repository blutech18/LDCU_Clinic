import { useEffect, useState, useMemo } from 'react';
import { Search, CheckCircle, XCircle, Clock, Users, RefreshCw, LogOut, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHRStore, type PendingUser } from '~/modules/hr';
import { useAuthStore } from '~/modules/auth';

export function HRDashboardPage() {
    const { profile, logout } = useAuthStore();
    const { pendingUsers, isLoading, fetchPendingUsers, approveUser, rejectUser } = useHRStore();

    const [search, setSearch] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        fetchPendingUsers();
    }, [fetchPendingUsers]);

    const handleApprove = async (user: PendingUser) => {
        setActionLoading(user.id);
        try {
            await approveUser(user);
            setMessage({ type: 'success', text: `Approved ${user.first_name} ${user.last_name} as ${user.requested_role}.` });
        } catch {
            setMessage({ type: 'error', text: 'Failed to approve. Please try again.' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (user: PendingUser) => {
        setActionLoading(user.id);
        try {
            await rejectUser(user);
            setMessage({ type: 'success', text: `Rejected role request from ${user.first_name} ${user.last_name}.` });
        } catch {
            setMessage({ type: 'error', text: 'Failed to reject. Please try again.' });
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return pendingUsers;
        return pendingUsers.filter(
            (user) =>
                user.first_name?.toLowerCase().includes(q) ||
                user.last_name?.toLowerCase().includes(q) ||
                user.email?.toLowerCase().includes(q) ||
                user.requested_role?.toLowerCase().includes(q)
        );
    }, [pendingUsers, search]);

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
                            </div>
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Profile"
                                    className="w-9 h-9 rounded-full object-cover border border-white/20"
                                />
                            ) : (
                                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                                </div>
                            )}
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
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            transition={{ type: 'spring', duration: 0.3 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
                        >
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Sign Out?</h3>
                            <p className="text-sm text-gray-600 mb-6">Are you sure you want to sign out of the HR dashboard?</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => logout()}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm"
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
                <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Pending Verifications
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Review and approve staff role requests</p>
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
                            <button onClick={() => setMessage(null)} className="ml-auto text-gray-400 hover:text-gray-600">×</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Controls */}
                <div className="flex flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or role..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-500 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={fetchPendingUsers}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 text-sm font-bold text-maroon-800 bg-maroon-50 hover:bg-maroon-100 border border-maroon-200 rounded-xl transition-all shadow-sm disabled:opacity-50 shrink-0"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                                    {pendingUsers.filter(u => new Date(u.updated_at || new Date()).toDateString() === new Date().toDateString()).length}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Today</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{pendingUsers.length}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Pending</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                                    {pendingUsers.filter(u => u.requested_role === 'staff').length}
                                </p>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Staff Reqs</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{filteredUsers.length}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Showing</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="w-8 h-8 border-4 border-maroon-800 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-500 text-sm">Loading pending requests...</p>
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
                            {/* Desktop Table View */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Current Role</th>
                                            <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Requested Role</th>
                                            <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <AnimatePresence>
                                            {filteredUsers.map((user, i) => (
                                                <motion.tr
                                                    key={user.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ duration: 0.2, delay: i * 0.04 }}
                                                    className="hover:bg-gray-50/50 transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {user.avatar_url ? (
                                                                <img
                                                                    src={user.avatar_url}
                                                                    alt={`${user.first_name} ${user.last_name}`}
                                                                    className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div className="w-9 h-9 bg-gradient-to-br from-maroon-500 to-maroon-700 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 text-center">{user.email}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold uppercase">
                                                            {user.role === 'pending' ? 'Pending' : user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold uppercase">
                                                            {user.requested_role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2">
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
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Mobile/Tablet Cards Grid (Only shown when not loading, hidden on lg screens) */}
                {!isLoading && filteredUsers.length > 0 && (
                    <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <AnimatePresence>
                            {filteredUsers.map((user, i) => (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2, delay: i * 0.04 }}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={`${user.first_name} ${user.last_name}`}
                                                className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gradient-to-br from-maroon-500 to-maroon-700 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                {user.first_name?.[0]}{user.last_name?.[0]}
                                            </div>
                                        )}
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
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}
