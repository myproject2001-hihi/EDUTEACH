import React, { useState, useEffect } from 'react';
import { ClassSession, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Video, Bell, X, ExternalLink, Sparkles, AlertCircle } from 'lucide-react';

interface ClassSessionReminderProps {
  user: User;
  classes: ClassSession[];
}

export interface ToastNotification {
  id: string;
  classId: string;
  title: string;
  subject: string;
  startTime: string;
  link: string;
  minutesRemaining: number;
  type: 'class_reminder' | 'simulation';
}

export function ClassSessionReminder({ user, classes }: ClassSessionReminderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  
  // Track notified class IDs using sessionStorage to prevent duplicate alerts on page reloads
  const [notifiedClassIds, setNotifiedClassIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('notified_class_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveNotifiedClassId = (id: string) => {
    setNotifiedClassIds(prev => {
      const updated = [...prev, id];
      sessionStorage.setItem('notified_class_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  // Scan classes every 10 seconds
  useEffect(() => {
    if (user.role !== 'student') return; // Only notify students as requested

    const checkSchedules = () => {
      const now = Date.now();
      
      classes.forEach(session => {
        if (!session.startTime) return;
        
        const startTimeMs = new Date(session.startTime).getTime();
        const diffMs = startTimeMs - now;
        const diffMins = diffMs / 60000;

        // Trigger notification if class is starting in <= 15 minutes (and is in the future)
        // We use 15.5 minutes to give a small buffer
        if (diffMins > 0 && diffMins <= 15.5) {
          if (!notifiedClassIds.includes(session.id)) {
            // Trigger toast
            const roundedMins = Math.max(1, Math.round(diffMins));
            const newToast: ToastNotification = {
              id: `toast_${Date.now()}_${session.id}`,
              classId: session.id,
              title: session.title,
              subject: session.subject || 'Môn Học',
              startTime: session.startTime,
              link: session.link,
              minutesRemaining: roundedMins,
              type: 'class_reminder'
            };

            setToasts(prev => {
              // Avoid duplicate active toasts for the same class
              if (prev.some(t => t.classId === session.id)) return prev;
              return [...prev, newToast];
            });

            saveNotifiedClassId(session.id);
          }
        }
      });
    };

    // Run check immediately on mount
    checkSchedules();

    const interval = setInterval(checkSchedules, 10000);
    return () => clearInterval(interval);
  }, [classes, notifiedClassIds, user]);

  // Expose a global simulation trigger on window so we can test easily from anywhere!
  useEffect(() => {
    (window as any).simulateClassReminder = (customTitle?: string) => {
      const simulatedToast: ToastNotification = {
        id: `toast_sim_${Date.now()}`,
        classId: `sim_${Date.now()}`,
        title: customTitle || 'Lớp Học Thử Nghiệm (Toán Học 10A1)',
        subject: 'Toán Đại Số',
        startTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        link: 'https://meet.google.com/abc-defg-hij',
        minutesRemaining: 15,
        type: 'simulation'
      };
      setToasts(prev => [...prev, simulatedToast]);
    };

    return () => {
      delete (window as any).simulateClassReminder;
    };
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9, transition: { duration: 0.15 } }}
            className={`pointer-events-auto bg-white border rounded-2xl p-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col gap-3 relative overflow-hidden ${
              toast.type === 'simulation' ? 'border-indigo-200 ring-1 ring-indigo-500/10' : 'border-rose-200 ring-1 ring-rose-500/10'
            }`}
          >
            {/* Ambient Background Glow */}
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 -mr-6 -mt-6 ${
              toast.type === 'simulation' ? 'bg-indigo-600' : 'bg-rose-600'
            }`} />

            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                toast.type === 'simulation' 
                  ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                  : 'bg-rose-50 border-rose-100 text-rose-500 animate-pulse'
              }`}>
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                    toast.type === 'simulation' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-rose-100 text-rose-700'
                  }`}>
                    {toast.type === 'simulation' ? 'Chạy Thử' : 'Sắp Diễn Ra'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Bắt đầu sau {toast.minutesRemaining} phút
                  </span>
                </div>
                <h5 className="font-extrabold text-slate-800 text-sm mt-1 leading-snug">
                  {toast.title}
                </h5>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Môn học: <strong className="text-slate-700 font-semibold">{toast.subject}</strong>
                </p>
              </div>
              <button 
                onClick={() => dismissToast(toast.id)}
                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 mt-1">
              <a
                href={toast.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => dismissToast(toast.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-black text-white transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                  toast.type === 'simulation'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10'
                    : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
                }`}
              >
                <Video className="w-4 h-4" /> Vào học ngay
              </a>
              <button
                onClick={() => dismissToast(toast.id)}
                className="px-3 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Bỏ qua
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
