export type Role = 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  dob?: string;
  phoneStudent?: string;
  phoneParent?: string;
  className?: string;
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
  type: 'online_test' | 'file_upload' | 'simulation';
  pdfUrl?: string;
  questions?: QuizQuestion[];
  simulationUrl?: string;
  createdAt: string;
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
}

export interface ClassSession {
  id: string;
  title: string;
  subject?: string;
  startTime: string;
  endTime: string;
  link: string;
  note?: string;
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

