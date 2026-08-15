import React, { useState, useEffect } from 'react';
import { Assignment, Submission, User, QuizQuestion, HTMLSimulation } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MarkdownMath } from '../components/MarkdownMath';
import { Plus, Search, Upload, MessageSquare, Check, X, FileText, Send, Clock, BookOpen, AlertTriangle, ExternalLink, Play, Copy, Share2, Eye, RotateCw, ZoomIn, ZoomOut, Download, Phone, MessageCircle, AlertCircle, Gamepad2, Camera, HelpCircle } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { CameraCapture } from '../components/CameraCapture';
import { GamePreview } from '../components/GamePreview';
import { FlashcardPreviewModal } from '../components/FlashcardPreviewModal';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { UserAvatar } from '../components/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { GameWizard } from '../components/GameWizard';
import { FlashcardWizard } from '../components/FlashcardWizard';

interface AssignmentsProps {
  user: User;
  assignments: Assignment[];
  submissions: Submission[];
  onAddAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => void;
  onSubmitWork: (submission: Omit<Submission, 'id' | 'submittedAt'>) => void;
  onGrade: (submissionId: string, grade: number, feedback: string) => void;
  initialSelectedAssignmentId?: string | null;
  onClearInitialSelectedAssignmentId?: () => void;
  simulations?: HTMLSimulation[];
  viewMode?: 'assignments' | 'games' | 'flashcards';
}

export const SAMPLE_TEMPLATES = {
  mau1: `Phần 1. TRẮC NGHIỆM
Câu 1. (VD) Trong cuộc khai thác thuộc địa lần thứ hai ở Đông Dương 1919.1929, thực dân Pháp tập trung đầu tư vào
A. Ngành chế tạo máy.    B. Công nghiệp luyện kim.
C. Đồn điền cao su.     D. Công nghiệp hóa chất.

Lời giải
Phương pháp: SGK Lịch sử 12, trang 76 – 77.
Cách giải: Trong cuộc khai thác thuộc địa lần thứ hai ở Đông Dương (1919-1929), thực dân Pháp tập trung đầu tư vào đồn điền cao su.
Chọn C

Câu 2. (NB) Nội dung nào sau đây phản ánh đúng tình hình Việt Nam sau Hiệp định Giơnevơ năm 1954 về Đông Dương?
A. Đất nước tạm thời bị chia cắt làm hai miền Nam, Bắc.
B. Miền Bắc chưa được giải phóng.
C. Miền Nam đã được giải phóng.
D. Cả nước được giải phóng và tiến lên xây dựng chủ nghĩa xã hội.

Lời giải
Phương pháp: SGK Lịch sử 12, trang 157 – 158.
Cách giải: Đất nước tạm thời bị chia cắt làm hai miền Nam, Bắc là nội dung phản ánh đúng tình hình Việt Nam sau Hiệp định Giơnevơ năm 1954 về Đông Dương.
Chọn A

Câu 3. Trong Đông . Xuân 1953.1954, bộ đội chủ lực Việt Nam mở chiến dịch tiến công quân Pháp ở
A. Đông Khê.    B. Thái Nguyên.    C. Thị xã Lai Châu.    D. Quảng Trị.
Chọn C`,

  mau2: `PHẦN I. Câu trắc nghiệm với nhiều phương án lựa chọn. Thí sinh trả lời từ câu 1 đến câu 12. Mỗi câu hỏi, thí sinh chỉ chọn một phương án.
Câu 1: Phát biểu nào sau đây là mệnh đề?
A. Hà Nội là thủ đô của Việt Nam.
B. Ước gì hôm nay trời không mưa!
C. \\(x + 5 = 8\\).
D. Con mèo này thật đáng yêu!

PHẦN II. Câu trắc nghiệm đúng sai. Thí sinh trả lời từ câu 13 đến câu 14. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai
Câu 13: Cho các tập hợp \\(A = \\{x \\in \\mathbb{R} \\mid 1 - 2x \\leq 0\\}\\), \\(B = (-3; 3)\\), \\(C = \\{1; 3\\}\\), \\(D = \\{1; 2; 3; 4; 5\\}\\).
a) \\(A \\cap B = [\\frac{1}{2}; 3)\\).
b) \\(C \\subset B\\).
c) \\(D \\setminus A = \\emptyset\\).
d) Có tất cả 3 tập hợp X thỏa mãn \\(C \\cup X = D\\).

PHẦN III. Câu trắc nghiệm trả lời ngắn. Thí sinh trả lời từ câu 15 đến câu 18.
Câu 15: Cho hai tập hợp \\(A = \\{x \\in \\mathbb{N} \\mid 3 \\leq x \\leq 11\\}\\) và \\(B = \\{x \\in \\mathbb{Z} \\mid -3 \\leq x < 6\\}\\). Tìm số phần tử của \\(A \\cup B\\).
------HẾT------
Hướng dẫn giải
PHẦN I.
Câu 1:
- Phát biểu A là một mệnh đề vì nó là một khẳng định có tính đúng, sai.
Đáp án đúng là: A.

PHẦN II.
Câu 13:
Đáp án đúng là: Đúng - Sai - Đúng - Sai.

PHẦN III.
Câu 15:
Đáp án đúng là: 15.`,

  mau3: `Phần 2. ĐIỀN TỪ / NGẮN
Câu 1. (TH) Điền từ thích hợp vào chỗ trống: Đồ thị hàm số bậc hai y = ax² + bx + c là một đường [...] có đỉnh I(-b/2a; -Δ/4a).
A. Parabol    B. Tròn    C. Elip    D. Thẳng

Lời giải
Cách giải: Đồ thị hàm số bậc hai luôn là một đường Parabol.
Chọn A`,

  mau4: `Phần 1. TRẮC NGHIỆM LÝ THUYẾT
Câu 1. (NB) Vectơ chỉ phương của đường thẳng d: 2x - 3y + 5 = 0 là:
A. u = (3; 2)    B. u = (2; -3)
C. u = (-3; 2)   D. u = (2; 3)

Lời giải
Cách giải: VTCP vuông góc với VTPT n = (2; -3) => u = (3; 2).
Chọn A`,

  mau5: `Phần 3. CÂU HỎI ĐÚNG - SAI
Câu 1. Cho tam giác ABC vuông tại A. Các khẳng định sau đây đúng hay sai?
a) Tích vô hướng của vectơ AB và AC bằng 0.
b) Tích vô hướng của vectơ AB và BC bằng 0.
c) Độ dài vectơ AB + AC bằng độ dài BC.
d) Tam giác ABC cân tại A nếu AB = AC.
A. a-Đúng, b-Sai, c-Đúng, d-Đúng
B. Tất cả đều Đúng
C. Tất cả đều Sai
D. a-Sai, b-Đúng, c-Sai, d-Đúng

Lời giải
Chọn A`
};

export interface ParsedQuestionItem {
  id: string;
  numStr: string;
  levelBadge: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[]; // for ABCD
  subOptions?: string[]; // for abcd
  correctAnswer?: number | string | number[]; 
  points: number;
  method?: string;
  solutionText?: string;
  groupTitle?: string;
}

export function parseRawCodeToQuestions(rawText: string): { groupTitle: string; parsedQuestions: ParsedQuestionItem[] } {
  // Remove ------HẾT------ line completely so it doesn't render in the question
  rawText = rawText.replace(/^\s*[-]+HẾT[-]+\s*$/gim, '');
  let initialGroupTitle = 'Phần 1. TRẮC NGHIỆM';
  const lines = rawText.split('\n');
  
  for (const line of lines) {
    if (line.trim().toLowerCase().startsWith('phần ')) {
      initialGroupTitle = line.trim();
      break;
    }
  }

  const questionsList: ParsedQuestionItem[] = [];
  const rawChunks = rawText.split(/(?=^Câu\s+\d+[\.:])/im);
  let currentGroupTitle = initialGroupTitle;

  rawChunks.forEach((chunk, index) => {
    if (index === 0) {
      const matches = chunk.match(/^Phần\s+[^\n]+/igm);
      if (matches) currentGroupTitle = matches[matches.length - 1].trim();
      return;
    }

    if (!chunk.toLowerCase().includes('câu ')) return;

    const qNumMatch = chunk.match(/^Câu\s+(\d+)[\.:]/im);
    const qNum = qNumMatch ? qNumMatch[1] : `${index + 1}`;
    const numStr = `Câu ${qNum}.`;

    const existingQ = questionsList.find(q => q.numStr === numStr);
    
    if (existingQ) {
      const dapAnMatch = chunk.match(/Đáp án đúng là:\s*([^\n]+)/i);
      if (dapAnMatch) {
        const dapAnText = dapAnMatch[1].trim().replace(/\.$/, '').trim();
        if (existingQ.type === 'multiple_choice') {
          const char = dapAnText.toUpperCase();
          if (char === 'A') existingQ.correctAnswer = 0;
          if (char === 'B') existingQ.correctAnswer = 1;
          if (char === 'C') existingQ.correctAnswer = 2;
          if (char === 'D') existingQ.correctAnswer = 3;
        } else if (existingQ.type === 'true_false') {
          const parts = dapAnText.split(/[-–—,]/).map(p => p.trim().toLowerCase());
          const tfAnswers = [];
          for (let i = 0; i < 4; i++) {
             if (parts[i] === 'đúng') tfAnswers.push(1);
             else if (parts[i] === 'sai') tfAnswers.push(0);
             else tfAnswers.push(0);
          }
          existingQ.correctAnswer = tfAnswers;
        } else if (existingQ.type === 'short_answer') {
          existingQ.correctAnswer = dapAnText;
        }
      }
      
      let solText = chunk.replace(/^Câu\s+\d+[\.:]/im, '').trim();
      if (dapAnMatch) {
        solText = solText.replace(dapAnMatch[0], '').trim();
      }
      if (solText) {
        // Remove trailing PHẦN headers (match PHẦN I, II, III at start of line)
        solText = solText.replace(/(^|\n)\s*PHẦN\s+[IVX]+[\s\S]*$/i, '').trim();
        // Remove leading dashes or whitespace
        solText = solText.replace(/^[-–—]\s*/, '').trim();
        existingQ.solutionText = solText;
      }
      return;
    }

    let levelBadge = 'VD';
    if (chunk.includes('(NB)')) levelBadge = 'NB';
    else if (chunk.includes('(TH)')) levelBadge = 'TH';
    else if (chunk.includes('(VD)')) levelBadge = 'VD';
    else if (chunk.includes('(VDC)')) levelBadge = 'VDC';

    let questionText = '';
    const qLineMatch = chunk.match(/^Câu\s+\d+[\.:]\s*(\([A-Z]+\))?\s*([^\n]+)/im);
    if (qLineMatch) {
      questionText = qLineMatch[2].trim();
    }
    
    // We need to capture lines between Question and Options or Solutions
    const questionLines = [];
    const clines = chunk.split('\n');
    let captureQ = false;
    for (const l of clines) {
       if (l.match(/^Câu\s+\d+[\.:]/i)) {
         captureQ = true;
         continue; // We already have the first line
       }
       if (l.match(/^[A-D][\.:]/i) || l.match(/^[a-d][\)\.]/i) || l.match(/^Lời giải/i) || l.match(/^Hướng dẫn giải/i) || l.match(/^Phần/i)) {
         captureQ = false;
       }
       if (captureQ && l.trim()) {
         questionLines.push(l.trim());
       }
    }
    if (questionLines.length > 0) {
      questionText += '\n' + questionLines.join('\n');
    }

    let type: 'multiple_choice' | 'true_false' | 'short_answer' = 'short_answer';
    let points = 0.5;
    const options: string[] = ['', '', '', ''];
    const subOptions: string[] = ['', '', '', ''];

    const optAMatch = chunk.match(/A[\.:]\s*([^\n\t]+)/i);
    const optBMatch = chunk.match(/B[\.:]\s*([^\n\t]+)/i);
    
    const subAMatch = chunk.match(/a[\)\.]\s*([^\n\t]+)/i);
    const subBMatch = chunk.match(/b[\)\.]\s*([^\n\t]+)/i);

    if (optAMatch && optBMatch) {
      type = 'multiple_choice';
      points = 0.25;
      options[0] = optAMatch[1].trim();
      options[1] = optBMatch[1].trim();
      const optCMatch = chunk.match(/C[\.:]\s*([^\n\t]+)/i);
      if (optCMatch) options[2] = optCMatch[1].trim();
      const optDMatch = chunk.match(/D[\.:]\s*([^\n\t]+)/i);
      if (optDMatch) options[3] = optDMatch[1].trim();
      
      // Clean options from trailing spaces and next options
      for (let i = 0; i < 4; i++) {
         options[i] = options[i].replace(/\s+[A-D][\.:].*/, '').trim();
      }
    } else if (subAMatch && subBMatch) {
      type = 'true_false';
      points = 1.0;
      subOptions[0] = subAMatch[1].trim();
      subOptions[1] = subBMatch[1].trim();
      const subCMatch = chunk.match(/c[\)\.]\s*([^\n\t]+)/i);
      if (subCMatch) subOptions[2] = subCMatch[1].trim();
      const subDMatch = chunk.match(/d[\)\.]\s*([^\n\t]+)/i);
      if (subDMatch) subOptions[3] = subDMatch[1].trim();
    }

    let correctAnswer: number | string | number[] | undefined = undefined;
    const selectMatch = chunk.match(/Chọn\s+([A-D])/i);
    const dapAnMatch = chunk.match(/Đáp án đúng là:\s*([^\n]+)/i);

    if (selectMatch && type === 'multiple_choice') {
      const char = selectMatch[1].toUpperCase();
      if (char === 'A') correctAnswer = 0;
      if (char === 'B') correctAnswer = 1;
      if (char === 'C') correctAnswer = 2;
      if (char === 'D') correctAnswer = 3;
    } else if (dapAnMatch) {
      const dapAnText = dapAnMatch[1].trim().replace(/\.$/, '').trim();
      
      if (type === 'multiple_choice') {
        const char = dapAnText.toUpperCase();
        if (char === 'A') correctAnswer = 0;
        if (char === 'B') correctAnswer = 1;
        if (char === 'C') correctAnswer = 2;
        if (char === 'D') correctAnswer = 3;
      } else if (type === 'true_false') {
        const parts = dapAnText.split(/[-–—,]/).map(p => p.trim().toLowerCase());
        const tfAnswers = [];
        for (let i = 0; i < 4; i++) {
           if (parts[i] === 'đúng') tfAnswers.push(1);
           else if (parts[i] === 'sai') tfAnswers.push(0);
           else tfAnswers.push(0);
        }
        correctAnswer = tfAnswers;
      } else if (type === 'short_answer') {
        correctAnswer = dapAnText;
      }
    }

    let method = '';
    let solutionText = '';
    const methodMatch = chunk.match(/Phương pháp:\s*([^\n]+)/i);
    if (methodMatch) method = methodMatch[1].trim();
    const solutionMatch = chunk.match(/Cách giải:\s*([^\n]+)/i);
    if (solutionMatch) solutionText = solutionMatch[1].trim();

    if (!questionText) {
      questionText = 'Nội dung câu hỏi chưa được định dạng đúng';
    }

    questionsList.push({
      id: `parsed_q_${index}_${Date.now()}`,
      numStr,
      levelBadge,
      question: questionText,
      type,
      options,
      subOptions,
      correctAnswer,
      points,
      method,
      solutionText,
      groupTitle: currentGroupTitle
    });

    const matches = chunk.match(/^Phần\s+[^\n]+/igm);
    if (matches) currentGroupTitle = matches[matches.length - 1].trim();
  });

  return { groupTitle: initialGroupTitle, parsedQuestions: questionsList };
}

