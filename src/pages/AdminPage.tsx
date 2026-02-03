import { useEffect, useState } from 'react';
import { Users, Check, X, Search } from 'lucide-react';
import { SidebarLayout } from '~/components/layout';
import { supabase } from '~/lib/supabase';
import type { Profile } from '~/types';

export function AdminPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (userId: string, verified: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: verified })
                .eq('id', userId);

            if (error) throw error;

            setUsers((prev) =>
                prev.map((user) =>
                    user.id === userId ? { ...user, is_verified: verified } : user
                )
            );
        } catch (error) {
            console.error('Failed to update verification status:', error);
        }
    };

    const handleRoleChange = async (userId: string, role: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId);

            if (error) throw error;

            setUsers((prev) =>
                prev.map((user) =>
                    user.id === userId ? { ...user, role: role as Profile['role'] } : user
                )
            );
        } catch (error) {
            console.error('Failed to update role:', error);
        }
    };

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

    return (
        <SidebarLayout>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                    <p className="text-gray-600">Manage users and system settings</p>
                </div>
                {pendingCount > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
                        <Users className="w-4 h-4" />
                        {pendingCount} pending verification
                    </div>
                )}
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
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                                        <td className="px-4 py-4 text-gray-600">{user.email}</td>
                                        <td className="px-4 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                            >
                                                <option value="employee">Employee</option>
                                                <option value="student">Student</option>
                                                <option value="nurse">Nurse</option>
                                                <option value="doctor">Doctor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-4">
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
                                            {!user.is_verified ? (
                                                <button
                                                    onClick={() => handleVerify(user.id, true)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded text-sm font-medium hover:bg-green-200 transition-colors"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    Verify
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleVerify(user.id, false)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                    Revoke
                                                </button>
                                            )}
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
