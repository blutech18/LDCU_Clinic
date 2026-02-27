import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <>
            <div className="animate-slide-up">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Profile
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Manage your clinic account and personal information.
                    </p>
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
                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                                    <Save className="w-4 h-4 text-green-600" />
                                </div>
                            ) : (
                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                                    <Shield className="w-4 h-4 text-red-600" />
                                </div>
                            )}
                            {message.text}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl">
                    {/* Profile Header Banner */}
                    <div className="relative h-32 sm:h-40 bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-900 overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold-400/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>

                        <div className="absolute inset-0 flex items-center px-6 sm:px-10">
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white p-1 rounded-2xl shadow-2xl relative group">
                                    <div className="w-full h-full bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center overflow-hidden">
                                        <span className="text-maroon-900 font-black text-2xl sm:text-3xl">
                                            {initials}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full"></div>
                                </div>
                                <div className="text-white pb-1 text-center sm:text-left">
                                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                                        {profile?.first_name} {profile?.middle_name ? `${profile.middle_name} ` : ''}{profile?.last_name}
                                    </h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-1.5">
                                        <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
                                            <Shield className="w-3.5 h-3.5" />
                                            {profile?.role || 'User'}
                                        </span>
                                        {profile?.email && (
                                            <span className="text-maroon-100 flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                                                <Mail className="w-3.5 h-3.5" />
                                                {profile.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Profile Form Section */}
                    <form onSubmit={handleSubmit} className="p-6 sm:p-10">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Personal Information</h3>
                                <p className="text-sm text-gray-500 mt-1">Keep your details up to date.</p>
                            </div>
                            {!isEditing ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 text-sm font-bold text-maroon-800 bg-maroon-50 hover:bg-maroon-100 border border-maroon-200 rounded-xl transition-all duration-300 shadow-sm hover:shadow active:scale-95 flex items-center gap-2"
                                >
                                    <User className="w-4 h-4" />
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
                                    className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all duration-300 active:scale-95"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Names Section */}
                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 ml-1">
                                        <div className="w-1.5 h-1.5 bg-maroon-800 rounded-full"></div>
                                        First Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 outline-none text-sm transition-all font-medium"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-3 px-4 bg-gray-50/50 border border-transparent rounded-xl text-sm font-semibold">{profile?.first_name || '-'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 ml-1">
                                        <div className="w-1.5 h-1.5 bg-maroon-800 rounded-full"></div>
                                        Last Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 outline-none text-sm transition-all font-medium"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-3 px-4 bg-gray-50/50 border border-transparent rounded-xl text-sm font-semibold">{profile?.last_name || '-'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 ml-1">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                        Middle Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="middle_name"
                                            value={formData.middle_name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 outline-none text-sm transition-all font-medium"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-3 px-4 bg-gray-50/50 border border-transparent rounded-xl text-sm font-semibold">{profile?.middle_name || '-'}</p>
                                    )}
                                </div>
                            </div>

                            {/* Contact & Info Section */}
                            <div className="space-y-6">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 ml-1">
                                        <Mail className="w-4 h-4 text-maroon-800" />
                                        Email Address
                                    </label>
                                    <div className="relative group">
                                        <p className="text-gray-500 py-3 px-4 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium italic opacity-75">
                                            {profile?.email || '-'}
                                        </p>
                                        <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 hidden group-hover:block transition-all">
                                            <div className="bg-gray-800 text-white text-[10px] py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                                                Locked for security
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 ml-1">
                                        <Phone className="w-4 h-4 text-maroon-800" />
                                        Contact Number
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="contact_number"
                                            value={formData.contact_number}
                                            onChange={handleChange}
                                            placeholder="09XX XXX XXXX"
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 outline-none text-sm transition-all font-medium"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-3 px-4 bg-gray-50/50 border border-transparent rounded-xl text-sm font-semibold">{profile?.contact_number || '-'}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2 ml-1">
                                        <MapPin className="w-4 h-4 text-maroon-800" />
                                        Assigned Campus
                                    </label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <select
                                                name="campus_id"
                                                value={formData.campus_id}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 outline-none text-sm transition-all font-medium appearance-none"
                                            >
                                                <option value="">Select campus...</option>
                                                {campuses.map((campus) => (
                                                    <option key={campus.id} value={campus.id}>
                                                        {campus.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center px-4 py-2 bg-maroon-50 border border-maroon-100 rounded-2xl">
                                            <div className="w-2 h-2 bg-maroon-600 rounded-full mr-2.5 animate-pulse"></div>
                                            <p className="text-maroon-900 text-sm font-bold">{getCampusName(profile?.campus_id)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-12 flex justify-end"
                            >
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center justify-center gap-3 w-full sm:w-auto sm:px-12 bg-maroon-800 text-white py-4 px-6 rounded-2xl font-bold hover:bg-maroon-700 focus:ring-4 focus:ring-maroon-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-maroon-900/20 active:scale-95 group"
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    )}
                                    {isSaving ? 'Saving Changes...' : 'Save Profile Details'}
                                </button>
                            </motion.div>
                        )}
                    </form>
                </div>
            </div>
        </>
    );
}
