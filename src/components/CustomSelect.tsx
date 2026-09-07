import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Search, X, Pencil } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  badge?: string;
  color?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right' | 'auto';
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onBadgeClick?: (option: CustomSelectOption, e: React.MouseEvent) => void;
  badgeTooltip?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Chọn một mục...',
  className = '',
  menuClassName = '',
  size = 'sm',
  align = 'auto',
  disabled = false,
  searchable,
  searchPlaceholder = 'Tìm kiếm lựa chọn...',
  onBadgeClick,
  badgeTooltip,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [computedAlign, setComputedAlign] = useState<'left' | 'right'>(align === 'right' ? 'right' : 'left');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (align === 'right') {
        setComputedAlign('right');
      } else if (align === 'left') {
        setComputedAlign('left');
      } else {
        // Auto alignment based on bounding rect and viewport width
        const rect = containerRef.current.getBoundingClientRect();
        const spaceOnRight = window.innerWidth - rect.left;
        if (spaceOnRight < 240 && rect.right > 200) {
          setComputedAlign('right');
        } else {
          setComputedAlign('left');
        }
      }
    }
  }, [isOpen, align]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Enable search automatically if there are many options (> 8)
  const isSearchEnabled = searchable !== undefined ? searchable : options.length > 8;

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(term)) ||
        (opt.badge && opt.badge.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input on open if enabled
      if (isSearchEnabled) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isSearchEnabled]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        onChange(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
      }
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-3.5 py-2.5 text-xs sm:text-sm',
    lg: 'px-4 py-3 text-sm font-semibold',
  }[size];

  // Determine alignment classes to avoid screen overflow
  const alignClass = computedAlign === 'right' ? 'right-0' : 'left-0';

  return (
    <div 
      ref={containerRef} 
      className={`relative text-left ${className.includes('inline') ? 'inline-block' : 'block'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full bg-white hover:bg-slate-50/90 border border-slate-200/90 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl sm:rounded-2xl font-bold text-slate-700 transition-all flex items-center justify-between gap-2 shadow-xs active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${sizeClasses}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}
          <span className="truncate font-bold text-slate-800">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            onBadgeClick ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onBadgeClick(selectedOption, e);
                }}
                title={badgeTooltip || "Nhấp để chỉnh sửa"}
                className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs flex items-center gap-1 transition-all shrink-0 cursor-pointer"
              >
                <Pencil className="w-2.5 h-2.5 stroke-[2.5]" />
                Chỉnh sửa
              </span>
            ) : (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                {selectedOption.badge}
              </span>
            )
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
            className={`absolute z-[150] mt-1.5 w-full min-w-full sm:min-w-[210px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-1.5 ring-1 ring-slate-900/5 ${alignClass} ${menuClassName}`}
          >
            {/* Quick Search Input */}
            {isSearchEnabled && (
              <div className="relative mb-1.5 p-1 border-b border-slate-100">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-7 pr-6 py-1.5 text-xs bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200/80 focus:border-indigo-400 rounded-xl outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-xs font-semibold text-slate-400 text-center">
                  Không tìm thấy lựa chọn phù hợp
                </div>
              ) : (
                filteredOptions.map((option, idx) => {
                  const isSelected = option.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 group cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-700 font-extrabold shadow-2xs'
                          : isHighlighted
                          ? 'bg-slate-100/90 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {option.icon && (
                          <span
                            className={`shrink-0 ${
                              isSelected
                                ? 'text-indigo-600'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          >
                            {option.icon}
                          </span>
                        )}
                        <div className="min-w-0 truncate">
                          <div className="truncate font-bold">{option.label}</div>
                          {option.sublabel && (
                            <div className="text-[10px] text-slate-400 font-normal truncate">
                              {option.sublabel}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {option.badge && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700'
                            }`}
                          >
                            {option.badge}
                          </span>
                        )}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 stroke-[3]" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
