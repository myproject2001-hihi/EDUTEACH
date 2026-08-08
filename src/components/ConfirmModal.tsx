import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Smooth Zoom Modal Box from Center */}
          <motion.div
            initial={{ scale: 0.65, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.65, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 overflow-hidden"
          >
            {/* Icon & Message */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  variant === 'danger'
                    ? 'bg-red-50 text-red-600 border border-red-100 shadow-red-100'
                    : variant === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100 shadow-amber-100'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-indigo-100'
                }`}
              >
                {variant === 'danger' ? (
                  <Trash2 className="w-7 h-7" />
                ) : variant === 'warning' ? (
                  <AlertTriangle className="w-7 h-7" />
                ) : (
                  <ShieldAlert className="w-7 h-7" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">{message}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  await onConfirm();
                }}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                  variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                    : variant === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {loading ? 'Đang xử lý...' : confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
