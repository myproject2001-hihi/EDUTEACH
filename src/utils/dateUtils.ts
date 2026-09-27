import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Checks if a given value can be converted into a valid Date.
 */
export function isValidDate(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  const d = new Date(val);
  return !isNaN(d.getTime());
}

/**
 * Safely formats a date without throwing RangeError: Invalid time value.
 * If the date is invalid or formatting fails, returns the fallback string.
 */
export function safeFormat(
  dateInput: any,
  formatStr: string,
  fallback = '',
  options?: { locale?: any; weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
): string {
  if (!dateInput && dateInput !== 0) return fallback;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr, options);
  } catch {
    return fallback;
  }
}

/**
 * Safely parse date or return current/fallback Date
 */
export function safeDate(dateInput: any, fallbackDate: Date = new Date()): Date {
  if (!dateInput && dateInput !== 0) return fallbackDate;
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return isNaN(d.getTime()) ? fallbackDate : d;
  } catch {
    return fallbackDate;
  }
}
