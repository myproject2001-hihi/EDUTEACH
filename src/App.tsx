import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { AssignmentsView } from './views/AssignmentsView';
import { ScheduleView } from './views/ScheduleView';
import { StudentsReportView } from './views/StudentsReportView';
import { SimulationsView } from './views/SimulationsView';
import { AuthView } from './views/AuthView';
import { currentUserMock } from './mockData';
import { Assignment, Role, Submission, User, HTMLSimulation, ClassSession, StudentProgress, SystemNotification } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc, increment } from 'firebase/firestore';

import { SettingsView } from './views/SettingsView';
import { AdminConsoleView } from './views/AdminConsoleView';
import { GuideOnboardingModal } from './components/GuideOnboardingModal';
import { ClassSessionReminder } from './components/ClassSessionReminder';
import { AssignmentReminder } from './components/AssignmentReminder';
import { NotificationsManagerView } from './views/NotificationsManagerView';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>('student');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showGuideOnboarding, setShowGuideOnboarding] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  
  // App states synchronized with Firestore
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [simulations, setSimulations] = useState<HTMLSimulation[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializingAuth, setInitializingAuth] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);

  // 1. Setup Firebase Auth state listener and real-time user profile sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
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
        setCurrentUser(null);
        setIsAuthenticated(false);
        setInitializingAuth(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setShowGuideOnboarding(false);
  }, [currentUser]);

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

    return () => {
      unsubscribeAssignments();
      unsubscribeSubmissions();
      unsubscribeSimulations();
      unsubscribeClasses();
      unsubscribeProgress();
      unsubscribeNotifications();
    };
  }, [isAuthenticated]);

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
    const assignment: Assignment = {
      ...newAssignment,
      id,
      createdAt: new Date().toISOString(),
      teacherId: newAssignment.teacherId || currentUser?.id,
      teacherName: newAssignment.teacherName || currentUser?.name,
    };
    try {
      await setDoc(doc(db, 'assignments', id), assignment);

      // Automatically publish system notification for new assignment
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
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `assignments/${id}`);
    }
  };

  const handleSubmitWork = async (submission: Omit<Submission, 'id' | 'submittedAt'>) => {
    const id = `sub_${Date.now()}`;
    const newSubmission: Submission = {
      ...submission,
      id,
      submittedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'submissions', id), newSubmission);
      
      // Also update student's cumulative personal points!
      if (submission.studentId) {
        const studentRef = doc(db, 'users', submission.studentId);
        const pointsToEarn = submission.grade ? Math.round(submission.grade * 10) : 10;
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
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `submissions/${id}`);
    }
  };

  const handleGrade = async (submissionId: string, grade: number, feedback: string) => {
    try {
      await updateDoc(doc(db, 'submissions', submissionId), {
        grade,
        feedback
      });

      // Automatically publish a system notification for grading
      const sub = submissions.find(s => s.id === submissionId);
      const assign = assignments.find(a => a.id === sub?.assignmentId);
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
    const simData: HTMLSimulation = {
      ...newSim,
      teacherId: newSim.teacherId || currentUser?.id,
      teacherName: newSim.teacherName || currentUser?.name,
    };
    try {
      await setDoc(doc(db, 'simulations', simData.id), simData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `simulations/${simData.id}`);
    }
  };

  const handleAddClass = async (newClass: ClassSession) => {
    const classData: ClassSession = {
      ...newClass,
      teacherId: newClass.teacherId || currentUser?.id,
      teacherName: newClass.teacherName || currentUser?.name,
    };
    try {
      await setDoc(doc(db, 'class_sessions', classData.id), classData);

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

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
  };

  // Display a gorgeous premium loading screen while initializing auth
  if (initializingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 text-sm font-semibold tracking-wide">Đang tải ứng dụng...</p>
      </div>
    );
  }

  const filteredNotifications = React.useMemo(() => {
    if (!currentUser) return [];
    return systemNotifications.filter(notif => {
      if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
        return true;
      }
      return !notif.targetStudentId || notif.targetStudentId === currentUser.id;
    });
  }, [systemNotifications, currentUser]);

  const renderContent = () => {
    if (!currentUser) return null;
    const isTeacherOrAdmin = role === 'teacher' || role === 'admin';

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            user={currentUser} 
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
            user={currentUser} 
            assignments={assignments} 
            classes={classes} 
            simulations={simulations} 
            isLoadingAssignments={isLoadingAssignments}
          />
        ) : null;
      case 'assignments':
        return (
          <AssignmentsView 
            key="assignments"
            user={currentUser}
            assignments={assignments}
            submissions={submissions}
            isLoadingAssignments={isLoadingAssignments}
            isLoadingSubmissions={isLoadingSubmissions}
            onAddAssignment={handleAddAssignment}
            onSubmitWork={handleSubmitWork}
            onGrade={handleGrade}
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
            user={currentUser}
            assignments={assignments}
            submissions={submissions}
            isLoadingAssignments={isLoadingAssignments}
            isLoadingSubmissions={isLoadingSubmissions}
            onAddAssignment={handleAddAssignment}
            onSubmitWork={handleSubmitWork}
            onGrade={handleGrade}
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
            user={currentUser}
            assignments={assignments}
            submissions={submissions}
            isLoadingAssignments={isLoadingAssignments}
            isLoadingSubmissions={isLoadingSubmissions}
            onAddAssignment={handleAddAssignment}
            onSubmitWork={handleSubmitWork}
            onGrade={handleGrade}
            initialSelectedAssignmentId={selectedAssignmentId}
            onClearInitialSelectedAssignmentId={() => setSelectedAssignmentId(null)}
            simulations={simulations}
            viewMode="flashcards"
          />
        );
      case 'schedule':
        return <ScheduleView user={currentUser} classes={classes} onAddClass={handleAddClass} />;
      case 'notifications-manager':
        return isTeacherOrAdmin ? <NotificationsManagerView user={currentUser} /> : null;
      case 'students':
        return isTeacherOrAdmin ? <StudentsReportView progressData={progressData} /> : null;
      case 'simulations':
        return <SimulationsView user={currentUser} simulations={simulations} onAddSimulation={handleAddSimulation} />;
      case 'settings':
        return isTeacherOrAdmin ? <SettingsView user={currentUser} /> : null;
      default:
        return (
          <DashboardView 
            user={currentUser} 
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
                assignments={assignments}
                submissions={submissions}
                systemNotifications={filteredNotifications}
                classes={classes}
              >
                {renderContent()}
              </Layout>
              <ClassSessionReminder user={currentUser} classes={classes} />
              <AssignmentReminder user={currentUser} assignments={assignments} submissions={submissions} />
            </>
          )}
          
          {showGuideOnboarding && currentUser && (
            <GuideOnboardingModal
              user={currentUser}
              onClose={() => {
                setShowGuideOnboarding(false);
                sessionStorage.setItem('onboardingDismissed', 'true');
                sessionStorage.setItem('guideOnboardingDismissed', 'true');
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

