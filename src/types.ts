export type Role = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  isSuperAdmin?: boolean;
  avatar: string;
  dob?: string;
  phoneStudent?: string;
  phoneParent?: string;
  className?: string;
  connectionCode?: string;
  points?: number; // Điểm tích lũy cá nhân
  readNotifications?: string[]; // IDs of notifications marked as read
  createdAt?: string;
}

export interface QuizQuestion {
  id: string;
  numStr?: string;
  question: string;
  type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching';
  options: string[];
  subOptions?: string[];
  correctAnswer?: number | string | number[];
  points: number;
  method?: string;
  solutionText?: string;
  matchingPairs?: { left: string; right: string }[];
}

export interface SubFlashcardSet {
  id: string;
  title: string;
  description?: string;
  flashcards: { id: string; front: string; back: string; image?: string; frontImage?: string; backImage?: string }[];
  questions?: QuizQuestion[];
  rawCode?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classSessionId?: string; // Tương ứng buổi học nào
  classSessionTitle?: string;
  type: 'online_test' | 'file_upload' | 'simulation' | 'game' | 'flashcard' | 'lesson_check';
  pdfUrl?: string;
  questions?: QuizQuestion[];
  simulationUrl?: string;
  gameType?: string; // ID game nếu type là 'game'
  gameFormats?: string[]; // Dạng câu hỏi của game
  isMandatory?: boolean; // Nút bắt buộc
  maxAttempts?: number; // 0 hoặc undefined = Vĩnh viễn (Không giới hạn), 1 = 1 lần, 2, 3, 5, 10
  flashcards?: { id: string; front: string; back: string; image?: string; frontImage?: string; backImage?: string }[];
  subFlashcardSets?: SubFlashcardSet[]; // Các bộ thẻ con khi gộp thành bộ lớn (Bộ cha)
  rawCode?: string; // Lưu giữ 100% nguyên vẹn mã nguồn đề thi người dùng nhập
  createdAt: string;
  teacherId?: string;
  teacherName?: string;
  isPublished?: boolean; // Nếu false, học sinh sẽ không thấy bài tập này
  grade?: string;
  className?: string;
}

export interface SubmissionQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  studentAnswer?: number;
  isCorrect?: boolean;
  solutionText?: string;
}

export interface SubmissionQuizDetails {
  totalQuestions: number;
  correctCount: number;
  score: number;
  questions?: SubmissionQuizQuestion[];
}

export interface StudentAttempt {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  answers: Record<string, any>; // Record of answers provided
  grade?: number;
  quizDetails?: SubmissionQuizDetails;
  content?: string; // For text/file submissions
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle?: string;
  studentId: string;
  studentName?: string;
  content: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  fileUrl?: string;
  imageUrls?: string[];
  quizAnswers?: Record<string, number>; // questionId -> optionIndex
  quizDetails?: SubmissionQuizDetails;
  isPenalty?: boolean; // Nộp muộn / chưa nộp bị trừ điểm
  teacherId?: string;
}

export interface ClassSession {
  id: string;
  title: string;
  subject?: string;
  startTime: string;
  endTime: string;
  link: string;
  note?: string;
  description?: string;
  createdAt?: string;
  teacherId?: string;
  teacherName?: string;
  isCompleted?: boolean;
  completedNote?: string;
  attendedByStudents?: { studentId: string; studentName: string; clickedAt: string }[];
}

export interface HTMLSimulation {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  category?: string;
  hasQuiz?: boolean;
  htmlContent?: string;
  createdAt?: string;
  teacherId?: string;
  teacherName?: string;
}

export interface MonthlyProgress {
  month: string; // e.g., 'Tháng 8', 'Tháng 9'
  quizScore: number;
  simScore: number;
  average: number;
}

export interface StudentProgress {
  studentId: string;
  studentName: string;
  phoneParent?: string;
  phoneStudent?: string;
  className?: string;
  completionRate: number;
  averageGrade: number;
  attendanceRate: number;
  monthlyProgress?: MonthlyProgress[];
}

export interface SystemNotification {
  id: string;
  title: string;
  content: string;
  type: 'system_update' | 'badge_info' | 'class_reminder' | 'announcement' | 'personal_reminder';
  badge: string;
  badgeColor?: string;
  createdAt: string;
  targetStudentId?: string;
}

export interface LoveLetter {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'teacher' | 'student';
  title: string;
  content: string;
  envelopeStyle: 'rose_love' | 'pastel_gold' | 'ocean_blue' | 'vintage_warm';
  fontStyle?: string; // itim | marck | patrick | mali | sriracha
  targetType: 'next_registered' | 'class' | 'specific_user' | 'all_teachers' | 'all_students';
  targetValue?: string; // Tên lớp, ID user, v.v.
  targetUserName?: string;
  createdAt: string;
  readByUsers?: string[];
  alreadyClaimedUserId?: string;
}

export type ActivityActionCategory = 
  | 'auth'
  | 'assignment'
  | 'submission'
  | 'grade'
  | 'class'
  | 'game'
  | 'flashcard'
  | 'simulation'
  | 'letter'
  | 'notification'
  | 'user_management'
  | 'profile'
  | 'system';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
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
  timestamp: string; // ISO string
  createdAtMs?: number;
}


