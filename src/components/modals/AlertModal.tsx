import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
}

export function AlertModal({ isOpen, onClose, title, message, type = 'warning' }: AlertModalProps) {
  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      default: // warning
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-600',
          button: 'bg-maroon-800 hover:bg-maroon-900'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`bg-white rounded-xl shadow-xl w-full max-w-md ${colors.border} border-2`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${colors.bg} px-6 py-4 rounded-t-xl border-b ${colors.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className={`w-6 h-6 ${colors.icon}`} />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {title || 'Booking Not Available'}
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-gray-700 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-xl">
              <button
                onClick={onClose}
                className={`w-full py-3 px-4 ${colors.button} text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maroon-500`}
              >
                OK
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
