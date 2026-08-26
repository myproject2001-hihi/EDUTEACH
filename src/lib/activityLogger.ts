import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ActivityLog, ActivityActionCategory, Role } from '../types';

// Helper to detect human-friendly device & browser description
export function getDeviceInfo(): string {
  if (typeof window === 'undefined' || !window.navigator) {
    return 'Thiết bị Web';
  }

  const ua = window.navigator.userAgent || '';
  let platform = 'Máy tính';
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
    platform = 'Máy tính bảng';
  } else if (/iPhone|iPod|Android.*Mobile|Mobile|Windows Phone/i.test(ua)) {
    platform = 'Điện thoại di động';
  }

  let browser = 'Trình duyệt Web';
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = 'Opera';
  }

  return `${platform} (${browser})`;
}

// In-memory cache for debouncing identical consecutive actions
const recentActions = new Map<string, number>();

export interface LogActivityParams {
  user?: {
    id?: string;
    name?: string;
    role?: Role;
    avatar?: string;
    className?: string;
  };
  userId?: string;
  userName?: string;
  userRole?: Role;
  userAvatar?: string;
  userClass?: string;
  category: ActivityActionCategory;
  actionType: string;
  title: string;
  description?: string;
  targetId?: string;
  targetName?: string;
  device?: string;
  meta?: Record<string, any>;
}

/**
 * Ghi lại lịch sử thao tác của người dùng vào Firestore (`activity_logs`)
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const userId = params.user?.id || params.userId || 'anonymous';
    const userName = params.user?.name || params.userName || 'Người dùng ẩn danh';
    const userRole: Role = params.user?.role || params.userRole || 'student';
    const userAvatar = params.user?.avatar || params.userAvatar || '';
    const userClass = params.user?.className || params.userClass || '';
    
    // Anti-spam key: skip duplicates within 3.5 seconds
    const dedupKey = `${userId}_${params.actionType}_${params.targetId || ''}_${params.title}`;
    const now = Date.now();
    const lastTriggered = recentActions.get(dedupKey);
    if (lastTriggered && now - lastTriggered < 3500) {
      return; // Skip duplicate action within 3.5 seconds
    }
    recentActions.set(dedupKey, now);

    // Clean up old debounce keys
    if (recentActions.size > 200) {
      const expirationThreshold = now - 60000;
      for (const [key, timestamp] of recentActions.entries()) {
        if (timestamp < expirationThreshold) {
          recentActions.delete(key);
        }
      }
    }

    const logId = `log_${now}_${Math.random().toString(36).substring(2, 9)}`;
    const logData: ActivityLog = {
      id: logId,
      userId,
      userName,
      userRole,
      userAvatar,
      userClass,
      category: params.category,
      actionType: params.actionType,
      title: params.title,
      description: params.description || '',
      targetId: params.targetId || '',
      targetName: params.targetName || '',
      device: params.device || getDeviceInfo(),
      meta: params.meta || {},
      timestamp: new Date().toISOString(),
      createdAtMs: now,
    };

    await setDoc(doc(db, 'activity_logs', logId), logData);
  } catch (error) {
    console.warn('Lỗi ghi nhật ký hoạt động (non-fatal):', error);
  }
}
