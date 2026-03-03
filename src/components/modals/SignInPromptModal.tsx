import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, LogIn, Sun } from 'lucide-react';
import { useAuthStore } from '~/modules/auth';

interface SignInPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDate: Date | null;
    bookedSlots: string[];
    maxSlots?: number;
    isHolidayDate?: boolean;
}

export function SignInPromptModal({ isOpen, onClose, selectedDate, bookedSlots, maxSlots = 20, isHolidayDate = false }: SignInPromptModalProps) {
    const { loginWithGoogle } = useAuthStore();

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
        } catch (err) {
            console.error('Failed to login with Google:', err);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const booked = bookedSlots.length;
    const available = Math.max(0, maxSlots - booked);
    const fillPercent = Math.min(100, (booked / maxSlots) * 100);
    const isFull = available === 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                            {/* Header — single row */}
                            <div className="bg-maroon-800 text-white px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-baseline gap-2 min-w-0">
                                    <h3 className="text-base font-bold whitespace-nowrap">Appointments</h3>
                                    <p className="text-sm text-gold-300 truncate">{formatDate(selectedDate)}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="shrink-0 p-1 rounded-lg hover:bg-maroon-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                {/* Holiday Notice */}
                                {isHolidayDate ? (
                                    <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                                        <Sun className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-orange-800">This is a Public Holiday</p>
                                            <p className="text-xs text-orange-600 mt-0.5">Clinic appointments are not available on this date. Please choose another day.</p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Slot Summary */
                                    <div className="mb-4 bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                                <Users className="w-4 h-4 text-maroon-700" />
                                                Slot Availability
                                            </div>
                                            <span className={`text-sm font-bold ${isFull ? 'text-red-600' : available <= maxSlots * 0.2 ? 'text-orange-500' : 'text-green-600'}`}>
                                                {isFull ? 'Full' : `${available}/${maxSlots}`}
                                            </span>
                                        </div>
                                        {/* Progress Bar */}
                                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : fillPercent >= 80 ? 'bg-orange-400' : 'bg-green-500'}`}
                                                style={{ width: `${fillPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Sign In Prompt */}
                                <div className="bg-gold-50 border border-gold-200 rounded-lg p-4 text-center">
                                    <LogIn className="w-8 h-8 text-maroon-800 mx-auto mb-2" />
                                    <p className="text-sm text-gray-700 font-medium mb-1">
                                        Want to book an appointment?
                                    </p>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Sign in with your Google account to schedule your visit.
                                    </p>
                                    <button
                                        onClick={handleGoogleLogin}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-maroon-800 text-white rounded-lg hover:bg-maroon-700 transition-colors font-medium"
                                    >
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Sign in with Google
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
