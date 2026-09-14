import { User, ClassSession, TuitionSetting, TuitionReceipt } from '../types';
import { isClassMatching } from './classFilter';

export interface StudentTuitionStatus {
  student: User;
  className: string;
  totalCompletedHours: number;
  limitHours: number;
  tuitionFee: number;
  paidReceiptsCount: number;
  totalPaidHours: number;
  currentCycleHours: number;
  status: 'unpaid' | 'accumulating';
  isDue: boolean;
  pendingCyclesCount: number;
  excessHours: number;
  amountDue: number;
  lastPaymentDate?: string;
  setting: TuitionSetting;
}

/**
 * Get active tuition setting for a class name
 */
export function getTuitionSettingForClass(
  className: string | undefined,
  tuitionSettings: TuitionSetting[]
): TuitionSetting {
  const cls = (className || '').trim();
  const matched = tuitionSettings.find(s => isClassMatching(s.className, cls));
  if (matched) return matched;

  return {
    id: cls ? cls.toLowerCase().replace(/\s+/g, '_') : 'default_tuition',
    className: cls || 'Mặc định',
    limitHours: 20,
    tuitionFee: 1500000,
    qrBankId: 'MBBank',
    qrAccountNumber: '0901234567',
    qrAccountName: 'NGUYEN VAN A',
    qrImageUrl: ''
  };
}

/**
 * Calculates accurate tuition hours and cycle rollover for a student
 * 
 * Logic rule:
 * - If teacher sets limit = 20h per cycle.
 * - Student finishes 20h -> payment due.
 * - If unpaid and continues to 24h -> status remains 'unpaid' (24/20h, 1 cycle due + 4h excess).
 * - When student pays for 1 cycle (20h), current cycle hours immediately become 24h - 20h = 4h.
 */
export function calculateStudentTuitionStatus(
  student: User,
  sessions: ClassSession[],
  tuitionSettings: TuitionSetting[],
  tuitionReceipts: TuitionReceipt[]
): StudentTuitionStatus {
  const studentClass = (student.className || '').trim();
  const setting = getTuitionSettingForClass(studentClass, tuitionSettings);
  const limitHours = Math.max(1, setting.limitHours || 20);
  const tuitionFee = setting.tuitionFee || 1500000;

  // 1. Calculate total completed teaching/learning hours for this student's class
  const studentCompletedSessions = sessions.filter(s => {
    if (!s.isCompleted) return false;
    // Check if session belongs to student's class or student was marked attended
    const classMatches = studentClass && isClassMatching(s.className || s.title, studentClass);
    const attended = s.attendedByStudents?.some(a => a.studentId === student.id);
    return classMatches || attended;
  });

  const totalCompletedHours = studentCompletedSessions.reduce((acc, s) => {
    const start = new Date(s.startTime).getTime();
    const end = new Date(s.endTime).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    return acc + (isNaN(hours) || hours <= 0 ? 1.5 : hours);
  }, 0);

  // 2. Count approved receipts for this student
  const studentApprovedReceipts = tuitionReceipts
    .filter(r => r.studentId === student.id && (r.status === 'approved' || !r.status))
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const paidReceiptsCount = studentApprovedReceipts.length;
  const totalPaidHours = paidReceiptsCount * limitHours;

  // 3. Current active cycle hours: total accumulated minus all settled hours
  const currentCycleHours = Math.max(0, totalCompletedHours - totalPaidHours);

  // 4. Status determinations
  const isDue = currentCycleHours >= limitHours;
  const status: 'unpaid' | 'accumulating' = isDue ? 'unpaid' : 'accumulating';
  const pendingCyclesCount = isDue ? Math.max(1, Math.floor(currentCycleHours / limitHours)) : 0;
  const excessHours = isDue ? Math.max(0, currentCycleHours - (pendingCyclesCount * limitHours)) : 0;
  const amountDue = isDue ? pendingCyclesCount * tuitionFee : 0;
  const lastPaymentDate = studentApprovedReceipts.length > 0 ? studentApprovedReceipts[0].paidAt : undefined;

  return {
    student,
    className: studentClass || setting.className,
    totalCompletedHours,
    limitHours,
    tuitionFee,
    paidReceiptsCount,
    totalPaidHours,
    currentCycleHours,
    status,
    isDue,
    pendingCyclesCount,
    excessHours,
    amountDue,
    lastPaymentDate,
    setting
  };
}

/**
 * Removes Vietnamese diacritics and special characters for bank transfer compatibility
 */
export function cleanVietnameseToAscii(str: string = ''): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim();
}

/**
 * Formats customized transfer content template with student data
 * Tokens:
 * {studentName}, {className}, {studentPhone}, {studentCode}, {month}, {year}
 */
export function generateTransferContent(
  template?: string | null,
  student?: { name?: string; phoneStudent?: string; phoneParent?: string; connectionCode?: string; id?: string } | null,
  className?: string | null
): string {
  const studentName = cleanVietnameseToAscii(student?.name || 'Hoc Sinh');
  const cls = cleanVietnameseToAscii(className || 'Lop');
  const phone = cleanVietnameseToAscii(student?.phoneStudent || student?.phoneParent || '');
  const code = cleanVietnameseToAscii(student?.connectionCode || student?.id || '');
  const month = (new Date().getMonth() + 1).toString();
  const year = new Date().getFullYear().toString();

  if (!template || !template.trim()) {
    return `Hoc phi ${studentName} lop ${cls}`;
  }

  let result = template
    .replace(/\{studentName\}/gi, studentName)
    .replace(/\{className\}/gi, cls)
    .replace(/\{studentPhone\}/gi, phone)
    .replace(/\{studentCode\}/gi, code)
    .replace(/\{month\}/gi, month)
    .replace(/\{year\}/gi, year);

  return cleanVietnameseToAscii(result);
}
