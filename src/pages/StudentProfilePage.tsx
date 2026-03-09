import { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, Save, Shield, ArrowLeft, X, AlertTriangle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '~/modules/auth';
import { supabase } from '~/lib/supabase';
import { StudentLayout } from '~/components/layout';

// cancelOnly = true means just clear requested_role, don't navigate
type RoleConfirm = { role: 'student' | 'staff'; cancelOnly?: boolean } | null;

export function StudentProfilePage() {
    const navigate = useNavigate();
    const { profile, avatarUrl, setProfile } = useAuthStore();

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isChangingRole, setIsChangingRole] = useState(false);
    const [roleConfirm, setRoleConfirm] = useState<RoleConfirm>(null);
    const [isNavigatingBack, setIsNavigatingBack] = useState(false);

    const [formData, setFormData] = useState({
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        middle_name: profile?.middle_name || '',
        contact_number: profile?.contact_number || '',
    });

    const refreshProfile = useCallback(async () => {
        if (!profile?.id) return;
        setIsLoadingProfile(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', profile.id)
                .single();
            if (!error && data) setProfile(data);
        } catch (e) {
            console.error('Failed to refresh profile', e);
        } finally {
            setIsLoadingProfile(false);
        }
    }, [profile?.id, setProfile]);

    useEffect(() => { refreshProfile(); }, [refreshProfile]);

    useEffect(() => {
        if (profile) {
            setFormData({
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
                middle_name: profile.middle_name || '',
                contact_number: profile.contact_number || '',
            });
        }
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;

        if (formData.contact_number && formData.contact_number.length !== 11) {
            setMessage({ type: 'error', text: 'Contact number must be exactly 11 digits.' });
            return;
        }

        setIsSaving(true);
        setMessage(null);
        try {
            const { error } = await supabase.from('profiles').update(formData).eq('id', profile.id);
            if (error) throw error;
            setProfile({ ...profile, ...formData } as typeof profile);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
        } catch {
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmRoleChange = async () => {
        if (!roleConfirm || !profile?.id) return;
        const { role: newRole, cancelOnly } = roleConfirm;
        setRoleConfirm(null);
        setIsChangingRole(true);
        setMessage(null);

        try {
            if (newRole === 'student' || cancelOnly) {
                // Either switching to student OR just cancelling a pending staff request
                const { error } = await supabase
                    .from('profiles')
                    .update({ role: 'student', requested_role: null })
                    .eq('id', profile.id);
                if (error) throw error;
                setProfile({ ...profile, role: 'student', requested_role: null } as typeof profile);

                if (cancelOnly) {
                    // Just cancelled pending request — stay on profile page
                    setMessage({ type: 'success', text: 'Staff request cancelled.' });
                } else {
                    // Actually switched role — navigate to student booking
                    setMessage({ type: 'success', text: 'You are now a Student.' });
                    setTimeout(() => navigate('/student/booking'), 1200);
                }
            } else {
                // Request staff role
                const { error } = await supabase
                    .from('profiles')
                    .update({ requested_role: 'staff' })
                    .eq('id', profile.id);
                if (error) throw error;
                setProfile({ ...profile, requested_role: 'staff' } as typeof profile);
                setMessage({ type: 'success', text: 'Staff role request submitted. Pending HR approval.' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to change role. Please try again.' });
        } finally {
            setIsChangingRole(false);
        }
    };

    const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase() || 'U';
    const displayAvatar = avatarUrl || profile?.avatar_url || null;
    const backPath = profile?.role === 'staff' ? '/staff/booking' : '/student/booking';
    const hasPending = !!profile?.requested_role;

    const handleBackClick = () => {
        if (isNavigatingBack) return;
        setIsNavigatingBack(true);
        setTimeout(() => navigate(backPath), 220);
    };

    return (
        <StudentLayout>
            <div className="w-full min-h-[calc(100vh-4rem)]">
                <div className="px-4 sm:px-6 lg:px-10 py-6">
                    <div className="w-full space-y-4">

                        {/* Message Banner */}
                        <AnimatePresence>
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${message.type === 'success'
                                        ? 'bg-green-50 text-green-800 border border-green-200'
                                        : 'bg-red-50 text-red-800 border border-red-200'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {message.type === 'success'
                                            ? <Save className="w-4 h-4 text-green-600" />
                                            : <AlertTriangle className="w-4 h-4 text-red-600" />}
                                    </div>
                                    <span>{message.text}</span>
                                    <button
                                        onClick={() => setMessage(null)}
                                        className="ml-auto text-current opacity-50 hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* ── Profile Card ── */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={isNavigatingBack ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full relative"
                        >

                        {/* Banner */}
                        <div className="relative bg-gradient-to-r from-maroon-900 via-maroon-800 to-maroon-900 overflow-hidden min-h-[160px] sm:min-h-0 sm:h-36 flex items-center">
                            {/* Back Button */}
                            <button
                                type="button"
                                onClick={handleBackClick}
                                className="absolute top-4 left-4 sm:top-1/2 sm:-translate-y-1/2 sm:left-6 z-20 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white border border-white/20 hover:text-maroon-900 transition-all shadow-sm"
                                aria-label="Back to Booking"
                            >
                                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>

                            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-56 h-56 bg-gold-400/10 rounded-full -ml-14 -mb-14 blur-2xl pointer-events-none" />

                            <div className="relative z-10 w-full flex flex-col sm:flex-row items-center sm:items-center px-4 sm:px-10 gap-3 sm:gap-6 pt-12 pb-6 sm:py-0 sm:pl-20">
                                {/* Avatar */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-0.5 rounded-2xl shadow-xl shrink-0 relative mt-0 sm:mt-0">
                                    <div className="w-full h-full bg-gradient-to-br from-gold-400 to-gold-600 rounded-[14px] flex items-center justify-center overflow-hidden">
                                        {isLoadingProfile ? (
                                            <div className="w-5 h-5 border-2 border-maroon-900/30 border-t-maroon-900 rounded-full animate-spin" />
                                        ) : displayAvatar ? (
                                            <img
                                                src={displayAvatar}
                                                alt={`${profile?.first_name} ${profile?.last_name}`}
                                                className="w-full h-full object-cover rounded-[14px]"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span className="text-maroon-900 font-black text-xl sm:text-2xl">{initials}</span>
                                        )}
                                    </div>
                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-[3px] border-white rounded-full" />
                                </div>

                                {/* Name & meta */}
                                <div className="text-white min-w-0 flex-1 flex flex-col items-center sm:items-start text-center sm:text-left w-full">
                                    <h2 className="text-lg sm:text-2xl font-bold truncate leading-tight w-full max-w-full">
                                        {profile?.first_name} {profile?.middle_name ? `${profile.middle_name} ` : ''}{profile?.last_name}
                                    </h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 w-full">
                                        <span className="px-2.5 py-0.5 bg-white/20 rounded-lg text-xs font-bold uppercase tracking-wider border border-white/20 flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            {profile?.role || 'User'}
                                        </span>
                                        {profile?.email && (
                                            <span className="hidden sm:flex text-maroon-200 items-center gap-1 text-xs font-medium truncate">
                                                <Mail className="w-3 h-3 shrink-0" />
                                                {profile.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Personal Info Form ── */}
                        <form onSubmit={handleSubmit} className="p-6 sm:p-8 lg:p-10">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Personal Information</h3>
                                    <p className="text-sm text-gray-400 mt-0.5">Keep your details up to date.</p>
                                </div>
                                {!isEditing ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 sm:px-4 sm:py-2 text-sm font-bold text-maroon-800 bg-maroon-50 hover:bg-maroon-100 border border-maroon-200 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <Edit2 className="w-4 h-4 sm:w-4 sm:h-4" />
                                        <span className="hidden sm:inline">Edit Profile</span>
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
                                            });
                                        }}
                                        className="p-2 sm:px-4 sm:py-2 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <X className="w-4 h-4 sm:hidden" />
                                        <span className="hidden sm:inline">Cancel</span>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* First Name */}
                                <Field label="First Name">
                                    {isEditing
                                        ? <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className={inputClass} />
                                        : <FieldValue>{profile?.first_name || '-'}</FieldValue>}
                                </Field>

                                {/* Last Name */}
                                <Field label="Last Name">
                                    {isEditing
                                        ? <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className={inputClass} />
                                        : <FieldValue>{profile?.last_name || '-'}</FieldValue>}
                                </Field>

                                {/* Middle Name */}
                                <Field label="Middle Name" hint="optional">
                                    {isEditing
                                        ? <input type="text" name="middle_name" value={formData.middle_name} onChange={handleChange} className={inputClass} />
                                        : <FieldValue>{profile?.middle_name || '-'}</FieldValue>}
                                </Field>

                                {/* Contact Number */}
                                <Field label="Contact Number" icon={<Phone className="w-3.5 h-3.5" />}>
                                    {isEditing
                                        ? <input
                                            type="tel" name="contact_number" value={formData.contact_number}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                                                setFormData(prev => ({ ...prev, contact_number: val }));
                                            }}
                                            placeholder="09XXXXXXXXX" maxLength={11} className={inputClass}
                                        />
                                        : <FieldValue>{profile?.contact_number || '-'}</FieldValue>}
                                </Field>

                                {/* Email — always locked */}
                                <div className="sm:col-span-2">
                                    <Field label="Email Address" icon={<Mail className="w-3.5 h-3.5" />} hint="locked">
                                        <p className="text-gray-400 py-3 px-4 bg-gray-50 rounded-xl text-sm italic select-none">
                                            {profile?.email || '-'}
                                        </p>
                                    </Field>
                                </div>
                            </div>

                            {isEditing && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-8 flex justify-end"
                                >
                                    <button
                                        type="submit" disabled={isSaving}
                                        className="flex items-center gap-2 px-8 py-3 bg-maroon-800 text-white text-sm font-bold rounded-xl hover:bg-maroon-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
                                    >
                                        {isSaving
                                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            : <Save className="w-4 h-4" />}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </motion.div>
                            )}
                        </form>

                        {/* ── Role Section ── */}
                        {(profile?.role === 'student' || profile?.role === 'staff') && (
                            <div className="px-6 sm:px-8 lg:px-10 pb-8 border-t border-gray-100 pt-6">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-0.5">Role</h3>
                                <p className="text-sm text-gray-400 mb-5">Switch between Student and Staff accounts.</p>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        {/* Student pill */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (profile?.role !== 'student') setRoleConfirm({ role: 'student' });
                                            }}
                                            disabled={isChangingRole || profile?.role === 'student'}
                                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all border-2 ${profile?.role === 'student'
                                                ? 'bg-maroon-800 text-white border-maroon-800 shadow-md cursor-default'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-maroon-500 hover:text-maroon-700 active:scale-95'}`}
                                        >
                                            Student
                                        </button>

                                        {/* Staff pill */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (profile?.role === 'staff' || hasPending) return;
                                                setRoleConfirm({ role: 'staff' });
                                            }}
                                            disabled={isChangingRole || profile?.role === 'staff'}
                                            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-full text-sm font-bold transition-all border-2 ${profile?.role === 'staff'
                                                ? 'bg-maroon-800 text-white border-maroon-800 shadow-md cursor-default'
                                                : hasPending
                                                    ? 'bg-amber-50 text-amber-700 border-amber-300 cursor-not-allowed'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-maroon-500 hover:text-maroon-700 active:scale-95'}`}
                                        >
                                            Staff
                                        </button>
                                    </div>

                                    {/* Cancel pending */}
                                    {hasPending && (
                                        <button
                                            type="button"
                                            onClick={() => setRoleConfirm({ role: 'student', cancelOnly: true })}
                                            disabled={isChangingRole}
                                            className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-full transition-all active:scale-95"
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel Request
                                            <span className="opacity-75 text-xs font-medium ml-0.5">(pending)</span>
                                        </button>
                                    )}

                                    {isChangingRole && (
                                        <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-500 w-full sm:w-auto">
                                            <div className="w-4 h-4 border-2 border-maroon-800/30 border-t-maroon-800 rounded-full animate-spin" />
                                            Processing...
                                        </div>
                                    )}
                                </div>

                                {/* Notices */}
                                {!hasPending && profile?.role === 'student' && (
                                    <p className="mt-3 text-xs text-gray-400">Switching to Staff requires HR approval.</p>
                                )}
                            </div>
                        )}
                        {/* End of Profile Card */}
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* ── Role Confirmation Modal ── */}
            <AnimatePresence>
                {roleConfirm && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setRoleConfirm(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', duration: 0.3 }}
                            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
                        >
                            {/* Close */}
                            <button
                                onClick={() => setRoleConfirm(null)}
                                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {/* Icon */}
                            <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center ${roleConfirm.cancelOnly
                                ? 'bg-red-100'
                                : roleConfirm.role === 'student' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                {roleConfirm.cancelOnly
                                    ? <X className="w-7 h-7 text-red-600" />
                                    : roleConfirm.role === 'student'
                                        ? <User className="w-7 h-7 text-green-600" />
                                        : <Shield className="w-7 h-7 text-blue-600" />}
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 text-center">
                                {roleConfirm.cancelOnly
                                    ? 'Cancel Staff Request?'
                                    : roleConfirm.role === 'student'
                                        ? 'Switch to Student?'
                                        : 'Request Staff Role?'}
                            </h3>

                            <p className="mt-2 text-sm text-gray-500 text-center leading-relaxed px-2">
                                {roleConfirm.cancelOnly
                                    ? 'This will cancel your pending Staff request. You will remain as a Student.'
                                    : roleConfirm.role === 'student'
                                        ? 'Your account will immediately switch to the Student role.'
                                        : 'A request will be sent to HR for approval. You will remain as a Student until approved.'}
                            </p>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRoleConfirm(null)}
                                    className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmRoleChange}
                                    className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-all active:scale-95 shadow-md ${roleConfirm.cancelOnly
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : roleConfirm.role === 'student' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    {roleConfirm.cancelOnly ? 'Yes, Cancel' : roleConfirm.role === 'student' ? 'Yes, Switch' : 'Yes, Request'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </StudentLayout>
    );
}

/* ── Small helper components for cleaner field layout ── */
function Field({
    label, hint, icon, children,
}: {
    readonly label: string;
    readonly hint?: string;
    readonly icon?: React.ReactNode;
    readonly children: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {icon}
                {label}
                {hint && <span className="text-gray-400 normal-case font-normal text-[11px]">({hint})</span>}
            </p>
            {children}
        </div>
    );
}

function FieldValue({ children }: { readonly children: React.ReactNode }) {
    return (
        <p className="text-gray-900 py-3 px-4 bg-gray-50/70 rounded-xl text-sm font-semibold">
            {children}
        </p>
    );
}

const inputClass = 'w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 outline-none text-sm font-medium transition-all';
