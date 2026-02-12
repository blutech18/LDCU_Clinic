import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarLayout } from '~/components/layout';
import { useAuthStore } from '~/modules/auth';
import { useScheduleStore } from '~/modules/schedule';
import { supabase } from '~/lib/supabase';

export function ProfilePage() {
    const { profile, setProfile } = useAuthStore();
    const { campuses, fetchCampuses } = useScheduleStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [formData, setFormData] = useState({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        middle_name: profile?.middle_name || '',
        contact_number: profile?.contact_number || '',
        campus_id: profile?.campus_id || '',
    });

    useEffect(() => {
        fetchCampuses();
    }, [fetchCampuses]);

    useEffect(() => {
        if (profile) {
            setFormData({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                middle_name: profile.middle_name || '',
                contact_number: profile.contact_number || '',
                campus_id: profile.campus_id || '',
            });
        }
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        setIsSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .update(formData)
                .eq('id', profile.id);

            if (error) throw error;

            setProfile({ ...profile, ...formData } as typeof profile);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const getCampusName = (campusId: string | undefined) => {
        if (!campusId) return 'Not assigned';
        const campus = campuses.find((c) => c.id === campusId);
        return campus?.name || 'Unknown';
    };

    const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase() || 'U';

    return (
        <SidebarLayout>
            <div className="max-w-3xl mx-auto px-0 sm:px-2">
                <div className="mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
                    <p className="text-gray-600 text-sm">Manage your account information</p>
                </div>

                {/* Message Banner */}
                <AnimatePresence>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`mb-6 p-3 sm:p-4 rounded-lg text-sm font-medium ${message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                                }`}
                        >
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-maroon-800 px-4 sm:px-6 py-6 sm:py-8">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gold-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                <span className="text-maroon-900 font-bold text-xl sm:text-2xl">
                                    {initials}
                                </span>
                            </div>
                            <div className="text-white min-w-0">
                                <h2 className="text-lg sm:text-xl font-bold truncate">
                                    {profile?.first_name} {profile?.middle_name ? `${profile.middle_name} ` : ''}{profile?.last_name}
                                </h2>
                                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 mt-1">
                                    <p className="text-maroon-200 capitalize flex items-center gap-1.5 text-sm">
                                        <Shield className="w-3.5 h-3.5" />
                                        {profile?.role || 'User'}
                                    </p>
                                    {profile?.email && (
                                        <p className="text-maroon-300 flex items-center gap-1.5 text-xs sm:text-sm truncate max-w-[250px]">
                                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                            {profile.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Personal Information</h3>
                            {!isEditing ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="px-3 py-1.5 text-sm font-medium text-maroon-800 hover:text-white bg-maroon-50 hover:bg-maroon-800 rounded-lg transition-all duration-200"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            first_name: profile?.first_name || '',
                                            last_name: profile?.last_name || '',
                                            middle_name: profile?.middle_name || '',
                                            contact_number: profile?.contact_number || '',
                                            campus_id: profile?.campus_id || '',
                                        });
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        <User className="w-4 h-4 text-gray-400" />
                                        First Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-2.5 px-3 bg-gray-50 rounded-lg text-sm">{profile?.first_name || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        <User className="w-4 h-4 text-gray-400" />
                                        Last Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-2.5 px-3 bg-gray-50 rounded-lg text-sm">{profile?.last_name || '-'}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                    Middle Name
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="middle_name"
                                        value={formData.middle_name}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow"
                                    />
                                ) : (
                                    <p className="text-gray-900 py-2.5 px-3 bg-gray-50 rounded-lg text-sm">{profile?.middle_name || '-'}</p>
                                )}
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    Email Address
                                </label>
                                <p className="text-gray-900 py-2.5 px-3 bg-gray-50 rounded-lg text-sm">{profile?.email || '-'}</p>
                                <p className="text-xs text-gray-400 mt-1 ml-1">Email cannot be changed</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        Contact Number
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="contact_number"
                                            value={formData.contact_number}
                                            onChange={handleChange}
                                            placeholder="09XX XXX XXXX"
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-2.5 px-3 bg-gray-50 rounded-lg text-sm">{profile?.contact_number || '-'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        Campus
                                    </label>
                                    {isEditing ? (
                                        <select
                                            name="campus_id"
                                            value={formData.campus_id}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none text-sm transition-shadow"
                                        >
                                            <option value="">Select campus...</option>
                                            {campuses.map((campus) => (
                                                <option key={campus.id} value={campus.id}>
                                                    {campus.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-gray-900 py-2.5 px-3 bg-gray-50 rounded-lg text-sm">{getCampusName(profile?.campus_id)}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6"
                            >
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center justify-center gap-2 w-full sm:w-auto sm:ml-auto sm:px-8 bg-maroon-800 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-maroon-700 focus:ring-2 focus:ring-maroon-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </motion.div>
                        )}
                    </form>
                </div>
            </div>
        </SidebarLayout>
    );
}
