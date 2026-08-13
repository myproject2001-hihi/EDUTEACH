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
}

export interface QuizQuestion {
  id: string;
  numStr?: string;
  question: string;
  type?: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  subOptions?: string[];
  correctAnswer: number | string | number[];
  points: number;
  method?: string;
  solutionText?: string;
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
  isMandatory?: boolean; // Nút bắt buộc
  flashcards?: { id: string; front: string; back: string }[];
  createdAt: string;
  teacherId?: string;
  teacherName?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  content: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
  fileUrl?: string;
  quizAnswers?: Record<string, number>; // questionId -> optionIndex
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
  teacherId?: string;
  teacherName?: string;
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

