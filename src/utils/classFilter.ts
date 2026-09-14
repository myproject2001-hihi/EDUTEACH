import { ClassSession, User, TuitionSetting } from '../types';

/**
 * Normalizes class name string for accurate comparison and grouping
 */
export function normalizeClassName(name?: string | null): string {
  if (!name) return '';
  return name.trim().toLowerCase().replace(/^(lớp|lop|class)\s+/gi, '').replace(/\s+/g, '');
}

/**
 * Checks whether an item's class matches a target user class or filter
 */
export function isClassMatching(assignClass?: string | null, userClass?: string | null): boolean {
  if (!assignClass || assignClass.trim() === '') return true;
  const cleanAssign = assignClass.trim().toLowerCase();
  if (
    cleanAssign === 'all' || 
    cleanAssign === 'tất cả' || 
    cleanAssign === 'tat ca' || 
    cleanAssign === 'toàn hệ thống' || 
    cleanAssign === 'toan he thong' ||
    cleanAssign === 'tất cả các lớp (toàn trường)' ||
    cleanAssign === 'tat ca cac lop (toan truong)'
  ) {
    return true;
  }
  if (!userClass || userClass.trim() === '') return false;
  return normalizeClassName(assignClass) === normalizeClassName(userClass);
}

/**
 * Checks if a session belongs to a valid, real active class or user
 */
export function getKnownRealClasses(users: User[] = [], tuitionSettings: TuitionSetting[] = []): Set<string> {
  const realClassSet = new Set<string>();

  // Extract from all real registered users (students and teachers)
  users.forEach(u => {
    if (u.className && u.className.trim()) {
      realClassSet.add(u.className.trim());
    }
    if (u.assignedClasses && Array.isArray(u.assignedClasses)) {
      u.assignedClasses.forEach(c => {
        if (c && c.trim()) realClassSet.add(c.trim());
      });
    }
  });

  // Extract from active tuition settings
  tuitionSettings.forEach(t => {
    if (t.className && t.className.trim()) {
      realClassSet.add(t.className.trim());
    }
  });

  return realClassSet;
}

/**
 * Utility to filter out sessions with ghost/dummy classes or corrupted data
 */
export function filterValidSessions(
  sessions: ClassSession[] = [],
  users: User[] = [],
  tuitionSettings: TuitionSetting[] = []
): ClassSession[] {
  if (!Array.isArray(sessions)) return [];

  const realClasses = getKnownRealClasses(users, tuitionSettings);
  const normalizedRealClasses = new Set(Array.from(realClasses).map(normalizeClassName));

  return sessions.filter(session => {
    if (!session || !session.id) return false;

    // Filter out invalid dates
    const start = new Date(session.startTime);
    if (isNaN(start.getTime())) return false;

    // If session has no className, or className is explicitly general/all, keep it
    const rawClass = (session.className || '').trim();
    if (!rawClass) return true;

    const normClass = normalizeClassName(rawClass);
    if (
      normClass === 'all' || 
      normClass === 'tatca' || 
      normClass === 'toanhethong' ||
      normClass === 'chung'
    ) {
      return true;
    }

    // If there are real registered classes in the system, check if this session's class matches any real class
    if (normalizedRealClasses.size > 0) {
      // Check exact or normalized match
      if (normalizedRealClasses.has(normClass)) {
        return true;
      }
      // If teacher who created this session is in users list, keep it
      if (session.teacherId && users.some(u => u.id === session.teacherId)) {
        return true;
      }
      // Otherwise it's a ghost session from removed dummy classes
      return false;
    }

    return true;
  });
}
