import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { AssignmentsView } from './views/AssignmentsView';
import { ScheduleView } from './views/ScheduleView';
import { StudentsReportView } from './views/StudentsReportView';
import { SimulationsView } from './views/SimulationsView';
import { AuthView } from './views/AuthView';
import { currentUserMock } from './mockData';
import { Assignment, Role, Submission, User, HTMLSimulation, ClassSession, StudentProgress, SystemNotification, LoveLetter, StudentAttempt } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

import { SettingsView } from './views/SettingsView';
import { AdminConsoleView } from './views/AdminConsoleView';
import { GuideOnboardingModal } from './components/GuideOnboardingModal';
import { ClassSessionReminder } from './components/ClassSessionReminder';
import { AssignmentReminder } from './components/AssignmentReminder';
import { NotificationsManagerView } from './views/NotificationsManagerView';
import { saveSimulationToFirestore } from './lib/simulationStorage';
import { LoveLetterModal } from './components/LoveLetterModal';
import { RobotGuide } from './components/RobotGuide';
import { checkAndIncrementNewResourceVisits } from './utils/resourceVisits';
import { ActivityLogsView } from './views/ActivityLogsView';
import { logActivity } from './lib/activityLogger';
import { ResourcesRepositoryView } from './views/ResourcesRepositoryView';
import { RewardStoreView } from './views/RewardStoreView';
import { QuestionBankView } from './views/QuestionBankView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>('student');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showGuideOnboarding, setShowGuideOnboarding] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // Scroll to top when active tab or selected assignment changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab, selectedAssignmentId]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // App states synchronized with Firestore
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [simulations, setSimulations] = useState<HTMLSimulation[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [loveLetters, setLoveLetters] = useState<LoveLetter[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeUnreadLetter, setActiveUnreadLetter] = useState<LoveLetter | null>(null);

  const [robotOpen, setRobotOpen] = useState(false);
  const [initializingAuth, setInitializingAuth] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [sessionReadLetters, setSessionReadLetters] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('session_read_letters');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Auto open Robot Guide ONLY for newly created accounts on their first login session
  useEffect(() => {
    if (currentUser) {
      const isWelcomedInLocal = localStorage.getItem(`robotWelcomed_${currentUser.id}`) === 'true';
      const isDismissed = localStorage.getItem(`robotGuideDismissed_${currentUser.id}`) === 'true';
      const isWelcomedInDb = currentUser.hasSeenRobotWelcome === true;

      // If user has NOT been welcomed yet (first login right after account creation):
      if (!isWelcomedInLocal && !isDismissed && !isWelcomedInDb) {
        setRobotOpen(true);
        // Mark as welcomed immediately so future logins/refreshes won't auto open again
        localStorage.setItem(`robotWelcomed_${currentUser.id}`, 'true');
        localStorage.setItem(`robotGuideDismissed_${currentUser.id}`, 'true');
        try {
          updateDoc(doc(db, 'users', currentUser.id), { hasSeenRobotWelcome: true });
        } catch (e) {
          console.warn('Could not update user hasSeenRobotWelcome:', e);
        }
      }
    }
  }, [currentUser]);

  // 1. Setup Firebase Auth state listener and real-time user profile sync
  useEffect(() => {
    const offlineUserId = sessionStorage.getItem('offline_user_id');
    if (offlineUserId) {
      const unsubscribeUser = onSnapshot(doc(db, 'users', offlineUserId), (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          setCurrentUser(userData);
          setRole(userData.role);
          setIsAuthenticated(true);
        } else {
          // Fallback if offline profile doc was removed
          sessionStorage.removeItem('offline_user_id');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
        setInitializingAuth(false);
      }, (error) => {
        console.warn("Offline profile sync error:", error);
        setInitializingAuth(false);
      });
      return () => unsubscribeUser();
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (sessionStorage.getItem('offline_user_id')) {
        return;
      }
      if (firebaseUser) {
        if (sessionStorage.getItem('isSigningUp') === 'true') {
          return; // Ignore this sign in, AuthView will sign out immediately
        }
        
        // Setup user profile snapshot listener
        const unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setCurrentUser(userData);
            setRole(userData.role);
            setIsAuthenticated(true);
          } else {
            // Document does not exist in Firestore, let's create a default student profile as safety fallback
            const defaultProfile: User = {
              id: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || 'Học sinh mới',
              role: 'student',
              avatar: 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=256&h=256',
              className: '123456',
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), defaultProfile);
              setCurrentUser(defaultProfile);
              setRole('student');
              setIsAuthenticated(true);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
          }
          setInitializingAuth(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        });

        return () => unsubscribeUser();
      } else {
        if (!sessionStorage.getItem('offline_user_id')) {
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
        setInitializingAuth(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setShowGuideOnboarding(false);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && assignments.length > 0) {
      checkAndIncrementNewResourceVisits(currentUser.id, assignments);
    }
  }, [currentUser, assignments]);

  // 2. Setup real-time listeners for database collections when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    // Listen to assignments
    const unsubscribeAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => {
      const list: Assignment[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Assignment);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAssignments(list);
      setIsLoadingAssignments(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assignments');
      setIsLoadingAssignments(false);
    });

    // Listen to submissions
    const unsubscribeSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const list: Submission[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Submission);
      });
      setSubmissions(list);
      setIsLoadingSubmissions(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      setIsLoadingSubmissions(false);
    });

    // Listen to custom simulations
    const unsubscribeSimulations = onSnapshot(collection(db, 'simulations'), (snapshot) => {
      const list: HTMLSimulation[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as HTMLSimulation);
      });
      setSimulations(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'simulations');
    });

    // Listen to class sessions (buổi học)
    const unsubscribeClasses = onSnapshot(collection(db, 'class_sessions'), (snapshot) => {
      const list: ClassSession[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ClassSession);
      });
      setClasses(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'class_sessions');
    });

    // Listen to student progress
    const unsubscribeProgress = onSnapshot(collection(db, 'student_progress'), (snapshot) => {
      const list: StudentProgress[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as StudentProgress);
      });
      setProgressData(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'student_progress');
    });

    // Listen to system notifications
    const unsubscribeNotifications = onSnapshot(collection(db, 'system_notifications'), async (snapshot) => {
      const list: SystemNotification[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as SystemNotification);
      });
      
      if (list.length === 0) {
        // Seed default notifications
        const defaults: SystemNotification[] = [
          {
            id: 'notif_1',
            title: 'Cập nhật hệ thống thành công',
            content: 'Đã chuyển đổi giao diện tạo Bài tập & Game sang quy trình từng bước chuyên nghiệp!',
            type: 'system_update',
            badge: '🎉 Cập nhật',
            badgeColor: 'emerald',
            createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
          },
          {
            id: 'notif_2',
            title: 'Hệ thống Huy hiệu tích lũy',
            content: 'Học sinh tích cực làm bài tập và chơi game để nâng cấp huy hiệu lên Huyền thoại học đường!',
            type: 'badge_info',
            badge: '🎯 Huy hiệu',
            badgeColor: 'indigo',
            createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ];
        for (const item of defaults) {
          try {
            await setDoc(doc(db, 'system_notifications', item.id), item);
          } catch (e) {
            console.error('Seeding notifications failed:', e);
          }
        }
      } else {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSystemNotifications(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_notifications');
    });

    // Listen to love letters
    const unsubscribeLetters = onSnapshot(collection(db, 'love_letters'), (snapshot) => {
      const list: LoveLetter[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as LoveLetter);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLoveLetters(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'love_letters');
    });

    // Listen to all registered users (for targeting/management)
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as User);
      });
      setAllUsers(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeSubmissions();
      unsubscribeSimulations();
      unsubscribeClasses();
      unsubscribeProgress();
      unsubscribeNotifications();
      unsubscribeLetters();
      unsubscribeUsers();
    };
  }, [isAuthenticated]);

  // Effect to evaluate active unread letter for currentUser upon login
  useEffect(() => {
    if (!currentUser || loveLetters.length === 0) {
      setActiveUnreadLetter(null);
      return;
    }

    const match = loveLetters.find((letter) => {
      const isImage1Target = ['class', 'specific_user', 'all_students', 'all_teachers'].includes(letter.targetType);

      if (isImage1Target) {
        // Image 1 target types: ONLY filter out if read in the CURRENT session
        if (sessionReadLetters.includes(letter.id)) {
          return false;
        }
      } else {
        // Image 2 target (next_registered): Filter out if read globally in Firestore
        if (letter.readByUsers && letter.readByUsers.includes(currentUser.id)) {
          return false;
        }
      }

      if (letter.targetType === 'all_students' && currentUser.role === 'student') return true;
      if (letter.targetType === 'all_teachers' && currentUser.role === 'teacher') return true;
      if (letter.targetType === 'specific_user' && letter.targetValue === currentUser.id) return true;

      if (letter.targetType === 'class') {
        const cls = (letter.targetValue || '').toLowerCase().trim();
        const userCls = (currentUser.className || '').toLowerCase().trim();
        if (cls && userCls && (userCls === cls || cls.includes(userCls) || userCls.includes(cls))) {
          return true;
        }
      }

      if (letter.targetType === 'next_registered') {
        // Any user registered AFTER or ON the letter's creation date gets this welcome letter on first login
        const userCreated = currentUser.createdAt ? new Date(currentUser.createdAt).getTime() : 0;
        const letterCreated = new Date(letter.createdAt).getTime();
        
        // Give a safe 5-second leeway buffer
        if (userCreated >= (letterCreated - 5000)) {
          return true;
        }
      }

      return false;
    });

    if (match) {
      setActiveUnreadLetter(match);
    } else {
      setActiveUnreadLetter(null);
    }
  }, [currentUser, loveLetters, sessionReadLetters]);

  // Automatically send reminder notifications to students who haven't submitted when deadline is under 24 hours away
  useEffect(() => {
    if (!currentUser || assignments.length === 0 || allUsers.length === 0) return;

    const checkAndSendReminders = async () => {
      const now = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const students = allUsers.filter(u => u.role === 'student');

      // If current user is a student, they only check/write for themselves to avoid write failures if they aren't a teacher
      const targetStudents = currentUser.role === 'student' 
        ? students.filter(s => s.id === currentUser.id) 
        : students;

      for (const assignment of assignments) {
        if (!assignment.dueDate) continue;
        const dueTime = new Date(assignment.dueDate).getTime();
        const diffMs = dueTime - now;

        // Check if deadline is less than 24 hours away and not yet past due
        if (diffMs > 0 && diffMs < oneDayMs) {
          for (const student of targetStudents) {
            // Check if this student has submitted
            const hasSubmitted = submissions.some(
              s => s.assignmentId === assignment.id && s.studentId === student.id
            );

            if (!hasSubmitted) {
              const notifId = `reminder_${assignment.id}_${student.id}`;
              const alreadyNotified = systemNotifications.some(n => n.id === notifId);

              if (!alreadyNotified) {
                const newNotif: SystemNotification = {
                  id: notifId,
                  title: '⏰ Sắp hết hạn nộp bài!',
                  content: `Bài tập "${assignment.title}" sắp hết hạn nộp (còn dưới 24 giờ). Bạn chưa hoàn thành bài tập này. Hãy làm bài ngay!`,
                  type: 'personal_reminder',
                  badge: '⚠️ Sắp hết hạn',
                  badgeColor: 'red',
                  createdAt: new Date().toISOString(),
                  targetStudentId: student.id
                };

                try {
                  await setDoc(doc(db, 'system_notifications', notifId), newNotif);
                } catch (err) {
                  console.error('Error writing reminder notification:', err);
                }
              }
            }
          }
        }
      }
    };

    // Run check
    checkAndSendReminders();
  }, [currentUser, assignments, allUsers, submissions, systemNotifications]);

  const handleMarkLetterRead = async (letterId: string) => {
    if (!currentUser) return;
    try {
      const letter = loveLetters.find(l => l.id === letterId);
      if (letter) {
        const isImage1Target = ['class', 'specific_user', 'all_students', 'all_teachers'].includes(letter.targetType);
        
        if (isImage1Target) {
          // Add to current session-based read list so it immediately hides in this session
          const updatedSession = [...sessionReadLetters, letterId];
          setSessionReadLetters(updatedSession);
          sessionStorage.setItem('session_read_letters', JSON.stringify(updatedSession));
        }
        
        // For analytics and status tracking (or global read for Image 2), save to readByUsers in Firestore
        const letterRef = doc(db, 'love_letters', letterId);
        await updateDoc(letterRef, {
          readByUsers: arrayUnion(currentUser.id)
        });
      }
      setActiveUnreadLetter(null);
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái đã đọc thư:', err);
    }
  };

  const handleUpdateUser = async (updated: User) => {
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), updated, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const handleAddAssignment = async (newAssignment: Omit<Assignment, 'id' | 'createdAt'>) => {
    const id = `a_${Date.now()}`;
    const assignment: Assignment = JSON.parse(JSON.stringify({
      ...newAssignment,
      id,
      createdAt: new Date().toISOString(),
      teacherId: newAssignment.teacherId || currentUser?.id,
      teacherName: newAssignment.teacherName || currentUser?.name,
    }));
    try {
      await setDoc(doc(db, 'assignments', id), assignment);

      // Log system activity
      if (currentUser) {
        logActivity({
          user: currentUser,
          category: 'assignment',
          actionType: 'assignment_create',
          title: `Tạo bài tập mới: "${assignment.title}"`,
          description: `Dạng bài: ${assignment.type === 'game' ? 'Trò chơi' : assignment.type === 'flashcard' ? 'Flashcard' : assignment.type === 'online_test' ? 'Trắc nghiệm' : 'Tự luận'}, Số câu: ${assignment.questions?.length || 0}`,
          targetId: id,
          targetName: assignment.title,
          meta: { type: assignment.type, questionsCount: assignment.questions?.length || 0 }
        });
      }

      // Automatically publish system notification for new assignment - wrapped in try/catch to prevent failing the assignment creation
      try {
        const notifId = `auto_assign_pub_${Date.now()}`;
        const newNotif: SystemNotification = {
          id: notifId,
          title: 'Bài tập mới được giao',
          content: `Giáo viên vừa giao bài tập mới: "${assignment.title}". Hạn nộp: ${assignment.dueDate ? new Date(assignment.dueDate).toLocaleString('vi-VN') : 'Không giới hạn'}.`,
          type: 'class_reminder',
          badge: '📚 Bài mới',
          badgeColor: 'indigo',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'system_notifications', notifId), newNotif);
      } catch (notifErr) {
        console.warn("Could not publish automatic system notification:", notifErr);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `assignments/${id}`);
    }
  };

  const handleSubmitWork = async (submission: Omit<Submission, 'id' | 'submittedAt'>) => {
    // Find existing submission for this student and assignment to preserve attempt history
    const existingSub = submissions.find(
      s => s.assignmentId === submission.assignmentId && s.studentId === submission.studentId
    );
    const id = existingSub?.id || `sub_${Date.now()}`;
    const submittedAt = new Date().toISOString();

    // Build history list
    const previousHistory = existingSub?.history ? [...existingSub.history] : [];
    if (existingSub && existingSub.submittedAt && (existingSub.grade !== undefined || existingSub.content || existingSub.quizDetails)) {
      // If previous attempt not yet in history, add it
      const alreadyInHistory = previousHistory.some(h => h.submittedAt === existingSub.submittedAt);
      if (!alreadyInHistory) {
        previousHistory.push({
          attemptNumber: previousHistory.length + 1,
          grade: existingSub.grade,
          submittedAt: existingSub.submittedAt,
          quizDetails: existingSub.quizDetails,
          quizAnswers: existingSub.quizAnswers,
          content: existingSub.content,
          feedback: existingSub.feedback,
          subSetId: existingSub.subSetId,
          subSetTitle: existingSub.subSetTitle,
          fileUrl: existingSub.fileUrl
        });
      }
    }

    const currentAttemptNumber = previousHistory.length + 1;
    const currentAttemptItem = {
      attemptNumber: currentAttemptNumber,
      grade: submission.grade,
      submittedAt,
      quizDetails: submission.quizDetails,
      quizAnswers: submission.quizAnswers,
      content: submission.content,
      feedback: submission.feedback,
      subSetId: submission.subSetId,
      subSetTitle: submission.subSetTitle,
      fileUrl: submission.fileUrl
    };
    const updatedHistory = [...previousHistory, currentAttemptItem];

    const allGrades = updatedHistory.map(h => h.grade).filter((g): g is number => typeof g === 'number');
    const bestGrade = allGrades.length > 0 ? Math.max(...allGrades) : (submission.grade ?? 10);

    const newSubmission: Submission = JSON.parse(JSON.stringify({
      ...submission,
      id,
      submittedAt,
      history: updatedHistory,
      attemptCount: currentAttemptNumber,
      bestGrade,
      isReset: false,
      resetAt: null,
      resetBy: null
    }));
    
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const newAttempt: StudentAttempt = JSON.parse(JSON.stringify({
      id: attemptId,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      submittedAt,
      answers: submission.quizAnswers || {},
      grade: submission.grade,
      quizDetails: submission.quizDetails,
      content: submission.content
    }));

    try {
      await setDoc(doc(db, 'submissions', id), newSubmission);
      
      // Also save the specific attempt to 'student_attempts'
      await setDoc(doc(db, 'student_attempts', attemptId), newAttempt);

      // Log activity
      if (currentUser) {
        logActivity({
          user: currentUser,
          category: 'submission',
          actionType: 'submit_assignment',
          title: `Nộp bài tập: "${submission.assignmentTitle || 'Bài làm'}"`,
          description: submission.grade ? `Điểm tự động: ${submission.grade}/10` : 'Đã hoàn thành và gửi bài nộp.',
          targetId: submission.assignmentId,
          targetName: submission.assignmentTitle,
          meta: { grade: submission.grade, assignmentId: submission.assignmentId }
        });
      }
      
      // Also update student's cumulative personal points!
      if (submission.studentId) {
        const studentRef = doc(db, 'users', submission.studentId);
        const gradeVal = typeof submission.grade === 'number' ? submission.grade : 10;
        const pointsToEarn = Math.max(10, Math.round(gradeVal * 10));
        await updateDoc(studentRef, {
          points: increment(pointsToEarn)
        });
        
        // Update local currentUser state if it matches the current logged in student
        if (currentUser && currentUser.id === submission.studentId) {
          setCurrentUser(prev => prev ? {
            ...prev,
            points: (prev.points || 0) + pointsToEarn
          } : null);
        }

        alert(`🎉 Bài nộp đã ghi nhận! Bạn được tích lũy +${pointsToEarn} điểm vào hệ thống!`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `submissions/${id}`);
    }
  };

  const handleAwardPoints = async (pointsToEarn: number, reasonTitle?: string) => {
    if (!currentUser?.id || pointsToEarn <= 0) return;
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        points: increment(pointsToEarn)
      });
      
      setCurrentUser(prev => prev ? {
        ...prev,
        points: (prev.points || 0) + pointsToEarn
      } : null);

      alert(`🎉 Cộng +${pointsToEarn} điểm tích lũy${reasonTitle ? `: ${reasonTitle}` : ''}!`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.id}`);
    }
  };

  const handleGrade = async (submissionId: string, grade: number, feedback: string) => {
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        grade,
        feedback
      });

      const sub = submissions.find(s => s.id === submissionId);
      const assign = assignments.find(a => a.id === sub?.assignmentId);

      // Log activity
      if (currentUser) {
        logActivity({
          user: currentUser,
          category: 'grade',
          actionType: 'grade_submission',
          title: `Chấm điểm bài làm: ${grade} điểm cho học sinh "${sub?.studentName || 'Học sinh'}"`,
          description: feedback ? `Nhận xét: "${feedback}"` : `Chấm bài tập "${assign?.title || 'Bài tập'}"`,
          targetId: submissionId,
          targetName: assign?.title,
          meta: { grade, studentName: sub?.studentName, feedback }
        });
      }

      // Automatically publish a system notification for grading
      if (sub && assign) {
        const notifId = `auto_grade_${Date.now()}`;
        const newNotif: SystemNotification = {
          id: notifId,
          title: 'Bài tập đã được chấm điểm',
          content: `Bài tập "${assign.title}" của bạn đã được chấm điểm: ${grade} điểm. Hãy kiểm tra kết quả ngay!`,
          type: 'class_reminder',
          badge: '📝 Chấm bài',
          badgeColor: 'amber',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'system_notifications', notifId), newNotif);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${submissionId}`);
    }
  };

  const handleAddSimulation = async (newSim: HTMLSimulation) => {
    try {
      await saveSimulationToFirestore({
        ...newSim,
        teacherId: newSim.teacherId || currentUser?.id || '',
        teacherName: newSim.teacherName || currentUser?.name || 'Giáo viên',
      });

      // Log activity
      if (currentUser) {
        logActivity({
          user: currentUser,
          category: 'simulation',
          actionType: 'simulation_create',
          title: `Đăng mô phỏng thí nghiệm mới: "${newSim.title}"`,
          description: `Danh mục: ${newSim.category || 'Mô phỏng khoa học'}`,
          targetId: newSim.id,
          targetName: newSim.title
        });
      }
    } catch (error) {
      console.error('Lỗi lưu mô phỏng:', error);
      handleFirestoreError(error, OperationType.CREATE, `simulations/${newSim.id}`);
    }
  };

  const handleAddClass = async (newClass: ClassSession) => {
    const classData: ClassSession = JSON.parse(JSON.stringify({
      ...newClass,
      teacherId: newClass.teacherId || currentUser?.id,
      teacherName: newClass.teacherName || currentUser?.name,
    }));
    try {
      await setDoc(doc(db, 'class_sessions', classData.id), classData);

      // Log activity
      if (currentUser) {
        logActivity({
          user: currentUser,
          category: 'class',
          actionType: 'class_create',
          title: `Lên lịch buổi học trực tuyến: "${classData.title}"`,
          description: `Thời gian: ${new Date(classData.startTime).toLocaleString('vi-VN')}, Môn: ${classData.subject || 'Chung'}`,
          targetId: classData.id,
          targetName: classData.title
        });
      }

      // Automatically publish system notification for new class session
      const notifId = `auto_class_pub_${Date.now()}`;
      const newNotif: SystemNotification = {
        id: notifId,
        title: 'Lịch học trực tuyến mới',
        content: `Buổi học trực tuyến "${classData.title}" đã được lên lịch lúc ${new Date(classData.startTime).toLocaleString('vi-VN')}.`,
        type: 'class_reminder',
        badge: '⏰ Lịch học',
        badgeColor: 'amber',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'system_notifications', notifId), newNotif);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `class_sessions/${classData.id}`);
    }
  };

  const handleUpdateClass = async (updatedClass: ClassSession) => {
    try {
      await setDoc(doc(db, 'class_sessions', updatedClass.id), updatedClass);

      // Log activity
      if (currentUser) {
        logActivity({
          user: currentUser,
          category: 'class',
          actionType: 'class_update',
          title: `Cập nhật buổi học trực tuyến: "${updatedClass.title}"`,
          description: updatedClass.isCompleted ? 'Trạng thái: Đã học (hoàn thành)' : 'Cập nhật nội dung/link buổi học',
          targetId: updatedClass.id,
          targetName: updatedClass.title
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `class_sessions/${updatedClass.id}`);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      logActivity({
        user: currentUser,
        category: 'auth',
        actionType: 'auth_logout',
        title: `Đăng xuất khỏi hệ thống: ${currentUser.name}`,
      });
    }
    sessionStorage.removeItem('session_read_letters');
    sessionStorage.removeItem('offline_user_id');
    setSessionReadLetters([]);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('SignOut error ignored:', e);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const filteredNotifications = React.useMemo(() => {
    if (!currentUser) return [];
    
    const isClassMatching = (assignClass: string | undefined | null, userClass: string | undefined | null): boolean => {
      if (!assignClass || assignClass.trim() === '') return true;
      const cleanAssign = assignClass.trim().toLowerCase();
      if (
        cleanAssign === 'all' || 
        cleanAssign === 'tất cả' || 
        cleanAssign === 'tat ca' || 
        cleanAssign === 'toàn hệ thống' || 
        cleanAssign === 'toan he thong'
      ) {
        return true;
      }
      if (!userClass || userClass.trim() === '') return false;
      const clean = (s: string) => {
        return s.trim()
          .toLowerCase()
          .replace(/^(lớp|lop|class)\s+/gi, '')
          .replace(/\s+/g, '');
      };
      return clean(assignClass) === clean(userClass);
    };

    return systemNotifications.filter(notif => {
      // 1. If notification has a specific personal recipient (e.g. thank you letter replies)
      if (notif.targetUserId || notif.targetStudentId || notif.targetScope === 'personal' || notif.badge?.includes('Lời Cảm Ơn')) {
        const targetId = notif.targetUserId || notif.targetStudentId;
        return targetId === currentUser.id;
      }

      // If user is Admin, they see system & administrative announcements
      if (role === 'admin') {
        return true;
      }
      
      // If user is Teacher, they see notifications they created OR system-wide announcements
      if (role === 'teacher') {
        if (notif.targetScope === 'class') {
          return isClassMatching(notif.targetClass, currentUser.className);
        }
        return !notif.teacherId || notif.teacherId === currentUser.id || notif.teacherId === 'admin';
      }
      
      // If user is Student, they see notifications targeted to their class or system-wide
      if (notif.targetScope === 'class') {
        return isClassMatching(notif.targetClass, currentUser.className);
      }
      
      // Default: system-wide announcements are visible, unless they were explicitly created by another teacher and not matching the student's class
      if (notif.teacherId && notif.teacherId !== 'admin') {
        // Find if this teacher is the student's teacher
        // (A simple check: if the teacher created a class session that matches student's class, or if they share the same class name)
        // Since we want strict isolation, if a notification has teacherId and targetScope is all, we default to showing it only if the student belongs to that teacher's class
        const teacherCode = notif.teacherId.toUpperCase();
        const studentClass = (currentUser.className || '').toUpperCase();
        return studentClass === teacherCode;
      }
      
      return true;
    });
  }, [systemNotifications, currentUser, role]);

  // Display a gorgeous premium loading screen while initializing auth
  if (initializingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 text-sm font-semibold tracking-wide">Đang tải ứng dụng...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (!currentUser) return null;
    const isTeacherOrAdmin = role === 'teacher' || role === 'admin';
    const activeUser = { ...currentUser, role };

    // Calculate unique class names for dropdown selection
    const uniqueClassNames = (() => {
      const names = new Set<string>();
      if (currentUser.className) names.add(currentUser.className);
      if (currentUser.connectionCode) names.add(currentUser.connectionCode);
      allUsers.forEach((u) => {
        if (u.className) names.add(u.className);
        if (u.connectionCode) names.add(u.connectionCode);
      });
      classes.forEach((c) => {
        if (c.className) names.add(c.className);
      });
      return Array.from(names).filter(Boolean).sort();
    })();

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            user={activeUser} 
            assignments={assignments} 
            submissions={submissions}
            classes={classes}
            isLoadingAssignments={isLoadingAssignments}
            isLoadingSubmissions={isLoadingSubmissions}
            onNavigate={setActiveTab}
            onSelectAssignment={setSelectedAssignmentId}
          />
        );
      case 'admin':
        return (role === 'admin' || currentUser.role === 'admin') ? (
          <AdminConsoleView 
            user={activeUser} 
            assignments={assignments} 
            classes={classes} 
            simulations={simulations} 
            submissions={submissions}
            loveLetters={loveLetters}
            isLoadingAssignments={isLoadingAssignments}
          />
        ) : null;
      case 'assignments':
        return (
          <AssignmentsView 
            key="assignments"
            user={activeUser}
            assignments={assignments}
            submissions={submissions}
            isLoadingAssignments={isLoadingAssignments}
            isLoadingSubmissions={isLoadingSubmissions}
            onAddAssignment={handleAddAssignment}
            onSubmitWork={handleSubmitWork}
            onGrade={handleGrade}
            onAwardPoints={handleAwardPoints}
            initialSelectedAssignmentId={selectedAssignmentId}
            onClearInitialSelectedAssignmentId={() => setSelectedAssignmentId(null)}
            simulations={simulations}
            viewMode="assignments"
          />
        );
      case 'games':
        return (
          <AssignmentsView 
            key="games"
            user={activeUser}
            assignments={assignments}
            submissions={submissions}
            isLoadingAssignments={isLoadingAssignments}
            isLoadingSubmissions={isLoadingSubmissions}
            onAddAssignment={handleAddAssignment}
            onSubmitWork={handleSubmitWork}
            onGrade={handleGrade}
            onAwardPoints={handleAwardPoints}
            initialSelectedAssignmentId={selectedAssignmentId}
            onClearInitialSelectedAssignmentId={() => setSelectedAssignmentId(null)}
            simulations={simulations}
            viewMode="games"
          />
        );
      case 'flashcards':
        return (
          <AssignmentsView 
            key="flashcards"
            user={activeUser}
            assignments={assignments}
            submissions={submissions}
            isLoadingAssignments={isLoadingAssignments}
            isLoadingSubmissions={isLoadingSubmissions}
            onAddAssignment={handleAddAssignment}
            onSubmitWork={handleSubmitWork}
            onGrade={handleGrade}
            onAwardPoints={handleAwardPoints}
            initialSelectedAssignmentId={selectedAssignmentId}
            onClearInitialSelectedAssignmentId={() => setSelectedAssignmentId(null)}
            simulations={simulations}
            viewMode="flashcards"
          />
        );
      case 'schedule':
        return <ScheduleView user={activeUser} classes={classes} onAddClass={handleAddClass} onUpdateClass={handleUpdateClass} />;
      case 'notifications-manager':
        return isTeacherOrAdmin ? (
          <NotificationsManagerView
            user={activeUser}
            loveLetters={loveLetters}
            usersList={allUsers}
            classesList={uniqueClassNames}
          />
        ) : null;
      case 'activity-logs':
        return (role === 'admin' || currentUser?.role === 'admin') ? (
          <ActivityLogsView
            currentUser={activeUser}
            onNavigateToTab={setActiveTab}
          />
        ) : null;
      case 'resources-repository':
        return isTeacherOrAdmin ? (
          <ResourcesRepositoryView
            user={activeUser}
            assignments={assignments}
            onAwardPoints={handleAwardPoints}
          />
        ) : null;
      case 'students':
        return isTeacherOrAdmin ? <StudentsReportView progressData={progressData} user={activeUser} submissions={submissions} assignments={assignments} /> : null;
      case 'simulations':
        return <SimulationsView user={activeUser} simulations={simulations} onAddSimulation={handleAddSimulation} />;
      case 'rewards-store':
        return (
          <RewardStoreView
            user={activeUser}
            onUpdateUser={handleUpdateUser}
            onAwardPoints={handleAwardPoints}
            onNavigateToTab={setActiveTab}
          />
        );
      case 'settings':
        return <SettingsView user={activeUser} onUpdateUser={handleUpdateUser} />;
      default:
        return (
          <DashboardView 
            user={activeUser} 
            assignments={assignments} 
            submissions={submissions} 
            classes={classes} 
            onNavigate={setActiveTab}
            onSelectAssignment={setSelectedAssignmentId}
            onOpenGuide={() => setShowGuideOnboarding(true)}
          />
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="h-full w-full absolute inset-0"
        >
          <AuthView 
            onLogin={(selectedRole) => {
              setRole(selectedRole);
              setIsAuthenticated(true);
            }} 
          />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="h-full w-full absolute inset-0 bg-[#f8fafc] transition-colors duration-300"
        >
          {currentUser && (
            <>
              <Layout 
                user={currentUser} 
                currentRole={role}
                onRoleChange={setRole}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onUpdateUser={handleUpdateUser}
                onLogout={handleLogout}
                onOpenGuide={() => setShowGuideOnboarding(true)}
                onOpenRobot={() => setRobotOpen(true)}
                assignments={assignments}
                submissions={submissions}
                systemNotifications={filteredNotifications}
                classes={classes}
              >
                {renderContent()}
              </Layout>
              <ClassSessionReminder user={currentUser} classes={classes} />
              <AssignmentReminder user={currentUser} assignments={assignments} submissions={submissions} />
              <RobotGuide 
                user={{ ...currentUser, role }} 
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOpen={robotOpen}
                onOpenChange={setRobotOpen}
              />
              
              {activeUnreadLetter && (
                <LoveLetterModal
                  letter={activeUnreadLetter}
                  currentUser={currentUser}
                  onClose={() => handleMarkLetterRead(activeUnreadLetter.id)}
                />
              )}
            </>
          )}
          
          {showGuideOnboarding && currentUser && (
            <GuideOnboardingModal
              user={currentUser}
              onClose={() => {
                setShowGuideOnboarding(false);
                if (currentUser) {
                  localStorage.setItem(`guideOnboardingDismissed_${currentUser.id}`, 'true');
                  sessionStorage.setItem(`guideOnboardingDismissed_${currentUser.id}`, 'true');
                }
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

