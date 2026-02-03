import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';
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

    return (
        <SidebarLayout>
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                    <p className="text-gray-600">Manage your account information</p>
                </div>

                {message && (
                    <div
                        className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-maroon-800 px-6 py-8">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center">
                                <span className="text-maroon-900 font-bold text-2xl">
                                    {profile?.first_name?.[0]?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="text-white">
                                <h2 className="text-xl font-bold">
                                    {profile?.first_name} {profile?.last_name}
                                </h2>
                                <p className="text-maroon-200 capitalize">{profile?.role || 'User'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                            {!isEditing ? (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="text-maroon-800 hover:text-maroon-600 font-medium text-sm"
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
                                    className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <User className="w-4 h-4 inline mr-1" />
                                        First Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="first_name"
                                            value={formData.first_name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-2">{profile?.first_name || '-'}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="last_name"
                                            value={formData.last_name}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-2">{profile?.last_name || '-'}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Middle Name
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        name="middle_name"
                                        value={formData.middle_name}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                    />
                                ) : (
                                    <p className="text-gray-900 py-2">{profile?.middle_name || '-'}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Mail className="w-4 h-4 inline mr-1" />
                                    Email Address
                                </label>
                                <p className="text-gray-900 py-2">{profile?.email || '-'}</p>
                                <p className="text-xs text-gray-500">Email cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Phone className="w-4 h-4 inline mr-1" />
                                    Contact Number
                                </label>
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        name="contact_number"
                                        value={formData.contact_number}
                                        onChange={handleChange}
                                        placeholder="09XX XXX XXXX"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                    />
                                ) : (
                                    <p className="text-gray-900 py-2">{profile?.contact_number || '-'}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    Campus
                                </label>
                                {isEditing ? (
                                    <select
                                        name="campus_id"
                                        value={formData.campus_id}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maroon-500 focus:border-maroon-500 outline-none"
                                    >
                                        <option value="">Select campus...</option>
                                        {campuses.map((campus) => (
                                            <option key={campus.id} value={campus.id}>
                                                {campus.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-gray-900 py-2">{getCampusName(profile?.campus_id)}</p>
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center justify-center gap-2 w-full bg-maroon-800 text-white py-2 px-4 rounded-lg font-medium hover:bg-maroon-700 focus:ring-2 focus:ring-maroon-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </SidebarLayout>
    );
}
