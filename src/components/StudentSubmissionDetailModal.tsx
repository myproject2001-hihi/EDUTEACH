import React, { useState, useEffect } from 'react';
import { Assignment, Submission, User, QuizQuestion } from '../types';
import { format } from 'date-fns';
import { MarkdownMath } from './MarkdownMath';
import { UserAvatar } from './UserAvatar';
import { 
  X, Check, CheckCircle2, XCircle, Eye, Download, ZoomIn, ZoomOut, 
  RotateCw, Phone, Copy, FileText, Sparkles, Clock, ChevronLeft, 
  ChevronRight, Send, Award, AlertTriangle, Gamepad2, BookOpen, 
  Camera, HelpCircle, CheckCircle
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
  isTeacher: boolean;
  currentUser: User;
  usersList?: User[];
}

export function StudentSubmissionDetailModal({
  isOpen,
  onClose,
  submission,
  assignment,
  allSubmissions = [],
  onSelectSubmission,
  onGrade,
  isTeacher,
  currentUser,
  usersList = []
}: StudentSubmissionDetailModalProps) {
  if (!isOpen || !submission || !assignment) return null;

  // Find student user info if available
  const studentUser = usersList.find(u => u.id === submission.studentId || (u.name && submission.studentName && u.name.trim().toLowerCase() === submission.studentName.trim().toLowerCase()));

  // Local grading state
  const [gradeInput, setGradeInput] = useState<number>(submission.grade !== undefined ? submission.grade : 10);
  const [feedbackInput, setFeedbackInput] = useState<string>(submission.feedback || '');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
  }, [submission.id, submission.grade, submission.feedback]);

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
    '🌟 Bài làm rất tốt, lập luận rõ ràng và chính xác!',
    '👍 Hoàn thành tốt, chú ý cẩn thận hơn ở các câu tính toán.',
    '💡 Em cần xem lại lời giải chi tiết của những câu làm sai nhé.',
    '👏 Nộp bài đúng hạn, tinh thần tự giác rất đáng khen ngợi!',
    '📝 Chú ý trình bày sạch đẹp và ghi chép cẩn thận hơn.',
    '⚠️ Cần bổ sung thêm bước giải thích cho rõ ràng hơn.'
  ];

  // Quick score options
  const scoreChips = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6, 5];

  // Calculate stats for online test or flashcards
  const quizAnswers = submission.quizAnswers || {};
  const questionsList = assignment.questions || [];
  let correctCount = 0;
  let totalCount = questionsList.length;

  if (assignment.type === 'online_test' && questionsList.length > 0) {
    questionsList.forEach(q => {
      const stuAns = quizAnswers[q.id];
      if (stuAns !== undefined && stuAns === q.correctAnswer) {
        correctCount++;
      }
    });
  } else if (assignment.type === 'flashcard' && assignment.flashcards && assignment.flashcards.length > 0) {
    totalCount = assignment.flashcards.length;
  }

  // Type labels and colors
  const typeMeta: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    online_test: { label: 'Trắc nghiệm Online', icon: FileText, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    flashcard: { label: 'Flashcard Quiz', icon: Sparkles, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
    game: { label: 'Trò chơi tương tác', icon: Gamepad2, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    file_upload: { label: 'Tệp đính kèm / Tự luận', icon: UploadIcon, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
    lesson_check: { label: 'Chụp ảnh vở chép bài', icon: Camera, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    simulation: { label: 'Thí nghiệm mô phỏng', icon: BookOpen, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' }
  };

  function UploadIcon(props: any) {
    return <FileText {...props} />;
  }

  const curTypeMeta = typeMeta[assignment.type] || typeMeta.file_upload;
  const TypeIcon = curTypeMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[94vh] max-h-[900px] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* HEADER BAR */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          
          {/* Left: Student info & navigation */}
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar 
              name={submission.studentName || 'Học sinh'} 
              avatar={studentUser?.avatar} 
              size="md" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                  {submission.studentName || 'Học sinh'}
                </h3>
                {studentUser?.className && (
                  <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 text-[11px] font-bold rounded-lg border border-slate-700">
                    Lớp: {studentUser.className}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                <span>Bài tập:</span>
                <span className="text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-[320px]">
                  {assignment.title}
                </span>
                <span>•</span>
                <Clock className="w-3 h-3 text-slate-400" />
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
          
          {/* LEFT COLUMN: Student's Actual Work Details (Cols 7 or 8) */}
          <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-6 overflow-y-auto custom-scrollbar border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 space-y-6">
            
            {/* 1. TEXT SUBMISSION / NOTES SECTION */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-2.5">
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

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                <p className="whitespace-pre-wrap">{submission.content || '(Học sinh không để lại ghi chú)'}</p>
              </div>
            </div>

            {/* 2. ONLINE TEST QUESTION-BY-QUESTION BREAKDOWN */}
            {assignment.type === 'online_test' && questionsList.length > 0 && (
              <div className="space-y-4">
                {/* Stats Header Bar */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base">Kết quả trắc nghiệm Online</h4>
                    <p className="text-xs text-blue-100 mt-0.5">
                      Học sinh đã trả lời đúng {correctCount} / {questionsList.length} câu hỏi (Tỉ lệ: {Math.round((correctCount / questionsList.length) * 100)}%)
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-center border border-white/20">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-100 block">Điểm tự động</span>
                    <span className="text-xl sm:text-2xl font-black text-white">
                      {((correctCount / questionsList.length) * 10).toFixed(1)} <span className="text-xs font-bold text-blue-100">/ 10</span>
                    </span>
                  </div>
                </div>

                {/* List of Questions */}
                <div className="space-y-3">
                  {questionsList.map((q, idx) => {
                    const stuAns = quizAnswers[q.id];
                    const isAttempted = stuAns !== undefined;
                    const isCorrect = isAttempted && stuAns === q.correctAnswer;

                    return (
                      <div 
                        key={q.id || idx} 
                        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all shadow-sm ${
                          isCorrect ? 'border-emerald-200' : isAttempted ? 'border-rose-200' : 'border-slate-200'
                        }`}
                      >
                        {/* Question Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center border border-indigo-100">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 text-xs">Câu hỏi số {idx + 1}</span>
                          </div>

                          <div>
                            {isAttempted ? (
                              isCorrect ? (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] rounded-lg border border-emerald-200 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" /> Đúng (+{(q.points || (10 / questionsList.length)).toFixed(1)}đ)
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-extrabold text-[11px] rounded-lg border border-rose-200 flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" /> Sai (0đ)
                                </span>
                              )
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 font-bold text-[11px] rounded-lg border border-slate-200">
                                Chưa làm
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium mb-3">
                          <MarkdownMath content={q.question} />
                        </div>

                        {/* Multiple Choice Options */}
                        {q.options && q.options.length > 0 && (
                          <div className="space-y-2 mb-3 pl-1">
                            {q.options.map((opt, optIdx) => {
                              const isStudentPick = stuAns === optIdx;
                              const isKeyCorrect = q.correctAnswer === optIdx;
                              const letter = ['A', 'B', 'C', 'D'][optIdx] || `${optIdx + 1}`;

                              let optionClass = 'bg-slate-50/70 border-slate-200 text-slate-700';
                              let badgeClass = 'bg-slate-200 text-slate-700';

                              if (isKeyCorrect) {
                                optionClass = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold';
                                badgeClass = 'bg-emerald-600 text-white font-bold';
                              } else if (isStudentPick && !isCorrect) {
                                optionClass = 'bg-rose-50 border-rose-300 text-rose-900 font-bold';
                                badgeClass = 'bg-rose-600 text-white font-bold';
                              }

                              return (
                                <div 
                                  key={optIdx} 
                                  className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs transition-colors ${optionClass}`}
                                >
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0 font-extrabold ${badgeClass}`}>
                                    {letter}
                                  </span>
                                  <div className="flex-1 leading-relaxed">
                                    <MarkdownMath content={opt} />
                                  </div>
                                  <div className="shrink-0 flex items-center gap-1.5">
                                    {isStudentPick && (
                                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                        isKeyCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                                      }`}>
                                        Học sinh chọn
                                      </span>
                                    )}
                                    {isKeyCorrect && !isStudentPick && (
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                                        Đáp án đúng
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Detailed Solution / Explanation */}
                        {(q.solutionText || q.method) && (
                          <div className="mt-2.5 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1.5">
                            <p className="font-extrabold text-amber-800 uppercase tracking-wider text-[10px] flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>Hướng dẫn giải chi tiết</span>
                            </p>
                            {q.method && (
                              <div className="text-slate-700">
                                <strong>Phương pháp:</strong> <MarkdownMath content={q.method} />
                              </div>
                            )}
                            {q.solutionText && (
                              <div className="text-slate-700">
                                <MarkdownMath content={q.solutionText} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. FLASHCARD QUIZ DETAILED BREAKDOWN */}
            {assignment.type === 'flashcard' && assignment.flashcards && assignment.flashcards.length > 0 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm sm:text-base">Chi tiết bộ thẻ Flashcard</h4>
                    <p className="text-xs text-purple-100 mt-0.5">
                      Tổng số: {assignment.flashcards.length} thẻ ghi nhớ & kiểm tra trắc nghiệm
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-bold text-white">
                    Điểm số: {submission.grade !== undefined ? `${submission.grade}/10` : 'Hoàn thành'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {assignment.flashcards.map((card, idx) => (
                    <div key={card.id || idx} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 text-xs">
                        <span className="font-bold text-purple-700">Thẻ #{idx + 1}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {card.id || idx + 1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mặt trước (Khái niệm):</span>
                        <div className="text-xs font-bold text-slate-800 mt-0.5">
                          <MarkdownMath content={card.front} />
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mặt sau (Định nghĩa):</span>
                        <div className="text-xs text-slate-700 mt-0.5">
                          <MarkdownMath content={card.back} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. ATTACHED FILE / NOTEBOOK IMAGE VIEWER */}
            {(submission.fileUrl || assignment.type === 'lesson_check' || assignment.type === 'file_upload') && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
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
