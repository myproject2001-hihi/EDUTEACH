import { Assignment, ClassSession, HTMLSimulation, StudentProgress, Submission, User } from './types';

export const currentUserMock: Record<string, User> = {
  teacher: {
    id: 't1',
    name: 'Cô Nguyễn Thị Hoa',
    role: 'teacher',
    avatar: 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&q=80&w=256&h=256',
    phoneStudent: '0901234567',
    className: 'Giáo viên Chủ nhiệm 10A1',
  },
  student: {
    id: 's1',
    name: 'Trần Văn An',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=256&h=256',
    phoneStudent: '0987654321',
    phoneParent: '0912345678',
    className: 'Lớp 10A1',
  }
};

export const mockStudents: User[] = [];

export const mockClasses: ClassSession[] = [];

export const mockAssignments: Assignment[] = [];

export const mockSubmissions: Submission[] = [];

export const mockSimulations: HTMLSimulation[] = [];

export const mockProgress: StudentProgress[] = [];

