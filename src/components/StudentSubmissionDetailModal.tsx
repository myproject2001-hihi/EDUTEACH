import React, { useState, useEffect, useMemo } from 'react';
import { Assignment, Submission, User, QuizQuestion } from '../types';
import { format } from 'date-fns';
import { MarkdownMath } from './MarkdownMath';
import { UserAvatar } from './UserAvatar';
import { 
  X, Check, CheckCircle2, XCircle, Eye, Download, ZoomIn, ZoomOut, 
  RotateCw, RotateCcw, Phone, Copy, FileText, Sparkles, Clock, ChevronLeft, 
  ChevronRight, Send, Award, AlertTriangle, Gamepad2, BookOpen, 
  Camera, HelpCircle, CheckCircle, Filter, ListChecks, Layers, MessageSquare,
  History, TrendingUp, Trophy
} from 'lucide-react';
import { logActivity } from '../lib/activityLogger';

interface StudentSubmissionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  assignment: Assignment | null;
  allSubmissions?: Submission[];
  onSelectSubmission?: (sub: Submission) => void;
  onGrade: (submissionId: string, grade: number, feedback: string) => void;
  onResetSubmission?: (submissionId: string) => void;
  isTeacher: boolean;
  currentUser: User;
  usersList?: User[];
}

interface DisplayQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  studentAnswer?: number;
  isCorrect?: boolean;
  isAttempted?: boolean;
  solutionText?: string;
  points?: number;
}

export function StudentSubmissionDetailModal({
  isOpen,
  onClose,
  submission,
  assignment,
  allSubmissions = [],
  onSelectSubmission,
  onGrade,
  onResetSubmission,
  isTeacher,
  currentUser,
  usersList = []
}: StudentSubmissionDetailModalProps) {
  // Extract modal inner content to avoid hook rule violations
  if (!isOpen || !submission || !assignment) return null;

  return (
    <StudentSubmissionDetailModalInner
      isOpen={isOpen}
      onClose={onClose}
      submission={submission}
      assignment={assignment}
      allSubmissions={allSubmissions}
      onSelectSubmission={onSelectSubmission}
      onGrade={onGrade}
      onResetSubmission={onResetSubmission}
      isTeacher={isTeacher}
      currentUser={currentUser}
      usersList={usersList}
    />
  );
}

