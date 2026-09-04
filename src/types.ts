export type Role = 'admin' | 'teacher' | 'student';

export interface RedeemedRewardItem {
  id: string;
  title: string;
  type: 'badge' | 'frame' | 'perk' | 'mystery';
  description?: string;
  icon: string;
  redeemedAt: string;
  cost: number;
}

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
  unlockedBadges?: string[];
  redeemedRewards?: RedeemedRewardItem[];
  activeAvatarFrame?: string;
  activeBadge?: string;
  readNotifications?: string[]; // IDs of notifications marked as read
  hasSeenRobotWelcome?: boolean;
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
  image?: string;
}

export interface QuizQuestionSet {
  id: string;
  title: string; // Tên đề (VD: Đề 1, Đề 2, Đề A, Đề B...)
  description?: string;
  rawCode?: string;
  questions?: QuizQuestion[];
  createdAt?: string;
}

export interface SubFlashcardSet {
  id: string;
  title: string;
  description?: string;
  flashcards: { id: string; front: string; back: string; image?: string; frontImage?: string; backImage?: string }[];
  questions?: QuizQuestion[];
  rawCode?: string;
  questionSets?: QuizQuestionSet[]; // Nhiều đề kiểm tra cho bộ thẻ con này
  activeQuestionSetId?: string;
  studentQuestionSetMap?: Record<string, string>; // { [studentId]: questionSetId }
}

export interface QuestionSetItem {
  id: string;
  title: string;
  subject?: string; // Môn học / Chủ đề (VD: Toán, Ngữ Văn, Tiếng Anh, Vật Lý, Hóa Học...)
  grade?: string; // Khối lớp (VD: Khối 10, Khối 11, Khối 12)
  description?: string;
  rawCode?: string;
  questions: QuizQuestion[];
  flashcards?: { id: string; front: string; back: string; image?: string }[];
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  teacherId?: string;
  teacherName?: string;
  usageCount?: number;
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
  tugOfWarMode?: 'bot' | 'pvp'; // Chế độ Game Kéo Co do GV thiết lập (Đấu máy hoặc Đối kháng)
  isMandatory?: boolean; // Nút bắt buộc
  maxAttempts?: number; // 0 hoặc undefined = Vĩnh viễn (Không giới hạn), 1 = 1 lần, 2, 3, 5, 10
  flashcards?: { id: string; front: string; back: string; image?: string; frontImage?: string; backImage?: string }[];
  subFlashcardSets?: SubFlashcardSet[]; // Các bộ thẻ con khi gộp thành bộ lớn (Bộ cha)
  activeSubSetId?: string; // ID của bộ đề/tập thẻ con đang được giao cho học sinh làm
  questionSets?: QuizQuestionSet[]; // Các đề trắc nghiệm kiểm tra (Đề 1, Đề 2, Đề A, Đề B...)
  activeQuestionSetId?: string; // ID đề kiểm tra mặc định
  studentQuestionSetMap?: Record<string, string>; // Phân công đề cụ thể cho từng học sinh: { [studentId]: questionSetId }
  thumbnail?: string; // Ảnh bìa cho bài tập
  category?: string; // Phân loại (Đại số, Hình học, v.v.)
  rawCode?: string; // Lưu giữ 100% nguyên vẹn mã nguồn đề thi người dùng nhập
  timeLimit?: number; // Thời gian làm bài (phút), 0 hoặc undefined = không giới hạn
  shuffleQuestions?: boolean; // Trộn ngẫu nhiên câu hỏi
  createdAt: string;
  teacherId?: string;
  teacherName?: string;
  isPublished?: boolean; // Nếu false, học sinh sẽ không thấy bài tập này
  grade?: string;
  className?: string;
  requiresRetake?: boolean;
  retakeRequestedAt?: string;
  retakeNote?: string;
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

export interface SubmissionAttemptItem {
  attemptNumber: number;
  grade?: number;
  submittedAt: string;
  quizDetails?: SubmissionQuizDetails;
  quizAnswers?: Record<string, number>;
  content?: string;
  feedback?: string;
  subSetId?: string;
  subSetTitle?: string;
  fileUrl?: string;
  resetAt?: string;
  resetBy?: string;
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
  subSetId?: string;
  subSetTitle?: string;
  quizDetails?: SubmissionQuizDetails;
  isPenalty?: boolean; // Nộp muộn / chưa nộp bị trừ điểm
  teacherId?: string;
  history?: SubmissionAttemptItem[];
  attemptCount?: number;
  bestGrade?: number;
  isReset?: boolean;
  resetAt?: string;
  resetBy?: string;
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
  className?: string;
}

export interface HTMLSimulation {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  category?: string;
  hasQuiz?: boolean;
  className?: string;
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
  targetUserId?: string;
  targetScope?: 'all' | 'class' | 'personal';
  targetClass?: string;
  teacherId?: string;
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


