import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, ArrowRight, Clock, CheckCircle } from 'lucide-react';
import { useAuthStore } from '~/modules/auth';
import { supabase } from '~/lib/supabase';

export function RoleSelectionPage() {
    const { profile, isAuthenticated, isInitialized, setProfile } = useAuthStore();
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState<'student' | 'staff' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Not authenticated → login
    if (isInitialized && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Already selected a role and not pending → go to dashboard
    if (profile && profile.role !== 'pending' && profile.role_selected !== false) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleSubmit = async () => {
        if (!selectedRole || !profile?.id) return;
        setIsSubmitting(true);

        try {
            if (selectedRole === 'student') {
                // Student — set role directly, no verification needed
                const { error } = await supabase
                    .from('profiles')
                    .update({ role: 'student', requested_role: null, role_selected: true })
                    .eq('id', profile.id);

                if (error) throw error;
                setProfile({ ...profile, role: 'student', requested_role: null, role_selected: true });
                navigate('/student/booking', { replace: true });
            } else {
                // Staff — keep role as 'pending' (pending verification), set requested_role for HR
                const { error } = await supabase
                    .from('profiles')
                    .update({ role: 'pending', requested_role: 'staff', role_selected: true })
                    .eq('id', profile.id);

                if (error) throw error;
                setProfile({ ...profile, role: 'pending', requested_role: 'staff', role_selected: true });
                setShowSuccess(true);
            }
        } catch (error) {
            console.error('Failed to set role:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-maroon-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-12 max-w-md w-full text-center"
                >
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted!</h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        Your staff role request has been sent for <span className="font-semibold text-maroon-800">HR approval</span>.
                        You can continue using the app as a student in the meantime.
                    </p>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8">
                        <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            Pending HR Verification
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/student/booking', { replace: true })}
                        className="w-full bg-maroon-800 text-white py-3.5 px-6 rounded-xl font-bold hover:bg-maroon-700 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                        Continue to App
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-maroon-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl w-full"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-maroon-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                        <img src="/ldcu-logo.png" alt="LDCU" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Welcome!</h1>
                    <p className="text-gray-600 text-lg">Choose your role to get started</p>
                </div>

                {/* Role Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                    {/* Student Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedRole('student')}
                        className={`relative group p-6 rounded-2xl border-2 transition-all duration-300 text-left ${selectedRole === 'student'
                            ? 'border-maroon-800 bg-maroon-50 shadow-lg shadow-maroon-100'
                            : 'border-gray-200 bg-white hover:border-maroon-300 hover:shadow-md'
                            }`}
                    >
                        {selectedRole === 'student' && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-4 right-4"
                            >
                                <CheckCircle className="w-6 h-6 text-maroon-800" />
                            </motion.div>
                        )}
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedRole === 'student' ? 'bg-maroon-800' : 'bg-maroon-100 group-hover:bg-maroon-200'
                            }`}>
                            <GraduationCap className={`w-7 h-7 ${selectedRole === 'student' ? 'text-white' : 'text-maroon-800'}`} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Student</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Book clinic appointments and access student services
                        </p>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 w-fit px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Instant access
                        </div>
                    </motion.button>

                    {/* Staff Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedRole('staff')}
                        className={`relative group p-6 rounded-2xl border-2 transition-all duration-300 text-left ${selectedRole === 'staff'
                            ? 'border-maroon-800 bg-maroon-50 shadow-lg shadow-maroon-100'
                            : 'border-gray-200 bg-white hover:border-maroon-300 hover:shadow-md'
                            }`}
                    >
                        {selectedRole === 'staff' && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-4 right-4"
                            >
                                <CheckCircle className="w-6 h-6 text-maroon-800" />
                            </motion.div>
                        )}
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedRole === 'staff' ? 'bg-maroon-800' : 'bg-blue-100 group-hover:bg-blue-200'
                            }`}>
                            <Briefcase className={`w-7 h-7 ${selectedRole === 'staff' ? 'text-white' : 'text-blue-700'}`} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Staff</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            Access staff services and clinic booking as an employee
                        </p>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 w-fit px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            Requires HR approval
                        </div>
                    </motion.button>
                </div>

                {/* Submit Button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSubmit}
                    disabled={!selectedRole || isSubmitting}
                    className="w-full bg-maroon-800 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-maroon-700 transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-maroon-800 disabled:hover:shadow-xl flex items-center justify-center gap-3"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Continue
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </motion.button>
            </motion.div>
        </div>
    );
}
