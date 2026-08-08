import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { AssignmentsView } from './views/AssignmentsView';
import { ScheduleView } from './views/ScheduleView';
import { StudentsReportView } from './views/StudentsReportView';
import { SimulationsView } from './views/SimulationsView';
import { AuthView } from './views/AuthView';
import { currentUserMock } from './mockData';
import { Assignment, Role, Submission, User, HTMLSimulation, ClassSession, StudentProgress } from './types';
import { AnimatePresence, motion } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

import { SettingsView } from './views/SettingsView';
import { AdminConsoleView } from './views/AdminConsoleView';
import { ZaloOnboardingModal } from './components/ZaloOnboardingModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>('student');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showZaloOnboarding, setShowZaloOnboarding] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  
  // App states synchronized with Firestore
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [simulations, setSimulations] = useState<HTMLSimulation[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initializingAuth, setInitializingAuth] = useState(true);

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
    if (currentUser && currentUser.role === 'student' && !currentUser.zaloChatId && !sessionStorage.getItem('zaloOnboardingDismissed')) {
      setShowZaloOnboarding(true);
    }
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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'assignments');
    });

    // Listen to submissions
    const unsubscribeSubmissions = onSnapshot(collection(db, 'submissions'), (snapshot) => {
      const list: Submission[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Submission);
      });
      setSubmissions(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
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

    return () => {
      unsubscribeAssignments();
      unsubscribeSubmissions();
      unsubscribeSimulations();
      unsubscribeClasses();
      unsubscribeProgress();
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
          />
        ) : null;
      case 'assignments':
        return (
          <AssignmentsView 
            user={currentUser}
            assignments={assignments}
            submissions={submissions}
            onAddAssignment={handleAddAssignment}
            onSubmitWork={handleSubmitWork}
            onGrade={handleGrade}
            initialSelectedAssignmentId={selectedAssignmentId}
            onClearInitialSelectedAssignmentId={() => setSelectedAssignmentId(null)}
            simulations={simulations}
          />
        );
      case 'schedule':
        return <ScheduleView user={currentUser} classes={classes} onAddClass={handleAddClass} />;
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
            onOpenGuide={() => setShowZaloOnboarding(true)}
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
          className="h-full w-full absolute inset-0 bg-[#f8fafc]"
        >
          {currentUser && (
            <Layout 
              user={currentUser} 
              currentRole={role}
              onRoleChange={setRole}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onUpdateUser={handleUpdateUser}
              onLogout={handleLogout}
            >
              {renderContent()}
            </Layout>
          )}
          
          {showZaloOnboarding && currentUser && (
            <ZaloOnboardingModal
              user={currentUser}
              onClose={() => {
                setShowZaloOnboarding(false);
                sessionStorage.setItem('zaloOnboardingDismissed', 'true');
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

