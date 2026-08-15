import React, { useState, useEffect } from 'react';
import { Assignment, Submission, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, AlertCircle, FileText, ExternalLink } from 'lucide-react';

interface AssignmentReminderProps {
  user: User;
  assignments: Assignment[];
  submissions: Submission[];
}

export interface AssignmentToast {
  id: string;
  assignmentId: string;
  title: string;
  type: string;
  dueDate: string;
  hoursRemaining: number;
}

export function AssignmentReminder({ user, assignments, submissions }: AssignmentReminderProps) {
  const [toasts, setToasts] = useState<AssignmentToast[]>([]);
  
  // Track notified assignment IDs using sessionStorage to prevent duplicate alerts on page reloads
  const [notifiedAssignmentIds, setNotifiedAssignmentIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('notified_assignments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveNotifiedAssignmentId = (id: string) => {
    setNotifiedAssignmentIds(prev => {
      const updated = [...prev, id];
      sessionStorage.setItem('notified_assignments', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (user.role !== 'student') return; // Only notify students

    const checkAssignments = () => {
      const now = Date.now();
      
      assignments.forEach(assignment => {
        if (!assignment.dueDate) return;
        
        const dueTimeMs = new Date(assignment.dueDate).getTime();
        const diffMs = dueTimeMs - now;
        const diffHours = diffMs / (60 * 60 * 1000);
        
        // Trigger notification if assignment is due in <= 24 hours (and is in the future)
        if (diffHours > 0 && diffHours <= 24) {
          // Check if already submitted
          const hasSubmitted = submissions.some(
            s => s.assignmentId === assignment.id && s.studentId === user.id
          );
          
          if (!hasSubmitted && !notifiedAssignmentIds.includes(assignment.id)) {
            const roundedHours = Math.max(1, Math.ceil(diffHours));
            
            const newToast: AssignmentToast = {
              id: `toast_assign_${Date.now()}_${assignment.id}`,
              assignmentId: assignment.id,
              title: assignment.title,
              type: assignment.type,
              dueDate: assignment.dueDate,
              hoursRemaining: roundedHours
            };

            setToasts(prev => {
              if (prev.some(t => t.assignmentId === assignment.id)) return prev;
              return [...prev, newToast];
            });
            saveNotifiedAssignmentId(assignment.id);
          }
        }
      });
    };

    // Initial check
    checkAssignments();
    // Re-check every 5 minutes
    const interval = setInterval(checkAssignments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [assignments, submissions, notifiedAssignmentIds, user]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto bg-white border rounded-2xl p-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col gap-3 relative overflow-hidden border-orange-200 ring-1 ring-orange-500/10"
          >
            <div className="absolute top-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-10 -ml-6 -mt-6 bg-orange-600" />
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-orange-50 border-orange-100 text-orange-500 animate-pulse">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                    Sắp Hết Hạn
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    Còn {toast.hoursRemaining} giờ
                  </span>
                </div>
                <h5 className="font-extrabold text-slate-800 text-sm mt-1 leading-snug truncate">
                  {toast.title}
                </h5>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Dạng bài: <strong className="text-slate-700 font-semibold">{toast.type === 'game' ? 'Game' : toast.type === 'online_test' ? 'Trắc nghiệm' : toast.type === 'file_upload' ? 'Tự luận' : 'Khác'}</strong>
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
              <button
                onClick={() => dismissToast(toast.id)}
                className="flex-1 py-2 rounded-xl text-xs font-black text-white transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 bg-orange-500 hover:bg-orange-600 shadow-orange-500/10"
              >
                <FileText className="w-4 h-4" /> Làm Bài Ngay
              </button>
              <button
                onClick={() => dismissToast(toast.id)}
                className="px-3 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Để sau
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