export function AssignmentsView({ 
  user, 
  assignments: rawAssignments, 
  submissions, 
  onAddAssignment, 
  onSubmitWork, 
  onGrade,
  initialSelectedAssignmentId,
  onClearInitialSelectedAssignmentId,
  simulations,
  viewMode = 'assignments'
}: AssignmentsProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  // Filter assignments: Teacher only sees & manages assignments they created, Admin sees all
  const assignments = React.useMemo(() => {
    let filtered = rawAssignments;
    if (viewMode === 'games') {
      filtered = rawAssignments.filter(a => a.type === 'game');
    } else if (viewMode === 'flashcards') {
      filtered = rawAssignments.filter(a => a.type === 'flashcard');
    } else {
      // viewMode === 'assignments', show file_upload, online_test, simulation
      filtered = rawAssignments.filter(a => a.type !== 'game' && a.type !== 'flashcard');
    }

    if (isAdmin) return filtered;
    if (user.role === 'teacher') {
      return filtered.filter(a => !a.teacherId || a.teacherId === user.id);
    }
    return filtered;
  }, [rawAssignments, user, isAdmin, viewMode]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(assignments[0] || null);

  // Unsubmitted students modal state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [unsubmittedModalAssignment, setUnsubmittedModalAssignment] = useState<Assignment | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setUsersList(list);
    });
    return () => unsub();
  }, []);



  // Teacher Create Assignment Form State
  const [newType, setNewType] = useState<'file_upload' | 'online_test' | 'simulation' | 'game' | 'flashcard' | 'lesson_check'>('file_upload');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('Đại số 10 - Tiết 23');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newSimUrl, setNewSimUrl] = useState('');
  const [selectedSimId, setSelectedSimId] = useState<string>('');
  const [newGameType, setNewGameType] = useState('quiz_nghieng_dau');
  const [gameSubStep, setGameSubStep] = useState<1 | 2 | 3>(1);
  const [flashcardSubStep, setFlashcardSubStep] = useState<1 | 2>(1);
  const [selectedGameCategory, setSelectedGameCategory] = useState<string>('all');
  const [gameSearchQuery, setGameSearchQuery] = useState<string>('');
  const [newGameFormats, setNewGameFormats] = useState<string[]>(['multiple_choice', 'true_false']);
  const [newFlashcards, setNewFlashcards] = useState<{id: string, front: string, back: string}[]>([{ id: Date.now().toString(), front: '', back: '' }]);
  const [showGamePreview, setShowGamePreview] = useState(false);
  const [showFlashcardPreview, setShowFlashcardPreview] = useState(false);
  const [newIsMandatory, setNewIsMandatory] = useState(false);

  // Online test raw code input (Azota style)
  const [rawQuestionCode, setRawQuestionCode] = useState<string>(SAMPLE_TEMPLATES.mau2);

  // Online test questions creation (Azota style)
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q1',
      question: 'Câu 1: Cho phương trình x² - 5x + 6 = 0. Nghiệm của phương trình là?',
      options: ['x = 2 hoặc x = 3', 'x = -2 hoặc x = -3', 'x = 1 hoặc x = 6', 'Vô nghiệm'],
      correctAnswer: 0,
      points: 5.0
    },
    {
      id: 'q2',
      question: 'Câu 2: Công thức tính biệt thức Delta (Δ) của phương trình bậc 2 ax² + bx + c = 0 là?',
      options: ['b² - 4ac', 'b² + 4ac', '4ac - b²', '2b - ac'],
      correctAnswer: 0,
      points: 5.0
    }
  ]);

  // Student Online Test Answer State
  const [studentQuizAnswers, setStudentQuizAnswers] = useState<Record<string, number>>({});
  const [showCamera, setShowCamera] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [mobileExamTab, setMobileExamTab] = useState<'questions' | 'bubble'>('questions');
  const [submitContent, setSubmitContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Azota Exam States
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [examTimeRemaining, setExamTimeRemaining] = useState(900); // 15 mins (900s)
  const [isNotFullscreen, setIsNotFullscreen] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showStandardSubmitModal, setShowStandardSubmitModal] = useState(false);
  const [showDisqualifiedModal, setShowDisqualifiedModal] = useState(false);

  const lastViolationTimeRef = React.useRef(0);

  // Monitor tabSwitchCount to terminate exam when reaching or exceeding 3 violations
  useEffect(() => {
    if (isExamStarted && tabSwitchCount >= 3) {
      setIsExamStarted(false);
      exitFullscreen();
      setShowCheatWarning(false);
      setIsNotFullscreen(false);

      let earnedPoints = 0;
      if (selectedAssignment?.questions) {
        selectedAssignment.questions.forEach(q => {
          if (studentQuizAnswers[q.id] === q.correctAnswer) {
            earnedPoints += q.points;
          }
        });
      }

      onSubmitWork({
        assignmentId: selectedAssignment!.id,
        studentId: user.id,
        studentName: user.name,
        content: `ĐÌNH CHỈ THI (Vi phạm chuyển tab hoặc rời toàn màn hình quá 3 lần). Giám sát: Đã ghi nhận 3/3 lần vi phạm.`,
        quizAnswers: studentQuizAnswers,
        grade: earnedPoints
      });

      setTabSwitchCount(0);
      setShowDisqualifiedModal(true);
    }
  }, [tabSwitchCount, isExamStarted, selectedAssignment, studentQuizAnswers, user, onSubmitWork]);

  useEffect(() => {
    if (initialSelectedAssignmentId) {
      const found = assignments.find(a => a.id === initialSelectedAssignmentId);
      if (found) {
        setSelectedAssignment(found);
      }
      if (onClearInitialSelectedAssignmentId) {
        onClearInitialSelectedAssignmentId();
      }
    }
  }, [initialSelectedAssignmentId, assignments, onClearInitialSelectedAssignmentId]);

  useEffect(() => {
    setIsExamStarted(false);
    setTabSwitchCount(0);
    setShowCheatWarning(false);
    setIsNotFullscreen(false);
    setExamTimeRemaining(900);
  }, [selectedAssignment]);

  useEffect(() => {
    let timerInterval: any = null;
    if (isExamStarted && examTimeRemaining > 0) {
      timerInterval = setInterval(() => {
        setExamTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            handleAutoSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isExamStarted, examTimeRemaining]);

  const enterFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        await (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).mozRequestFullScreen) {
        await (docEl as any).mozRequestFullScreen();
      } else if ((docEl as any).msRequestFullscreen) {
        await (docEl as any).msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request failed (likely blocked inside an iframe):", err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen exit failed:", err);
    }
  };

  useEffect(() => {
    if (!isExamStarted) return;

    const recordViolation = () => {
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 2000) {
        return; // Ignore duplicates within 2 seconds
      }
      lastViolationTimeRef.current = now;

      setTabSwitchCount(prev => {
        const nextCount = prev + 1;
        setShowCheatWarning(true);
        return nextCount;
      });
    };

    const handleBlur = () => {
      recordViolation();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation();
      }
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        setIsNotFullscreen(true);
        recordViolation();
      } else {
        setIsNotFullscreen(false);
      }
    };

    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isExamStarted]);

  const handleAutoSubmitExam = () => {
    setIsExamStarted(false);
    exitFullscreen();
    let earnedPoints = 0;
    if (selectedAssignment?.questions) {
      selectedAssignment.questions.forEach(q => {
        if (studentQuizAnswers[q.id] === q.correctAnswer) {
          earnedPoints += q.points;
        }
      });
    }
    onSubmitWork({
      assignmentId: selectedAssignment!.id,
      studentId: user.id,
      studentName: user.name,
      content: `Nộp bài tự động (Hết giờ làm bài). Giám sát: Phát hiện chuyển tab hoặc rời màn hình ${tabSwitchCount} lần.`,
      quizAnswers: studentQuizAnswers,
      grade: earnedPoints
    });
    setTabSwitchCount(0);
    setIsNotFullscreen(false);
  };

  const handleManualSubmitExam = () => {
    setIsExamStarted(false);
    exitFullscreen();
    let earnedPoints = 0;
    if (selectedAssignment?.questions) {
      selectedAssignment.questions.forEach(q => {
        if (studentQuizAnswers[q.id] === q.correctAnswer) {
          earnedPoints += q.points;
        }
      });
    }
    onSubmitWork({
      assignmentId: selectedAssignment!.id,
      studentId: user.id,
      studentName: user.name,
      content: `Đã hoàn thành làm bài trắc nghiệm trực tuyến. Giám sát: Ghi nhận ${tabSwitchCount} lần chuyển tab hoặc rời toàn màn hình.`,
      quizAnswers: studentQuizAnswers,
      grade: earnedPoints
    });
    setTabSwitchCount(0);
    setIsNotFullscreen(false);
  };

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Grading State for Teacher
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeValue, setGradeValue] = useState<number>(0);
  const [feedbackValue, setFeedbackValue] = useState<string>('');

  const handleImportFlashcards = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const newCards = lines.map((line, index) => {
        // Handle common delimiters: tab, or dash, or comma
        let separator = ',';
        if (line.includes('\t')) separator = '\t';
        else if (line.includes(' - ')) separator = ' - ';
        else if (line.includes('-')) separator = '-';

        const parts = line.split(separator);
        const front = parts[0]?.trim() || `Thẻ ${index + 1}`;
        const back = parts.slice(1).join(separator)?.trim() || '';
        return {
          id: `fc_${Date.now()}_${index}`,
          front,
          back
        };
      });
      if (newCards.length > 0) {
        setNewFlashcards(newCards);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleDownloadSampleFlashcards = () => {
    const sampleContent = `Apple - Quả táo
Banana - Quả chuối
Cat - Con mèo
Dog - Con chó
Elephant - Con voi
1 + 1 = ? - Bằng 2
Thành phố thủ đô của Việt Nam? - Hà Nội`;
    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_nhap_flashcard.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateAssignment = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    let finalQuestions = questions;
    if (newType === 'online_test' || newType === 'game' || newType === 'flashcard') {
      const { parsedQuestions } = parseRawCodeToQuestions(rawQuestionCode);
      if (parsedQuestions.length > 0) {
        finalQuestions = parsedQuestions.map((pq, idx) => ({
          id: `q_${idx}_${Date.now()}`,
          numStr: pq.numStr,
          question: pq.question,
          type: pq.type,
          options: pq.options,
          subOptions: pq.subOptions,
          correctAnswer: pq.correctAnswer,
          points: pq.points || 0.25,
          method: pq.method,
          solutionText: pq.solutionText
        }));
      }
    }

    onAddAssignment({
      title: newTitle || (newType === 'game' ? 'Game Học Tập' : newType === 'flashcard' ? 'Bộ Flashcard' : 'Bài tập buổi học mới'),
      description: newDescription || 'Các em hoàn thành bài tập đầy đủ đúng hạn trước khi vào giờ học tiếp theo.',
      dueDate: newDueDate || new Date(Date.now() + 86400000 * 2).toISOString(),
      classSessionTitle: newSessionTitle,
      type: newType,
      pdfUrl: newPdfUrl || undefined,
      simulationUrl: newSimUrl || undefined,
      gameType: newType === 'game' ? newGameType : undefined,
      gameFormats: newType === 'game' ? newGameFormats : undefined,
      isMandatory: newIsMandatory,
      flashcards: newType === 'flashcard' ? newFlashcards : undefined,
      questions: (newType === 'online_test' || newType === 'game' || newType === 'flashcard') ? finalQuestions : undefined,
    });
    setShowCreateModal(false);
    setCreateStep(1);
    // Reset
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setNewIsMandatory(false);
    setNewGameType('quiz_nghieng_dau');
    setGameSubStep(1);
    setFlashcardSubStep(1);
    setNewGameFormats(['multiple_choice', 'true_false']);
  };

  const handleStudentSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAssignment) return;

    let autoGrade: number | undefined = undefined;
    if ((selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') && selectedAssignment.questions) {
      let earnedPoints = 0;
      selectedAssignment.questions.forEach(q => {
        if (studentQuizAnswers[q.id] === q.correctAnswer) {
          earnedPoints += q.points;
        }
      });
      autoGrade = earnedPoints;
    }

    onSubmitWork({
      assignmentId: selectedAssignment.id,
      studentId: user.id,
      studentName: user.name,
      content: submitContent || ((selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') ? 'Đã hoàn thành bài làm trực tuyến.' : 'Đã nộp bài đầy đủ.'),
      fileUrl: uploadedFileUrl || uploadedFileName || (selectedAssignment.type === 'file_upload' ? 'bailam_hocsinh.pdf' : undefined),
      quizAnswers: (selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') ? studentQuizAnswers : undefined,
      grade: autoGrade
    });

    setSubmitContent('');
    setUploadedFileName(null);
    setUploadedFileUrl(null);
  };



  const handleDownloadFile = (sub: Submission) => {
    if (!sub.fileUrl) return;
    if (sub.fileUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = sub.fileUrl;
      link.download = sub.fileUrl.startsWith('data:image/') ? 'baitap_hocsinh.png' : 'baitap_hocsinh.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      let content = '';
      let mimeType = 'text/plain';
      let fileName = sub.fileUrl;
      
      if (sub.fileUrl.endsWith('.pdf')) {
        content = `%PDF-1.4\n% MOCK PDF FILE REPRESENTING SUBMISSION FOR ${sub.studentName}\n% Assignment: ${selectedAssignment?.title || 'Toán học'}\n% Score: ${sub.grade || 'Chưa chấm'}\n\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 60 >>\nstream\nBT /F1 12 Tf 50 700 Td (${sub.studentName} - Diem: ${sub.grade || 'N/A'}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000018 00000 n\n0000000069 00000 n\n0000000120 00000 n\n0000000201 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n310\n%%EOF`;
        mimeType = 'application/pdf';
      } else if (sub.fileUrl.endsWith('.jpg') || sub.fileUrl.endsWith('.jpeg') || sub.fileUrl.endsWith('.png')) {
        content = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
          <rect width="100%" height="100%" fill="#FAF9F5"/>
          <text x="50" y="80" font-family="sans-serif" font-size="24" font-weight="bold" fill="#1e293b">BÀI LÀM: KHẢO SÁT HÀM SỐ PARABOL</text>
          <text x="50" y="120" font-family="sans-serif" font-size="16" fill="#475569">Học sinh: ${sub.studentName || 'Lê Thị Bình'}</text>
          <text x="50" y="150" font-family="sans-serif" font-size="16" fill="#475569">Điểm số: ${sub.grade || 'N/A'}/10</text>
          <text x="50" y="200" font-family="sans-serif" font-size="14" fill="#334155">Nội dung đã nộp: ${sub.content}</text>
        </svg>`;
        mimeType = 'image/svg+xml';
        if (!fileName.endsWith('.svg')) {
          fileName = fileName.substring(0, fileName.lastIndexOf('.')) + '.svg';
        }
      } else {
        content = `Bài làm của học sinh: ${sub.studentName}\nNội dung: ${sub.content}\nTên tệp đính kèm: ${sub.fileUrl}`;
        mimeType = 'text/plain';
      }
      
      const blob = new Blob([content], { type: mimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    }
  };

  if (selectedAssignment && (selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') && isExamStarted) {
    return (
      <div className="fixed inset-0 bg-[#F4F6F9] z-[9999] overflow-hidden flex flex-col h-screen w-screen">
        {/* Header Exam */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white font-black text-xl tracking-tight">
              {selectedAssignment.type === 'game' ? 'Trò Chơi Học Tập' : selectedAssignment.type === 'flashcard' ? 'Thẻ Ghi Nhớ' : 'Hệ Thống Đề Thi Trắc Nghiệm'}
            </span>
            <div className="h-4 w-[1px] bg-emerald-600/60 hidden sm:block"></div>
            <span className="text-xs font-semibold bg-emerald-700/60 px-2.5 py-1 rounded-lg border border-emerald-600/30 text-emerald-100 hidden sm:inline-block">
              🟢 Đang giám sát thí sinh
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-emerald-950 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-amber-300 border border-emerald-700/40">
              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              {formatTimeRemaining(examTimeRemaining)}
            </div>
            
            <button 
              type="button"
              onClick={() => setShowSubmitConfirmModal(true)}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all uppercase"
            >
              Nộp bài
            </button>
          </div>
        </div>

        {/* Monitor sub header */}
        <div className="bg-white px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-medium text-slate-500 shrink-0">
          <p>Thí sinh: <strong className="text-slate-800">{user.name}</strong></p>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <p className="flex items-center gap-1">
              Cảnh báo: 
              <span className={`px-2 py-0.5 rounded font-black ${tabSwitchCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                {tabSwitchCount} / 3
              </span>
            </p>
          </div>
        </div>

        {/* Mobile / Tablet View Switcher */}
        <div className="lg:hidden bg-slate-100 p-1.5 border-b border-slate-200 flex gap-2 shrink-0 px-4">
          <button
            type="button"
            onClick={() => setMobileExamTab('questions')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              mobileExamTab === 'questions'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>📝</span> Đề Bài ({selectedAssignment.questions?.length || 0} câu)
          </button>
          <button
            type="button"
            onClick={() => setMobileExamTab('bubble')}
            className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
              mobileExamTab === 'bubble'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>🔘</span> Phiếu Làm Bài ({Object.keys(studentQuizAnswers).length}/{selectedAssignment.questions?.length || 0})
          </button>
        </div>

        {/* Main content pane */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          
          {/* Left Column: Questions List (Đề bài) */}
          <div className={`lg:col-span-2 p-4 sm:p-6 overflow-y-auto space-y-6 bg-white h-full ${
            mobileExamTab === 'questions' ? 'block' : 'hidden lg:block'
          }`}>
            {selectedAssignment.questions?.map((q, idx) => (
              <div key={q.id} className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Câu hỏi {idx + 1} ({q.points}đ)</span>
                </div>
                
                <div className="text-sm font-serif text-slate-800 leading-relaxed pl-1">
                  {q.numStr && <span className="font-bold mr-2">{q.numStr}</span>}
                  <MarkdownMath content={q.question} />
                  {q.type === 'multiple_choice' && q.options && (
                    <div className="mt-3 space-y-3 pl-2">
                      {q.options.map((opt, optIdx) => opt && (
                        <div key={optIdx} className="flex gap-2 items-start">
                          <span className="font-bold shrink-0">{['A.', 'B.', 'C.', 'D.'][optIdx]}</span>
                          <MarkdownMath content={opt} />
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'true_false' && q.subOptions && (
                    <div className="mt-3 space-y-3 pl-2">
                      {q.subOptions.map((opt, optIdx) => opt && (
                        <div key={optIdx} className="flex gap-2 items-start">
                          <span className="font-bold shrink-0">{['a)', 'b)', 'c)', 'd)'][optIdx]}</span>
                          <MarkdownMath content={opt} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 italic pl-1 flex items-center gap-1">
                  <span>✨ Mã đề gv đã add code - công thức hiển thị không lỗi</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Bubble Sheet (Phiếu trả lời) */}
          <div className={`p-4 sm:p-6 overflow-y-auto bg-slate-50 flex flex-col justify-between h-full ${
            mobileExamTab === 'bubble' ? 'block' : 'hidden lg:block'
          }`}>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Phiếu Trả Lời Trắc Nghiệm</p>
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">Tự động lưu</span>
              </div>

              <div className="space-y-4">
                {selectedAssignment.questions?.map((q, idx) => (
                  <div key={q.id} className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                    <p className="text-xs font-bold text-slate-700">Câu {idx + 1}:</p>
                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {['A', 'B', 'C', 'D'].map((optLabel, optIdx) => {
                        const isSelected = studentQuizAnswers[q.id] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              setStudentQuizAnswers({
                                ...studentQuizAnswers,
                                [q.id]: optIdx
                              });
                            }}
                            className={`flex-1 max-w-[50px] h-10 rounded-xl border-2 font-black text-xs transition-all flex items-center justify-center ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100 scale-105'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {optLabel}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 italic font-medium truncate">
                      {studentQuizAnswers[q.id] !== undefined 
                        ? `Đã chọn: ${['A', 'B', 'C', 'D'][studentQuizAnswers[q.id]]}` 
                        : 'Chưa trả lời'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
              <p className="leading-normal font-semibold text-emerald-800">
                Giám sát thông minh đang hoạt động. Vui lòng không rời trình duyệt!
              </p>
            </div>
          </div>

        </div>

        {/* Anti Cheat warning modal overlay */}
        {showCheatWarning && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border-2 border-red-500 max-w-sm w-full p-5 shadow-2xl space-y-4">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100 shadow-sm shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce" />
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black text-red-600 tracking-tight">CẢNH BÁO GIÁM SÁT THI</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  {isNotFullscreen ? 'ĐÃ THOÁT CHẾ ĐỘ TOÀN MÀN HÌNH!' : 'Hệ thống phát hiện chuyển tab hoặc rời màn hình!'}
                </p>
              </div>

              <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-red-900 leading-normal">
                  {isNotFullscreen 
                    ? 'Bạn vừa thoát khỏi chế độ toàn màn hình. Để tiếp tục làm bài thi, bạn BẮT BUỘC phải bật lại chế độ toàn màn hình.'
                    : 'Hành vi rời khỏi màn hình làm bài thi đã bị tự động ghi nhận và gửi báo cáo trực tiếp về tài khoản của Giáo viên.'}
                </p>
                <div className="mt-3 inline-block bg-red-600 text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-sm">
                  Số lần vi phạm: {tabSwitchCount} / 3
                </div>
              </div>

              {isNotFullscreen ? (
                <button
                  type="button"
                  onClick={async () => {
                    await enterFullscreen();
                    setShowCheatWarning(false);
                    setIsNotFullscreen(false);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-md uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  Quay lại toàn màn hình để làm bài
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCheatWarning(false)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md uppercase tracking-wide"
                >
                  Tôi đã hiểu & cam kết tiếp tục làm bài
                </button>
              )}
            </div>
          </div>
        )}
        {/* Center-Zoom Confirm Modal for Submitting Exam */}
        <ConfirmModal
          isOpen={showSubmitConfirmModal}
          onClose={() => setShowSubmitConfirmModal(false)}
          onConfirm={() => {
            handleManualSubmitExam();
            setShowSubmitConfirmModal(false);
          }}
          title="Xác nhận nộp bài thi"
          message="Bạn có chắc chắn muốn nộp bài thi ngay bây giờ? Sau khi nộp bài, câu trả lời sẽ được gửi trực tiếp cho giáo viên và không thể sửa đổi."
          confirmText="Nộp bài ngay"
          cancelText="Tiếp tục làm bài"
          variant="info"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Bài Tập Sau Buổi Học</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTeacher 
              ? 'Nơi tạo bài tập trắc nghiệm online, PDF, bài thực hành và quản lý tình trạng làm bài' 
              : 'Nơi học sinh làm bài tập từ giáo viên, bắt buộc phải hoàn thành trước buổi học tiếp theo'}
          </p>
        </div>

        {isTeacher && (
          <button 
            onClick={() => {
              // Reset type and fields on open
              setNewType(viewMode === 'games' ? 'game' : viewMode === 'flashcards' ? 'flashcard' : 'file_upload');
              setNewTitle('');
              setNewDescription('');
              setNewPdfUrl('');
              setNewSimUrl('');
              setSelectedSimId('');
              setNewGameType('quiz_nghieng_dau');
              setNewIsMandatory(false);
              setGameSubStep(1);
              setFlashcardSubStep(1);
              setCreateStep(1);
              setNewType(viewMode === 'games' ? 'game' : viewMode === 'flashcards' ? 'flashcard' : 'file_upload');
              setShowCreateModal(true);
            }}
            className="flex items-center px-5 py-3 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            {viewMode === 'games' ? 'Giao Game mới' : viewMode === 'flashcards' ? 'Tạo Flashcard mới' : 'Giao bài tập mới'}
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Assignments List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-900 text-base">
              {viewMode === 'games' ? 'Danh sách Game' : viewMode === 'flashcards' ? 'Danh sách Flashcard' : 'Danh sách Bài Tập'}
            </h3>
            <span className="text-xs font-semibold text-slate-500">{assignments.length} bài</span>
          </div>

          <div className="space-y-3">
            {assignments.map(assignment => {
              const isSelected = selectedAssignment?.id === assignment.id;
              const isPastDue = new Date(assignment.dueDate) < new Date();
              const mySubmission = submissions.find(s => s.assignmentId === assignment.id && s.studentId === user.id);
              const totalSubs = submissions.filter(s => s.assignmentId === assignment.id).length;

              return (
                <div 
                  key={assignment.id}
                  onClick={() => setSelectedAssignment(assignment)}
                  className={`p-5 rounded-3xl cursor-pointer transition-all border ${
                    isSelected 
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-sm ring-1 ring-indigo-300' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {assignment.type === 'online_test' ? 'Kiểm tra Online' : assignment.type === 'simulation' ? 'Bài Mô phỏng' : 'Nộp bài'}
                    </span>
                    
                    {isTeacher ? (
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-200">
                        {totalSubs}/3 đã nộp
                      </span>
                    ) : (
                      mySubmission ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                          Đã nộp
                        </span>
                      ) : isPastDue ? (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-200">
                          Quá hạn (Trừ điểm)
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200">
                          Chưa nộp
                        </span>
                      )
                    )}
                  </div>

                  <h4 className={`font-bold text-sm sm:text-base ${isSelected ? 'text-indigo-900' : 'text-slate-900'} line-clamp-2 mb-2`}>
                    {assignment.title}
                  </h4>

                  {assignment.isMandatory && (
                    <span className="inline-block bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 mr-2">
                      Bắt buộc
                    </span>
                  )}

                  {assignment.classSessionTitle && (
                    <span className="inline-block text-[10px] text-indigo-600 font-semibold mb-2 bg-indigo-50 px-2 py-0.5 rounded">
                      Buổi học: {assignment.classSessionTitle}
                    </span>
                  )}

                  <p className={`text-xs flex items-center font-medium ${isSelected ? 'text-indigo-700' : 'text-slate-500'}`}>
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Hạn: {format(new Date(assignment.dueDate), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                  </p>

                  {isTeacher && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {totalSubs} đã nộp
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUnsubmittedModalAssignment(assignment);
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Danh sách chưa nộp</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Assignment Details & Actions */}
        <div className="lg:col-span-2">
          {selectedAssignment ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 lg:p-8 space-y-6">
              
              {/* Header Details */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                      {selectedAssignment.classSessionTitle || 'Bài tập buổi học'}
                    </span>
                    {selectedAssignment.isMandatory && (
                      <span className="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-200 uppercase tracking-wider">
                        Bắt buộc
                      </span>
                    )}
                  </div>
                  
                  {isTeacher && (
                    <button 
                      onClick={() => {
                        const summary = `📝 [BÀI TẬP]: ${selectedAssignment.title}\nHạn nộp: ${format(new Date(selectedAssignment.dueDate), 'HH:mm - dd/MM/yyyy', { locale: vi })}\nCác em học sinh đăng nhập hệ thống để hoàn thành bài tập nhé!`;
                        navigator.clipboard.writeText(summary);
                        alert('Đã sao chép tóm tắt bài tập vào bộ nhớ tạm!');
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      <Copy className="w-4 h-4 text-indigo-600" />
                      Sao chép tóm tắt bài tập
                    </button>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedAssignment.title}</h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 pb-4 border-b border-slate-100">
                  <span className="flex items-center font-medium text-slate-700">
                    <Clock className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Hạn nộp trước giờ học: <strong className="ml-1 text-slate-900">{format(new Date(selectedAssignment.dueDate), 'HH:mm - dd/MM/yyyy', { locale: vi })}</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>Hoạt động theo buổi học</span>
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed">
                <p className="font-semibold text-slate-900 mb-1">Hướng dẫn từ giáo viên:</p>
                <p>{selectedAssignment.description}</p>
              </div>

              {/* Penalty Notice */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center gap-3 text-amber-900 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  <strong>Lưu ý quy định:</strong> Bài tập này cần được hoàn thành trước buổi học tương ứng. Nếu không làm đúng hạn sẽ bị trừ điểm chuyên cần!
                </span>
              </div>

              {/* Teacher Attached Document / Link Section */}
              {selectedAssignment.pdfUrl && (
                <div className="p-5 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Tài liệu & Đề bài đính kèm từ Giáo viên</p>
                        <p className="text-xs text-slate-500">
                          {selectedAssignment.pdfUrl.startsWith('data:') ? 'Tệp bài tập tải lên (.pdf / .png)' : 'Đường link đề bài / tài liệu tham khảo'}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={selectedAssignment.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      download={selectedAssignment.pdfUrl.startsWith('data:') ? 'de_bai_tap.pdf' : undefined}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" /> Mở / Tải đề bài
                    </a>
                  </div>

                  {/* Image preview if document is an image */}
                  {(selectedAssignment.pdfUrl.startsWith('data:image/') || selectedAssignment.pdfUrl.match(/\.(jpeg|jpg|gif|png|webp)/i)) && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-blue-200 max-h-60 bg-white flex justify-center p-2">
                      <img src={selectedAssignment.pdfUrl} alt="Đề bài tập" className="max-h-56 object-contain rounded-lg" />
                    </div>
                  )}
                </div>
              )}



              {selectedAssignment.simulationUrl && (
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <Play className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Bài tập Mô phỏng Thực hành PhET</p>
                      <p className="text-xs text-slate-500">Mở giao diện mô phỏng tương tác để hoàn thành</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <a 
                      href={selectedAssignment.simulationUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" /> Vào Mô phỏng
                    </a>
                    
                    {!isTeacher && !submissions.some(s => s.assignmentId === selectedAssignment.id && s.studentId === user.id) && (
                      <button 
                        type="button"
                        onClick={() => {
                          onSubmitWork({
                            assignmentId: selectedAssignment.id,
                            studentId: user.id,
                            studentName: user.name,
                            content: 'Đã hoàn thành mô phỏng thực hành PhET thành công.',
                            grade: 10
                          });
                        }}
                        className="py-2.5 px-4 bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all shadow-sm font-semibold"
                      >
                        Xác nhận đã hoàn thành
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STUDENT VIEW: Submit Form or View Submission */}
              {!isTeacher && selectedAssignment.type !== 'simulation' && (
                <div className="pt-4 border-t border-slate-100">
                  {(() => {
                    const mySub = submissions.find(s => s.assignmentId === selectedAssignment.id && s.studentId === user.id);
                    
                    if (mySub) {
                      return (
                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-emerald-900 flex items-center gap-2 text-base">
                              <Check className="w-5 h-5 text-emerald-600" /> Em đã nộp bài tập này
                            </h3>
                            <span className="text-xs text-emerald-700 font-medium">
                              Thời gian nộp: {format(new Date(mySub.submittedAt), 'HH:mm dd/MM/yyyy')}
                            </span>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-800">
                            <p className="font-semibold text-xs text-slate-500 mb-1">Nội dung bài làm:</p>
                            <p className="whitespace-pre-wrap">{mySub.content}</p>

                             {mySub.fileUrl && (
                               <div className="mt-3 flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                 <div className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 truncate max-w-[70%]">
                                   <FileText className="w-4 h-4 flex-shrink-0" />
                                   <span className="truncate">Tệp đính kèm: {mySub.fileUrl.startsWith('data:') ? 'Tệp bài làm tải lên.html' : mySub.fileUrl}</span>
                                 </div>
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setPreviewSub(mySub);
                                     setZoomLevel(1);
                                     setRotationAngle(0);
                                   }}
                                   className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                 >
                                   <Eye className="w-3.5 h-3.5" /> Xem tệp
                                 </button>
                               </div>
                             )}
                          </div>

                          {mySub.grade !== undefined ? (
                            <div className="bg-white p-4 rounded-xl border border-indigo-200 flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-indigo-900">Điểm số từ giáo viên:</p>
                                {mySub.feedback && <p className="text-sm text-slate-700 mt-1 italic">"{mySub.feedback}"</p>}
                              </div>
                              <span className="bg-indigo-600 text-white font-black text-lg px-4 py-2 rounded-xl shadow-md">
                                {mySub.grade} <span className="text-xs opacity-80">/ 10</span>
                              </span>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Đang chờ giáo viên chấm điểm...</p>
                          )}

                          {selectedAssignment.type === 'online_test' && selectedAssignment.questions && (
                            <div className="mt-6 space-y-4">
                              <h4 className="font-bold text-slate-800 text-sm border-b pb-2">Chi tiết bài làm và đáp án</h4>
                              {selectedAssignment.questions.map((q, idx) => {
                                const stuAns = mySub.quizAnswers?.[q.id];
                                const isCorrect = stuAns === q.correctAnswer;
                                return (
                                  <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                    <div className="flex justify-between items-start">
                                      <div className="font-bold text-indigo-700 text-sm">Câu {idx + 1}</div>
                                      {stuAns !== undefined ? (
                                        isCorrect ? (
                                          <span className="text-emerald-600 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">Đúng</span>
                                        ) : (
                                          <span className="text-red-600 text-[10px] font-bold px-2 py-0.5 bg-red-50 rounded border border-red-200">Sai</span>
                                        )
                                      ) : (
                                        <span className="text-slate-500 text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded border border-slate-200">Chưa làm</span>
                                      )}
                                    </div>
                                    <div className="text-sm text-slate-800">
                                      <MarkdownMath content={q.question} />
                                    </div>
                                    
                                    {q.type === 'multiple_choice' && q.options && (
                                      <div className="space-y-2 mt-2 pl-2">
                                        {q.options.map((opt, optIdx) => {
                                          const isStuSelected = stuAns === optIdx;
                                          const isActualCorrect = q.correctAnswer === optIdx;
                                          return (
                                            <div key={optIdx} className={`flex gap-2 p-2 rounded-lg text-sm ${isActualCorrect ? 'bg-emerald-50 border border-emerald-200 font-bold' : isStuSelected ? 'bg-red-50 border border-red-200' : ''}`}>
                                              <span className="font-bold shrink-0">{['A.', 'B.', 'C.', 'D.'][optIdx]}</span>
                                              <MarkdownMath content={opt} />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {q.type === 'true_false' && q.subOptions && (
                                      <div className="space-y-2 mt-2 pl-2">
                                        {q.subOptions.map((opt, optIdx) => opt && (
                                          <div key={optIdx} className="flex gap-2 p-2 rounded-lg text-sm bg-slate-50 border border-slate-200">
                                            <span className="font-bold shrink-0">{['a)', 'b)', 'c)', 'd)'][optIdx]}</span>
                                            <MarkdownMath content={opt} />
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {(q.method || q.solutionText) && (
                                      <div className="mt-3 p-3 bg-amber-50/50 border border-amber-200/50 rounded-xl text-xs space-y-2">
                                        <p className="font-bold text-amber-700 uppercase tracking-wider text-[10px]">Hướng dẫn giải</p>
                                        {q.method && <div className="text-slate-700"><strong>Phương pháp:</strong> <MarkdownMath content={q.method} /></div>}
                                        {q.solutionText && <div className="text-slate-700"><MarkdownMath content={q.solutionText} /></div>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                        </div>
                      );
                    }

                    // --- AZOTA TYPE: LANDING SCREEN ---
                    if ((selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game') && !isExamStarted) {
                      const isGame = selectedAssignment.type === 'game';
                      
                      const gameMetadataMap: Record<string, { name: string, desc: string, emoji: string, bg: string, border: string, text: string, gradient: string }> = {
                        quiz_nghieng_dau: { name: 'Quiz Nghiêng Đầu AI', desc: 'Sử dụng camera nghiêng đầu để trả lời A, B, C, D cực nhạy', emoji: '🧠', bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-700', gradient: 'from-blue-600 to-indigo-600' },
                        pose_matching: { name: 'Tư Thế Mô Phỏng', desc: 'Mô phỏng tư thế hình học trước camera AI nhận diện cơ thể', emoji: '🧍', bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-700', gradient: 'from-amber-500 to-orange-600' },
                        cuoc_dua_ngon_tay: { name: 'Cuộc Đua Ngón Tay', desc: 'Đua xe trả lời đúng để bứt tốc vượt lên đối thủ trên đường đua', emoji: '🏎️', bg: 'bg-rose-50/50', border: 'border-rose-200', text: 'text-rose-700', gradient: 'from-rose-500 to-red-600' },
                        do_min: { name: 'Dò Mìn Toán Học', desc: 'Khám phá ô mìn an toàn thông qua giải các phép tính nhanh', emoji: '💣', bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-700', gradient: 'from-emerald-600 to-teal-600' },
                        doan_tau_tri_thuc: { name: 'Đoàn Tàu Tri Thức', desc: 'Đưa đoàn tàu vượt các ga học liệu cập bến ga cuối an toàn', emoji: '🚂', bg: 'bg-sky-50/50', border: 'border-sky-200', text: 'text-sky-700', gradient: 'from-sky-500 to-blue-600' },
                        game_map: { name: 'Bản Đồ Cổ Thử Thách', desc: 'Bản đồ truy tìm kho báu toán học cổ xưa đầy thú vị', emoji: '🗺️', bg: 'bg-yellow-50/50', border: 'border-yellow-200', text: 'text-yellow-700', gradient: 'from-yellow-500 to-amber-600' },
                        tu_ngu_biet_bay: { name: 'Từ Ngữ Biết Bay', desc: 'Chạm từ chuyển động đúng chính tả và logic ngữ văn', emoji: '🛸', bg: 'bg-violet-50/50', border: 'border-violet-200', text: 'text-violet-700', gradient: 'from-violet-500 to-purple-600' },
                        keo_tha_noi_y: { name: 'Kéo Thả Nối Ý', desc: 'Ghép nối vế trái logic với vế phải tạo câu đúng hoàn chỉnh', emoji: '🔗', bg: 'bg-teal-50/50', border: 'border-teal-200', text: 'text-teal-700', gradient: 'from-teal-500 to-cyan-600' },
                        o_chu_khoa: { name: 'Ô Chữ Khóa Bí Mật', desc: 'Giải ô chữ giải mã từ khóa cốt lõi của bài học', emoji: '🔐', bg: 'bg-green-50/50', border: 'border-green-200', text: 'text-green-700', gradient: 'from-green-500 to-emerald-600' },
                        san_kho_bau: { name: 'Săn Kho Báu Đại Dương', desc: 'Tìm rương vàng cổ vật thông qua thử thách toán thực tế', emoji: '🏴‍☠️', bg: 'bg-slate-100/50', border: 'border-slate-200', text: 'text-slate-700', gradient: 'from-slate-600 to-slate-800' },
                        lat_manh_ghep: { name: 'Lật Mảnh Ghép Tranh', desc: 'Lật câu hỏi khám phá bức tranh chủ đề bí mật đằng sau', emoji: '🧩', bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-700', gradient: 'from-indigo-500 to-purple-600' },
                        domino: { name: 'Đấu Trường Domino', desc: 'Chuỗi logic ghép nối domino liên tiếp', emoji: '🀄', bg: 'bg-cyan-50/50', border: 'border-cyan-200', text: 'text-cyan-700', gradient: 'from-cyan-500 to-blue-600' },
                        dao_chu: { name: 'Đảo Chữ Anagram', desc: 'Xáo trộn ký tự để xếp lại thuật ngữ có nghĩa chuẩn xác nhất', emoji: '🔠', bg: 'bg-teal-50/50', border: 'border-teal-200', text: 'text-teal-700', gradient: 'from-teal-500 to-emerald-600' },
                        mo_hop: { name: 'Mở Hộp Bí Mật', desc: 'Hộp quà chứa các thử thách toán học ngẫu nhiên bất ngờ', emoji: '🎁', bg: 'bg-sky-50/50', border: 'border-sky-200', text: 'text-sky-700', gradient: 'from-sky-500 to-indigo-500' },
                        gan_nhan_so_do: { name: 'Gắn Nhãn Sơ Đồ', desc: 'Kéo các nhãn vào đúng chấm tròn sơ đồ minh họa hình học', emoji: '📊', bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-700', gradient: 'from-purple-500 to-indigo-600' },
                        no_bong_bay: { name: 'Nổ Bóng Bay', desc: 'Chạm nổ những quả bóng bay mang đáp án đúng bay lượn', emoji: '🎈', bg: 'bg-pink-50/50', border: 'border-pink-200', text: 'text-pink-700', gradient: 'from-pink-500 to-rose-500' },
                        dap_chuot_chui: { name: 'Đập Chuột Chũi', desc: 'Đập búa vào chú chuột mang mệnh đề toán học chính xác', emoji: '🔨', bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-700', gradient: 'from-amber-500 to-yellow-600' }
                      };

                      const curGameMeta = isGame ? (gameMetadataMap[selectedAssignment.gameType || 'quiz_nghieng_dau'] || gameMetadataMap.quiz_nghieng_dau) : null;

                      return (
                        <div className={`border rounded-3xl p-6 sm:p-8 space-y-6 text-center max-w-xl mx-auto transform hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${
                          isGame 
                            ? 'bg-gradient-to-b from-indigo-50/80 to-purple-50/40 border-indigo-100 shadow-xl' 
                            : 'bg-slate-50 border-slate-200 shadow-md'
                        }`}>
                          
                          {/* Top Decorative Lights for Game Mode */}
                          {isGame && (
                            <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-300/30 rounded-full blur-2xl animate-pulse" />
                          )}

                          <div className="flex flex-col items-center justify-center gap-3 relative z-10">
                            {isGame && curGameMeta ? (
                              <div className="w-20 h-20 rounded-3xl bg-white border-2 border-indigo-200 shadow-lg flex items-center justify-center text-4xl animate-bounce mb-2">
                                {curGameMeta.emoji}
                              </div>
                            ) : null}
                            <span className={`font-extrabold text-xs sm:text-sm uppercase tracking-widest px-3 py-1 rounded-full ${
                              isGame 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isGame ? '🎮 Trò Chơi Học Tập' : '📝 Hệ Thống Đề Thi'}
                            </span>
                          </div>

                          <div className="space-y-2 relative z-10">
                            <h3 className="font-extrabold text-slate-900 text-xl sm:text-2xl leading-tight">
                              {selectedAssignment.title}
                            </h3>
                            {isGame && curGameMeta ? (
                              <div className="max-w-md mx-auto space-y-1 bg-white/70 p-3.5 rounded-2xl border border-indigo-100">
                                <p className="text-xs font-black text-indigo-900">{curGameMeta.name}</p>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{curGameMeta.desc}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Bài làm của bạn sẽ được chấm điểm tự động & hệ thống giám sát trong suốt quá trình làm bài.
                              </p>
                            )}
                          </div>

                          {/* Formats or Exam Detail block */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-4 max-w-md mx-auto text-left py-3 border-t border-b border-slate-200 my-4 relative z-10">
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Thời gian làm bài</p>
                              <p className="text-sm font-black text-slate-800">15 phút</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Số lượng câu hỏi</p>
                              <p className="text-sm font-black text-slate-800">{selectedAssignment.questions?.length || 4} Câu</p>
                            </div>
                            
                            {isGame && (
                              <div className="col-span-2 pt-2 border-t border-slate-200 space-y-1.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Dạng bài thi được giáo viên bật:</p>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                  {['multiple_choice', 'true_false', 'word_reorder', 'short_answer', 'matching'].filter(id => {
                                    // if teacher has allowed it
                                    return true; // render standard formatted tags beautifully
                                  }).map(id => {
                                    const labels: Record<string, { label: string, emoji: string, color: string }> = {
                                      multiple_choice: { label: 'Trắc nghiệm', emoji: '🔘', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                                      true_false: { label: 'Đúng/Sai', emoji: '⚖️', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                      word_reorder: { label: 'Sắp xếp chữ', emoji: '🔠', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                                      short_answer: { label: 'Trả lời ngắn', emoji: '📝', color: 'bg-teal-50 border-teal-200 text-teal-700' },
                                      matching: { label: 'Ghép vế', emoji: '🔗', color: 'bg-rose-50 border-rose-200 text-rose-700' }
                                    };
                                    const item = labels[id];
                                    return (
                                      <span key={id} className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border flex items-center gap-1 ${item.color}`}>
                                        <span>{item.emoji}</span>
                                        <span>{item.label}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="space-y-0.5 col-span-2 pt-2 border-t border-slate-200 text-center">
                              <p className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                                <span>✓</span> Hệ thống tự động lưu kết quả nộp bài & cộng xu tích lũy
                              </p>
                            </div>
                          </div>

                          <div className={`p-4 rounded-2xl text-left text-xs space-y-1.5 max-w-md mx-auto relative z-10 ${
                            isGame ? 'bg-indigo-50/50 border border-indigo-100 text-indigo-900' : 'bg-amber-50 border border-amber-200/80 text-amber-800'
                          }`}>
                            <p className="font-extrabold">⚠️ Hướng dẫn làm bài:</p>
                            {isGame ? (
                              <>
                                <p>• Click nút <strong className="text-indigo-900">"Chơi game ngay"</strong> để bắt đầu thử thách kiến thức.</p>
                                <p>• Hãy trả lời chính xác để đạt được điểm số cao nhất cùng phần thưởng xu vàng 🪙 lấp lánh!</p>
                              </>
                            ) : (
                              <>
                                <p>• Bấm nút <strong>"Bắt đầu làm bài"</strong> bên dưới để vào phòng thi.</p>
                                <p>• Trong khi làm bài, tuyệt đối <strong>không chuyển đổi tab hoặc thoát toàn màn hình</strong> để tránh bị ghi nhận vi phạm.</p>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              setIsExamStarted(true);
                              setExamTimeRemaining(900);
                              setTabSwitchCount(0);
                              setStudentQuizAnswers({});
                              await enterFullscreen();
                            }}
                            className={`w-full max-w-md py-3.5 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all uppercase tracking-wider font-semibold animate-pulse relative z-10 ${
                              isGame 
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-100' 
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                            }`}
                          >
                            {isGame ? '🕹️ Chơi game ngay' : '📝 Bắt đầu làm bài'}
                          </button>
                        </div>
                      );
                    }

                    // --- FLASHCARD TYPE: LANDING SCREEN ---
                    if (selectedAssignment.type === 'flashcard' && !isExamStarted) {
                      const allFlipped = selectedAssignment.flashcards && flippedCards.size === selectedAssignment.flashcards.length;
                      const activeCard = selectedAssignment.flashcards?.[activeCardIndex];

                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 text-center max-w-xl mx-auto flex flex-col">
                          <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">{selectedAssignment.title}</h3>
                          <p className="text-xs text-slate-500">
                            Bạn cần xem (lật) tất cả thẻ ghi nhớ để mở khóa bài kiểm tra.
                          </p>
                          
                          {activeCard && (
                            <div 
                              onClick={() => {
                                setFlippedCards(prev => new Set(prev).add(activeCard.id));
                              }}
                              className="w-full h-64 sm:h-80 md:h-96 perspective-1000 cursor-pointer group my-2"
                            >
                              <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flippedCards.has(activeCard.id) ? 'rotate-y-180' : ''}`}>
                                {/* Front */}
                                <div className="absolute w-full h-full backface-hidden bg-white border-2 border-indigo-200 group-hover:border-indigo-400 rounded-3xl shadow-lg flex flex-col justify-between p-5 sm:p-8 transition-colors overflow-hidden">
                                  <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                                    <span className="text-indigo-500 text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-1.5">
                                      ✨ Mặt trước
                                    </span>
                                    <span className="text-xs font-mono text-slate-400">#{activeCardIndex + 1}</span>
                                  </div>
                                  <div className="flex-1 flex items-center justify-center text-center py-4 px-2 overflow-y-auto custom-scrollbar">
                                    <div className="text-lg sm:text-2xl font-bold text-slate-800 leading-relaxed">
                                      <MarkdownMath content={activeCard.front || '(Trống)'} />
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-indigo-50 text-center text-xs font-semibold text-indigo-400 flex items-center justify-center gap-1">
                                    <RotateCw className="w-3.5 h-3.5" /> Chạm để lật mặt sau
                                  </div>
                                </div>
                                {/* Back */}
                                <div className="absolute w-full h-full backface-hidden bg-gradient-to-b from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-3xl shadow-lg flex flex-col justify-between p-5 sm:p-8 rotate-y-180 overflow-hidden">
                                  <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                                    <span className="text-indigo-600 text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-1.5">
                                      🎯 Mặt sau
                                    </span>
                                    <span className="text-xs font-mono text-indigo-400">#{activeCardIndex + 1}</span>
                                  </div>
                                  <div className="flex-1 flex items-center justify-center text-center py-4 px-2 overflow-y-auto custom-scrollbar">
                                    <div className="text-base sm:text-xl font-medium text-slate-800 leading-relaxed">
                                      <MarkdownMath content={activeCard.back || '(Trống)'} />
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-indigo-100 text-center text-xs font-semibold text-indigo-500 flex items-center justify-center gap-1">
                                    <RotateCw className="w-3.5 h-3.5" /> Chạm để quay lại mặt trước
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center px-4">
                            <button 
                              disabled={activeCardIndex === 0}
                              onClick={() => setActiveCardIndex(i => i - 1)}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-50"
                            >
                              Trước
                            </button>
                            <span className="text-sm font-bold text-slate-500">
                              {activeCardIndex + 1} / {selectedAssignment.flashcards?.length || 0}
                            </span>
                            <button 
                              disabled={activeCardIndex === (selectedAssignment.flashcards?.length || 1) - 1}
                              onClick={() => setActiveCardIndex(i => i + 1)}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 disabled:opacity-50"
                            >
                              Sau
                            </button>
                          </div>

                          <div className="pt-4 border-t border-slate-200">
                            {allFlipped ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  setIsExamStarted(true);
                                  setExamTimeRemaining(900);
                                  setTabSwitchCount(0);
                                  setStudentQuizAnswers({});
                                  await enterFullscreen();
                                }}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-100 transition-all uppercase tracking-wider"
                              >
                                Bắt đầu bài kiểm tra
                              </button>
                            ) : (
                              <button
                                disabled
                                className="w-full py-3.5 bg-slate-200 text-slate-400 font-bold text-sm rounded-2xl uppercase tracking-wider cursor-not-allowed"
                              >
                                Xem hết thẻ để làm bài
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // --- LESSON CHECK TYPE ---
                    if (selectedAssignment.type === 'lesson_check') {
                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 text-center max-w-xl mx-auto">
                          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-sm border border-blue-200">
                            <Camera className="w-8 h-8" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">Nộp ảnh chép bài</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                              Sử dụng camera để chụp lại vở ghi chép của bạn. Hình ảnh sẽ tự động được hệ thống chuyển đổi thành định dạng PDF để nộp.
                            </p>
                          </div>
                          
                          {showCamera && (
                            <CameraCapture 
                              onCancel={() => setShowCamera(false)}
                              onCapture={(img, pdfDataUrl) => {
                                if (pdfDataUrl) {
                                  // This is the generated PDF string
                                  setUploadedFileUrl(pdfDataUrl);
                                  setUploadedFileName('bai_tap_chep_tay.pdf');
                                } else {
                                  // Fallback to image
                                  setUploadedFileUrl(img);
                                  setUploadedFileName('bai_tap_chep_tay.jpg');
                                }
                                setSubmitContent('Em gửi ảnh chép bài (đã chuyển thành PDF) ạ.');
                                setShowCamera(false);
                                // Don't automatically submit, let user preview and then click submit
                              }}
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => setShowCamera(true)}
                            className="w-full max-w-md mx-auto py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                          >
                            <Camera className="w-5 h-5" /> Mở Camera & Chụp ảnh
                          </button>
                        </div>
                      );
                    }

                    // --- AZOTA TYPE: ACTIVE EXAM SCREEN ---
                    if ((selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') && isExamStarted) {
                      return null;
                    }

                    // --- FILE UPLOAD TYPE ---
                    return (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        setShowStandardSubmitModal(true);
                      }} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5">
                        <h3 className="font-bold text-slate-900 text-base">Làm bài tập và nộp bài</h3>

                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-slate-700">Tải tệp đính kèm / Ảnh chụp bài làm:</label>
                          <div className="border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50 p-6 rounded-2xl text-center cursor-pointer transition-colors">
                            <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-800">
                              {uploadedFileName ? `Đã chọn: ${uploadedFileName}` : 'Kéo thả file bài làm (PDF, PNG, JPG) hoặc bấm để chọn'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ ảnh chụp tập vở hoặc file PDF</p>
                            <input 
                              type="file" 
                              className="hidden" 
                              id="fileUploadInput"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadedFileName(file.name);
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (typeof event.target?.result === 'string') {
                                      setUploadedFileUrl(event.target.result);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <button 
                              type="button" 
                              onClick={() => document.getElementById('fileUploadInput')?.click()}
                              className="mt-3 px-4 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg hover:bg-indigo-100 border border-indigo-200 font-semibold"
                            >
                              Chọn file từ thiết bị
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCamera(true)}
                              className="mt-3 ml-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg hover:bg-emerald-100 border border-emerald-200 font-semibold inline-flex items-center gap-1"
                            >
                              <Camera className="w-4 h-4" /> Chụp hình (PDF)
                            </button>
                          </div>
                          {showCamera && (
                            <CameraCapture 
                              onCancel={() => setShowCamera(false)}
                              onCapture={(img, pdfDataUrl) => {
                                if (pdfDataUrl) {
                                  setUploadedFileUrl(pdfDataUrl);
                                  setUploadedFileName('bai_tap_chep_tay.pdf');
                                } else {
                                  setUploadedFileUrl(img);
                                  setUploadedFileName('bai_tap_chep_tay.jpg');
                                }
                                setSubmitContent(prev => prev ? prev + '\nEm gửi ảnh chép bài (đã chuyển thành PDF) ạ.' : 'Em gửi ảnh chép bài (đã chuyển thành PDF) ạ.');
                                setShowCamera(false);
                              }}
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú lời nhắn cho giáo viên:</label>
                          <textarea 
                            rows={3}
                            value={submitContent}
                            onChange={e => setSubmitContent(e.target.value)}
                            className="w-full p-3 bg-white text-slate-900 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Nhập ghi chú thêm nếu có..."
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <button 
                            type="submit" 
                            className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
                          >
                            Hoàn tất & Nộp bài tập
                          </button>
                        </div>
                      </form>
                    );
                  })()}
                </div>
              )}

              {/* TEACHER VIEW: Submission Matrix & Grading */}
              {isTeacher && (
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-lg">Danh sách học sinh nộp bài</h3>
                    <span className="text-xs font-semibold text-slate-500">
                      Sĩ số: 3 học sinh
                    </span>
                  </div>

                  <div className="space-y-3">
                    {submissions.filter(s => s.assignmentId === selectedAssignment.id).length === 0 ? (
                      <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs italic">
                        Chưa có học sinh nào nộp bài tập này.
                      </div>
                    ) : (
                      submissions.filter(s => s.assignmentId === selectedAssignment.id).map(sub => (
                        <div key={sub.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{sub.studentName || 'Học sinh'}</p>
                              <p className="text-[11px] text-slate-500">Nộp lúc: {format(new Date(sub.submittedAt), 'HH:mm dd/MM/yyyy')}</p>
                            </div>

                            {sub.grade !== undefined ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-1 rounded-xl border border-emerald-200">
                                {sub.grade} / 10 điểm
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-xl border border-amber-200">
                                Cần chấm điểm
                              </span>
                            )}
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                            <p className="whitespace-pre-wrap">{sub.content}</p>
                            {sub.fileUrl && (
                              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                                <div className="text-indigo-600 font-bold flex items-center gap-1.5 truncate max-w-[65%]">
                                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span className="truncate">Tệp đính kèm: {sub.fileUrl.startsWith('data:') ? 'Tệp bài làm tải lên.html' : sub.fileUrl}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewSub(sub);
                                    setZoomLevel(1);
                                    setRotationAngle(0);
                                  }}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-sm"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Xem bài làm
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Grading Form */}
                          {gradingSubId === sub.id ? (
                            <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Điểm số (0 - 10)</label>
                                  <input 
                                    type="number" min="0" max="10" step="0.5"
                                    value={gradeValue} onChange={e => setGradeValue(Number(e.target.value))}
                                    className="w-full p-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-bold text-slate-700 mb-1">Nhận xét của cô</label>
                                  <input 
                                    type="text"
                                    value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)}
                                    className="w-full p-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Nhập nhận xét..."
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setGradingSubId(null)} className="px-3 py-1.5 text-xs text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Hủy</button>
                                <button 
                                  onClick={() => {
                                    onGrade(sub.id, gradeValue, feedbackValue);
                                    setGradingSubId(null);
                                  }} 
                                  className="px-4 py-1.5 text-xs bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                                >
                                  Lưu kết quả
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <button 
                                onClick={() => {
                                  setGradingSubId(sub.id);
                                  setGradeValue(sub.grade || 10);
                                  setFeedbackValue(sub.feedback || '');
                                }}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                              >
                                {sub.grade !== undefined ? 'Sửa điểm' : 'Chấm điểm ngay'}
                              </button>
                            </div>
                          )}

                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm h-full min-h-[350px] flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-bold text-slate-800">Chưa chọn bài tập</p>
              <p className="text-xs mt-1">Hãy chọn một bài tập từ danh sách bên trái để xem chi tiết.</p>
            </div>
          )}
        </div>
      </div>

      {showGamePreview && (
        <GamePreview 
          gameType={newGameType} 
          questions={parseRawCodeToQuestions(rawQuestionCode).parsedQuestions} 
          onClose={() => setShowGamePreview(false)} 
        />
      )}

      {showFlashcardPreview && (
        <FlashcardPreviewModal
          flashcards={newFlashcards}
          title={newTitle ? `Xem trước: ${newTitle}` : 'Xem trước bộ thẻ Flashcard'}
          onClose={() => setShowFlashcardPreview(false)}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-5xl shadow-2xl overflow-y-auto md:overflow-hidden h-[95vh] md:h-[90vh] flex flex-col relative transition-all">
            <button 
              onClick={() => setShowCreateModal(false)} 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[60] p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Editor Area */}
            <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col bg-slate-50/50">
              
              {createStep === 1 ? (
                <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col p-3 sm:p-5">
                  {viewMode === 'assignments' && (
                    <div className="mb-3 sm:mb-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">
                          1. Chọn hình thức và cấu hình đề bài
                        </h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                          Bấm để chọn 1 trong 3 hình thức bài tập dưới đây.
                        </p>
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar">
                        {(['file_upload', 'online_test', 'simulation', 'lesson_check'] as const).map(t => (
                          <button 
                            key={t}
                            type="button"
                            onClick={() => setNewType(t)}
                            className={`py-1.5 px-3 sm:px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                              newType === t 
                                ? 'bg-white text-blue-700 shadow border border-slate-200' 
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                            }`}
                          >
                            {t === 'file_upload' ? 'Offline' : t === 'online_test' ? 'Online' : t === 'simulation' ? 'Mô phỏng' : 'Chép bài'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`flex-1 flex flex-col lg:flex-row gap-4 custom-scrollbar ${newType === 'game' || newType === 'flashcard' ? 'md:overflow-hidden' : 'overflow-y-auto lg:overflow-hidden'}`}>
                    {/* Game Selection */}
                    {newType === 'game' && (
                      <GameWizard
                        gameSubStep={gameSubStep}
                        setGameSubStep={setGameSubStep}
                        newGameType={newGameType}
                        setNewGameType={setNewGameType}
                        selectedGameCategory={selectedGameCategory}
                        setSelectedGameCategory={setSelectedGameCategory}
                        gameSearchQuery={gameSearchQuery}
                        setGameSearchQuery={setGameSearchQuery}
                        newGameFormats={newGameFormats}
                        setNewGameFormats={setNewGameFormats}
                        rawQuestionCode={rawQuestionCode}
                        setRawQuestionCode={setRawQuestionCode}
                        setShowGamePreview={setShowGamePreview}
                      />
                    )}

                    {/* Flashcard Configuration */}
                    {newType === 'flashcard' && (
                      <FlashcardWizard
                        flashcardSubStep={flashcardSubStep}
                        setFlashcardSubStep={setFlashcardSubStep}
                        newFlashcards={newFlashcards}
                        setNewFlashcards={setNewFlashcards}
                        rawQuestionCode={rawQuestionCode}
                        setRawQuestionCode={setRawQuestionCode}
                        setShowFlashcardPreview={setShowFlashcardPreview}
                        setShowGamePreview={setShowGamePreview}
                        handleDownloadSampleFlashcards={handleDownloadSampleFlashcards}
                        handleImportFlashcards={handleImportFlashcards}
                      />
                    )}

                    {/* 1. OFFLINE WORKSPACE (File Upload Type) */}
                    {newType === 'file_upload' && (
                      <div className="w-full max-w-2xl mx-auto bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6 flex flex-col justify-center">
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center justify-center gap-2 border-b border-slate-100 pb-3 sm:pb-4">
                          <span>📁</span> Tạo đề Offline (Nộp bài tự luận)
                        </h4>
                        
                        <div className="space-y-4 sm:space-y-6">
                          <div>
                            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                              1. Dán đường link đề bài / Tài liệu (Google Drive, PDF, Ảnh):
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                              <input 
                                type="url"
                                value={newPdfUrl} 
                                onChange={e => setNewPdfUrl(e.target.value)}
                                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                                placeholder="https://example.com/de-bai-tap.pdf"
                              />
                              <button 
                                type="button"
                                onClick={() => setNewPdfUrl('https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&q=80&w=1000')}
                                className="px-4 sm:px-5 py-2.5 sm:py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs sm:text-sm font-bold shrink-0"
                              >
                                Dùng đề mẫu
                              </button>
                            </div>
                          </div>

                          <div className="text-center font-bold text-slate-400">HOẶC</div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                              2. Tải tệp đề bài lên từ máy tính (PDF, Ảnh):
                            </label>
                            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 p-8 rounded-2xl text-center cursor-pointer transition-all relative">
                              <input 
                                type="file" 
                                accept=".pdf,image/*"
                                id="offlineTeacherFileInput"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (typeof event.target?.result === 'string') {
                                        setNewPdfUrl(event.target.result);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden"
                              />
                              <Upload className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                              <p className="text-sm font-bold text-slate-800">
                                {newPdfUrl?.startsWith('data:') ? '✅ Đã tải file đề bài thành công!' : 'Bấm để chọn file đề bài từ thiết bị (.pdf, .png, .jpg)'}
                              </p>
                              <p className="text-xs text-slate-500 mt-2">Học sinh sẽ nhìn thấy tệp đính kèm này để xem đề bài và tải về làm bài tập.</p>
                              <button 
                                type="button" 
                                onClick={() => document.getElementById('offlineTeacherFileInput')?.click()}
                                className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-sm"
                              >
                                Tải tệp từ máy tính
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lesson Check Workspace */}
                    {newType === 'lesson_check' && (
                      <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-center text-center">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Camera className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-black text-slate-800">
                          Kiểm tra Chép bài / Bài học
                        </h4>
                        <p className="text-slate-500 font-medium">
                          Học sinh sẽ được yêu cầu chụp ảnh vở ghi chép bằng camera trên thiết bị (điện thoại/máy tính bảng) để nộp lại. Hệ thống sẽ tự động ghép ảnh thành file PDF để giáo viên dễ dàng chấm điểm.
                        </p>
                      </div>
                    )}

                    {/* 2. ONLINE TEST WORKSPACE */}
                    {newType === 'online_test' && (() => {
                      const parsedData = parseRawCodeToQuestions(rawQuestionCode);
                      const lineCountArray = Array.from({ length: Math.max(rawQuestionCode.split('\n').length, 12) }, (_, i) => i + 1);

                      return (
                        <div className="flex-1 flex flex-col xl:flex-row gap-4 h-full min-h-0 overflow-y-auto xl:overflow-hidden">
                          {/* Left: Cards Preview */}
                          <div className="w-full xl:w-auto xl:flex-[5] bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[360px] xl:min-h-0">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                              {parsedData.parsedQuestions.map((pq, idx) => (
                                <div key={pq.id || idx} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-sm">
                                  
                                  {/* Card Toolbar */}
                                  <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 text-[11px]">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-extrabold rounded-lg">
                                      {pq.numStr}
                                    </span>
                                    <span className="px-2.5 py-1 bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-lg">
                                      {pq.points} điểm
                                    </span>
                                    <span className="px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-bold">
                                      {pq.type === 'multiple_choice' ? 'Trắc nghiệm nhiều phương án' : pq.type === 'true_false' ? 'Trắc nghiệm đúng sai' : 'Trả lời ngắn'}
                                    </span>
                                    
                                    
                                  </div>

                                  <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                                    <MarkdownMath content={pq.question} />
                                  </div>

                                  {/* Options rendering based on type */}
                                  {pq.type === 'multiple_choice' && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {['A', 'B', 'C', 'D'].map((lbl, optIdx) => {
                                        const isCorrect = pq.correctAnswer === optIdx;
                                        return (
                                          <div 
                                            key={optIdx} 
                                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                              isCorrect ? 'bg-blue-50/70 border-blue-400 text-blue-900 font-bold ring-1 ring-blue-300' : 'bg-white border-slate-200 text-slate-700'
                                            }`}
                                          >
                                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] ${
                                              isCorrect ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                            }`}>
                                              {lbl}
                                            </span>
                                            <div className="overflow-hidden"><MarkdownMath content={pq.options[optIdx] || ''} /></div>
                                            {isCorrect && <Check className="w-4 h-4 text-blue-600 ml-auto shrink-0" />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {pq.type === 'true_false' && pq.subOptions && (
                                    <div className="space-y-2">
                                      {['a', 'b', 'c', 'd'].map((lbl, optIdx) => {
                                        const isCorrect = Array.isArray(pq.correctAnswer) ? pq.correctAnswer[optIdx] === 1 : undefined;
                                        const isFalse = Array.isArray(pq.correctAnswer) ? pq.correctAnswer[optIdx] === 0 : undefined;
                                        return (
                                        <div key={optIdx} className="p-2 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-3 bg-white">
                                          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                            {lbl})
                                          </span>
                                          <div className="flex-1 overflow-hidden"><MarkdownMath content={pq.subOptions![optIdx] || ''} /></div>
                                          <div className="flex gap-1 shrink-0">
                                            <span className={`px-2 py-1 border rounded text-[10px] ${isCorrect ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Đúng</span>
                                            <span className={`px-2 py-1 border rounded text-[10px] ${isFalse ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Sai</span>
                                          </div>
                                        </div>
                                      )})}
                                    </div>
                                  )}

                                  {pq.type === 'short_answer' && (
                                    <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 font-medium text-center">
                                      {pq.correctAnswer ? (
                                        <span className="text-slate-800 font-bold not-italic">Đáp án: {pq.correctAnswer}</span>
                                      ) : (
                                        <span className="italic">Khu vực học sinh nhập câu trả lời ngắn...</span>
                                      )}
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-dashed border-slate-200 text-xs space-y-1.5 bg-amber-50/30 p-3 rounded-xl border">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Hướng dẫn giải</p>
                                    {pq.method && <div className="text-slate-700 mt-2"><strong>Phương pháp:</strong> <MarkdownMath content={pq.method} /></div>}
                                    {pq.solutionText && <div className="text-slate-700 mt-2"><MarkdownMath content={pq.solutionText} /></div>}
                                  </div>

                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right: Code Input */}
                          <div className="w-full xl:w-auto xl:flex-[4] bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[360px] xl:min-h-0">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                              <span className="text-xs font-bold text-slate-700">Mã nguồn đề thi</span>
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">{rawQuestionCode.split('\n').length} dòng</span>
                            </div>

                            <div className="flex-1 border border-slate-200 rounded-2xl bg-white overflow-hidden flex shadow-inner">
                              <div className="w-10 bg-slate-50 border-r border-slate-200 text-right pt-4 text-[11px] font-mono text-slate-400 select-none overflow-hidden pb-4">
                                {lineCountArray.map(num => <div key={num} className="pr-2 leading-relaxed h-[21px]">{num}</div>)}
                              </div>
                              <textarea 
                                value={rawQuestionCode}
                                onChange={e => setRawQuestionCode(e.target.value)}
                                className="flex-1 w-full p-4 text-[12px] font-mono text-slate-800 outline-none resize-none leading-relaxed whitespace-pre font-medium"
                                spellCheck={false}
                                placeholder="Nhập nội dung đề thi..."
                              />
                            </div>
                            
                            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                              <p className="text-[11px] font-bold text-slate-600">Nội dung mẫu:</p>
                              <div className="flex flex-wrap gap-2">
                                <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau1)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 1</button>
                                <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau2)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 2</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. SIMULATION WORKSPACE */}
                    {newType === 'simulation' && (
                      <div className="w-full max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                        <h4 className="text-lg font-extrabold text-slate-800 flex items-center justify-center gap-2 border-b border-slate-100 pb-4 mb-6">
                          <span>🧪</span> Lựa chọn từ Kho Mô phỏng
                        </h4>

                        <p className="text-sm text-slate-600 font-semibold mb-4 text-center">Bấm chọn một mô phỏng tương tác dưới đây để tích hợp trực tiếp vào bài tập:</p>
                        
                        <div className="grid grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto p-4 border border-slate-200 rounded-2xl bg-slate-50">
                          {(simulations || []).map((sim) => {
                            const isSelected = newSimUrl === sim.url || (sim.htmlContent && selectedSimId === sim.id);
                            return (
                              <div 
                                key={sim.id}
                                onClick={() => {
                                  setNewSimUrl(sim.url || '');
                                  setSelectedSimId(sim.id);
                                  if (!newTitle) setNewTitle(`Bài thực hành: ${sim.title}`);
                                }}
                                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 shadow-sm' 
                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                                    {sim.category || 'Toán học'}
                                  </span>
                                  {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                                </div>
                                <h4 className="font-extrabold text-sm text-slate-900 mt-2">{sim.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">{sim.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50 flex items-center justify-center">
                  <div className="w-full max-w-xl bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
                    <h4 className="text-xl font-extrabold text-slate-800 text-center">2. Thông tin bài tập</h4>
                    <p className="text-xs text-slate-500 text-center font-medium">Hoàn tất các thông tin chung trước khi giao bài cho học sinh.</p>
                    
                    <div className="space-y-5 mt-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Tên bài tập / Đề thi:</label>
                        <input 
                          required 
                          type="text"
                          value={newTitle} 
                          onChange={e => setNewTitle(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-shadow"
                          placeholder="Nhập tên bài tập..." 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Thời gian giao đề (Hạn nộp):</label>
                        <input 
                          required type="datetime-local"
                          value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-shadow"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Mô tả & Hướng dẫn:</label>
                        <textarea 
                          required rows={4}
                          value={newDescription} onChange={e => setNewDescription(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 resize-none transition-shadow leading-relaxed"
                          placeholder="VD: Các em làm bài đầy đủ trước khi lên lớp học..."
                        />
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <input
                          type="checkbox"
                          id="isMandatory"
                          checked={newIsMandatory}
                          onChange={e => setNewIsMandatory(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600 cursor-pointer"
                        />
                        <label htmlFor="isMandatory" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                          Bài tập bắt buộc hoàn thành
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Bar for Flow */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              {createStep === 2 ? (
                <button 
                  type="button"
                  onClick={() => setCreateStep(1)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Quay lại
                </button>
              ) : <div></div>}
              
              {createStep === 1 ? (
                <button 
                  type="button"
                  onClick={() => setCreateStep(2)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-100 uppercase tracking-wider ml-auto"
                >
                  Tiếp tục
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={handleCreateAssignment}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-100 uppercase tracking-wider ml-auto"
                >
                  Tạo & Giao bài ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUDENT SUBMISSION DOCUMENT / PDF / IMAGE PREVIEW MODAL */}
      {previewSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm sm:text-base">
                    Xem bài làm: {previewSub.studentName || 'Học sinh'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bài tập: <span className="text-slate-300 font-semibold">{selectedAssignment?.title}</span> • Nộp lúc: {format(new Date(previewSub.submittedAt), 'HH:mm dd/MM/yyyy')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* ZOOM CONTROLS */}
                <div className="flex items-center bg-slate-850 border border-slate-800/40 rounded-xl px-1 py-1 mr-2 text-slate-400 gap-1 text-xs">
                  <button 
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                    title="Thu nhỏ"
                    className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="px-2 font-bold text-[10px] text-slate-300 select-none">{Math.round(zoomLevel * 100)}%</span>
                  <button 
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.25))}
                    title="Phóng to"
                    className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-800 mx-1" />
                  <button 
                    type="button"
                    onClick={() => setRotationAngle(prev => (prev + 90) % 360)}
                    title="Xoay tệp"
                    className="p-1.5 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  type="button"
                  onClick={() => handleDownloadFile(previewSub)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải về
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    setPreviewSub(null);
                    setZoomLevel(1);
                    setRotationAngle(0);
                  }} 
                  className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Workspace Area */}
            <div className="flex-1 overflow-auto bg-slate-950 flex items-start justify-center p-8 relative">
              <div 
                style={{ 
                  transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`, 
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' 
                }}
                className="origin-top max-w-full my-4"
              >
                {(() => {
                  const url = previewSub.fileUrl || '';
                  
                  // 1. Real Uploaded Files (Base64 data URLs)
                  if (url.startsWith('data:')) {
                    if (url.startsWith('data:image/')) {
                      return (
                        <div className="bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-800 max-w-2xl">
                          <img 
                            src={url} 
                            alt="Bài làm học sinh" 
                            className="max-h-[65vh] max-w-full rounded-xl object-contain"
                          />
                        </div>
                      );
                    } else if (url.startsWith('data:text/html') || url.includes('html') || url.startsWith('data:application/octet-stream')) {
                      return (
                        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 w-[750px] h-[550px] flex flex-col">
                          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Trình duyệt giả lập (Mã nguồn HTML)</span>
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 font-mono">● Đang chạy trực tuyến</span>
                          </div>
                          <iframe 
                            srcDoc={url.startsWith('data:') ? atob(url.split(',')[1] || '') : url} 
                            sandbox="allow-scripts"
                            className="w-full flex-1 border-none bg-white"
                          />
                        </div>
                      );
                    } else {
                      // Generic file view
                      return (
                        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 text-center text-slate-300 max-w-md space-y-4">
                          <FileText className="w-16 h-16 text-indigo-400 mx-auto" />
                          <div>
                            <p className="font-bold text-sm">Tệp đính kèm tự động phát hiện</p>
                            <p className="text-xs text-slate-400 mt-1">Đã nhận tệp định dạng nhị phân thành công.</p>
                          </div>
                          <a 
                            href={url}
                            download="baitap_hocsinh"
                            className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                          >
                            Tải file về máy để xem
                          </a>
                        </div>
                      );
                    }
                  }

                  // 2. Mock submission 'bailam_math_tranvanan.pdf' - Render fully designed mathematical worksheet
                  if (url.toLowerCase().includes('pdf') || url.toLowerCase().includes('tranvanan') || url.toLowerCase().includes('hocsinh')) {
                    return (
                      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-[680px] min-h-[800px] p-10 font-sans relative overflow-hidden bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:18px_18px] select-none pointer-events-none">
                        
                        {/* Red Margin Margin-line of worksheet */}
                        <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-red-200" />
                        
                        {/* Worksheet Header */}
                        <div className="border-b-2 border-slate-300 pb-4 mb-6 pl-6">
                          <div className="flex justify-between items-start text-xs font-bold text-slate-500 uppercase tracking-wide">
                            <span>Trường THPT Chuyên Hà Nội - Amsterdam</span>
                            <span>Môn: Toán học 10</span>
                          </div>
                          <div className="text-center my-4">
                            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">BÀI THI TỰ LUẬN - PHƯƠNG TRÌNH BẬC 2</h2>
                            <p className="text-xs text-slate-500 font-medium italic mt-0.5">Tiết 23: Bài tập rèn luyện nâng cao hệ số</p>
                          </div>
                          <div className="flex justify-between items-center text-xs mt-2 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <div>
                              <span>Học sinh: <strong>{previewSub.studentName || 'Lê Thị Bình'}</strong></span>
                              <span className="mx-3">|</span>
                              <span>Lớp: <strong>10A1</strong></span>
                            </div>
                            <span>Ngày nộp: {format(new Date(previewSub.submittedAt), 'dd/MM/yyyy')}</span>
                          </div>
                        </div>

                        {/* Student handwritten answers simulation */}
                        <div className="pl-6 space-y-6 text-sm font-serif italic text-slate-800 font-medium leading-relaxed">
                          
                          <div>
                            <p className="font-bold text-slate-900 not-italic font-sans text-xs uppercase text-indigo-600 tracking-wide mb-1">Đề bài:</p>
                            <p className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/80 text-xs text-indigo-900 font-sans not-italic">
                              Giải phương trình bậc hai sau và xác định số nghiệm thực phân biệt: <br />
                              <strong className="text-sm font-bold">x² - 5x + 6 = 0</strong>
                            </p>
                          </div>

                          <div className="space-y-3 pt-2">
                            <p className="font-bold text-slate-900 not-italic font-sans text-xs uppercase text-slate-500 tracking-wide">Lời giải của học sinh:</p>
                            
                            <p className="text-indigo-900/90 hover:text-indigo-950 transition-colors pl-2 border-l-2 border-indigo-400">
                              Ta có phương trình: <span className="font-sans not-italic font-bold">x² - 5x + 6 = 0</span>
                            </p>
                            
                            <p className="pl-2 border-l-2 border-slate-300">
                              Xác định các hệ số của phương trình bậc hai: <br />
                              <span className="font-sans not-italic font-bold bg-slate-100 px-1.5 py-0.5 rounded">a = 1</span>, 
                              <span className="font-sans not-italic font-bold bg-slate-100 px-1.5 py-0.5 rounded ml-2">b = -5</span>, 
                              <span className="font-sans not-italic font-bold bg-slate-100 px-1.5 py-0.5 rounded ml-2">c = 6</span>
                            </p>

                            <p className="pl-2 border-l-2 border-slate-300">
                              Áp dụng công thức tính biệt thức biệt số Delta (Δ): <br />
                              <span className="font-sans not-italic font-bold text-slate-900">Δ = b² - 4ac</span> <br />
                              <span className="font-sans not-italic font-bold text-slate-900">Δ = (-5)² - 4 · 1 · 6</span> <br />
                              <span className="font-sans not-italic font-bold text-slate-900">Δ = 25 - 24 = 1</span>
                            </p>

                            <p className="pl-2 border-l-2 border-slate-300">
                              Vì biệt thức <span className="font-sans not-italic font-bold">Δ = 1 &gt; 0</span>, nên phương trình có hai nghiệm thực phân biệt:
                            </p>

                            <div className="pl-6 space-y-2 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200">
                              <p className="font-sans not-italic">
                                x₁ = <span className="inline-block align-middle text-center"><span className="block border-b border-slate-900 px-1">-b + √Δ</span><span className="block">2a</span></span> = <span className="inline-block align-middle text-center"><span className="block border-b border-slate-900 px-1">-(-5) + √1</span><span className="block">2 · 1</span></span> = <span className="inline-block align-middle text-center"><span className="block border-b border-slate-900 px-1">5 + 1</span><span className="block">2</span></span> = <strong className="text-slate-900 text-sm">3</strong>
                              </p>
                              <p className="font-sans not-italic">
                                x₂ = <span className="inline-block align-middle text-center"><span className="block border-b border-slate-900 px-1">-b - √Δ</span><span className="block">2a</span></span> = <span className="inline-block align-middle text-center"><span className="block border-b border-slate-900 px-1">-(-5) - √1</span><span className="block">2 · 1</span></span> = <span className="inline-block align-middle text-center"><span className="block border-b border-slate-900 px-1">5 - 1</span><span className="block">2</span></span> = <strong className="text-slate-900 text-sm">2</strong>
                              </p>
                            </div>

                            <p className="pl-2 border-l-2 border-slate-300">
                              Kết luận: Tập nghiệm của phương trình là <span className="font-sans not-italic font-bold bg-slate-100 px-2 py-0.5 rounded">S = {'{2; 3}'}</span>.
                            </p>
                          </div>
                        </div>

                        {/* Circular Grading Stamp */}
                        {previewSub.grade !== undefined && (
                          <div className="absolute right-14 top-14 w-24 h-24 rounded-full border-4 border-red-500/80 flex flex-col items-center justify-center text-red-600 rotate-[-12deg] bg-white/40 shadow-sm pointer-events-none select-none">
                            <span className="text-[10px] uppercase font-black tracking-widest text-red-500">ĐÃ CHẤM</span>
                            <span className="text-2xl font-black text-red-600">{previewSub.grade}</span>
                            <span className="text-[10px] font-bold text-red-500">ĐIỂM SỐ</span>
                          </div>
                        )}

                        {/* Page Footer simulated */}
                        <div className="absolute bottom-6 left-10 right-10 flex justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider pl-6 border-t border-slate-100 pt-3">
                          <span>Học sinh {previewSub.studentName || 'Lê Thị Bình'} - Lớp 10A1</span>
                          <span>Trang 1 / 1</span>
                        </div>
                      </div>
                    );
                  }

                  // 3. Mock submission 'math_binh.jpg' - Render notebook snap mockup
                  return (
                    <div className="bg-[#FAF9F5] text-slate-800 rounded-3xl shadow-2xl border border-amber-200/60 w-[660px] min-h-[750px] p-10 relative bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] bg-[size:16px_16px] select-none pointer-events-none">
                      
                      {/* Notebook Binder rings representation */}
                      <div className="absolute -left-3 top-10 bottom-10 flex flex-col justify-between w-6 pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="w-6 h-4 bg-gradient-to-r from-slate-400 to-slate-200 rounded-full border-r border-slate-500 shadow-md transform translate-x-1" />
                        ))}
                      </div>

                      {/* Notebook Header */}
                      <div className="border-b border-slate-300 pb-3 mb-6 pl-4 flex justify-between items-end">
                        <div>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-100">Bài tập chụp vở</span>
                          <h2 className="text-sm font-extrabold text-slate-800 mt-2 font-mono">BÀI LÀM: KHẢO SÁT HÀM SỐ PARABOL</h2>
                        </div>
                        <div className="text-right text-[11px] text-slate-500 font-mono">
                          <p>Họ tên: {previewSub.studentName || 'Lê Thị Bình'}</p>
                          <p>Lớp: 10A1</p>
                        </div>
                      </div>

                      {/* Content of snap */}
                      <div className="pl-4 space-y-4 font-serif text-slate-700 leading-relaxed italic text-sm">
                        <p className="font-bold font-sans not-italic text-xs text-slate-400 uppercase tracking-wide">Được chụp và gửi tự động từ điện thoại</p>
                        
                        <p className="font-bold font-sans not-italic text-slate-800 text-xs">Bài tập về nhà - Tiết 24: Đồ thị hàm số bậc 2</p>

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <p className="font-bold text-slate-900 not-italic font-sans text-xs">Bài 1: Khảo sát sự biến thiên của parabol y = 2x² - 4x + 1</p>
                          
                          <p className="pl-3 border-l-2 border-amber-400 font-mono text-xs text-slate-800 not-italic bg-amber-50/30 p-2 rounded-lg">
                            Hàm số y = ax² + bx + c có các hệ số: a = 2, b = -4, c = 1 <br />
                            Vì a = 2 &gt; 0 nên parabol có bề lõm quay lên phía trên.
                          </p>

                          <p className="pl-3">
                            Tọa độ đỉnh I của Parabol: <br />
                            x_I = -b / 2a = -(-4) / (2 · 2) = 1 <br />
                            y_I = 2(1)² - 4(1) + 1 = 2 - 4 + 1 = -1 <br />
                            =&gt; Đỉnh I(1; -1)
                          </p>

                          <p className="pl-3">
                            Trục đối xứng: x = 1. <br />
                            Bảng biến thiên: Hàm số đồng biến trên khoảng (1; +∞), nghịch biến trên khoảng (-∞; 1).
                          </p>

                          <p className="pl-3">
                            Bảng giá trị điểm đặc biệt: <br />
                            x = 0 =&gt; y = 1; x = 2 =&gt; y = 1 <br />
                            x = -1 =&gt; y = 7; x = 3 =&gt; y = 7
                          </p>
                        </div>

                        <div className="pt-2">
                          <p className="font-bold text-slate-900 not-italic font-sans text-xs">Bài 2: Vẽ đồ thị</p>
                          <p className="pl-3">Đồ thị Parabol đối xứng qua đường thẳng x = 1, cắt trục tung Oy tại điểm A(0; 1), đỉnh I(1; -1).</p>
                        </div>
                      </div>

                      {/* Circular Grading Stamp */}
                      {previewSub.grade !== undefined && (
                        <div className="absolute right-14 top-14 w-24 h-24 rounded-full border-4 border-red-500/80 flex flex-col items-center justify-center text-red-600 rotate-[-12deg] bg-white/40 shadow-sm pointer-events-none select-none">
                          <span className="text-[9px] uppercase font-black tracking-widest text-red-500">ĐÃ CHẤM</span>
                          <span className="text-2xl font-black text-red-600">{previewSub.grade}</span>
                          <span className="text-[10px] font-bold text-red-500">ĐIỂM SỐ</span>
                        </div>
                      )}

                      {/* Page Footer */}
                      <div className="absolute bottom-6 left-10 right-10 text-center text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-3">
                        <span>Trang 1 / 1 — Học sinh {previewSub.studentName || 'Lê Thị Bình'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer / Feedback panel */}
            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-400">Nhận xét của cô Hoa:</span>
                <span className="text-indigo-400 font-bold bg-indigo-500/10 px-3 py-1 rounded-lg">
                  {previewSub.feedback ? `"${previewSub.feedback}"` : 'Chưa có nhận xét nào.'}
                </span>
              </div>
              <div className="flex gap-2">
                {isTeacher && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewSub(null);
                      setGradingSubId(previewSub.id);
                      setGradeValue(previewSub.grade || 10);
                      setFeedbackValue(previewSub.feedback || '');
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow transition-all"
                  >
                    Chấm điểm / Sửa điểm tệp này
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    setPreviewSub(null);
                    setZoomLevel(1);
                    setRotationAngle(0);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors border border-slate-700"
                >
                  Đóng lại
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Standard Assignment Submit Confirmation Modal */}
      <ConfirmModal
        isOpen={showStandardSubmitModal}
        onClose={() => setShowStandardSubmitModal(false)}
        onConfirm={() => {
          handleStudentSubmit();
          setShowStandardSubmitModal(false);
        }}
        title="Xác nhận nộp bài"
        message="Bạn có chắc chắn muốn nộp bài ngay bây giờ? Sau khi nộp, bạn sẽ không thể chỉnh sửa lại bài làm của mình."
        confirmText="Xác nhận nộp bài"
        cancelText="Quay lại chỉnh sửa"
        variant="info"
      />

      {/* Disqualification Center-Zoom Modal */}
      <ConfirmModal
        isOpen={showDisqualifiedModal}
        onClose={() => setShowDisqualifiedModal(false)}
        onConfirm={() => setShowDisqualifiedModal(false)}
        title="🚨 CẢNH BÁO GIÁM SÁT THI"
        message="Bạn đã vi phạm quy chế thi quá 3 lần (chuyển tab hoặc rời màn hình). Bài thi của bạn đã bị ĐÌNH CHỈ và NỘP BÀI TỰ ĐỘNG lên hệ thống!"
        confirmText="Đã hiểu"
        cancelText="Đóng"
        variant="danger"
      />

      {/* Unsubmitted Students Modal */}
      {unsubmittedModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  Danh sách học sinh chưa nộp bài
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bài tập: <span className="font-bold text-slate-700">{unsubmittedModalAssignment.title}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const unsubmitted = usersList.filter(u => {
                      if (u.role !== 'student') return false;
                      const submittedIds = submissions
                        .filter(s => s.assignmentId === unsubmittedModalAssignment.id)
                        .map(s => s.studentId);
                      return !submittedIds.includes(u.id);
                    });
                    if (unsubmitted.length === 0) {
                      alert('Không có học sinh nào chưa nộp!');
                      return;
                    }
                    const names = unsubmitted.map(s => s.name).join(', ');
                    const text = `🔔 [NHẮC NHỞ HOÀN THÀNH BÀI TẬP]:\nChào các em học sinh chưa nộp bài: ${names}.\nCác em nhớ nộp bài tập "${unsubmittedModalAssignment.title}" trước hạn nhé!`;
                    navigator.clipboard.writeText(text);
                    alert(`Đã sao chép nội dung nhắc nhở học sinh chưa nộp vào bộ nhớ tạm!\n\n${text}`);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép nhắc nhở tất cả</span>
                </button>
                <button 
                  onClick={() => setUnsubmittedModalAssignment(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {(() => {
                const unsubmitted = usersList.filter(u => {
                  if (u.role !== 'student') return false;
                  const submittedIds = submissions
                    .filter(s => s.assignmentId === unsubmittedModalAssignment.id)
                    .map(s => s.studentId);
                  return !submittedIds.includes(u.id);
                });

                if (unsubmitted.length === 0) {
                  return (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">Tuyệt vời! Tất cả học sinh đã nộp bài đầy đủ.</p>
                    </div>
                  );
                }

                return unsubmitted.map(student => (
                  <div key={student.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar name={student.name} firstName={student.firstName} avatar={student.avatar} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{student.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {student.phoneStudent || student.phoneParent || 'Chưa có SĐT'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const text = `🔔 [NHẮC NHỞ BÀI TẬP]: Thầy/cô nhắc em ${student.name} hoàn thành bài tập "${unsubmittedModalAssignment.title}" trên hệ thống học tập nhé!`;
                          navigator.clipboard.writeText(text);
                          setCopiedStudentId(student.id);
                          alert(`Đã sao chép tin nhắn nhắc nhở riêng của ${student.name} vào bộ nhớ tạm!\n\nNội dung:\n"${text}"`);
                          setTimeout(() => setCopiedStudentId(null), 2000);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép nhắc nhở</span>
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setUnsubmittedModalAssignment(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