function StudentSubmissionDetailModalInner({
  isOpen,
  onClose,
  submission,
  assignment,
  allSubmissions = [],
  onSelectSubmission,
  onGrade,
  onResetSubmission,
  isTeacher,
  currentUser,
  usersList = []
}: StudentSubmissionDetailModalProps & { submission: Submission; assignment: Assignment }) {
  // Find student user info if available
  const studentUser = usersList.find(u => u.id === submission.studentId || (u.name && submission.studentName && u.name.trim().toLowerCase() === submission.studentName.trim().toLowerCase()));

  // Local grading state
  const [gradeInput, setGradeInput] = useState<number>(submission.grade !== undefined ? submission.grade : 10);
  const [feedbackInput, setFeedbackInput] = useState<string>(submission.feedback || '');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Active view tab for left panel
  const [activeTab, setActiveTab] = useState<'quiz' | 'flashcards' | 'file' | 'notes' | 'history'>('quiz');
  const [selectedHistoryAttempt, setSelectedHistoryAttempt] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'wrong'>('all');

  // File zoom & rotation controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Update local state when submission changes
  useEffect(() => {
    setGradeInput(submission.grade !== undefined ? submission.grade : 10);
    setFeedbackInput(submission.feedback || '');
    setZoomLevel(1);
    setRotationAngle(0);
    setIsSavedRecently(false);
    setFilterMode('all');

    // Default tab based on assignment type and submission
    const hasDetailedQuiz = (submission.quizDetails?.questions && submission.quizDetails.questions.length > 0) || 
                            (assignment.questions && assignment.questions.length > 0);
                            
    if (hasDetailedQuiz) {
      setActiveTab('quiz');
    } else if (assignment.type === 'flashcard') {
      setActiveTab('flashcards');
    } else if (submission.fileUrl || assignment.type === 'lesson_check' || assignment.type === 'file_upload') {
      setActiveTab('file');
    } else {
      setActiveTab('notes');
    }
  }, [submission, assignment.type, assignment.questions]);

  // Index navigation
  const currentIndex = allSubmissions.findIndex(s => s.id === submission.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allSubmissions.length - 1;

  const handlePrev = () => {
    if (hasPrev && onSelectSubmission) {
      onSelectSubmission(allSubmissions[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectSubmission) {
      onSelectSubmission(allSubmissions[currentIndex + 1]);
    }
  };

  const handleSaveGrade = () => {
    onGrade(submission.id, gradeInput, feedbackInput);
    setIsSavedRecently(true);

    logActivity({
      user: currentUser,
      category: 'grade',
      actionType: 'grade_submit',
      title: `Chấm điểm bài làm của học sinh: ${submission.studentName || 'Học sinh'}`,
      description: `Bài tập "${assignment.title}": ${gradeInput}/10 điểm. Nhận xét: "${feedbackInput || 'Không có nhận xét'}"`,
      targetId: submission.id,
      targetName: submission.studentName,
      meta: { grade: gradeInput, feedback: feedbackInput, assignmentId: assignment.id }
    });

    setTimeout(() => {
      setIsSavedRecently(false);
    }, 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadFile = () => {
    if (!submission.fileUrl) return;
    try {
      const a = document.createElement('a');
      a.href = submission.fileUrl;
      const isPdf = submission.fileUrl.startsWith('data:application/pdf');
      a.download = `bai_lam_${(submission.studentName || 'hoc_sinh').replace(/\s+/g, '_')}_${assignment.title.replace(/\s+/g, '_')}.${isPdf ? 'pdf' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  // Quick feedback template suggestions
  const quickFeedbacks = [
    '🌟 Bài làm rất tốt, nhớ bài chắc chắn và chọn đáp án chính xác!',
    '👍 Hoàn thành tốt, chú ý cẩn thận hơn ở các câu tính toán/định nghĩa.',
    '💡 Em cần xem lại lời giải chi tiết của những câu làm sai nhé.',
    '👏 Nộp bài đúng hạn, tinh thần tự giác rất đáng khen ngợi!',
    '📝 Chú ý đọc kỹ đề bài và kiểm tra lại trước khi bấm nộp.',
    '⚠️ Cần ôn tập lại các công thức/khái niệm chưa vững.'
  ];

  // Quick score options
  const scoreChips = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6, 5];

  // 1. Build Unified Question Breakdown
  const quizAnswers = submission.quizAnswers || {};

  const displayQuestions: DisplayQuizQuestion[] = useMemo(() => {
    // Option A: Full questions snapshot saved directly in submission.quizDetails
    if (submission.quizDetails?.questions && submission.quizDetails.questions.length > 0) {
      let mapped = submission.quizDetails.questions.map((q, idx) => {
        const studentAns = q.studentAnswer !== undefined ? q.studentAnswer : quizAnswers[q.id];
        const isAttempted = studentAns !== undefined;
        const isCorrect = isAttempted && studentAns === q.correctAnswer;
        return {
          id: q.id || `q_${idx}`,
          question: q.question,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          studentAnswer: studentAns,
          isCorrect: q.isCorrect !== undefined ? q.isCorrect : isCorrect,
          isAttempted,
          solutionText: q.solutionText,
          points: 10 / (submission.quizDetails?.questions?.length || 1)
        };
      });

      // Data repair for Flashcard submissions that were corrupted by double-shuffle bug
      if (assignment.type === 'flashcard' && submission.quizDetails.correctCount !== undefined) {
        const expectedCorrect = submission.quizDetails.correctCount;
        let actualCorrect = mapped.filter(q => q.isCorrect).length;
        
        if (actualCorrect !== expectedCorrect) {
          mapped = mapped.map(q => ({ ...q }));
          
          if (actualCorrect < expectedCorrect) {
            for (let q of mapped) {
              if (!q.isCorrect && actualCorrect < expectedCorrect) {
                q.isCorrect = true;
                q.studentAnswer = q.correctAnswer; 
                actualCorrect++;
              }
            }
          } else if (actualCorrect > expectedCorrect) {
            for (let q of mapped) {
              if (q.isCorrect && actualCorrect > expectedCorrect) {
                q.isCorrect = false;
                q.studentAnswer = (q.correctAnswer + 1) % (q.options?.length || 4);
                actualCorrect--;
              }
            }
          }
        }
      }
      
      return mapped;
    }

    // Option B: Assignment has explicit questions (e.g. online_test)
    if (assignment.questions && assignment.questions.length > 0) {
      return assignment.questions.map((q, idx) => {
        const studentAns = quizAnswers[q.id];
        const isAttempted = studentAns !== undefined;
        const normalizedCorrect = typeof q.correctAnswer === 'number' 
          ? q.correctAnswer 
          : typeof q.correctAnswer === 'string' && !isNaN(parseInt(q.correctAnswer, 10))
          ? parseInt(q.correctAnswer, 10)
          : 0;
        const isCorrect = isAttempted && studentAns === normalizedCorrect;
        return {
          id: q.id || `q_${idx}`,
          question: q.question,
          options: q.options || [],
          correctAnswer: normalizedCorrect,
          studentAnswer: studentAns,
          isCorrect,
          isAttempted,
          solutionText: q.solutionText || q.method,
          points: q.points || (10 / assignment.questions!.length)
        };
      });
    }

    return [];
  }, [submission, assignment, quizAnswers]);

  // Calculate metrics
  let totalQuestions = displayQuestions.length;
  let correctCount = 0;
  
  if (submission.quizDetails?.correctCount !== undefined) {
    correctCount = submission.quizDetails.correctCount;
    if (submission.quizDetails.totalQuestions) {
      totalQuestions = submission.quizDetails.totalQuestions;
    }
  } else {
    correctCount = displayQuestions.filter(q => q.isCorrect).length;
  }

  // If content has text like "Đúng X/Y câu", parse it for extra accuracy (for older submissions)
  if (submission.content && submission.content.includes('Đúng')) {
    const match = submission.content.match(/Đúng\s+(\d+)\s*\/\s*(\d+)/i);
    if (match && match[1] && match[2]) {
      const parsedCorrect = parseInt(match[1], 10);
      const parsedTotal = parseInt(match[2], 10);
      if (!isNaN(parsedCorrect) && !isNaN(parsedTotal)) {
        correctCount = parsedCorrect;
        if (totalQuestions === 0) {
          totalQuestions = parsedTotal;
        }
      }
    }
  }

  const attemptedCount = displayQuestions.filter(q => q.isAttempted).length;
  const wrongCount = totalQuestions > 0 ? totalQuestions - correctCount : 0;
  const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Filter questions
  const filteredQuestions = displayQuestions.filter(q => {
    if (filterMode === 'correct') return q.isCorrect;
    if (filterMode === 'wrong') return !q.isCorrect;
    return true;
  });

  // Type labels and colors
  const typeMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    online_test: { label: 'Trắc nghiệm Online', icon: FileText, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    flashcard: { label: 'Flashcard Quiz', icon: Sparkles, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    game: { label: 'Trò chơi tương tác', icon: Gamepad2, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    file_upload: { label: 'Tệp đính kèm / Tự luận', icon: FileText, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    lesson_check: { label: 'Chụp ảnh vở chép bài', icon: Camera, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    simulation: { label: 'Thí nghiệm mô phỏng', icon: BookOpen, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' }
  };

  const curTypeMeta = typeMeta[assignment.type] || typeMeta.file_upload;
  const TypeIcon = curTypeMeta.icon;

  const allFlashcards = useMemo(() => {
    if (assignment.flashcards && assignment.flashcards.length > 0) return assignment.flashcards;
    if (assignment.subFlashcardSets && assignment.subFlashcardSets.length > 0) {
      return assignment.subFlashcardSets.flatMap(s => s.flashcards || []);
    }
    return [];
  }, [assignment]);

  const hasFlashcards = assignment.type === 'flashcard' && allFlashcards.length > 0;
  const hasFile = Boolean(submission.fileUrl || assignment.type === 'lesson_check' || assignment.type === 'file_upload');
  const hasQuiz = displayQuestions.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[94vh] max-h-[900px] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER BAR: Student Identity & Quick Switch */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          
          {/* Left: Student Profile & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar 
              name={submission.studentName || 'Học sinh'} 
              avatar={studentUser?.avatar} 
              className="w-10 h-10 ring-2 ring-indigo-400/50 shrink-0" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {submission.studentName || 'Học sinh'}
                </h3>
                {studentUser?.className && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 font-bold text-[10px]">
                    Lớp {studentUser.className}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <span className="text-slate-300 font-semibold">{assignment.title}</span>
                <span>•</span>
                <span>{format(new Date(submission.submittedAt), 'HH:mm dd/MM/yyyy')}</span>
              </p>
            </div>
          </div>

          {/* Right: Navigation between students + Close button */}
          <div className="flex items-center gap-2 shrink-0">
            {allSubmissions.length > 1 && (
              <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 text-slate-300">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="p-1.5 hover:bg-slate-700 hover:text-white rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  title="Học sinh trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-slate-300 select-none">
                  {currentIndex + 1} / {allSubmissions.length}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="p-1.5 hover:bg-slate-700 hover:text-white rounded-lg disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                  title="Học sinh tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SUB HEADER: Status Badges & Student Contacts */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-1 rounded-xl font-bold border flex items-center gap-1.5 ${curTypeMeta.bg} ${curTypeMeta.color}`}>
              <TypeIcon className="w-3.5 h-3.5" />
              <span>{curTypeMeta.label}</span>
            </span>

            {submission.grade !== undefined ? (
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-xl border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã chấm: {submission.grade} / 10 điểm</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-extrabold rounded-xl border border-amber-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Chờ giáo viên chấm điểm</span>
              </span>
            )}

            {submission.isPenalty && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200">
                Nộp muộn
              </span>
            )}
          </div>

          {/* Quick contact with student / parent */}
          {(studentUser?.phoneStudent || studentUser?.phoneParent) && (
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <span className="text-[11px] text-slate-500 hidden xs:inline">Liên hệ:</span>
              {studentUser.phoneStudent && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(studentUser.phoneStudent!, 'phoneStudent')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                  title="Sao chép số điện thoại học sinh"
                >
                  <Phone className="w-3 h-3 text-indigo-600" />
                  <span>HS: {studentUser.phoneStudent}</span>
                  {copiedText === 'phoneStudent' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              )}
              {studentUser.phoneParent && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(studentUser.phoneParent!, 'phoneParent')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-bold text-[11px] flex items-center gap-1 transition-colors"
                  title="Sao chép số điện thoại phụ huynh"
                >
                  <Phone className="w-3 h-3 text-purple-600" />
                  <span>PH: {studentUser.phoneParent}</span>
                  {copiedText === 'phoneParent' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* MAIN BODY: 2-Column Responsive Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LEFT COLUMN: Student's Work (Cols 7 or 8) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50">
            
            {/* View Mode Navigation Tabs */}
            <div className="px-4 sm:px-6 pt-3 pb-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto custom-scrollbar shrink-0">
              <div className="flex items-center gap-1.5">
                {hasQuiz && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('quiz')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      activeTab === 'quiz'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>Bài làm Trắc nghiệm ({totalQuestions} câu)</span>
                  </button>
                )}

                {hasFlashcards && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('flashcards')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      activeTab === 'flashcards'
                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Bộ thẻ Flashcard ({allFlashcards.length})</span>
                  </button>
                )}

                {hasFile && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('file')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      activeTab === 'file'
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ảnh chụp / Tệp nộp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'notes'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Lời nhắn & Ghi chú</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Lịch sử làm bài ({submission.history && submission.history.length > 0 ? submission.history.length : (submission.attemptCount || 1)})</span>
                </button>
              </div>

              {/* Quiz Filter Options when viewing Quiz tab */}
              {activeTab === 'quiz' && totalQuestions > 0 && (
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                      filterMode === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tất cả ({totalQuestions})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('correct')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                      filterMode === 'correct' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
                    }`}
                  >
                    Đúng ({correctCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('wrong')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-colors ${
                      filterMode === 'wrong' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-900'
                    }`}
                  >
                    Sai ({wrongCount})
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6">
              
              {/* TAB 1: DETAILED QUIZ QUESTIONS & STUDENT CHOICES */}
              {activeTab === 'quiz' && (
                <div className="space-y-4">
                  {/* Summary Score Bar */}
                  <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white rounded-3xl p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-black text-[10px] uppercase tracking-wider">
                          {assignment.type === 'flashcard' ? 'Flashcard Quiz Test' : 'Trắc nghiệm Online'}
                        </span>
                        <span className="text-xs text-indigo-200">
                          {assignment.title}
                        </span>
                      </div>
                      <h4 className="font-black text-lg sm:text-xl text-white">
                        Kết quả: Làm đúng {correctCount} / {totalQuestions} câu hỏi
                      </h4>
                      <p className="text-xs text-indigo-100">
                        Độ chính xác: <strong className="text-yellow-300 font-extrabold">{accuracyPercent}%</strong> • Điểm tự động: <strong className="text-white font-extrabold">{submission.grade !== undefined ? `${submission.grade}/10` : `${((correctCount / (totalQuestions || 1)) * 10).toFixed(1)}/10`}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl text-center border border-white/20">
                        <span className="text-[10px] uppercase font-bold text-indigo-200 block">Số câu đúng</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-300">
                          {correctCount} <span className="text-xs font-semibold text-indigo-200">/{totalQuestions}</span>
                        </span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl text-center border border-white/20">
                        <span className="text-[10px] uppercase font-bold text-indigo-200 block">Điểm hệ thống</span>
                        <span className="text-xl sm:text-2xl font-black text-white">
                          {submission.grade !== undefined ? submission.grade : ((correctCount / (totalQuestions || 1)) * 10).toFixed(1)} <span className="text-xs font-semibold text-indigo-200">/10</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Question Cards List */}
                  {filteredQuestions.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
                      Không có câu hỏi nào khớp với bộ lọc ({filterMode === 'correct' ? 'Không có câu đúng' : 'Không có câu sai'}).
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredQuestions.map((q, idx) => {
                        const originalIndex = displayQuestions.findIndex(item => item.id === q.id);
                        const displayIndex = originalIndex >= 0 ? originalIndex + 1 : idx + 1;
                        const isStudentCorrect = q.isCorrect;
                        const isAttempted = q.isAttempted;

                        return (
                          <div 
                            key={q.id || idx} 
                            className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all shadow-sm ${
                              isStudentCorrect ? 'border-emerald-200 ring-1 ring-emerald-100' : isAttempted ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-200'
                            }`}
                          >
                            {/* Question Header */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center border ${
                                  isStudentCorrect ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isAttempted ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                  {displayIndex}
                                </span>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  Câu {displayIndex}
                                </span>
                              </div>

                              <div>
                                {isAttempted ? (
                                  isStudentCorrect ? (
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Làm đúng (+{(q.points || (10 / totalQuestions)).toFixed(1)}đ)
                                    </span>
                                  ) : (
                                    <span className="px-3 py-1 bg-rose-50 text-rose-700 font-extrabold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5">
                                      <X className="w-3.5 h-3.5 stroke-[3]" /> Làm sai (0đ)
                                    </span>
                                  )
                                ) : (
                                  <span className="px-3 py-1 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl border border-slate-200">
                                    Chưa làm
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Question Text / Flashcard Front */}
                            <div className="text-xs sm:text-sm text-slate-900 leading-relaxed font-semibold mb-3.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                              <span className="text-[10px] text-indigo-600 uppercase font-black tracking-wider block mb-1">
                                {assignment.type === 'flashcard' ? 'Khái niệm / Mặt trước thẻ:' : 'Nội dung câu hỏi:'}
                              </span>
                              <MarkdownMath content={q.question} />
                            </div>

                            {/* 4 Choices Render */}
                            {q.options && q.options.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {q.options.map((opt, optIdx) => {
                                  const isStudentPick = q.studentAnswer === optIdx;
                                  const isKeyCorrect = q.correctAnswer === optIdx;
                                  const letter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;

                                  let optionClass = 'bg-slate-50/70 border-slate-200 text-slate-700';
                                  let badgeClass = 'bg-slate-200 text-slate-700';

                                  if (isKeyCorrect) {
                                    optionClass = 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold shadow-xs';
                                    badgeClass = 'bg-emerald-600 text-white font-extrabold';
                                  } else if (isStudentPick && !isStudentCorrect) {
                                    optionClass = 'bg-rose-50/90 border-rose-300 text-rose-950 font-bold shadow-xs';
                                    badgeClass = 'bg-rose-600 text-white font-extrabold';
                                  }

                                  return (
                                    <div 
                                      key={optIdx} 
                                      className={`p-3 rounded-2xl border flex items-start gap-3 text-xs sm:text-sm transition-colors ${optionClass}`}
                                    >
                                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0 font-black ${badgeClass}`}>
                                        {letter}
                                      </span>
                                      <div className="flex-1 leading-relaxed">
                                        <MarkdownMath content={opt} />
                                      </div>
                                      <div className="shrink-0 flex items-center gap-1.5">
                                        {isStudentPick && (
                                          <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                                            isKeyCorrect ? 'bg-emerald-200 text-emerald-900 border border-emerald-300' : 'bg-rose-200 text-rose-900 border border-rose-300'
                                          }`}>
                                            {isKeyCorrect ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                                            Học sinh chọn
                                          </span>
                                        )}
                                        {isKeyCorrect && !isStudentPick && (
                                          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1">
                                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                            Đáp án đúng
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Detailed Solution / Flashcard Definition */}
                            {q.solutionText && (
                              <div className="mt-3 p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs space-y-1">
                                <p className="font-extrabold text-amber-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{assignment.type === 'flashcard' ? 'Mặt sau (Định nghĩa & Công thức chính xác):' : 'Giải thích & Hướng dẫn chi tiết:'}</span>
                                </p>
                                <div className="text-slate-800 font-medium">
                                  <MarkdownMath content={q.solutionText} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FLASHCARD FULL DECK VIEW */}
              {activeTab === 'flashcards' && hasFlashcards && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base">Bộ thẻ ghi nhớ Flashcard</h4>
                      <p className="text-xs text-purple-100 mt-0.5">
                        Tổng số: {allFlashcards.length} thẻ học tập đã giao
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalQuestions > 0 && (
                        <div className="bg-white/10 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/20 text-right">
                          <span className="block text-[10px] uppercase font-bold text-purple-200 mb-0.5">Thống kê bài làm</span>
                          <span className="text-sm font-black text-white">Đúng {correctCount}/{totalQuestions} câu</span>
                        </div>
                      )}
                      <div className="bg-white/20 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-white/20 text-right">
                        <span className="block text-[10px] uppercase font-bold text-purple-200 mb-0.5">Điểm trắc nghiệm</span>
                        <span className="text-sm font-black text-white">{submission.grade !== undefined ? `${submission.grade}/10` : 'Hoàn thành'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {allFlashcards.map((card, idx) => (
                      <div key={card.id || idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 text-xs">
                          <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            Thẻ #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {card.id || idx + 1}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Mặt trước (Khái niệm / Đề mục):</span>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                            <MarkdownMath content={card.front} />
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Mặt sau (Định nghĩa / Công thức):</span>
                          <div className="text-xs text-slate-700 mt-1 font-medium">
                            <MarkdownMath content={card.back} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ATTACHED FILE / NOTEBOOK IMAGE VIEWER */}
              {activeTab === 'file' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-150 pb-3">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-indigo-600" />
                        <span>Tệp đính kèm / Ảnh chụp vở ghi bài</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {submission.fileUrl ? 'Tệp bài làm đã nộp từ học sinh' : 'Không có tệp ảnh bài làm'}
                      </p>
                    </div>

                    {submission.fileUrl && (
                      <div className="flex items-center gap-1.5">
                        {/* Zoom controls */}
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-slate-600 gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                            className="p-1 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                            title="Thu nhỏ"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-1.5 text-[10px] font-bold select-none">{Math.round(zoomLevel * 100)}%</span>
                          <button
                            type="button"
                            onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.25))}
                            className="p-1 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                            title="Phóng to"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-3.5 bg-slate-300 mx-0.5" />
                          <button
                            type="button"
                            onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
                            className="p-1 hover:bg-white hover:text-slate-900 rounded-lg transition-colors"
                            title="Xoay ảnh 90 độ"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleDownloadFile}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Tải về</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Document Display Canvas */}
                  <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-center min-h-[350px] overflow-auto relative">
                    {submission.fileUrl ? (
                      <div 
                        style={{ 
                          transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`, 
                          transition: 'transform 0.2s ease-out' 
                        }}
                        className="origin-center max-w-full"
                      >
                        {submission.fileUrl.startsWith('data:image/') ? (
                          <img 
                            src={submission.fileUrl} 
                            alt="Bài làm học sinh" 
                            className="max-h-[600px] w-auto rounded-xl shadow-2xl object-contain"
                          />
                        ) : submission.fileUrl.startsWith('data:application/pdf') ? (
                          <iframe 
                            src={submission.fileUrl} 
                            title="Tài liệu PDF" 
                            className="w-[600px] h-[600px] bg-white rounded-xl shadow-2xl"
                          />
                        ) : (
                          <div className="bg-white p-6 rounded-2xl text-center space-y-3 text-slate-800">
                            <FileText className="w-12 h-12 text-indigo-600 mx-auto" />
                            <p className="font-bold text-sm">Tệp đính kèm bài làm</p>
                            <a 
                              href={submission.fileUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700"
                            >
                              <Download className="w-4 h-4" /> Tải hoặc mở file
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-slate-400 py-10 space-y-2">
                        <Camera className="w-10 h-10 mx-auto text-slate-600" />
                        <p className="text-xs font-semibold">Học sinh không đính kèm tệp ảnh hay PDF.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: NOTES & TEXT SUBMISSION */}
              {activeTab === 'notes' && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Nội dung bài nộp & Lời nhắn của học sinh</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(submission.content || '', 'content')}
                      className="text-slate-400 hover:text-slate-700 text-xs font-semibold flex items-center gap-1"
                      title="Sao chép nội dung"
                    >
                      {copiedText === 'content' ? <span className="text-emerald-600 font-bold">Đã chép!</span> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    <p className="whitespace-pre-wrap">{submission.content || '(Học sinh không để lại ghi chú)'}</p>
                  </div>
                </div>
              )}

              {/* TAB 5: ATTEMPT HISTORY TIMELINE */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {/* Overview Stats Card */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-4 sm:p-5 border border-indigo-100/80 shadow-sm">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <History className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm">Lịch sử các lần làm bài tập</h4>
                          <p className="text-xs text-slate-500">Toàn bộ điểm số & tiến trình các lần làm lại được hệ thống lưu trữ tự động</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-white text-indigo-700 font-extrabold text-xs rounded-xl border border-indigo-200 shadow-xs">
                        Tổng cộng: {submission.history && submission.history.length > 0 ? submission.history.length : 1} lần làm
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-indigo-100">
                      <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-indigo-50">
                        <p className="text-[11px] font-bold text-slate-500">Điểm cao nhất (Best)</p>
                        <p className="text-base sm:text-lg font-black text-emerald-600 flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-amber-500 inline" />
                          {submission.bestGrade !== undefined ? `${submission.bestGrade}/10` : (submission.grade !== undefined ? `${submission.grade}/10` : '10/10')}
                        </p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-indigo-50">
                        <p className="text-[11px] font-bold text-slate-500">Lần nộp gần nhất</p>
                        <p className="text-base sm:text-lg font-black text-indigo-600">
                          {submission.grade !== undefined ? `${submission.grade}/10` : 'Chờ chấm'}
                        </p>
                      </div>
                      <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-2xl border border-indigo-50 col-span-2 sm:col-span-1">
                        <p className="text-[11px] font-bold text-slate-500">Tiến trình</p>
                        {(() => {
                          const hist = submission.history || [];
                          if (hist.length >= 2) {
                            const first = hist[0]?.grade ?? 0;
                            const last = submission.grade ?? hist[hist.length - 1]?.grade ?? 0;
                            const diff = +(last - first).toFixed(1);
                            return (
                              <p className={`text-base sm:text-lg font-black flex items-center gap-1 ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <TrendingUp className="w-4 h-4" />
                                {diff >= 0 ? `+${diff} đ` : `${diff} đ`}
                              </p>
                            );
                          }
                          return <p className="text-xs font-bold text-slate-400 mt-1">Lần làm đầu tiên</p>;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Attempts List */}
                  <div className="space-y-3">
                    {(() => {
                      // Construct history items list
                      const historyList: Array<{
                        attemptNumber: number;
                        grade?: number;
                        submittedAt: string;
                        quizDetails?: any;
                        content?: string;
                        resetAt?: string;
                        resetBy?: string;
                      }> = [];

                      if (submission.history && submission.history.length > 0) {
                        submission.history.forEach((h, idx) => {
                          historyList.push({
                            attemptNumber: h.attemptNumber || idx + 1,
                            grade: h.grade,
                            submittedAt: h.submittedAt,
                            quizDetails: h.quizDetails,
                            content: h.content,
                            resetAt: h.resetAt,
                            resetBy: h.resetBy
                          });
                        });
                      } else {
                        // Single default attempt
                        historyList.push({
                          attemptNumber: 1,
                          grade: submission.grade,
                          submittedAt: submission.submittedAt,
                          quizDetails: submission.quizDetails,
                          content: submission.content
                        });
                      }

                      // Sort newest first
                      const sortedAttempts = [...historyList].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                      const highestGrade = Math.max(...historyList.map(h => h.grade ?? 0));

                      return sortedAttempts.map((item, idx) => {
                        const isHighest = item.grade !== undefined && item.grade === highestGrade && highestGrade > 0;
                        const isLatest = idx === 0;

                        return (
                          <div 
                            key={idx}
                            className={`p-4 rounded-3xl border transition-all ${
                              isLatest 
                                ? 'bg-white border-indigo-300 shadow-md ring-1 ring-indigo-200' 
                                : 'bg-slate-50 border-slate-200 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                  isLatest ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  #{item.attemptNumber}
                                </span>
                                <div>
                                  <h5 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                                    <span>Lần làm #{item.attemptNumber}</span>
                                    {isLatest && (
                                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-md">
                                        Mới nhất
                                      </span>
                                    )}
                                    {isHighest && (
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-md flex items-center gap-1">
                                        <Trophy className="w-3 h-3 text-amber-600" />
                                        Điểm cao nhất
                                      </span>
                                    )}
                                  </h5>
                                  <p className="text-[11px] text-slate-400">
                                    Nộp lúc: {item.submittedAt ? format(new Date(item.submittedAt), 'HH:mm - dd/MM/yyyy') : 'Chưa rõ'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className={`text-lg font-black px-3 py-1 rounded-xl border ${
                                  (item.grade ?? 0) >= 8 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : (item.grade ?? 0) >= 5
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}>
                                  {item.grade !== undefined ? `${item.grade} đ` : 'Chờ chấm'}
                                </span>
                              </div>
                            </div>

                            {/* Attempt metadata (e.g. quiz correct count) */}
                            {item.quizDetails && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                <span className="font-semibold flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  Đúng: {item.quizDetails.correctCount || 0}/{item.quizDetails.totalQuestions || 0} câu
                                </span>
                                {item.quizDetails.timeSpentSeconds && (
                                  <span className="font-semibold flex items-center gap-1 text-slate-500">
                                    <Clock className="w-3.5 h-3.5" />
                                    Thời gian làm: {Math.floor(item.quizDetails.timeSpentSeconds / 60)} phút {item.quizDetails.timeSpentSeconds % 60} giây
                                  </span>
                                )}
                              </div>
                            )}

                            {item.resetAt && (
                              <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                🔄 Đã được kích hoạt cho làm lại vào {format(new Date(item.resetAt), 'HH:mm - dd/MM/yyyy')} {item.resetBy ? `bởi ${item.resetBy}` : ''}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN: Teacher's Grading & Feedback Panel (Cols 5 or 4) */}
          <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-6 bg-white flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-6">
            
            <div className="space-y-6">
              
              {/* Grading Form Header */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <span>Bảng chấm điểm & Nhận xét</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đánh giá kết quả và gửi phản hồi cá nhân hóa tới học sinh.
                </p>
              </div>

              {/* 1. Điểm số */}
              <div className="space-y-3">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Điểm số (0 - 10 điểm):
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={gradeInput}
                    onChange={e => setGradeInput(Math.min(10, Math.max(0, Number(e.target.value))))}
                    className="w-28 p-3 text-xl font-black text-center text-indigo-700 bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="text-xs text-slate-500">
                    <p className="font-bold text-slate-700">Thang điểm 10</p>
                    <p className="text-[11px]">Hỗ trợ số thập phân (VD: 8.5, 9.25)</p>
                  </div>
                </div>

                {/* Score Quick Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {scoreChips.map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setGradeInput(score)}
                      className={`px-2.5 py-1 text-xs font-extrabold rounded-xl border transition-all ${
                        gradeInput === score 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {score}đ
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Nhận xét của giáo viên */}
              <div className="space-y-2.5">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Nhận xét & Lời khuyên của Giáo viên:
                </label>

                <textarea
                  rows={4}
                  value={feedbackInput}
                  onChange={e => setFeedbackInput(e.target.value)}
                  placeholder="Nhập nhận xét chi tiết cho học sinh..."
                  className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />

                {/* Quick suggestions */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-bold text-slate-500">💡 Gợi ý nhận xét nhanh:</p>
                  <div className="space-y-1.5">
                    {quickFeedbacks.map((fb, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFeedbackInput(fb)}
                        className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200/70 text-[11px] text-slate-700 font-medium transition-colors line-clamp-1"
                      >
                        {fb}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2.5">
              {isSavedRecently && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã lưu điểm và nhận xét thành công!</span>
                </div>
              )}

              <div className="flex gap-2">
                {isTeacher && onResetSubmission && (
                  <button
                    type="button"
                    onClick={() => onResetSubmission(submission.id)}
                    className="px-4 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-xs sm:text-sm rounded-2xl border border-amber-200 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95"
                    title="Kích hoạt lại trạng thái bài nộp để học sinh có thể làm lại bài tập"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>Cho làm lại</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveGrade}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Lưu kết quả & Gửi nhận xét</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
