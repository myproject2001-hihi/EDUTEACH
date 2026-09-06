import React from 'react';
import { Check, Trash2, LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface BatchActionBarProps {
  count: number;
  itemLabel?: string;
  actionLabel?: string;
  description?: string;
  onDeselectAll: () => void;
  onAction?: () => void;
  isActionLoading?: boolean;
  actionIcon?: LucideIcon;
  actionVariant?: 'danger' | 'primary' | 'success';
  customActions?: React.ReactNode;
}

export function BatchActionBar({
  count,
  itemLabel = 'mục đã chọn',
  actionLabel,
  description = 'Bạn có thể thực hiện thao tác hàng loạt các mục đã chọn này cùng lúc.',
  onDeselectAll,
  onAction,
  isActionLoading = false,
  actionIcon: ActionIcon = Trash2,
  actionVariant = 'danger',
  customActions
}: BatchActionBarProps) {
  if (count <= 0) return null;

  const getActionBtnClass = () => {
    switch (actionVariant) {
      case 'primary':
        return 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white';
      default:
        return 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-indigo-50/80 border border-indigo-100/90 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100/70 rounded-xl flex items-center justify-center text-indigo-700 shrink-0">
          <Check className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 leading-tight">
            Đang chọn {count} {itemLabel}
          </p>
          <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate sm:whitespace-normal">
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
        {customActions}
        <button
          type="button"
          onClick={onDeselectAll}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
        >
          Bỏ chọn
        </button>
        {onAction && actionLabel && (
          <button
            type="button"
            disabled={isActionLoading}
            onClick={onAction}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95 ${getActionBtnClass()}`}
          >
            {isActionLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ActionIcon className="w-4 h-4" />
            )}
            <span>{actionLabel} ({count})</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
