import React, { useState, useEffect, useRef } from 'react';
import { 
  format, 
  parse, 
  addDays, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  isSameMonth
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Check, Sparkles, X } from 'lucide-react';

interface DateTimePicker24hProps {
  value: string; // "YYYY-MM-DDTHH:mm" or ISO string
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export function DateTimePicker24h({
  value,
  onChange,
  label,
  required = false,
  className = '',
  placeholder = 'Chọn ngày và giờ 24h...'
}: DateTimePicker24hProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsedDate = React.useMemo(() => {
    if (!value) return new Date();
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }, [value]);

  const [viewMonth, setViewMonth] = useState<Date>(parsedDate);
  const [selectedDate, setSelectedDate] = useState<Date>(parsedDate);
  const [selectedHour, setSelectedHour] = useState<number>(parsedDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(parsedDate.getMinutes());

  // Update internal state when value prop changes externally
  useEffect(() => {
    if (value) {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          setSelectedDate(d);
          setSelectedHour(d.getHours());
          setSelectedMinute(d.getMinutes());
          setViewMonth(d);
        }
      } catch {
        // ignore
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Auto-scroll selected hour/minute into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const hourContainer = document.getElementById('24h-hour-scroll-container');
        const minuteContainer = document.getElementById('24h-minute-scroll-container');
        
        const selectedHourEl = hourContainer?.querySelector('[data-hour-selected="true"]');
        const selectedMinuteEl = minuteContainer?.querySelector('[data-minute-selected="true"]');
        
        if (selectedHourEl) {
          selectedHourEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
        if (selectedMinuteEl) {
          selectedMinuteEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      }, 60);
    }
  }, [isOpen]);

  const applyDateTime = (date: Date, hour: number, minute: number) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(hour);
    const min = pad(minute);
    const result = `${y}-${m}-${d}T${h}:${min}`;
    onChange(result);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    applyDateTime(date, selectedHour, selectedMinute);
  };

  const handleSelectHour = (h: number) => {
    setSelectedHour(h);
    applyDateTime(selectedDate, h, selectedMinute);
  };

  const handleSelectMinute = (m: number) => {
    setSelectedMinute(m);
    applyDateTime(selectedDate, selectedHour, m);
  };

  // Quick Presets
  const applyPreset = (daysFromNow: number, hour = 23, minute = 59) => {
    const target = addDays(new Date(), daysFromNow);
    setSelectedDate(target);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setViewMonth(target);
    applyDateTime(target, hour, minute);
  };

  // Days in month calculation for custom calendar
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const formattedDisplay = React.useMemo(() => {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      const time24h = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const datePart = format(d, 'EEEE, dd/MM/yyyy', { locale: vi });
      return `${time24h} - ${datePart.charAt(0).toUpperCase() + datePart.slice(1)}`;
    } catch {
      return value;
    }
  }, [value]);

  const quickMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 59];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Trigger Input Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 border rounded-2xl text-left text-sm font-bold transition-all flex items-center justify-between gap-2 shadow-sm ${
          isOpen ? 'ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20' : 'border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          {formattedDisplay ? (
            <span className="font-bold text-slate-800 truncate">{formattedDisplay}</span>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>
        <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
          Giờ 24H
        </span>
      </button>

      {/* Modern Popover Picker */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-full sm:w-[480px] max-w-[95vw] bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Quick Presets Bar */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Chọn nhanh hạn nộp:
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset(0, 23, 59)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
              >
                Hôm nay 23:59
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1, 23, 59)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
              >
                Ngày mai 23:59
              </button>
              <button
                type="button"
                onClick={() => applyPreset(3, 23, 59)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
              >
                3 ngày nữa
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7, 23, 59)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
              >
                1 tuần nữa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            
            {/* 1. Date Selection Pane */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 capitalize">
                  {format(viewMonth, 'MMMM yyyy', { locale: vi })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span className="text-indigo-500">T7</span>
                <span className="text-rose-500">CN</span>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentMonth = isSameMonth(day, viewMonth);
                  const isCurrentDay = isToday(day);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDate(day)}
                      className={`h-7 sm:h-8 text-xs font-bold rounded-lg transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                          : isCurrentDay
                          ? 'bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200'
                          : isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Redesigned 24-Hour Column-based Time Selection Pane */}
            <div className="space-y-3 sm:border-l sm:border-slate-100 sm:pl-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600 animate-pulse" /> Giờ 24H & Phút:
                </span>
                <span className="text-[11px] font-mono font-black px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg shadow-sm">
                  {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
                </span>
              </div>

              {/* Side-by-side scroll lists */}
              <div className="grid grid-cols-2 gap-2 h-44 bg-slate-50/60 rounded-2xl p-2 border border-slate-100">
                {/* Hours List (00-23) */}
                <div className="flex flex-col h-full overflow-hidden">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center mb-1">Giờ (00-23)</p>
                  <div 
                    id="24h-hour-scroll-container"
                    className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5"
                  >
                    {Array.from({ length: 24 }, (_, h) => {
                      const isSel = selectedHour === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          data-hour-selected={isSel ? "true" : "false"}
                          onClick={() => handleSelectHour(h)}
                          className={`w-full py-1.5 text-xs font-mono font-bold rounded-xl transition-all text-center ${
                            isSel
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 font-black scale-[1.02]'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          {h.toString().padStart(2, '0')} giờ
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minutes List (00-59) */}
                <div className="flex flex-col h-full overflow-hidden border-l border-slate-200/50 pl-1.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center mb-1">Phút (00-59)</p>
                  <div 
                    id="24h-minute-scroll-container"
                    className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5 pr-0.5"
                  >
                    {Array.from({ length: 60 }, (_, m) => {
                      const isSel = selectedMinute === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          data-minute-selected={isSel ? "true" : "false"}
                          onClick={() => handleSelectMinute(m)}
                          className={`w-full py-1.5 text-xs font-mono font-bold rounded-xl transition-all text-center ${
                            isSel
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-150 font-black scale-[1.02]'
                              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'
                          }`}
                        >
                          {m.toString().padStart(2, '0')} phút
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Fast minute presets below the wheel */}
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Chọn nhanh phút chẵn:</p>
                <div className="flex flex-wrap gap-1">
                  {[0, 15, 30, 45, 59].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`px-2 py-0.5 text-[10px] font-mono font-extrabold rounded-lg border transition-all ${
                        selectedMinute === m
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-black'
                          : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      :{m.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Confirmation Bar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500 font-medium truncate">
              Đã chọn: <strong className="text-slate-800">{selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')} - {format(selectedDate, 'dd/MM/yyyy')}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                applyDateTime(selectedDate, selectedHour, selectedMinute);
                setIsOpen(false);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center gap-1 shrink-0"
            >
              <Check className="w-3.5 h-3.5" /> Xác nhận
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
