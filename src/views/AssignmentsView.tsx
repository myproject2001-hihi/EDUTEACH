import React, { useState, useEffect, useMemo } from 'react';
import { Assignment, Submission, User, QuizQuestion, HTMLSimulation, SubFlashcardSet } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MarkdownMath } from '../components/MarkdownMath';
import { Plus, Search, Upload, MessageSquare, Check, X, FileText, Send, Clock, BookOpen, AlertTriangle, ExternalLink, Play, Copy, Share2, Eye, EyeOff, RotateCw, ZoomIn, ZoomOut, Download, Phone, MessageCircle, AlertCircle, Gamepad2, Camera, HelpCircle, Pencil, Trash2, Sparkles, CheckCircle2, Layers, Radio, LayoutGrid, List, ArrowLeft, ChevronLeft, ChevronRight, Maximize2, Minimize2, FileQuestion, ChevronDown, ChevronUp, Folder, Filter, Timer } from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';
import { CameraCapture } from '../components/CameraCapture';
import { GamePreview } from '../components/GamePreview';
import { FlashcardPreviewModal } from '../components/FlashcardPreviewModal';
import { FlashcardQuizGame } from '../components/FlashcardQuizGame';
import { SimulationFrame } from '../components/SimulationFrame';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from '../components/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GameWizard } from '../components/GameWizard';
import { FlashcardWizard } from '../components/FlashcardWizard';
import { AssignmentListSkeleton, AssignmentDetailSkeleton, SubmissionsListSkeleton } from '../components/Skeletons';
import { DateTimePicker24h } from '../components/DateTimePicker24h';
import { StudentSubmissionDetailModal } from '../components/StudentSubmissionDetailModal';
import { shouldShowNewBadge } from '../utils/resourceVisits';

interface AssignmentsProps {
  user: User;
  assignments: Assignment[];
  submissions: Submission[];
  isLoadingAssignments?: boolean;
  isLoadingSubmissions?: boolean;
  onAddAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitWork: (submission: Omit<Submission, 'id' | 'submittedAt'>) => void;
  onGrade: (submissionId: string, grade: number, feedback: string) => void;
  onAwardPoints?: (points: number, reason?: string) => void;
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
Cách giải: Đất nước tạm thời bị chia cắt làm hai miền Nam, Bắc là nội dung phản ánh đúng tình hình Việt Nam sau Hiệp định Giơnevơ năm 1954.
Chọn A`,

  mau2: `PHẦN I. Câu trắc nghiệm với nhiều phương án lựa chọn.
Câu 1: Phát biểu nào sau đây là mệnh đề?
A. Hà Nội là thủ đô của Việt Nam.
B. Ước gì hôm nay trời không mưa!
C. \\(x + 5 = 8\\).
D. Con mèo này thật đáng yêu!

PHẦN II. Câu trắc nghiệm đúng sai.
Câu 13: Cho các tập hợp \\(A = \\{x \\in \\mathbb{R} \\mid 1 - 2x \\leq 0\\}\\), \\(B = (-3; 3)\\).
a) \\(A \\cap B = [\\frac{1}{2}; 3)\\).
b) \\(C \\subset B\\).

Hướng dẫn giải
Câu 1: Đáp án đúng là: A.`,

  mau3: `Phần 1. TỪ NGỮ BIẾT BAY
Câu 1: Tục ngữ: Lý thuyết phải đi liền với thực tiễn.
Gợi ý: Lý thuyết phải đi liền với thực tiễn.
Đáp án: Học | đi | đôi | với | hành
Nhiễu: chơi | ngủ | nói

Câu 2: Loài vật nào là khắc tinh của loài chuột?
Gợi ý: Loài vật kêu meo meo
Đáp án: Con | mèo | thích | bắt | chuột
Nhiễu: chó | cá | bay | gặm

Câu 3: Tục ngữ khuyên chúng ta phải biết ơn người đi trước.
Gợi ý: Biết ơn cội nguồn
Đáp án: Uống | nước | nhớ | nguồn
Nhiễu: ăn | cây | sông | biển

Câu 4: Tục ngữ về tinh thần tương thân tương ái, giúp đỡ nhau.
Gợi ý: Giúp đỡ người lúc khó khăn
Đáp án: Lá | lành | đùm | lá | rách
Nhiễu: cây | rụng | gió | xanh`,

  mau_matching: `Phần 1. GHÉP NỐI CẶP Ý (ĐOÀN TÀU TRI THỨC)
Câu 1: Hãy ghép nối các cặp câu hỏi và đáp án tương ứng sau đây:
Thủ đô của Việt Nam là thành phố nào? - Hà Nội
Ngọn núi cao nhất Việt Nam là núi nào? - Fansipan
Quốc kỳ Việt Nam có nền màu gì? - Màu đỏ
Phép toán: 9 nhân 8 bằng mấy? - 72
Ngôi sao trên lá cờ Tổ quốc màu gì? - Màu vàng`
};

export interface ParsedQuestionItem {
  id: string;
  numStr: string;
  levelBadge: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching';
  options: string[]; // for ABCD
  subOptions?: string[]; // for abcd
  correctAnswer?: number | string | number[]; 
  points: number;
  method?: string;
  solutionText?: string;
  groupTitle?: string;
  matchingPairs?: { left: string; right: string }[];
  image?: string;
  imageUrl?: string;
  thumb?: string;
}

export function cleanQuestionText(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\s*(Câu|Bài)\s*\d+\s*[\.:]?\s*/gi, '')
    .replace(/^\s*\((?:NB|TH|VD|VDC|B1|B2|B3|B4|M1|M2|M3|M4)\)\s*/gi, '')
    .replace(/^\s*[\.:]\s*/, '')
    .trim();
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
  const rawChunks = rawText.split(/(?=^\s*(?:Câu|Bài)\s*\d+[\.:])/im);
  let currentGroupTitle = initialGroupTitle;

  rawChunks.forEach((chunk, index) => {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) return;

    if (index === 0) {
      if (!trimmedChunk.match(/^(?:Câu|Bài)\s*\d+[\.:]/i)) {
        const matches = chunk.match(/^Phần\s+[^\n]+/igm);
        if (matches) currentGroupTitle = matches[matches.length - 1].trim();
        return;
      }
    }

    if (!trimmedChunk.toLowerCase().includes('câu ') && !trimmedChunk.toLowerCase().includes('bài ')) return;

    const qNumMatch = trimmedChunk.match(/^(?:Câu|Bài)\s*(\d+)[\.:]/im);
    const qNum = qNumMatch ? qNumMatch[1] : `${questionsList.length + 1}`;
    const numStr = `Câu ${qNum}.`;

    const existingQ = questionsList.find(q => q.numStr === numStr);
    const hasOptions = trimmedChunk.match(/(?:^|\n)\s*(?<!\\)[A-DА-Я][\.:]/m) || trimmedChunk.match(/(?:^|\n)\s*(?<!\\)[a-d][\)\.]/m);
    
    if (existingQ && !hasOptions) {
      const dapAnMatch = chunk.match(/Đáp án đúng là\s*[:\.]?\s*([^\n]+)/i) || chunk.match(/Chọn\s+([A-D])/i);
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
      
      let solText = chunk.replace(/^(?:Câu|Bài)\s*\d+[\.:]?/im, '').trim();
      if (dapAnMatch) {
        solText = solText.replace(dapAnMatch[0], '').trim();
      }
      solText = solText.replace(/Đáp án đúng là\s*[:\.]?\s*[^\n]+/gi, '').trim();
      solText = solText.replace(/Chọn\s+[A-D][\.:]?[^\n]*/gi, '').trim();
      solText = solText.replace(/(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Giải thích|Giải chi tiết|Cách giải)\s*[:\.]?/gi, '').trim();
      solText = solText.replace(/^[-–—]\s*/, '').trim();
      
      if (solText) {
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
    const qLineMatch = chunk.match(/^(?:Câu|Bài)\s*\d+[\.:]?\s*(\((?:NB|TH|VD|VDC|B1|B2|B3|B4)\))?\s*([^\n]*)/im);
    if (qLineMatch && qLineMatch[2]) {
      questionText = qLineMatch[2].trim();
    }
    
    const questionLines = [];
    const clines = chunk.split('\n');
    let captureQ = false;
    for (const l of clines) {
       if (l.match(/^(?:Câu|Bài)\s*\d+[\.:]?/i)) {
         captureQ = true;
         continue;
       }
       if (l.match(/^[A-D][\.:]/i) || l.match(/^[a-d][\)\.]/i) || l.match(/^Lời giải/i) || l.match(/^Hướng dẫn giải/i) || l.match(/^Phần/i) || l.match(/^Đáp án/i)) {
         captureQ = false;
       }
       if (captureQ && l.trim()) {
         questionLines.push(l.trim());
       }
    }
    if (questionLines.length > 0) {
      if (questionText) {
        questionText += '\n' + questionLines.join('\n');
      } else {
        questionText = questionLines.join('\n');
      }
    }

    questionText = cleanQuestionText(questionText);

    let type: 'multiple_choice' | 'true_false' | 'short_answer' | 'matching' = 'short_answer';
    let points = 0.5;
    const options: string[] = ['', '', '', ''];
    const subOptions: string[] = ['', '', '', ''];

    const matchingPairs: { left: string; right: string }[] = [];
    const clinesForPairs = chunk.split('\n');
    clinesForPairs.forEach(l => {
      const trimmedL = l.trim();
      const matchSplit = trimmedL.split(/\s+[-–—]\s+/);
      if (matchSplit.length === 2) {
        const leftSide = matchSplit[0].trim();
        const rightSide = matchSplit[1].trim();
        const isMetadata = leftSide.match(/^(?:Câu|Bài|Chọn|Đáp án|Phương pháp|Cách giải)/i) || 
                          leftSide.match(/^[A-D][\.:]/i) || 
                          leftSide.match(/^[a-d][\)\.]/i) ||
                          leftSide.toLowerCase().startsWith('phần ');
        if (!isMetadata && leftSide && rightSide) {
          matchingPairs.push({ left: leftSide, right: rightSide });
        }
      }
    });

    // Extract options safely without cutting
    const optAMatch = chunk.match(/(?:^|\n)\s*(?<!\\)[AА][\.:]\s*([\s\S]*?)(?=(?:(?:^|\n)\s*(?<!\\)[BВ][\.:])|\s+(?<!\\)[BВ][\.:]|(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Giải thích|Đáp án|Chọn\s+[A-D])|$)/i);
    const optBMatch = chunk.match(/(?:^|\n|\s+)\s*(?<!\\)[BВ][\.:]\s*([\s\S]*?)(?=(?:(?:^|\n)\s*(?<!\\)[CС][\.:])|\s+(?<!\\)[CС][\.:]|(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Giải thích|Đáp án|Chọn\s+[A-D])|$)/i);
    const optCMatch = chunk.match(/(?:^|\n|\s+)\s*(?<!\\)[CС][\.:]\s*([\s\S]*?)(?=(?:(?:^|\n)\s*(?<!\\)[DĐ][\.:])|\s+(?<!\\)[DĐ][\.:]|(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Giải thích|Đáp án|Chọn\s+[A-D])|$)/i);
    const optDMatch = chunk.match(/(?:^|\n|\s+)\s*(?<!\\)[DĐ][\.:]\s*([\s\S]*?)(?=(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Giải thích|Đáp án|Chọn\s+[A-D])|$)/i);
    
    // 2. True/False Sub-options (a) / b) / c) / d))
    const subAMatch = chunk.match(/(?:^|\n)\s*(?<!\\)[aа][\)\.]\s*([\s\S]*?)(?=(?:^|\n)\s*(?<!\\)[bв][\)\.]|(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Đáp án)|$)/i);
    const subBMatch = chunk.match(/(?:^|\n)\s*(?<!\\)[bв][\)\.]\s*([\s\S]*?)(?=(?:^|\n)\s*(?<!\\)[cс][\)\.]|(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Đáp án)|$)/i);
    const subCMatch = chunk.match(/(?:^|\n)\s*(?<!\\)[cс][\)\.]\s*([\s\S]*?)(?=(?:^|\n)\s*(?<!\\)[dđ][\)\.]|(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Đáp án)|$)/i);
    const subDMatch = chunk.match(/(?:^|\n)\s*(?<!\\)[dđ][\)\.]\s*([\s\S]*?)(?=(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Đáp án)|$)/i);

    if (matchingPairs.length > 0) {
      type = 'matching';
      points = 1.0;
    } else if (optAMatch && optBMatch) {
      type = 'multiple_choice';
      points = 0.25;
      options[0] = optAMatch[1].trim();
      options[1] = optBMatch[1].trim();
      if (optCMatch) options[2] = optCMatch[1].trim();
      if (optDMatch) options[3] = optDMatch[1].trim();
    } else if (subAMatch && subBMatch) {
      type = 'true_false';
      points = 1.0;
      subOptions[0] = subAMatch[1].trim();
      subOptions[1] = subBMatch[1].trim();
      if (subCMatch) subOptions[2] = subCMatch[1].trim();
      if (subDMatch) subOptions[3] = subDMatch[1].trim();
    }

    let correctAnswer: number | string | number[] | undefined = undefined;
    const selectMatch = chunk.match(/Chọn\s+([A-D])/i);
    const dapAnMatch = chunk.match(/(?:Đáp án đúng là|Đáp án|Chọn)\s*[:\.]?\s*([^\n]+)/i);

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

    // Extract Hướng dẫn giải / Lời giải / Cách giải / Giải thích
    const solHeaderMatch = chunk.match(/(?:^|\n)\s*(?:Hướng dẫn giải|Lời giải|Giải thích|Giải chi tiết|Cách giải)\s*[:\.]?/i);
    if (solHeaderMatch && solHeaderMatch.index !== undefined) {
      let solSection = chunk.slice(solHeaderMatch.index + solHeaderMatch[0].length).trim();
      
      const methodM = solSection.match(/Phương pháp\s*[:\.]?\s*([\s\S]*?)(?=(?:Cách giải|Đáp án đúng là|Chọn\s+[A-D]|$))/i);
      if (methodM) {
        method = methodM[1].trim();
        solSection = solSection.replace(methodM[0], '').trim();
      }

      const cáchGiảiM = solSection.match(/Cách giải\s*[:\.]?\s*/i);
      if (cáchGiảiM) {
        solSection = solSection.replace(cáchGiảiM[0], '').trim();
      }

      // Remove "Đáp án đúng là: ..." and "Chọn X" from solutionText
      solSection = solSection.replace(/Đáp án đúng là\s*[:\.]?\s*[^\n]+/gi, '').trim();
      solSection = solSection.replace(/Chọn\s+[A-D][\.:]?[^\n]*/gi, '').trim();
      solSection = solSection.replace(/^[-–—]\s*/, '').trim();
      
      if (solSection) {
        solutionText = solSection;
      }
    } else {
      const methodMatch = chunk.match(/Phương pháp:\s*([^\n]+)/i);
      if (methodMatch) method = methodMatch[1].trim();
      const solutionMatch = chunk.match(/Cách giải:\s*([\s\S]+)/i);
      if (solutionMatch) solutionText = solutionMatch[1].trim();
    }

    if (!questionText) {
      questionText = 'Nội dung câu hỏi chưa được định dạng đúng';
    }

    const imageMatch = chunk.match(/(?:^|\n)\s*(?:Ảnh|Hình|Image):\s*(https?:\/\/[^\s\n]+)/i);
    const image = imageMatch ? imageMatch[1].trim() : undefined;

    questionsList.push({
      id: `parsed_q_${index}_${Date.now()}`,
      numStr: `Câu ${questionsList.length + 1}.`,
      levelBadge,
      question: questionText,
      type,
      options,
      subOptions,
      correctAnswer,
      points,
      method,
      solutionText,
      groupTitle: currentGroupTitle,
      matchingPairs,
      image
    });

    const matches = chunk.match(/^Phần\s+[^\n]+/igm);
    if (matches) currentGroupTitle = matches[matches.length - 1].trim();
  });

  return { groupTitle: initialGroupTitle, parsedQuestions: questionsList };
}

export function questionsToRawCode(questions?: QuizQuestion[]): string {
  if (!questions || questions.length === 0) return SAMPLE_TEMPLATES.mau2;
  return questions.map((q, idx) => {
    let str = `${q.numStr || `Câu ${idx + 1}.`} ${q.question || ''}\n`;
    
    if (q.type === 'multiple_choice' && q.options) {
      const labels = ['A.', 'B.', 'C.', 'D.'];
      q.options.forEach((opt, oIdx) => {
        if (opt) str += `${labels[oIdx] || 'A.'} ${opt}\n`;
      });
    } else if (q.type === 'true_false' && q.subOptions) {
      const labels = ['a)', 'b)', 'c)', 'd)'];
      q.subOptions.forEach((sOpt, sIdx) => {
        if (sOpt) str += `${labels[sIdx] || 'a)'} ${sOpt}\n`;
      });
    } else if (q.type === 'matching' && q.matchingPairs) {
      q.matchingPairs.forEach(pair => {
        str += `${pair.left} - ${pair.right}\n`;
      });
    }

    if (q.solutionText || q.correctAnswer !== undefined || q.method) {
      str += `\nHướng dẫn giải\n`;
      if (q.method) {
        str += `Phương pháp: ${q.method}\n`;
      }
      if (q.type === 'multiple_choice' && typeof q.correctAnswer === 'number') {
        const char = ['A', 'B', 'C', 'D'][q.correctAnswer] || 'A';
        str += `Đáp án đúng là: ${char}.\n`;
      } else if (q.type === 'true_false' && Array.isArray(q.correctAnswer)) {
        const tfStr = q.correctAnswer.map(v => v === 1 ? 'đúng' : 'sai').join(', ');
        str += `Đáp án đúng là: ${tfStr}.\n`;
      } else if (q.correctAnswer !== undefined && typeof q.correctAnswer !== 'object') {
        str += `Đáp án đúng là: ${q.correctAnswer}.\n`;
      }
      if (q.solutionText) {
        str += `${q.solutionText}\n`;
      }
    }
    return str;
  }).join('\n\n');
}

export function formatForDateTimeInput(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

const DEFAULT_THUMBNAILS = {
  online_test: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
  game: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
  flashcard: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
  lesson_check: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=600&q=80',
  simulation: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
  file_upload: 'https://images.unsplash.com/photo-1454165833767-027ffea9e7a7?auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80'
};

export function AssignmentsView({ 
  user, 
  assignments: rawAssignments, 
  submissions, 
  isLoadingAssignments = false,
  isLoadingSubmissions = false,
  onAddAssignment, 
  onSubmitWork: propOnSubmitWork, 
  onGrade,
  onAwardPoints,
  initialSelectedAssignmentId,
  onClearInitialSelectedAssignmentId,
  simulations,
  viewMode = 'assignments'
}: AssignmentsProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  // Celebration states
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{
    title: string;
    points: number;
    gradeText: string;
    assignmentTitle: string;
    feedbackMsg: string;
  } | null>(null);

  const onSubmitWork = (submission: Omit<Submission, 'id' | 'submittedAt'>) => {
    // Submit the real work to database
    propOnSubmitWork(submission);

    // Only show celebration overlay for students
    if (!isTeacher) {
      const calculatedPoints = submission.grade ? Math.round(submission.grade * 10) : 10;
      const assignmentTitle = rawAssignments.find(a => a.id === submission.assignmentId)?.title || 'Bài tập';
      
      let title = 'XUẤT SẮC! 🎉';
      let feedbackMsg = 'Em đã làm rất tốt, hãy luôn phát huy tinh thần tự học tuyệt vời này nhé!';
      if (submission.grade !== undefined) {
        if (submission.grade >= 9) {
          title = 'XUẤT SẮC! 🎉';
          feedbackMsg = 'Kết quả hoàn hảo! Bộ não của em thật nhạy bén và tuyệt vời!';
        } else if (submission.grade >= 7) {
          title = 'GIỎI QUÁ! ✨';
          feedbackMsg = 'Quá tuyệt vời! Chăm chỉ luyện tập thêm một chút nữa để đạt điểm tối đa nha!';
        } else if (submission.grade >= 5) {
          title = 'HOÀN THÀNH! 👍';
          feedbackMsg = 'Chúc mừng em đã vượt qua thử thách này! Cùng cố gắng hơn nữa ở bài sau nhé!';
        } else {
          title = 'NỖ LỰC ĐÁNG KHEN! 🌱';
          feedbackMsg = 'Cảm ơn em đã nỗ lực làm bài! Lần sau chắc chắn sẽ đạt điểm cao hơn!';
        }
      }

      setCelebrationDetails({
        title,
        points: calculatedPoints,
        gradeText: submission.grade !== undefined ? `${submission.grade}/10` : 'Hoàn thành',
        assignmentTitle,
        feedbackMsg
      });
      setShowCelebration(true);

      // Trigger high-quality fireworks/confetti!
      // 1. Center burst
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.65 }
      });

      // 2. Left side launcher
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.75 }
        });
      }, 200);

      // 3. Right side launcher
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.75 }
        });
      }, 400);

      // 4. Random glitter rain
      const end = Date.now() + 1.2 * 1000;
      const interval = setInterval(() => {
        if (Date.now() > end) {
          return clearInterval(interval);
        }
        confetti({
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
      }, 200);
    }
  };

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
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteConfirmAssignment, setDeleteConfirmAssignment] = useState<Assignment | null>(null);
  const [selectedIdsForDeletion, setSelectedIdsForDeletion] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);

  // Search & Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unsubmitted' | 'overdue' | 'submitted'>('all');
  const [filterOnAir, setFilterOnAir] = useState<'all' | 'on_air' | 'draft'>('all');

  // Status counts for current student / overall
  const statusCounts = useMemo(() => {
    let submitted = 0;
    let unsubmitted = 0;
    let overdue = 0;

    const baseList = assignments.filter(a => {
      if (!isTeacher && !isAdmin && a.isPublished === false) return false;
      return true;
    });

    baseList.forEach(a => {
      const isPastDue = new Date(a.dueDate) < new Date();
      const mySub = submissions.find(s => s.assignmentId === a.id && s.studentId === user.id);
      if (mySub) {
        submitted++;
      } else if (isPastDue) {
        overdue++;
      } else {
        unsubmitted++;
      }
    });

    return {
      all: baseList.length,
      submitted,
      unsubmitted,
      overdue
    };
  }, [assignments, submissions, user.id, isTeacher, isAdmin]);

  // Chat với giáo viên states
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatType, setChatType] = useState<'system'>('system');
  const [chatStatus, setChatStatus] = useState<{ type: 'idle' | 'sending' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  const filteredAssignments = React.useMemo(() => {
    return assignments.filter(assignment => {
      // 0. Filter out unpublished for students
      if (!isTeacher && !isAdmin && assignment.isPublished === false) return false;

      // 0.5 Filter by class for students
      if (!isTeacher && !isAdmin && assignment.className && assignment.className !== user.className) return false;

      // 1. Search Query Match
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const titleMatch = (assignment.title || '').toLowerCase().includes(q);
        const descMatch = (assignment.description || '').toLowerCase().includes(q);
        const sessionMatch = (assignment.classSessionTitle || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !sessionMatch) return false;
      }

      // 2. Filter by Category / Type Match
      if (filterType !== 'all') {
        const matchesCategory = assignment.category === filterType;
        const matchesType = assignment.type === filterType;
        if (!matchesCategory && !matchesType) return false;
      }

      // 3. Filter by Due Date Match
      if (filterDueDate !== 'all') {
        const isPastDue = new Date(assignment.dueDate) < new Date();
        if (filterDueDate === 'upcoming' && isPastDue) return false;
        if (filterDueDate === 'overdue' && !isPastDue) return false;
      }

      // 4. Filter by Status (Đã nộp, Chưa nộp, Quá hạn)
      if (filterStatus !== 'all') {
        const isPastDue = new Date(assignment.dueDate) < new Date();
        const mySub = submissions.find(s => s.assignmentId === assignment.id && s.studentId === user.id);
        const isSub = Boolean(mySub);

        if (filterStatus === 'submitted') {
          if (!isSub) return false;
        } else if (filterStatus === 'unsubmitted') {
          if (isSub || isPastDue) return false;
        } else if (filterStatus === 'overdue') {
          if (isSub || !isPastDue) return false;
        }
      }

      // 5. Filter by On Air status (Teacher mode)
      if (isTeacher && filterOnAir !== 'all') {
        if (filterOnAir === 'on_air' && assignment.isPublished === false) return false;
        if (filterOnAir === 'draft' && assignment.isPublished !== false) return false;
      }

      return true;
    });
  }, [assignments, searchQuery, filterType, filterDueDate, filterStatus, filterOnAir, submissions, user.id, isTeacher, isAdmin]);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Auto scroll to top when selecting or navigating assignments
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [selectedAssignment]);

  const [layoutDensity, setLayoutDensity] = useState<'comfortable' | 'compact'>(() => {
    return (localStorage.getItem('layout_density') as 'comfortable' | 'compact') || 'comfortable';
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('layout_density');
      if (saved === 'comfortable' || saved === 'compact') {
        setLayoutDensity(saved);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Unsubmitted students modal state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [classList, setClassList] = useState<any[]>([]);
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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'class_sessions'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setClassList(list);
    });
    return () => unsub();
  }, []);

  const teacherClasses = React.useMemo(() => {
    return classList.filter(c => c.teacherId === user.id || user.role === 'admin');
  }, [classList, user]);

  const availableTeacherClasses = React.useMemo(() => {
    const classSet = new Set<string>();

    // 1. Classes from teacher's sessions (or all sessions for admin)
    classList.forEach((c: any) => {
      if (user.role === 'admin' || c.teacherId === user.id || c.teacherName === user.name) {
        if (c.className && typeof c.className === 'string') classSet.add(c.className.trim());
        if (c.title && typeof c.title === 'string') {
          classSet.add(c.title.trim());
        }
      }
    });

    // 2. Classes from students registered in the system
    usersList.forEach(u => {
      if (u.role === 'student' && u.className && typeof u.className === 'string') {
        classSet.add(u.className.trim());
      }
    });

    // 3. Class from teacher's own profile
    if (user.className && typeof user.className === 'string') {
      classSet.add(user.className.trim());
    }

    // 4. Classes from teacher's existing assignments
    assignments.forEach(a => {
      if (a.className && typeof a.className === 'string') {
        classSet.add(a.className.trim());
      }
    });

    // Default standard classes if empty
    const defaults = ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'];
    defaults.forEach(d => classSet.add(d));

    return Array.from(classSet).filter(Boolean).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [classList, usersList, user, assignments]);



  // Teacher Create Assignment Form State
  const [newType, setNewType] = useState<'file_upload' | 'online_test' | 'simulation' | 'game' | 'flashcard' | 'lesson_check'>('file_upload');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [newSimUrl, setNewSimUrl] = useState('');
  const [selectedSimId, setSelectedSimId] = useState<string>('');
  const [newGameType, setNewGameType] = useState('quiz_nghieng_dau');
  const [newTugOfWarMode, setNewTugOfWarMode] = useState<'bot' | 'pvp'>('bot');
  const [gameSubStep, setGameSubStep] = useState<1 | 2 | 3>(1);
  const [flashcardSubStep, setFlashcardSubStep] = useState<1 | 2>(1);
  const [selectedGameCategory, setSelectedGameCategory] = useState<string>('all');
  const [gameSearchQuery, setGameSearchQuery] = useState<string>('');
  const [newGameFormats, setNewGameFormats] = useState<string[]>(['multiple_choice', 'true_false']);
  const [newFlashcards, setNewFlashcards] = useState<{id: string, front: string, back: string, image?: string, frontImage?: string, backImage?: string}[]>([{ id: Date.now().toString(), front: '', back: '' }]);
  const [newSubFlashcardSets, setNewSubFlashcardSets] = useState<SubFlashcardSet[]>([]);
  const [activeSubSetId, setActiveSubSetId] = useState<string>('all');
  const [expandedSubSetId, setExpandedSubSetId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isFlashcardFullscreen, setIsFlashcardFullscreen] = useState(false);

  const toggleFlashcardFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen request failed:', err);
      }
      setIsFlashcardFullscreen(true);
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      } catch (err) {
        console.warn('Fullscreen exit failed:', err);
      }
      setIsFlashcardFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFSChange = () => {
      if (!document.fullscreenElement) {
        setIsFlashcardFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const [expandedListGroups, setExpandedListGroups] = useState<Record<string, boolean>>({});

  const toggleListGroup = (assignmentId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedListGroups(prev => ({
      ...prev,
      [assignmentId]: !(prev[assignmentId] ?? true)
    }));
  };

  useEffect(() => {
    if (selectedAssignment?.subFlashcardSets && selectedAssignment.subFlashcardSets.length > 0) {
      setActiveSubSetId(prev => {
        if (prev === 'all' || selectedAssignment.subFlashcardSets?.some(s => s.id === prev)) {
          return prev;
        }
        return 'overview';
      });
    } else {
      setActiveSubSetId('all');
    }
  }, [selectedAssignment?.id]);

  const displayFlashcards = useMemo(() => {
    if (!selectedAssignment || selectedAssignment.type !== 'flashcard') return [];
    if (selectedAssignment.subFlashcardSets && selectedAssignment.subFlashcardSets.length > 0) {
      if (activeSubSetId === 'overview' || activeSubSetId === 'all') {
        return selectedAssignment.flashcards && selectedAssignment.flashcards.length > 0
          ? selectedAssignment.flashcards
          : selectedAssignment.subFlashcardSets.flatMap(s => s.flashcards || []);
      }
      const found = selectedAssignment.subFlashcardSets.find(s => s.id === activeSubSetId);
      return found ? (found.flashcards || []) : (selectedAssignment.flashcards || []);
    }
    return selectedAssignment.flashcards || [];
  }, [selectedAssignment, activeSubSetId]);
  const [showGamePreview, setShowGamePreview] = useState(false);
  const [showFlashcardPreview, setShowFlashcardPreview] = useState(false);
  const [showFlashcardQuizTest, setShowFlashcardQuizTest] = useState(false);
  const [newIsMandatory, setNewIsMandatory] = useState(false);
  const [newIsPublished, setNewIsPublished] = useState(false);
  const [newMaxAttempts, setNewMaxAttempts] = useState<number>(0); // 0 = vĩnh viễn (không giới hạn)
  const [newTimeLimit, setNewTimeLimit] = useState<number>(0);
  const [newShuffleQuestions, setNewShuffleQuestions] = useState<boolean>(false);
  const [isRetryingUpload, setIsRetryingUpload] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [showEmbeddedSim, setShowEmbeddedSim] = useState(false);

  // Online test raw code input (Azota style)
  const [rawQuestionCode, setRawQuestionCode] = useState<string>(SAMPLE_TEMPLATES.mau2);

  // Memoized parsed questions from rawQuestionCode to prevent heavy regex re-parsing on every re-render
  const parsedQuestionsData = useMemo(() => parseRawCodeToQuestions(rawQuestionCode), [rawQuestionCode]);

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
  const [shuffledExamQuestions, setShuffledExamQuestions] = useState<QuizQuestion[] | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [viewedCards, setViewedCards] = useState<Set<string>>(new Set());
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [mobileExamTab, setMobileExamTab] = useState<'questions' | 'bubble'>('questions');
  const [submitContent, setSubmitContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedPageCount, setUploadedPageCount] = useState<number | undefined>(undefined);
  const [submittedSuccessModal, setSubmittedSuccessModal] = useState<{
    assignmentTitle: string;
    fileName: string;
    pageCount?: number;
    submittedAt: string;
    content?: string;
  } | null>(null);
  const [previewSub, setPreviewSub] = useState<Submission | null>(null);
  const [inspectingSubmission, setInspectingSubmission] = useState<Submission | null>(null);
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState<'all' | 'pending' | 'graded'>('all');
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotationAngle, setRotationAngle] = useState<number>(0);

  // Azota Exam States
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const [examTimeRemaining, setExamTimeRemaining] = useState<number | null>(null); // null = unlimited
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
      const found = (rawAssignments || []).find(a => a.id === initialSelectedAssignmentId) || assignments.find(a => a.id === initialSelectedAssignmentId);
      if (found) {
        setSelectedAssignment(found);
        
        // Auto-start is removed to let students read the assignment details before starting.
        // The user complained about seeing black modals directly on load.
      }
      if (onClearInitialSelectedAssignmentId) {
        onClearInitialSelectedAssignmentId();
      }
    }
  }, [initialSelectedAssignmentId, rawAssignments, assignments, onClearInitialSelectedAssignmentId, isTeacher]);

  useEffect(() => {
    setIsExamStarted(false);
    setTabSwitchCount(0);
    setShowCheatWarning(false);
    setIsNotFullscreen(false);
    setExamTimeRemaining(selectedAssignment?.timeLimit ? selectedAssignment.timeLimit * 60 : null);
    setShuffledExamQuestions(null);
    setFlippedCards(new Set());
    setViewedCards(new Set());
    setActiveCardIndex(0);
  }, [selectedAssignment?.id, selectedAssignment?.timeLimit]);

  useEffect(() => {
    if ((isExamStarted || showFlashcardQuizTest) && selectedAssignment && selectedAssignment.questions) {
      if (selectedAssignment.shuffleQuestions) {
        setShuffledExamQuestions([...selectedAssignment.questions].sort(() => Math.random() - 0.5));
      } else {
        setShuffledExamQuestions(selectedAssignment.questions);
      }
    }
  }, [isExamStarted, showFlashcardQuizTest, selectedAssignment]);

  useEffect(() => {
    if (selectedAssignment?.type === 'flashcard' && selectedAssignment.flashcards) {
      const activeCard = selectedAssignment.flashcards[activeCardIndex];
      if (activeCard) {
        setViewedCards(prev => new Set(prev).add(activeCard.id));
      }
    }
  }, [activeCardIndex, selectedAssignment]);

  useEffect(() => {
    let timerInterval: any = null;
    const isTimerActive = isExamStarted || showFlashcardQuizTest;
    
    if (isTimerActive && examTimeRemaining !== null && examTimeRemaining > 0) {
      timerInterval = setInterval(() => {
        setExamTimeRemaining(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isExamStarted, showFlashcardQuizTest, examTimeRemaining !== null && examTimeRemaining > 0]);

  // Effect to handle auto-submission when time reaches 0
  useEffect(() => {
    if (isExamStarted && examTimeRemaining === 0) {
      // NOTE: We only call handleAutoSubmitExam for online_test mode here.
      // Game and Flashcard modes handle their own auto-submit via timeLimitRemaining prop.
      if (selectedAssignment?.type === 'online_test') {
        handleAutoSubmitExam();
      }
    }
  }, [isExamStarted, examTimeRemaining, selectedAssignment]);

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

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.command === 'submit_result') {
        const answerTrue = typeof data.answerTrue === 'number' ? data.answerTrue : 0;
        const totalQuestion = typeof data.totalQuestion === 'number' && data.totalQuestion > 0 ? data.totalQuestion : 1;
        
        // Calculate grade out of 10
        const computedGrade = Math.min(10, Math.round((answerTrue / totalQuestion) * 10));

        if (selectedAssignment && user) {
          const alreadySubmitted = submissions.some(
            s => s.assignmentId === selectedAssignment.id && s.studentId === user.id
          );
          if (!alreadySubmitted) {
            onSubmitWork({
              assignmentId: selectedAssignment.id,
              studentId: user.id,
              studentName: user.name,
              content: `Mô phỏng HTML nộp bài tự động qua postMessage. Trả lời đúng ${answerTrue}/${totalQuestion} câu.`,
              grade: computedGrade
            });
            alert(`Chúc mừng! Em đã hoàn thành bài thực hành mô phỏng thành công với điểm số: ${computedGrade}/10 điểm.`);
          }
        }
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [selectedAssignment, user, submissions, onSubmitWork]);

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
    if (isTeacher) {
      alert(`[XEM TRƯỚC - TỰ ĐỘNG NỘP] Bài làm đã được nộp! Điểm của bạn: ${earnedPoints}`);
    } else {
      onSubmitWork({
        assignmentId: selectedAssignment!.id,
        studentId: user.id,
        studentName: user.name,
        content: `Nộp bài tự động (Hết giờ làm bài). Giám sát: Phát hiện chuyển tab hoặc rời màn hình ${tabSwitchCount} lần.`,
        quizAnswers: studentQuizAnswers,
        grade: earnedPoints
      });
    }
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
    if (isTeacher) {
      alert(`[XEM TRƯỚC] Bài làm đã được nộp! Điểm của bạn: ${earnedPoints}`);
    } else {
      onSubmitWork({
        assignmentId: selectedAssignment!.id,
        studentId: user.id,
        studentName: user.name,
        content: `Đã hoàn thành làm bài trắc nghiệm trực tuyến. Giám sát: Ghi nhận ${tabSwitchCount} lần chuyển tab hoặc rời toàn màn hình.`,
        quizAnswers: studentQuizAnswers,
        grade: earnedPoints
      });
    }
    setTabSwitchCount(0);
    setIsNotFullscreen(false);
  };

  const formatTimeRemaining = (seconds: number | null) => {
    if (seconds === null) return 'Không giới hạn';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Grading State for Teacher
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [gradeValue, setGradeValue] = useState<number>(0);
  const [feedbackValue, setFeedbackValue] = useState<string>('');
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    setIsDeletingSubmission(true);
    try {
      await deleteDoc(doc(db, 'submissions', submissionToDelete.id));
      setSubmissionToDelete(null);
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Không thể xóa bài nộp. Vui lòng thử lại sau.');
    } finally {
      setIsDeletingSubmission(false);
    }
  };


  const handleSendChatQuestion = async () => {
    if (!chatQuestion.trim()) return;
    setChatStatus({ type: 'sending', message: '' });

    try {
      const timestamp = new Date().toISOString();
      const notifId = 'chat_notif_' + Date.now();

      const newNotif = {
        id: notifId,
        title: `❓ Thắc mắc bài: ${user.name}`,
        content: `Học sinh *${user.name}* (Lớp ${user.className || 'Chưa rõ'}) có thắc mắc về bài tập "${selectedAssignment?.title || 'Không xác định'}":

"${chatQuestion.trim()}"`,
        type: 'personal_reminder', // Ensures teachers/admins get notified
        badge: '💬 Hỏi Bài',
        badgeColor: 'rose',
        createdAt: timestamp
      };

      await setDoc(doc(db, 'system_notifications', notifId), newNotif);

      setChatStatus({ type: 'success', message: 'Gửi câu hỏi thành công!' });
      setChatQuestion('');
      setTimeout(() => {
        setShowChatModal(false);
        setChatStatus({ type: 'idle', message: '' });
      }, 3500);
    } catch (err: any) {
      console.error("Lỗi gửi thắc mắc bài tập:", err);
      setChatStatus({ type: 'error', message: err.message || 'Gửi thắc mắc thất bại, vui lòng thử lại.' });
    }
  };

  const handleImportFlashcards = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      try {
        // If file is JSON
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const newCards = parsed.map((item: any, index: number) => {
              return {
                id: item.id ? String(item.id) : `fc_${Date.now()}_${index}`,
                front: String(item.front || item.question || '').trim(),
                back: String(item.back || item.answer || '').trim(),
                image: item.image ? String(item.image).trim() : undefined
              };
            }).filter(c => c.front.length > 0 || c.back.length > 0);
            
            if (newCards.length > 0) {
              setNewFlashcards(newCards);
              alert(`Nhập thành công ${newCards.length} thẻ ghi nhớ từ file JSON!`);
            } else {
              alert('File JSON không chứa thẻ hợp lệ.');
            }
            return;
          }
        }
      } catch (err) {
        console.error("Lỗi parse JSON:", err);
        alert('File JSON có định dạng không hợp lệ. Vui lòng kiểm tra lại cấu trúc.');
        return;
      }

      // Default TXT/CSV fallback
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
        alert(`Nhập thành công ${newCards.length} thẻ ghi nhớ từ file văn bản!`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleDownloadSampleFlashcards = () => {
    const sampleJSON = [
      {
        "front": "Apple",
        "back": "Quả táo",
        "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200"
      },
      {
        "front": "Banana",
        "back": "Quả chuối",
        "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200"
      },
      {
        "front": "Cat",
        "back": "Con mèo",
        "image": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200"
      },
      {
        "front": "Dog",
        "back": "Con chó",
        "image": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200"
      },
      {
        "front": "1 + 1 = ?",
        "back": "Bằng 2",
        "image": ""
      }
    ];
    
    const blob = new Blob([JSON.stringify(sampleJSON, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mau_kho_flashcard.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenCreateModal = (
    targetType?: 'file_upload' | 'online_test' | 'simulation' | 'game' | 'flashcard' | 'lesson_check',
    initialFlashcards?: { id: string; front: string; back: string; image?: string; frontImage?: string; backImage?: string; }[],
    initialSubFlashcardSets?: SubFlashcardSet[]
  ) => {
    const finalType = targetType || (viewMode === 'games' ? 'game' : viewMode === 'flashcards' ? 'flashcard' : 'file_upload');
    setEditingAssignment(null);
    setNewType(finalType);
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setNewSessionTitle('');
    setNewGrade('');
    setNewClassName('');
    setNewPdfUrl('');
    setNewSimUrl('');
    setSelectedSimId('');
    setNewGameType('quiz_nghieng_dau');
    setNewTugOfWarMode('bot');
    setNewGameFormats(['multiple_choice', 'true_false']);
    setNewIsMandatory(false);
    setNewTimeLimit(0);
    setNewShuffleQuestions(false);
    setNewIsPublished(false); // Default to draft for new assignments
    setNewMaxAttempts(0);
    setGameSubStep(1);
    setFlashcardSubStep(1);
    setCreateStep(1);
    // Complete reset of flashcards and raw question code
    if (initialFlashcards && initialFlashcards.length > 0) {
      setNewFlashcards(initialFlashcards);
    } else {
      setNewFlashcards([{ id: Date.now().toString(), front: '', back: '' }]);
    }
    setNewSubFlashcardSets(initialSubFlashcardSets || []);
    setRawQuestionCode(SAMPLE_TEMPLATES.mau2);
    setQuestions([
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
    setSelectedGameCategory('all');
    setGameSearchQuery('');
    setShowGamePreview(false);
    setShowFlashcardPreview(false);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setNewType(assignment.type);
    setNewTitle(assignment.title || '');
    setNewDescription(assignment.description || '');
    setNewDueDate(formatForDateTimeInput(assignment.dueDate));
    setNewSessionTitle(assignment.classSessionTitle || '');
    setNewGrade(assignment.grade || '');
    setNewClassName(assignment.className || '');
    setNewPdfUrl(assignment.pdfUrl || '');
    setNewSimUrl(assignment.simulationUrl || '');
    setNewGameType(assignment.gameType || 'quiz_nghieng_dau');
    setNewTugOfWarMode(assignment.tugOfWarMode || 'bot');
    setNewGameFormats(assignment.gameFormats || ['multiple_choice', 'true_false']);
    setNewIsMandatory(assignment.isMandatory || false);
    setNewTimeLimit(assignment.timeLimit || 0);
    setNewShuffleQuestions(assignment.shuffleQuestions || false);
    setNewIsPublished(assignment.isPublished !== false);
    setNewMaxAttempts(assignment.maxAttempts !== undefined ? assignment.maxAttempts : 0);
    setNewFlashcards(assignment.flashcards && assignment.flashcards.length > 0 ? assignment.flashcards : [{ id: Date.now().toString(), front: '', back: '' }]);
    setNewSubFlashcardSets(assignment.subFlashcardSets || []);
    
    if (assignment.rawCode) {
      setRawQuestionCode(assignment.rawCode);
    } else if (assignment.questions && assignment.questions.length > 0) {
      setRawQuestionCode(questionsToRawCode(assignment.questions));
    } else {
      setRawQuestionCode(SAMPLE_TEMPLATES.mau2);
    }

    setCreateStep(1);
    setShowCreateModal(true);
  };

  const optimizeAssignmentImagesForFirestore = async (data: any): Promise<any> => {
    try {
      let payloadStr = JSON.stringify(data);
      let cloned = JSON.parse(payloadStr);

      // If subFlashcardSets exists and is non-empty, remove redundant top-level flashcards array to cut payload in half
      if (Array.isArray(cloned.subFlashcardSets) && cloned.subFlashcardSets.length > 0) {
        delete cloned.flashcards;
      }

      payloadStr = JSON.stringify(cloned);

      const resizeBase64 = (base64Str: string, maxDim = 1200, quality = 0.88): Promise<string> => {
        if (!base64Str || typeof base64Str !== 'string' || !base64Str.startsWith('data:image')) {
          return Promise.resolve(base64Str);
        }
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            // Preserve untouched if image is already within bounds to avoid quality degradation
            if (width <= maxDim && height <= maxDim && quality >= 0.85) {
              resolve(base64Str);
              return;
            }
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              let compressed = canvas.toDataURL('image/webp', quality);
              if (!compressed || !compressed.startsWith('data:image/webp')) {
                compressed = canvas.toDataURL('image/jpeg', quality);
              }
              resolve(compressed);
            } else {
              resolve(base64Str);
            }
          };
          img.onerror = () => resolve(base64Str);
          img.src = base64Str;
        });
      };

      const processCards = async (cards: any[], maxDim: number, quality: number) => {
        if (!Array.isArray(cards)) return;
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          if (card.frontImage && card.frontImage.length > 5000) {
            card.frontImage = await resizeBase64(card.frontImage, maxDim, quality);
          }
          if (card.backImage && card.backImage.length > 5000) {
            card.backImage = await resizeBase64(card.backImage, maxDim, quality);
          }
          if (card.image && card.image.length > 5000) {
            card.image = await resizeBase64(card.image, maxDim, quality);
          }
        }
      };

      // PASS 1: Gentle high-res compression ONLY if payload exceeds 750KB (Firestore doc limit is ~1MB)
      if (payloadStr.length > 750000) {
        if (Array.isArray(cloned.flashcards)) {
          await processCards(cloned.flashcards, 1200, 0.88);
        }
        if (Array.isArray(cloned.subFlashcardSets)) {
          for (const subSet of cloned.subFlashcardSets) {
            if (Array.isArray(subSet.flashcards)) {
              await processCards(subSet.flashcards, 1200, 0.88);
            }
          }
        }
        if (Array.isArray(cloned.questions)) {
          for (let i = 0; i < cloned.questions.length; i++) {
            const q = cloned.questions[i];
            if (q.image && q.image.length > 5000) {
              q.image = await resizeBase64(q.image, 1200, 0.88);
            }
          }
        }
      }

      // PASS 2: Moderate compression if payload approaches 900KB
      payloadStr = JSON.stringify(cloned);
      if (payloadStr.length > 900000) {
        if (Array.isArray(cloned.flashcards)) {
          await processCards(cloned.flashcards, 950, 0.80);
        }
        if (Array.isArray(cloned.subFlashcardSets)) {
          for (const subSet of cloned.subFlashcardSets) {
            if (Array.isArray(subSet.flashcards)) {
              await processCards(subSet.flashcards, 950, 0.80);
            }
          }
        }
        if (Array.isArray(cloned.questions)) {
          for (let i = 0; i < cloned.questions.length; i++) {
            const q = cloned.questions[i];
            if (q.image && q.image.length > 5000) {
              q.image = await resizeBase64(q.image, 950, 0.80);
            }
          }
        }
      }

      // PASS 3: Safe compression if payload touches critical 980KB mark
      payloadStr = JSON.stringify(cloned);
      if (payloadStr.length > 980000) {
        if (Array.isArray(cloned.flashcards)) {
          await processCards(cloned.flashcards, 750, 0.72);
        }
        if (Array.isArray(cloned.subFlashcardSets)) {
          for (const subSet of cloned.subFlashcardSets) {
            if (Array.isArray(subSet.flashcards)) {
              await processCards(subSet.flashcards, 750, 0.72);
            }
          }
        }
        if (Array.isArray(cloned.questions)) {
          for (let i = 0; i < cloned.questions.length; i++) {
            const q = cloned.questions[i];
            if (q.image && q.image.length > 5000) {
              q.image = await resizeBase64(q.image, 750, 0.72);
            }
          }
        }
      }

      return cloned;
    } catch (err) {
      console.error("Error optimizing assignment payload:", err);
      return data;
    }
  };

  const handleSaveAssignment = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (isSavingAssignment) return;
    
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
          solutionText: pq.solutionText,
          matchingPairs: pq.matchingPairs,
          image: pq.image
        }));
      }
    }

    const rawAssignmentData = {
      title: newTitle || (newType === 'game' ? 'Game Học Tập' : newType === 'flashcard' ? 'Bộ Flashcard' : 'Bài tập buổi học mới'),
      description: newDescription || 'Các em hoàn thành bài tập đầy đủ đúng hạn trước khi vào giờ học tiếp theo.',
      dueDate: newDueDate ? new Date(newDueDate).toISOString() : new Date(Date.now() + 86400000 * 2).toISOString(),
      classSessionTitle: newSessionTitle,
      type: newType,
      pdfUrl: newPdfUrl || undefined,
      simulationUrl: newSimUrl || undefined,
      gameType: newType === 'game' ? newGameType : undefined,
      gameFormats: newType === 'game' ? newGameFormats : undefined,
      tugOfWarMode: newType === 'game' && newGameType === 'keo_co' ? newTugOfWarMode : undefined,
      isMandatory: newIsMandatory,
      timeLimit: newTimeLimit,
      shuffleQuestions: newShuffleQuestions,
      isPublished: newIsPublished,
      maxAttempts: newMaxAttempts,
      grade: newGrade || undefined,
      className: newClassName || undefined,
      flashcards: newType === 'flashcard' ? (newSubFlashcardSets.length > 0 ? undefined : newFlashcards) : undefined,
      subFlashcardSets: newType === 'flashcard' && newSubFlashcardSets.length > 0 ? newSubFlashcardSets : undefined,
      rawCode: (newType === 'online_test' || newType === 'game' || (newType === 'flashcard' && newSubFlashcardSets.length === 0)) ? rawQuestionCode : undefined,
      questions: (newType === 'online_test' || newType === 'game' || (newType === 'flashcard' && newSubFlashcardSets.length === 0)) ? finalQuestions : undefined,
    };

    // Remove explicit undefined fields which crashes Firestore v9
    let assignmentData = JSON.parse(JSON.stringify(rawAssignmentData));

    setIsSavingAssignment(true);
    try {
      // Auto-compress base64 images if total payload is large to prevent Firestore 1MB document limit errors
      assignmentData = await optimizeAssignmentImagesForFirestore(assignmentData);

      if (editingAssignment) {
        const updatedAssignment: Assignment = {
          ...editingAssignment,
          ...assignmentData,
        };
        await setDoc(doc(db, 'assignments', editingAssignment.id), updatedAssignment, { merge: true });
        if (selectedAssignment?.id === editingAssignment.id) {
          setSelectedAssignment(updatedAssignment);
        }
      } else {
        await onAddAssignment(assignmentData);
      }

      setShowCreateModal(false);
      setEditingAssignment(null);
      setCreateStep(1);
      // Reset
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewGrade('');
      setNewClassName('');
      setNewIsMandatory(false);
      setNewTimeLimit(0);
      setNewShuffleQuestions(false);
      setNewGameType('quiz_nghieng_dau');
      setNewTugOfWarMode('bot');
      setGameSubStep(1);
      setFlashcardSubStep(1);
      setNewGameFormats(['multiple_choice', 'true_false']);
    } catch (err) {
      console.error("Error saving assignment:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('exceeds') || errMsg.includes('size') || errMsg.includes('limit')) {
        alert("⚠️ LỖI LƯU TRỮ: Dung lượng bộ thẻ quá lớn do chứa ảnh chất lượng cao. Hệ thống đã tự động nén ảnh nhưng tổng số lượng thẻ và kích thước vẫn vượt giới hạn Firestore. Vui lòng giảm bớt số lượng thẻ hoặc sử dụng ảnh nhỏ hơn để lưu thành công!");
      } else {
        alert("❌ Có lỗi xảy ra khi lưu bài học! Vui lòng thử lại. Chi tiết: " + errMsg);
      }
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await deleteDoc(doc(db, 'assignments', assignmentId));
      if (selectedAssignment?.id === assignmentId) {
        const remaining = assignments.filter(a => a.id !== assignmentId);
        setSelectedAssignment(remaining[0] || null);
      }
      setDeleteConfirmAssignment(null);
      // Clean up from deletion selected list if there
      setSelectedIdsForDeletion(prev => prev.filter(id => id !== assignmentId));
    } catch (err) {
      console.error("Error deleting assignment:", err);
      alert("Có lỗi xảy ra khi xóa bài tập!");
    }
  };

  // Keyboard shortcut listener for Assignment creation/editing and confirmation modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Delete Confirm Modal shortcuts
      if (deleteConfirmAssignment) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setDeleteConfirmAssignment(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleDeleteAssignment(deleteConfirmAssignment.id);
        }
        return;
      }

      if (showBulkDeleteConfirm) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowBulkDeleteConfirm(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleBulkDeleteAssignments();
        }
        return;
      }

      // 2. Main Create Modal shortcuts
      if (showCreateModal) {
        if (e.key === 'Escape' && !showFlashcardPreview && !showFlashcardQuizTest && !showGamePreview) {
          e.preventDefault();
          setShowCreateModal(false);
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          if (createStep === 1) {
            setCreateStep(2);
          } else {
            handleSaveAssignment();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showCreateModal,
    createStep,
    deleteConfirmAssignment,
    showBulkDeleteConfirm,
    showFlashcardPreview,
    showFlashcardQuizTest,
    showGamePreview,
    isSavingAssignment,
    newTitle,
    newDescription,
    newDueDate,
    newSessionTitle,
    newType,
    newPdfUrl,
    newSimUrl,
    newGameType,
    newGameFormats,
    newIsMandatory,
    newIsPublished,
    newMaxAttempts,
    newGrade,
    newClassName,
    newFlashcards,
    newSubFlashcardSets,
    rawQuestionCode,
    questions,
    editingAssignment
  ]);

  const handleCombineFlashcards = () => {
    // Merge from bottom to top as requested (reverse list order so earlier/bottom selected items come first)
    const selectedAssignments = assignments.filter(a => selectedIdsForDeletion.includes(a.id) && a.type === 'flashcard').reverse();
    
    if (selectedAssignments.length < 1) {
      alert("Vui lòng chọn ít nhất 1 bộ thẻ để gộp.");
      return;
    }

    const subSets: SubFlashcardSet[] = [];
    let combinedCards: {id: string, front: string, back: string, image?: string, frontImage?: string, backImage?: string}[] = [];

    selectedAssignments.forEach((a, aIdx) => {
      // If assignment a already has subFlashcardSets, preserve them!
      if (a.subFlashcardSets && a.subFlashcardSets.length > 0) {
        a.subFlashcardSets.forEach(s => {
          subSets.push({
            id: s.id || `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            title: s.title,
            description: s.description || '',
            flashcards: s.flashcards || [],
            questions: s.questions || [],
            rawCode: s.rawCode || (s.questions && s.questions.length > 0 ? questionsToRawCode(s.questions) : '')
          });
        });
      } else {
        const cards = a.flashcards || [];
        subSets.push({
          id: a.id || `sub_${Date.now()}_${aIdx}`,
          title: a.title || `Bộ thẻ ${aIdx + 1}`,
          description: a.description || '',
          flashcards: cards,
          questions: a.questions || [],
          rawCode: a.rawCode || (a.questions && a.questions.length > 0 ? questionsToRawCode(a.questions) : '')
        });
      }
    });

    // Default active flashcards to the first subSet cards for crisp editing
    const initialActiveCards = subSets[0]?.flashcards && subSets[0].flashcards.length > 0
      ? subSets[0].flashcards
      : [{ id: Date.now().toString(), front: '', back: '' }];
    const initialRawCode = subSets[0]?.rawCode || (subSets[0]?.questions && subSets[0].questions.length > 0 ? questionsToRawCode(subSets[0].questions) : '');

    const parentTitle = `BỘ LỚN: ${selectedAssignments.map(a => a.title).join(' + ')}`;
    const parentDesc = `Bộ thẻ tổng hợp bao gồm ${subSets.length} bộ con (${selectedAssignments.map(a => a.title).join(', ')})`;

    handleOpenCreateModal('flashcard', initialActiveCards, subSets);
    setNewTitle(parentTitle);
    setNewDescription(parentDesc);
    setRawQuestionCode(initialRawCode);
    setSelectedIdsForDeletion([]);
    setShowCreateModal(true);
  };

  const handleBulkToggleOnAir = async (explicitStatus?: boolean) => {
    if (selectedIdsForDeletion.length === 0) return;
    const selectedAssignments = filteredAssignments.filter(a => selectedIdsForDeletion.includes(a.id));
    const areAllOnAir = selectedAssignments.length > 0 && selectedAssignments.every(a => a.isPublished !== false);
    const targetStatus = explicitStatus !== undefined ? explicitStatus : !areAllOnAir;

    try {
      const promises = selectedIdsForDeletion.map(id => 
        setDoc(doc(db, 'assignments', id), { isPublished: targetStatus }, { merge: true })
      );
      await Promise.all(promises);
    } catch (err) {
      alert("Có lỗi xảy ra khi cập nhật trạng thái On Air!");
    }
  };

  const handleBulkDeleteAssignments = async () => {
    try {
      for (const id of selectedIdsForDeletion) {
        await deleteDoc(doc(db, 'assignments', id));
      }
      const remaining = assignments.filter(a => !selectedIdsForDeletion.includes(a.id));
      if (selectedAssignment && selectedIdsForDeletion.includes(selectedAssignment.id)) {
        setSelectedAssignment(remaining[0] || null);
      }
      setSelectedIdsForDeletion([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      console.error("Error bulk deleting assignments:", err);
      alert("Có lỗi xảy ra khi xóa hàng loạt bài tập!");
    }
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

    const currentFileUrl = uploadedFileUrl || uploadedFileName || (selectedAssignment.type === 'file_upload' ? 'bailam_hocsinh.pdf' : undefined);
    const recordedFileName = uploadedFileName || (selectedAssignment.type === 'lesson_check' ? 'bai_tap_chup_tay.pdf' : 'bailam_hocsinh.pdf');
    const recordedContent = submitContent || ((selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') ? 'Đã hoàn thành bài làm trực tuyến.' : 'Đã nộp bài đầy đủ.');

    onSubmitWork({
      assignmentId: selectedAssignment.id,
      studentId: user.id,
      studentName: user.name,
      content: recordedContent,
      fileUrl: currentFileUrl,
      quizAnswers: (selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') ? studentQuizAnswers : undefined,
      grade: autoGrade
    });

    if (selectedAssignment.type === 'lesson_check' || selectedAssignment.type === 'file_upload') {
      setSubmittedSuccessModal({
        assignmentTitle: selectedAssignment.title,
        fileName: recordedFileName,
        pageCount: uploadedPageCount,
        submittedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
        content: recordedContent
      });
    }

    setSubmitContent('');
    setUploadedFileName(null);
    setUploadedFileUrl(null);
    setUploadedPageCount(undefined);
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

  // Active Game Mode Screen
  if (selectedAssignment && selectedAssignment.type === 'game' && isExamStarted) {
    return (
      <div className="fixed inset-0 bg-slate-900/95 z-[9999] flex flex-col justify-center items-center p-1 sm:p-2 overflow-hidden">
        {examTimeRemaining !== null && (
          <div className="absolute top-4 right-4 z-[10000] flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl shadow-xl border border-slate-700/50">
            <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-amber-400 font-mono font-black text-xl tracking-wider">
              {formatTimeRemaining(examTimeRemaining)}
            </span>
          </div>
        )}
        <div className="w-full h-full max-w-full max-h-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-indigo-100 flex flex-col relative">
          <GamePreview
            gameType={selectedAssignment.gameType || 'do_min'}
            questions={shuffledExamQuestions || (selectedAssignment.questions && selectedAssignment.questions.length > 0 ? selectedAssignment.questions : parseRawCodeToQuestions(rawQuestionCode).parsedQuestions)}
            isStudentMode={!isTeacher}
            tugOfWarMode={selectedAssignment.tugOfWarMode || 'bot'}
            timeLimitRemaining={examTimeRemaining}
            onClose={() => setIsExamStarted(false)}
            onSubmitWork={(finalScore, correctCount, answers) => {
              if (isTeacher) {
                alert(`[XEM TRƯỚC] Đã hoàn thành trò chơi! Điểm của bạn: ${finalScore}, Số câu đúng: ${correctCount}`);
              } else {
                const submissionData = {
                  assignmentId: selectedAssignment.id,
                  studentId: user.id,
                  studentName: user.name,
                  content: `Đã hoàn thành trò chơi học tập với điểm số ${finalScore}.`,
                  quizAnswers: answers,
                  grade: Math.min(10, Math.round((correctCount / (selectedAssignment.questions?.length || 1)) * 10)),
                  status: 'submitted' as const
                };
                onSubmitWork(submissionData);
              }
              setIsExamStarted(false);
            }}
          />
        </div>
      </div>
    );
  }

  if (selectedAssignment && selectedAssignment.type === 'online_test' && isExamStarted) {
    return (
      <div className="fixed inset-0 bg-[#F4F6F9] z-[9999] overflow-hidden flex flex-col h-screen w-screen">
        {/* Header Exam */}
        <div className="bg-emerald-800 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white font-black text-xl tracking-tight">
              Hệ Thống Đề Thi Trắc Nghiệm
            </span>
            <div className="h-4 w-[1px] bg-emerald-600/60 hidden sm:block"></div>
            <span className="text-xs font-semibold bg-emerald-700/60 px-2.5 py-1 rounded-lg border border-emerald-600/30 text-emerald-100 hidden sm:inline-block">
              🟢 Đang giám sát thí sinh
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const isCurrentlyFS = !!(
                  document.fullscreenElement ||
                  (document as any).webkitFullscreenElement ||
                  (document as any).mozFullScreenElement ||
                  (document as any).msFullscreenElement
                );
                if (!isCurrentlyFS) {
                  await enterFullscreen();
                  setShowCheatWarning(false);
                  setIsNotFullscreen(false);
                } else {
                  await exitFullscreen();
                  setIsNotFullscreen(true);
                }
              }}
              className="flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-600/60 shadow-sm transition-all"
              title={isNotFullscreen ? "Bật toàn màn hình" : "Thoát toàn màn hình"}
            >
              {isNotFullscreen ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span className="hidden sm:inline font-bold">Toàn màn hình</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="hidden sm:inline font-bold">Thu nhỏ</span>
                </>
              )}
            </button>

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
            <span>📝</span> Đề Bài ({(shuffledExamQuestions || selectedAssignment.questions)?.length || 0} câu)
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
            <span>🔘</span> Phiếu Làm Bài ({Object.keys(studentQuizAnswers).length}/{(shuffledExamQuestions || selectedAssignment.questions)?.length || 0})
          </button>
        </div>

        {/* Main content pane */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
          
          {/* Left Column: Questions List (Đề bài) */}
          <div className={`lg:col-span-2 p-4 sm:p-6 overflow-y-auto space-y-6 bg-white h-full ${
            mobileExamTab === 'questions' ? 'block' : 'hidden lg:block'
          }`}>
            {(shuffledExamQuestions || selectedAssignment.questions)?.map((q, idx) => (
              <div key={q.id} className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Câu hỏi {idx + 1} ({q.points}đ)</span>
                </div>
                
                <div className="text-sm font-serif text-slate-800 leading-relaxed pl-1">
                  {(q as any).image && (
                    <div className="mb-4 max-h-[300px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 w-fit">
                      <img src={(q as any).image} alt="Question" referrerPolicy="no-referrer" className="max-h-[280px] w-auto object-contain rounded-lg" />
                    </div>
                  )}
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
                {(shuffledExamQuestions || selectedAssignment.questions)?.map((q, idx) => (
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
      
      {/* SYNCED BANNER COMPONENT */}
      <div className={`bg-gradient-to-r ${
        viewMode === 'games' 
          ? 'from-amber-500 via-orange-600 to-rose-600' 
          : viewMode === 'flashcards' 
          ? 'from-indigo-600 via-purple-600 to-pink-600' 
          : 'from-sky-600 via-blue-600 to-indigo-600'
      } rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md`}>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              {viewMode === 'games' ? 'Khu Vui Chơi Học Tập' : viewMode === 'flashcards' ? 'Kho Flashcard Sinh Động' : 'Bài Tập & Thử Thách'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {viewMode === 'games' 
                ? 'Trò Chơi Tương Tác & Ôn Tập'
                : viewMode === 'flashcards' 
                ? 'Bộ Thẻ Ghi Nhớ Thông Minh' 
                : 'Bài Tập Rèn Luyện Mỗi Ngày'}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              {viewMode === 'games'
                ? (isTeacher ? 'Tạo và giao các trò chơi tương tác ôn tập kiến thức cho học sinh' : 'Luyện tập kiến thức vui nhộn qua các trò chơi tương tác thú vị!')
                : viewMode === 'flashcards'
                ? (isTeacher ? 'Quản lý các bộ thẻ ghi nhớ giúp học sinh học thuộc khái niệm và định nghĩa' : 'Ghi nhớ định nghĩa và thuật ngữ qua các bộ thẻ ghi nhớ sinh động!')
                : (isTeacher ? 'Quản lý bài tập trắc nghiệm, PDF và theo dõi tình trạng làm bài của lớp' : 'Hoàn thành các thử thách từ thầy cô để tích lũy điểm thưởng nhé!')}
            </p>
          </div>

          {isTeacher && (
            <button 
              onClick={() => handleOpenCreateModal()}
              className="px-5 py-3 bg-white text-slate-800 font-bold text-xs sm:text-sm rounded-2xl hover:bg-slate-50 transition-colors shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {viewMode === 'games' ? 'Giao Game mới' : viewMode === 'flashcards' ? 'Tạo Flashcard' : 'Giao bài tập mới'}
            </button>
          )}
        </div>
      </div>

      {/* STATUS FILTER PILLS FOR STUDENTS */}
      {!isTeacher && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shrink-0 ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>Tất cả</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              filterStatus === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {statusCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('unsubmitted')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shrink-0 ${
              filterStatus === 'unsubmitted'
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-100 ring-2 ring-amber-500/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50/50 hover:text-amber-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chưa nộp</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              filterStatus === 'unsubmitted' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {statusCounts.unsubmitted}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('overdue')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shrink-0 ${
              filterStatus === 'overdue'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-100 ring-2 ring-rose-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-rose-50/50 hover:text-rose-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Quá hạn</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              filterStatus === 'overdue' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {statusCounts.overdue}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('submitted')}
            className={`px-3.5 sm:px-4 py-2 text-xs font-bold rounded-2xl transition-all flex items-center gap-2 shrink-0 ${
              filterStatus === 'submitted'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-100 ring-2 ring-emerald-600/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50/50 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Đã nộp</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              filterStatus === 'submitted' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {statusCounts.submitted}
            </span>
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      {!selectedAssignment ? (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BOX - Inline in Grid view */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Tìm tên bài, buổi học, mô tả..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded-xl transition-all"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              {!isTeacher && (
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">📋 Tất cả ({statusCounts.all})</option>
                  <option value="unsubmitted">⏳ Chưa nộp ({statusCounts.unsubmitted})</option>
                  <option value="overdue">⏰ Quá hạn ({statusCounts.overdue})</option>
                  <option value="submitted">✅ Đã nộp ({statusCounts.submitted})</option>
                </select>
              )}

              {/* On Air Status Filter for Teachers */}
              {isTeacher && (
                <select
                  value={filterOnAir}
                  onChange={(e) => setFilterOnAir(e.target.value as any)}
                  className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">📻 Trạng thái On Air (Tất cả)</option>
                  <option value="on_air">🟢 Đã On Air (Hiển thị HS)</option>
                  <option value="draft">🟡 Bản Nháp (Ẩn với HS)</option>
                </select>
              )}

              <select
                value={filterDueDate}
                onChange={(e) => setFilterDueDate(e.target.value)}
                className="px-4 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tất cả hạn</option>
                <option value="upcoming">Còn hạn</option>
                <option value="overdue">Quá hạn</option>
              </select>

              {isTeacher && (
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={filteredAssignments.length > 0 && selectedIdsForDeletion.length === filteredAssignments.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIdsForDeletion(filteredAssignments.map(a => a.id));
                      } else {
                        setSelectedIdsForDeletion([]);
                      }
                    }}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">CHỌN TẤT CẢ</span>
                </div>
              )}

              {selectedIdsForDeletion.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() => handleBulkToggleOnAir()}
                      className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center shrink-0 shadow-xs"
                      title={`Bật/Tắt On Air (${selectedIdsForDeletion.length} mục đã chọn)`}
                    >
                      <Radio className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="p-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors"
                    title="Xóa hàng loạt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {viewMode === 'flashcards' && (
                    <button
                      onClick={handleCombineFlashcards}
                      className="p-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors"
                      title="Gộp bộ thẻ"
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* GRID OF ASSIGNMENT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoadingAssignments ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-3xl h-64 animate-pulse border border-slate-100" />
              ))
            ) : filteredAssignments.length === 0 ? (
              <div className="col-span-full py-16 px-6 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                <div className="text-4xl mb-3">
                  {filterStatus === 'submitted' ? '📝' : filterStatus === 'overdue' ? '🎉' : filterStatus === 'unsubmitted' ? '🌟' : '📭'}
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">
                  {filterStatus === 'submitted' 
                    ? 'Chưa có bài tập nào đã nộp' 
                    : filterStatus === 'overdue' 
                    ? 'Tuyệt vời! Không có bài tập nào bị quá hạn' 
                    : filterStatus === 'unsubmitted' 
                    ? 'Xuất sắc! Em đã hoàn thành hết bài tập còn hạn' 
                    : 'Không tìm thấy bài tập nào phù hợp.'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {filterStatus === 'submitted'
                    ? 'Hãy chọn các bài tập chưa nộp để bắt đầu làm bài và tích lũy điểm thưởng nhé!'
                    : filterStatus === 'overdue'
                    ? 'Tiến độ làm bài của em rất tốt, hãy tiếp tục duy trì nhé!'
                    : filterStatus === 'unsubmitted'
                    ? 'Em có thể xem lại các bài đã nộp hoặc ôn tập các bộ thẻ ghi nhớ.'
                    : 'Thử tìm kiếm với từ khóa khác hoặc đặt lại các bộ lọc.'}
                </p>
                {(filterStatus !== 'all' || searchQuery || filterType !== 'all' || filterDueDate !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStatus('all');
                      setSearchQuery('');
                      setFilterType('all');
                      setFilterDueDate('all');
                    }}
                    className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Đặt lại bộ lọc</span>
                  </button>
                )}
              </div>
            ) : (
              filteredAssignments.map(assignment => {
                const isPastDue = new Date(assignment.dueDate) < new Date();
                const mySubmission = submissions.find(s => s.assignmentId === assignment.id && s.studentId === user.id);
                const totalSubs = submissions.filter(s => s.assignmentId === assignment.id).length;
                const thumb = assignment.thumbnail || DEFAULT_THUMBNAILS[assignment.type] || DEFAULT_THUMBNAILS.default;

                return (
                  <div 
                    key={assignment.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all group flex flex-col"
                  >
                    <div 
                      className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                      onClick={() => setSelectedAssignment(assignment)}
                    >
                      <img 
                        src={thumb} 
                        alt={assignment.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        <span className="bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200 uppercase">
                          {assignment.type === 'game' ? '🎮 Game' : assignment.type === 'flashcard' ? '🎴 Flashcard' : '📝 Bài tập'}
                        </span>
                        {shouldShowNewBadge(user?.id, assignment) && (
                          <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                            MỚI
                          </span>
                        )}
                      </div>
                      
                      <div className="absolute top-3 right-3">
                        {isTeacher && (
                          <input
                            type="checkbox"
                            checked={selectedIdsForDeletion.includes(assignment.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedIdsForDeletion(prev => [...prev, assignment.id]);
                              } else {
                                setSelectedIdsForDeletion(prev => prev.filter(id => id !== assignment.id));
                              }
                            }}
                            className="w-5 h-5 text-indigo-600 rounded-lg border-white/50 bg-white/20 backdrop-blur-sm focus:ring-indigo-500 cursor-pointer"
                          />
                        )}
                      </div>

                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-indigo-600 shadow-lg scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-6 h-6 ml-1" />
                        </div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-slate-900 text-base line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                          {assignment.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-500">
                          Hạn: {format(new Date(assignment.dueDate), 'HH:mm - dd/MM', { locale: vi })}
                        </span>
                        <div className="ml-auto">
                          {isTeacher ? (
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-indigo-100">
                              {totalSubs}/3 đã nộp
                            </span>
                          ) : (
                            mySubmission ? (
                              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-emerald-100">
                                Đã nộp
                              </span>
                            ) : isPastDue ? (
                              <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-rose-100">
                                Quá hạn
                              </span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-100">
                                Chưa làm
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button 
                          onClick={() => setSelectedAssignment(assignment)}
                          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {isTeacher ? 'Xem chi tiết' : 'Bắt đầu học'}
                        </button>
                        
                        {isTeacher && (
                          <div className="flex gap-1.5">
                            <button 
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newStatus = assignment.isPublished === false ? true : false;
                                try {
                                  await setDoc(doc(db, 'assignments', assignment.id), { isPublished: newStatus }, { merge: true });
                                } catch (err) {
                                  alert('Lỗi cập nhật trạng thái On Air');
                                }
                              }}
                              className={`p-2.5 rounded-xl transition-colors border ${
                                assignment.isPublished !== false 
                                  ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200' 
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              }`}
                              title={assignment.isPublished !== false ? "Đang ON AIR (Nhấn để tắt)" : "Đang Bản Nháp (Nhấn để bật ON AIR)"}
                            >
                              <Radio className={`w-4 h-4 ${assignment.isPublished !== false ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
                            </button>
                            <button 
                              onClick={() => handleOpenEditModal(assignment)}
                              className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors border border-amber-200"
                              title="Sửa"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmAssignment(assignment)}
                              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors border border-rose-200"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* SYNCED DETAIL VIEW: Only show the selected assignment's content */
        <div className="space-y-6">
          {selectedAssignment ? (
            <div className="space-y-4">
              {/* Mobile Back to List Button */}
              <div className="flex items-center justify-between">
                <button 
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="inline-flex items-center gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-2xl text-xs font-bold border border-indigo-200 shadow-sm transition-all active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <span>Quay lại danh sách {viewMode === 'flashcards' ? 'flashcard' : viewMode === 'games' ? 'game' : 'bài tập'}</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8 space-y-6">
              
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
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        type="button"
                        onClick={async () => {
                          const newStatus = selectedAssignment.isPublished === false ? true : false;
                          try {
                            await setDoc(doc(db, 'assignments', selectedAssignment.id), { isPublished: newStatus }, { merge: true });
                            if (newStatus) {
                              alert('Đã phát hành bài tập/trò chơi cho học sinh!');
                            } else {
                              alert('Đã ẩn bài tập/trò chơi. Hiện tại chỉ giáo viên mới nhìn thấy.');
                            }
                          } catch (err) {
                            alert('Lỗi cập nhật trạng thái');
                          }
                        }}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-sm border ${
                          selectedAssignment.isPublished !== false 
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200' 
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
                        }`}
                        title={selectedAssignment.isPublished !== false ? "Đang ON AIR (Nhấn để tắt)" : "Đang Bản Nháp (Nhấn để bật ON AIR)"}
                      >
                        {selectedAssignment.isPublished !== false ? (
                          <>
                            <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
                            ON AIR
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4 text-amber-600" />
                            Bật ON AIR
                          </>
                        )}
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleOpenEditModal(selectedAssignment)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                        title="Chỉnh sửa bài tập này"
                      >
                        <Pencil className="w-4 h-4 text-amber-600" />
                        Chỉnh sửa
                      </button>
                      <button 
                        type="button"
                        onClick={() => setDeleteConfirmAssignment(selectedAssignment)}
                        className="flex items-center gap-1.5 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                        title="Xóa bài tập này"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        Xóa
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const summary = `📝 [BÀI TẬP]: ${selectedAssignment.title}\nHạn nộp: ${format(new Date(selectedAssignment.dueDate), 'HH:mm - dd/MM/yyyy', { locale: vi })}\nCác em học sinh đăng nhập hệ thống để hoàn thành bài tập nhé!`;
                          navigator.clipboard.writeText(summary);
                          alert('Đã sao chép tóm tắt bài tập vào bộ nhớ tạm!');
                        }}
                        className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        <Copy className="w-4 h-4 text-indigo-600" />
                        Sao chép tóm tắt
                      </button>
                      {(selectedAssignment.type === 'online_test' || selectedAssignment.type === 'game' || selectedAssignment.type === 'flashcard') && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (selectedAssignment.type === 'online_test') {
                              setIsExamStarted(true);
                              setExamTimeRemaining(selectedAssignment.timeLimit ? selectedAssignment.timeLimit * 60 : null);
                              setTabSwitchCount(0);
                              setStudentQuizAnswers({});
                              await enterFullscreen();
                            } else if (selectedAssignment.type === 'game') {
                              setIsExamStarted(true);
                            } else if (selectedAssignment.type === 'flashcard') {
                              setShowFlashcardQuizTest(true);
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors shadow-sm"
                          title="Xem trước chế độ làm bài"
                        >
                          <Eye className="w-4 h-4 text-emerald-600" />
                          Xem trước
                        </button>
                      )}
                    </div>
                  )}
                  {!isTeacher && !isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setChatQuestion('');
                        setChatStatus({ type: 'idle', message: '' });
                        setShowChatModal(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
                    >
                      <MessageCircle className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span>Chat với Giáo viên</span>
                    </button>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedAssignment.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2 pb-4 border-b border-slate-100">
                  <span className="flex items-center font-medium text-slate-700">
                    <Clock className="w-4 h-4 mr-1.5 text-indigo-600" />
                    Hạn nộp (24H): <strong className="ml-1 text-slate-900">{format(new Date(selectedAssignment.dueDate), 'HH:mm - dd/MM/yyyy', { locale: vi })}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-lg">
                    {selectedAssignment.maxAttempts ? `Tối đa ${selectedAssignment.maxAttempts} lần làm` : 'Làm vĩnh viễn (Tự do)'}
                  </span>
                  {selectedAssignment.timeLimit ? (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-lg flex items-center gap-1">
                        <Timer className="w-3 h-3" /> Thời gian: {selectedAssignment.timeLimit} phút
                      </span>
                    </>
                  ) : null}
                  <span className="text-slate-300">•</span>
                  <span>Hoạt động theo buổi học</span>
                  {selectedAssignment.grade && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-150">
                        {selectedAssignment.grade}
                      </span>
                    </>
                  )}
                  {selectedAssignment.className && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-150">
                        Lớp: {selectedAssignment.className}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed">
                <p className="font-semibold text-slate-900 mb-1">Hướng dẫn từ giáo viên:</p>
                <p>{selectedAssignment.description}</p>
              </div>

              {/* Policy Notice */}
              <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl flex items-center gap-3 text-blue-900 text-xs">
                <AlertTriangle className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  <strong>Quy định nộp bài & luyện tập:</strong> Học sinh bắt buộc hoàn thành trong thời gian giáo viên quy định. Nếu quá hạn nộp, học sinh vẫn có thể tiếp tục vào làm lại bài tập để ôn luyện kiến thức.
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <Play className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Bài tập Mô phỏng Thực hành</p>
                        <p className="text-xs text-slate-500">Mở giao diện mô phỏng tương tác để hoàn thành bài tập</p>
                      </div>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => setShowEmbeddedSim(!showEmbeddedSim)}
                      className={`px-4 py-2 rounded-xl font-bold text-xs border transition-all ${
                        showEmbeddedSim 
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm' 
                          : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      {showEmbeddedSim ? '📴 Đóng chế độ nhúng' : '📺 Thực hành ngay tại đây'}
                    </button>
                  </div>

                  {showEmbeddedSim && (
                    <div className="relative w-full h-[550px] border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-inner">
                      {(() => {
                        const matchedSim = (simulations || []).find(s => s.url === selectedAssignment.simulationUrl || s.id === selectedAssignment.simulationUrl);
                        return (
                          <SimulationFrame 
                            simulation={matchedSim}
                            fallbackUrl={selectedAssignment.simulationUrl}
                            sandbox="allow-scripts allow-same-origin"
                            title={selectedAssignment.title}
                          />
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <a 
                      href={selectedAssignment.simulationUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-center"
                    >
                      <ExternalLink className="w-4 h-4" /> Mở trong tab mới
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
                    const mySubs = submissions
                      .filter(s => s.assignmentId === selectedAssignment.id && s.studentId === user.id)
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
                    const mySub = mySubs[0]; // the latest attempt
                    const attemptCount = mySubs.length;
                    const maxAttempts = selectedAssignment.maxAttempts || 0; // 0 = vĩnh viễn
                    const isPastDue = new Date(selectedAssignment.dueDate) < new Date();
                    const canDoAgain = maxAttempts === 0 || attemptCount < maxAttempts || isPastDue;
                    
                    if (mySub && !isRetryingUpload) {
                      return (
                        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <Check className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="font-bold text-emerald-900 text-base">
                                  Em đã nộp bài tập này
                                </h3>
                                <p className="text-xs text-emerald-700 font-semibold">
                                  Lượt làm bài: <strong className="text-emerald-900">Lần {attemptCount}{maxAttempts > 0 ? `/${maxAttempts}` : ' (Vĩnh viễn)'}</strong>
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-emerald-700 font-medium bg-emerald-100/60 px-3 py-1 rounded-full border border-emerald-200">
                              Thời gian nộp: {format(new Date(mySub.submittedAt), 'HH:mm dd/MM/yyyy')}
                            </span>
                          </div>

                          {/* Friendly late banner */}
                          {isPastDue && (
                            <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-indigo-900">
                              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span>
                                <strong>Luyện tập tự do:</strong> Đã quá hạn nộp ban đầu của giáo viên, nhưng bạn vẫn có thể làm lại và luyện tập bao nhiêu lần tùy thích!
                              </span>
                            </div>
                          )}

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

                          {/* Retake / Retry Section */}
                          {canDoAgain && (
                            <div className="mt-4 pt-4 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-100/40 p-4 rounded-2xl border">
                              <div className="text-xs text-emerald-950 font-medium">
                                <p className="font-extrabold text-sm flex items-center gap-1.5 text-emerald-900">
                                  <RotateCw className="w-4 h-4 text-emerald-600" />
                                  {isPastDue ? 'Tiếp tục làm lại & luyện tập' : `Làm lại bài tập (Lượt ${attemptCount + 1}${maxAttempts > 0 ? `/${maxAttempts}` : ''})`}
                                </p>
                                <p className="text-[11px] text-emerald-800 mt-0.5">
                                  {maxAttempts === 0 
                                    ? 'Bài tập cho phép làm vĩnh viễn không giới hạn số lần.' 
                                    : isPastDue 
                                    ? 'Đã qua hạn nộp, bạn vẫn có thể làm lại để ôn tập kiến thức.' 
                                    : `Bạn còn ${maxAttempts - attemptCount} lượt làm bài.`}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (selectedAssignment.type === 'online_test') {
                                    setIsExamStarted(true);
                                    setExamTimeRemaining(selectedAssignment.timeLimit ? selectedAssignment.timeLimit * 60 : null);
                                    setTabSwitchCount(0);
                                    setStudentQuizAnswers({});
                                    await enterFullscreen();
                                  } else if (selectedAssignment.type === 'game') {
                                    setIsExamStarted(true);
                                  } else if (selectedAssignment.type === 'flashcard') {
                                    setShowFlashcardQuizTest(true);
                                  } else {
                                    setIsRetryingUpload(true);
                                  }
                                }}
                                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 shrink-0 uppercase tracking-wider active:scale-95"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                                {selectedAssignment.type === 'game' ? 'Chơi lại game' : selectedAssignment.type === 'flashcard' ? 'Làm lại Flashcard' : 'Làm lại bài tập'}
                              </button>
                            </div>
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

                          {mySubs.length > 1 && (
                            <div className="mt-6 space-y-4">
                              <h4 className="font-bold text-slate-800 text-sm border-b pb-2">Lịch sử làm bài</h4>
                              <div className="space-y-3">
                                {mySubs.map((sub, idx) => (
                                  <div key={sub.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                                    <div>
                                      <p className="text-xs font-bold text-slate-700">Lần {mySubs.length - idx}</p>
                                      <p className="text-[11px] text-slate-500">{format(new Date(sub.submittedAt), 'HH:mm dd/MM/yyyy')}</p>
                                    </div>
                                    {sub.grade !== undefined ? (
                                      <span className="font-black text-indigo-600 text-sm">{sub.grade}/10</span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium italic">Chờ chấm</span>
                                    )}
                                  </div>
                                ))}
                              </div>
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
                        cuoc_dua_ngon_tay: { name: 'Cuộc Đua Ngón Tay', desc: 'Đua xe trả lời đúng để bứt tốc vượt lên đối thủ trên đường đua', emoji: '🏎️', bg: 'bg-rose-50/50', border: 'border-rose-200', text: 'text-rose-700', gradient: 'from-rose-500 to-red-600' },
                        do_min: { name: 'Dò Mìn Toán Học', desc: 'Khám phá ô mìn an toàn thông qua giải các phép tính nhanh', emoji: '💣', bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-700', gradient: 'from-emerald-600 to-teal-600' },
                        doan_tau_tri_thuc: { name: 'Đoàn Tàu Tri Thức', desc: 'Đưa đoàn tàu vượt các ga học liệu cập bến ga cuối an toàn', emoji: '🚂', bg: 'bg-sky-50/50', border: 'border-sky-200', text: 'text-sky-700', gradient: 'from-sky-500 to-blue-600' },
                        keo_co: { name: 'Kéo Co Kiến Thức', desc: 'Đấu trí kéo co kịch tính đấu với máy hoặc hai người chơi', emoji: '🪢', bg: 'bg-orange-50/50', border: 'border-orange-200', text: 'text-orange-700', gradient: 'from-orange-500 to-amber-600' },
                        game_map: { name: 'Bản Đồ Cổ Thử Thách', desc: 'Bản đồ truy tìm kho báu toán học cổ xưa đầy thú vị', emoji: '🗺️', bg: 'bg-yellow-50/50', border: 'border-yellow-200', text: 'text-yellow-700', gradient: 'from-yellow-500 to-amber-600' },
                        tu_ngu_biet_bay: { name: 'Từ Ngữ Biết Bay', desc: 'Chạm từ chuyển động đúng chính tả và logic ngữ văn', emoji: '🛸', bg: 'bg-violet-50/50', border: 'border-violet-200', text: 'text-violet-700', gradient: 'from-violet-500 to-purple-600' },
                        keo_tha_noi_y: { name: 'Kéo Thả Nối Ý', desc: 'Ghép nối vế trái logic với vế phải tạo câu đúng hoàn chỉnh', emoji: '🔗', bg: 'bg-teal-50/50', border: 'border-teal-200', text: 'text-teal-700', gradient: 'from-teal-500 to-cyan-600' },
                        o_chu_khoa: { name: 'Ô Chữ Khóa Bí Mật', desc: 'Giải ô chữ giải mã từ khóa cốt lõi của bài học', emoji: '🔐', bg: 'bg-green-50/50', border: 'border-green-200', text: 'text-green-700', gradient: 'from-green-500 to-emerald-600' },
                        san_kho_bau: { name: 'Săn Kho Báu Đại Dương', desc: 'Tìm rương vàng cổ vật thông qua thử thách toán thực tế', emoji: '🏴‍☠️', bg: 'bg-slate-100/50', border: 'border-slate-200', text: 'text-slate-700', gradient: 'from-slate-600 to-slate-800' },
                        lat_manh_ghep: { name: 'Lật Mảnh Ghép Kiến Thức', desc: 'Lật và ghép nối các cặp câu hỏi - đáp án tương ứng', emoji: '🧩', bg: 'bg-indigo-50/50', border: 'border-indigo-200', text: 'text-indigo-700', gradient: 'from-indigo-500 to-purple-600' },
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
                              <p className="text-sm font-black text-slate-800">{selectedAssignment.timeLimit ? `${selectedAssignment.timeLimit} phút` : 'Không giới hạn'}</p>
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
                                    if (selectedAssignment.gameFormats && selectedAssignment.gameFormats.length > 0) {
                                      return selectedAssignment.gameFormats.includes(id);
                                    }
                                    if (selectedAssignment.gameType === 'tu_ngu_biet_bay') {
                                      return id === 'word_reorder';
                                    }
                                    if (selectedAssignment.gameType === 'o_chu_khoa') {
                                      return id === 'short_answer';
                                    }
                                    if (selectedAssignment.gameType === 'lat_manh_ghep' || selectedAssignment.gameType === 'doan_tau_tri_thuc') {
                                      return id === 'matching';
                                    }
                                    return true;
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
                              setExamTimeRemaining(selectedAssignment.timeLimit ? selectedAssignment.timeLimit * 60 : null);
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
                      const hasSubSets = selectedAssignment.subFlashcardSets && selectedAssignment.subFlashcardSets.length > 0;
                      const allFlipped = displayFlashcards.length > 0 && flippedCards.size >= displayFlashcards.length;
                      const activeCard = displayFlashcards[activeCardIndex];

                      // 1. OVERVIEW VIEW FOR PARENT ASSIGNMENT (Gộp thành bộ cha / Bài học tổng hợp)
                      if (hasSubSets && activeSubSetId === 'overview') {
                        const totalCardsCount = selectedAssignment.subFlashcardSets!.reduce((acc, s) => acc + (s.flashcards?.length || 0), 0);

                        return (
                          <div className="space-y-6 max-w-4xl mx-auto">
                            {/* Parent Header Card */}
                            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                              <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
                              <div className="relative z-10 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-3 py-1 bg-purple-500/30 border border-purple-400/40 backdrop-blur-md rounded-full text-xs font-black text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-purple-300" /> BỘ FLASHCARD
                                  </span>
                                  <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-slate-200">
                                    📚 {selectedAssignment.subFlashcardSets!.length} Bộ con
                                  </span>
                                  <span className="px-3 py-1 bg-emerald-500/30 border border-emerald-400/30 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-200">
                                    ✨ {totalCardsCount} Thẻ ghi nhớ
                                  </span>
                                </div>

                                <div>
                                  <h2 className="text-xl sm:text-2xl font-black text-white">{selectedAssignment.title}</h2>
                                  {selectedAssignment.description && (
                                    <p className="text-sm text-purple-100/80 leading-relaxed max-w-2xl mt-1.5">{selectedAssignment.description}</p>
                                  )}
                                </div>

                                <div className="pt-2 flex flex-wrap items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSubSetId('all');
                                      setActiveCardIndex(0);
                                      setFlippedCards(new Set());
                                    }}
                                    className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95 flex items-center gap-2 uppercase tracking-wider"
                                  >
                                    <Sparkles className="w-4 h-4" /> Học tất cả các bộ con (Gộp {totalCardsCount} thẻ)
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Section title */}
                            <div className="flex items-center justify-between px-1">
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                                  <span>📚</span> Các bộ bài học
                                </h3>
                              </div>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                {selectedAssignment.subFlashcardSets!.length} bộ bài học
                              </span>
                            </div>

                            {/* Grid of Sub-sets */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {selectedAssignment.subFlashcardSets!.map((sub, idx) => {
                                const isExpanded = expandedSubSetId === sub.id;
                                const cardCount = sub.flashcards?.length || 0;

                                return (
                                  <div
                                    key={sub.id || idx}
                                    className="bg-white border-2 border-slate-200 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 group"
                                  >
                                    <div className="space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-1 rounded-xl bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                                            Level {idx + 1}
                                          </span>
                                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                                            {sub.title}
                                          </h4>
                                        </div>
                                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
                                          {cardCount} thẻ
                                        </span>
                                      </div>

                                      {sub.description && (
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pl-9">
                                          {sub.description}
                                        </p>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setExpandedSubSetId(isExpanded ? null : sub.id)}
                                        className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>{isExpanded ? 'Ẩn thẻ' : 'Xem danh sách thẻ'}</span>
                                      </button>

                                      <div className="flex items-center gap-2">
                                        {isTeacher && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const subCards = sub.flashcards && sub.flashcards.length > 0 ? sub.flashcards : [{ id: Date.now().toString(), front: '', back: '' }];
                                              handleOpenCreateModal('flashcard', subCards, undefined);
                                              setNewTitle(sub.title || 'Bộ thẻ bài tập mới');
                                              setNewDescription(sub.description || `Bài tập thẻ flashcard: ${sub.title}`);
                                              const rawCode = sub.rawCode || (sub.questions && sub.questions.length > 0 ? questionsToRawCode(sub.questions) : '');
                                              setRawQuestionCode(rawCode);
                                              setNewSubFlashcardSets([]);
                                              setShowCreateModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                            title="Giao bài tập riêng độc lập từ bộ con này"
                                          >
                                            <FileQuestion className="w-3.5 h-3.5" />
                                            <span>Giao bài tập</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveSubSetId(sub.id);
                                            setActiveCardIndex(0);
                                            setFlippedCards(new Set());
                                          }}
                                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all flex items-center gap-1.5"
                                        >
                                          <BookOpen className="w-3.5 h-3.5" />
                                          <span>Học nhé!</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Accordion Preview of Flashcards in this Sub-Set */}
                                    {isExpanded && (
                                      <div className="mt-3 pt-3 border-t border-indigo-100 bg-slate-50 rounded-xl p-3 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                                          Danh sách {cardCount} thẻ trong "{sub.title}":
                                        </p>
                                        {sub.flashcards?.map((card, cIdx) => (
                                          <div key={card.id || cIdx} className="bg-white border border-slate-200 rounded-lg p-2.5 text-xs flex items-center justify-between gap-2">
                                            <span className="font-mono text-[10px] text-slate-400 font-bold shrink-0">#{cIdx + 1}</span>
                                            <div className="flex-1 min-w-0 font-medium text-slate-800 truncate">
                                              <strong className="text-indigo-600">Trước:</strong> {card.front || '(Trống)'}
                                            </div>
                                            <div className="flex-1 min-w-0 font-medium text-slate-600 truncate border-l border-slate-200 pl-2">
                                              <strong className="text-purple-600">Sau:</strong> {card.back || '(Trống)'}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // 2. FLASHCARD PLAYER VIEW (FOR ACTIVE SUB-SET OR SINGLE SET)
                      return (
                        <div className={`transition-all duration-300 flex flex-col shadow-sm ${
                          isFlashcardFullscreen
                            ? 'fixed inset-0 z-[10000] bg-slate-950 text-white p-3 sm:p-6 space-y-3 w-screen h-screen overflow-y-auto'
                            : 'bg-slate-50 border border-slate-200 rounded-3xl p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 text-center max-w-2xl mx-auto'
                        }`}>
                          {/* Header Toolbar with Phóng To / Fullscreen toggle */}
                          <div className={`flex items-center justify-between gap-2 pb-2 border-b ${
                            isFlashcardFullscreen ? 'border-slate-800' : 'border-slate-200'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                isFlashcardFullscreen ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/30' : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                🎴 Thẻ Ghi Nhớ
                              </span>
                              {!hasSubSets && (
                                <h3 className={`font-extrabold text-xs sm:text-sm truncate ${isFlashcardFullscreen ? 'text-white' : 'text-slate-900'}`}>
                                  {selectedAssignment.title}
                                </h3>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={toggleFlashcardFullscreen}
                              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0 ${
                                isFlashcardFullscreen
                                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                              }`}
                              title={isFlashcardFullscreen ? "Thu nhỏ màn hình (Esc)" : "Phóng to toàn màn hình"}
                            >
                              {isFlashcardFullscreen ? (
                                <>
                                  <Minimize2 className="w-4 h-4" />
                                  <span>Thu nhỏ (Esc)</span>
                                </>
                              ) : (
                                <>
                                  <Maximize2 className="w-4 h-4" />
                                  <span>Phóng to</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Navigation Bar if parent assignment with sub-sets */}
                          {hasSubSets && (
                            <div className="space-y-3 text-left">
                              <div className={`flex items-center justify-between border rounded-2xl p-2.5 sm:p-3 shadow-sm ${
                                isFlashcardFullscreen ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => setActiveSubSetId('overview')}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 ${
                                    isFlashcardFullscreen
                                      ? 'bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800'
                                      : 'text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                                  }`}
                                >
                                  <ArrowLeft className="w-4 h-4 shrink-0" />
                                  <span>Quay lại danh sách bộ con</span>
                                </button>
                                <div className="text-right">
                                  <span className={`text-[10px] font-bold block uppercase tracking-wider ${isFlashcardFullscreen ? 'text-slate-400' : 'text-slate-400'}`}>Đang học:</span>
                                  <span className={`text-xs font-black truncate max-w-[160px] sm:max-w-xs block ${isFlashcardFullscreen ? 'text-indigo-300' : 'text-indigo-900'}`}>
                                    {activeSubSetId === 'all'
                                      ? '✨ Tất cả các bộ con (Gộp chung)'
                                      : `📚 ${selectedAssignment.subFlashcardSets?.find(s => s.id === activeSubSetId)?.title || 'Bộ con'}`}
                                  </span>
                                </div>
                              </div>

                              {/* Quick sub-set tabs switcher */}
                              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSubSetId('all');
                                    setActiveCardIndex(0);
                                    setFlippedCards(new Set());
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                                    activeSubSetId === 'all'
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                      : isFlashcardFullscreen ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                                  }`}
                                >
                                  Sparkles Tất cả bộ ({selectedAssignment.flashcards?.length || selectedAssignment.subFlashcardSets?.reduce((acc, s) => acc + (s.flashcards?.length || 0), 0) || 0} thẻ)
                                </button>

                                {selectedAssignment.subFlashcardSets!.map((sub, idx) => (
                                  <button
                                    key={sub.id || idx}
                                    type="button"
                                    onClick={() => {
                                      setActiveSubSetId(sub.id);
                                      setActiveCardIndex(0);
                                      setFlippedCards(new Set());
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                                      activeSubSetId === sub.id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : isFlashcardFullscreen ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                                    }`}
                                  >
                                    📚 {sub.title} ({sub.flashcards?.length || 0})
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className={`text-xs ${isFlashcardFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
                            Lật tất cả thẻ ({displayFlashcards.length} thẻ) để mở khóa bài kiểm tra.
                          </p>
                          
                          {activeCard && (
                            <motion.div 
                              onClick={() => {
                                setFlippedCards(prev => {
                                  const next = new Set(prev);
                                  if (next.has(activeCard.id)) {
                                    next.delete(activeCard.id);
                                  } else {
                                    next.add(activeCard.id);
                                  }
                                  return next;
                                });
                              }}
                              onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                              onTouchEnd={(e) => {
                                if (touchStartX === null) return;
                                const touchEndX = e.changedTouches[0].clientX;
                                const diff = touchStartX - touchEndX;
                                if (Math.abs(diff) > 40) {
                                  if (diff > 0) {
                                    if (activeCardIndex < (displayFlashcards.length || 1) - 1) {
                                      setActiveCardIndex(i => i + 1);
                                    }
                                  } else {
                                    if (activeCardIndex > 0) {
                                      setActiveCardIndex(i => i - 1);
                                    }
                                  }
                                }
                                setTouchStartX(null);
                              }}
                              className={`w-full perspective-1000 cursor-pointer group my-1 sm:my-3 select-none ${
                                isFlashcardFullscreen
                                  ? 'h-[calc(100vh-230px)] min-h-[360px] max-h-[700px]'
                                  : 'h-[350px] sm:h-[380px] md:h-[420px]'
                              }`}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            >
                              <motion.div 
                                animate={{ rotateY: flippedCards.has(activeCard.id) ? 180 : 0 }}
                                transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                                className="relative w-full h-full transform-style-3d"
                              >
                                {/* Front */}
                                <div className="absolute w-full h-full backface-hidden bg-white border-2 border-indigo-200 group-hover:border-indigo-400 rounded-3xl shadow-lg flex flex-col justify-between p-4 sm:p-7 transition-colors overflow-hidden">
                                  <div className="flex-1 flex flex-col items-center justify-center text-center py-3 px-1 overflow-y-auto custom-scrollbar">
                                    {(activeCard.frontImage || activeCard.image) && (
                                      <div className="max-h-64 sm:max-h-80 md:max-h-96 rounded-2xl overflow-hidden border border-slate-100 shadow-sm p-1.5 bg-white mb-3 shrink-0 flex items-center justify-center">
                                        <img src={activeCard.frontImage || activeCard.image} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                                      </div>
                                    )}
                                    <div className="text-lg sm:text-2xl font-bold text-slate-800 leading-relaxed">
                                      <MarkdownMath content={activeCard.front || (activeCard.frontImage || activeCard.image ? '' : '(Trống)')} />
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-indigo-50 text-center text-xs font-semibold text-indigo-500 flex items-center justify-center gap-1">
                                    <RotateCw className="w-3.5 h-3.5" /> Chạm lật mặt sau
                                  </div>
                                </div>
                                {/* Back */}
                                <div className="absolute w-full h-full backface-hidden bg-gradient-to-b from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-3xl shadow-lg flex flex-col justify-between p-4 sm:p-7 rotate-y-180 overflow-hidden">
                                  <div className="flex-1 flex flex-col items-center justify-center text-center py-3 px-1 overflow-y-auto custom-scrollbar">
                                    {activeCard.backImage && (
                                      <div className="max-h-64 sm:max-h-80 md:max-h-96 rounded-2xl overflow-hidden border border-indigo-100 shadow-sm p-1.5 bg-white mb-3 shrink-0 flex items-center justify-center">
                                        <img src={activeCard.backImage} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                                      </div>
                                    )}
                                    <div className="text-base sm:text-xl font-medium text-slate-800 leading-relaxed">
                                      <MarkdownMath content={activeCard.back || (activeCard.backImage || activeCard.image ? '' : '(Trống)')} />
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t border-indigo-100 text-center text-xs font-semibold text-indigo-500 flex items-center justify-center gap-1">
                                    <RotateCw className="w-3.5 h-3.5" /> Chạm quay lại mặt trước
                                  </div>
                                </div>
                              </motion.div>
                            </motion.div>
                          )}

                          <div className="flex justify-between items-center px-1 sm:px-4 gap-2">
                            <button 
                              disabled={activeCardIndex === 0}
                              onClick={() => setActiveCardIndex(i => i - 1)}
                              className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 disabled:opacity-40 active:scale-95 shadow-sm flex items-center gap-1 min-h-[44px]"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span>Thẻ trước</span>
                            </button>

                            <div className="flex flex-col items-center">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-700 font-mono">
                                {activeCardIndex + 1} / {displayFlashcards.length || 0}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Vuốt sang trái/phải</span>
                            </div>

                            <button 
                              disabled={activeCardIndex === (displayFlashcards.length || 1) - 1}
                              onClick={() => setActiveCardIndex(i => i + 1)}
                              className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 disabled:opacity-40 active:scale-95 shadow-sm flex items-center gap-1 min-h-[44px]"
                            >
                              <span>Thẻ sau</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="pt-3 border-t border-slate-200">
                            {allFlipped ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setShowFlashcardQuizTest(true);
                                }}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-emerald-100 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                              >
                                <Sparkles className="w-4 h-4" /> Bắt đầu bài kiểm tra Flashcard
                              </button>
                            ) : (
                              <button
                                disabled
                                className="w-full py-3.5 bg-slate-200 text-slate-400 font-bold text-xs sm:text-sm rounded-2xl uppercase tracking-wider cursor-not-allowed"
                              >
                                Lật hết thẻ để làm bài (Đã lật {flippedCards.size}/{displayFlashcards.length || 0})
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
                              Sử dụng camera để chụp lại từng trang vở ghi chép của bạn. Hệ thống hỗ trợ xem trước, xoay ảnh, chụp lại trang mờ và tự động đóng gói thành định dạng PDF chất lượng cao để gửi cho giáo viên.
                            </p>
                          </div>
                          
                          {/* If file has been captured/attached */}
                          {uploadedFileUrl ? (
                            <div className="bg-white border-2 border-emerald-200 rounded-2xl p-5 text-left space-y-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{uploadedFileName || 'bai_tap_chep_tay.pdf'}</h4>
                                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                      <Check className="w-3.5 h-3.5" /> Đã sẵn sàng {uploadedPageCount ? `(${uploadedPageCount} trang)` : ''}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowCamera(true)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                                >
                                  <Camera className="w-3.5 h-3.5" /> Chụp lại / Thêm trang
                                </button>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Lời nhắn gửi cho giáo viên:</label>
                                <textarea
                                  rows={2}
                                  value={submitContent}
                                  onChange={e => setSubmitContent(e.target.value)}
                                  className="w-full p-3 bg-slate-50 text-slate-900 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="Nhập ghi chú thêm cho giáo viên nếu có..."
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleStudentSubmit()}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                              >
                                <Send className="w-4 h-4" /> Gửi bài về cho Giáo viên
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <button
                                type="button"
                                onClick={() => setShowCamera(true)}
                                className="w-full max-w-md mx-auto py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
                              >
                                <Camera className="w-5 h-5" /> Mở Camera & Chụp ảnh vở ghi
                              </button>

                              <div className="text-center">
                                <label className="text-xs text-slate-500 hover:text-indigo-600 cursor-pointer font-medium inline-flex items-center gap-1">
                                  <Upload className="w-3.5 h-3.5" /> Hoặc tải file PDF/Ảnh có sẵn từ thiết bị
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setUploadedFileName(file.name);
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          if (typeof event.target?.result === 'string') {
                                            setUploadedFileUrl(event.target.result);
                                            setUploadedPageCount(1);
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          )}

                          {showCamera && (
                            <CameraCapture 
                              assignmentTitle={selectedAssignment.title}
                              onCancel={() => setShowCamera(false)}
                              onCapture={(img, pdfDataUrl, pageCount) => {
                                if (pdfDataUrl) {
                                  setUploadedFileUrl(pdfDataUrl);
                                  setUploadedFileName(`bai_tap_chep_tay_${pageCount || 1}_trang.pdf`);
                                  setUploadedPageCount(pageCount || 1);
                                } else {
                                  setUploadedFileUrl(img);
                                  setUploadedFileName('bai_tap_chep_tay.jpg');
                                  setUploadedPageCount(1);
                                }
                                setSubmitContent(prev => prev || 'Em gửi ảnh chép bài (đã chuyển thành PDF) ạ.');
                                setShowCamera(false);
                              }}
                              onSubmitDirectly={(img, pdfDataUrl, pageCount) => {
                                const finalFileUrl = pdfDataUrl || img;
                                const finalFileName = pdfDataUrl ? `bai_tap_chep_tay_${pageCount || 1}_trang.pdf` : 'bai_tap_chep_tay.jpg';
                                const finalContent = submitContent || 'Em gửi ảnh chép bài (đã chuyển thành PDF) ạ.';

                                onSubmitWork({
                                  assignmentId: selectedAssignment.id,
                                  studentId: user.id,
                                  studentName: user.name,
                                  content: finalContent,
                                  fileUrl: finalFileUrl
                                });

                                setSubmittedSuccessModal({
                                  assignmentTitle: selectedAssignment.title,
                                  fileName: finalFileName,
                                  pageCount: pageCount,
                                  submittedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                                  content: finalContent
                                });

                                setSubmitContent('');
                                setUploadedFileName(null);
                                setUploadedFileUrl(null);
                                setUploadedPageCount(undefined);
                                setShowCamera(false);
                              }}
                            />
                          )}
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
                              {uploadedFileName ? `Đã chọn: ${uploadedFileName} ${uploadedPageCount ? `(${uploadedPageCount} trang)` : ''}` : 'Kéo thả file bài làm (PDF, PNG, JPG) hoặc bấm để chọn'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ ảnh chụp tập vở nhiều trang (tự động xuất PDF) hoặc file tải lên</p>
                            <input 
                              type="file" 
                              className="hidden" 
                              id="fileUploadInput"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadedFileName(file.name);
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    if (typeof event.target?.result === 'string') {
                                      setUploadedFileUrl(event.target.result);
                                      setUploadedPageCount(1);
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
                              <Camera className="w-4 h-4" /> Chụp bài vở & Xuất PDF
                            </button>
                          </div>
                          {showCamera && (
                            <CameraCapture 
                              assignmentTitle={selectedAssignment.title}
                              onCancel={() => setShowCamera(false)}
                              onCapture={(img, pdfDataUrl, pageCount) => {
                                if (pdfDataUrl) {
                                  setUploadedFileUrl(pdfDataUrl);
                                  setUploadedFileName(`bai_tap_${pageCount || 1}_trang.pdf`);
                                  setUploadedPageCount(pageCount || 1);
                                } else {
                                  setUploadedFileUrl(img);
                                  setUploadedFileName('bai_tap_chep_tay.jpg');
                                  setUploadedPageCount(1);
                                }
                                setSubmitContent(prev => prev ? prev + '\nEm gửi ảnh chép bài (đã chuyển thành PDF) ạ.' : 'Em gửi ảnh chép bài (đã chuyển thành PDF) ạ.');
                                setShowCamera(false);
                              }}
                              onSubmitDirectly={(img, pdfDataUrl, pageCount) => {
                                const finalFileUrl = pdfDataUrl || img;
                                const finalFileName = pdfDataUrl ? `bai_tap_${pageCount || 1}_trang.pdf` : 'bai_tap_chep_tay.jpg';
                                const finalContent = submitContent || 'Em gửi ảnh bài làm (đã chuyển thành PDF) ạ.';

                                onSubmitWork({
                                  assignmentId: selectedAssignment.id,
                                  studentId: user.id,
                                  studentName: user.name,
                                  content: finalContent,
                                  fileUrl: finalFileUrl
                                });

                                setSubmittedSuccessModal({
                                  assignmentTitle: selectedAssignment.title,
                                  fileName: finalFileName,
                                  pageCount: pageCount,
                                  submittedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                                  content: finalContent
                                });

                                setSubmitContent('');
                                setUploadedFileName(null);
                                setUploadedFileUrl(null);
                                setUploadedPageCount(undefined);
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
                            className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2"
                          >
                            <Send className="w-4 h-4" /> Hoàn tất & Nộp bài tập
                          </button>
                        </div>
                      </form>
                    );
                  })()}
                </div>
              )}

              {/* TEACHER VIEW: Submission Matrix & Grading */}
              {isTeacher && (() => {
                const currentAssignmentSubs = submissions.filter(s => s.assignmentId === selectedAssignment.id);
                const gradedSubsCount = currentAssignmentSubs.filter(s => s.grade !== undefined).length;
                const pendingSubsCount = currentAssignmentSubs.filter(s => s.grade === undefined).length;

                const displayedSubs = currentAssignmentSubs.filter(sub => {
                  if (submissionSearchQuery.trim()) {
                    const q = submissionSearchQuery.trim().toLowerCase();
                    const name = (sub.studentName || '').toLowerCase();
                    const content = (sub.content || '').toLowerCase();
                    if (!name.includes(q) && !content.includes(q)) return false;
                  }
                  if (submissionFilterStatus === 'pending') return sub.grade === undefined;
                  if (submissionFilterStatus === 'graded') return sub.grade !== undefined;
                  return true;
                });

                return (
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    {/* Header with Title & Stats */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Danh sách học sinh nộp bài</h3>
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full border border-indigo-200">
                            {currentAssignmentSubs.length} đã nộp
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Nhấn vào từng bài nộp để xem chi tiết câu trả lời, hình ảnh, tài liệu và nhận xét.
                        </p>
                      </div>

                      {/* Filter Status Tabs */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
                        <button
                          type="button"
                          onClick={() => setSubmissionFilterStatus('all')}
                          className={`px-3 py-1.5 rounded-lg transition-all ${
                            submissionFilterStatus === 'all'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Tất cả ({currentAssignmentSubs.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionFilterStatus('pending')}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                            submissionFilterStatus === 'pending'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-slate-500 hover:text-amber-700'
                          }`}
                        >
                          <span>Chờ chấm</span>
                          {pendingSubsCount > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              submissionFilterStatus === 'pending' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {pendingSubsCount}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmissionFilterStatus('graded')}
                          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                            submissionFilterStatus === 'graded'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-emerald-700'
                          }`}
                        >
                          <span>Đã chấm</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                            submissionFilterStatus === 'graded' ? 'bg-white/30 text-white' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {gradedSubsCount}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Search bar when there are submissions */}
                    {currentAssignmentSubs.length > 2 && (
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm học sinh theo họ tên hoặc nội dung..."
                          value={submissionSearchQuery}
                          onChange={e => setSubmissionSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {submissionSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setSubmissionSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    {/* Submissions Cards List */}
                    <div className="space-y-3">
                      {isLoadingSubmissions ? (
                        <SubmissionsListSkeleton count={3} />
                      ) : currentAssignmentSubs.length === 0 ? (
                        <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center space-y-2">
                          <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="font-bold text-slate-700 text-sm">Chưa có học sinh nào nộp bài</p>
                          <p className="text-slate-500 text-xs">Khi học sinh làm bài và nộp, bài làm sẽ hiển thị chi tiết tại đây.</p>
                        </div>
                      ) : displayedSubs.length === 0 ? (
                        <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs">
                          Không tìm thấy bài nộp nào phù hợp với bộ lọc hiện tại.
                        </div>
                      ) : (
                        displayedSubs.map(sub => {
                          const studentUser = usersList.find(u => u.id === sub.studentId || (u.name && sub.studentName && u.name.trim().toLowerCase() === sub.studentName.trim().toLowerCase()));

                          return (
                            <div 
                              key={sub.id} 
                              className="group p-4 sm:p-5 bg-white hover:bg-indigo-50/20 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div 
                                  onClick={() => setInspectingSubmission(sub)}
                                  className="flex items-center gap-3 cursor-pointer select-none"
                                >
                                  <UserAvatar 
                                    name={sub.studentName || 'Học sinh'} 
                                    avatar={studentUser?.avatar} 
                                    size="md" 
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                        {sub.studentName || 'Học sinh'}
                                      </p>
                                      {studentUser?.className && (
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                                          Lớp: {studentUser.className}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>Nộp lúc: {format(new Date(sub.submittedAt), 'HH:mm dd/MM/yyyy')}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {sub.grade !== undefined ? (
                                    <span className="bg-emerald-50 text-emerald-800 font-black text-xs px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 shadow-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{sub.grade} / 10 điểm</span>
                                    </span>
                                  ) : (
                                    <span className="bg-amber-50 text-amber-800 font-extrabold text-xs px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Cần chấm điểm</span>
                                    </span>
                                  )}

                                  {sub.isPenalty && (
                                    <span className="bg-rose-50 text-rose-700 font-bold text-[10px] px-2 py-1 rounded-lg border border-rose-200">
                                      Nộp muộn
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Student Snippet / Note */}
                              <div 
                                onClick={() => setInspectingSubmission(sub)}
                                className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-150 text-xs text-slate-700 cursor-pointer transition-colors"
                              >
                                <p className="whitespace-pre-wrap line-clamp-2 font-medium">{sub.content || '(Không có lời nhắn)'}</p>
                                {sub.feedback && (
                                  <p className="text-[11px] text-indigo-700 font-semibold mt-1.5 pt-1.5 border-t border-slate-200/60 italic flex items-center gap-1">
                                    <span>💬 Nhận xét: "{sub.feedback}"</span>
                                  </p>
                                )}
                                {sub.fileUrl && (
                                  <div className="mt-2 text-indigo-600 font-bold text-[11px] flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Có tệp đính kèm bài làm</span>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                <div className="text-[11px] text-slate-400 font-medium">
                                  {selectedAssignment.type === 'online_test' && sub.quizAnswers && (
                                    <span>Đã làm {Object.keys(sub.quizAnswers).length} câu hỏi</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setInspectingSubmission(sub)}
                                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Xem chi tiết bài làm</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGradingSubId(gradingSubId === sub.id ? null : sub.id);
                                      setGradeValue(sub.grade !== undefined ? sub.grade : 10);
                                      setFeedbackValue(sub.feedback || '');
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
                                  >
                                    {gradingSubId === sub.id ? 'Thu gọn' : (sub.grade !== undefined ? 'Sửa nhanh' : 'Chấm nhanh')}
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={() => setSubmissionToDelete(sub)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                                    title="Xóa bài nộp"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Quick Inline Grading Form (Optional) */}
                              {gradingSubId === sub.id && (
                                <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200 space-y-3 mt-2 animate-in fade-in">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-extrabold text-slate-700 mb-1">Điểm số (0 - 10)</label>
                                      <input 
                                        type="number" min="0" max="10" step="0.5"
                                        value={gradeValue} onChange={e => setGradeValue(Number(e.target.value))}
                                        className="w-full p-2 text-xs font-bold bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-xs font-extrabold text-slate-700 mb-1">Nhận xét của giáo viên</label>
                                      <input 
                                        type="text"
                                        value={feedbackValue} onChange={e => setFeedbackValue(e.target.value)}
                                        className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
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
                              )}

                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
            </div>
          ) : isLoadingAssignments ? (
            <AssignmentDetailSkeleton />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm h-full min-h-[350px] flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-bold text-slate-800">Chưa chọn bài tập</p>
              <p className="text-xs mt-1">Hãy chọn một bài tập từ danh sách bên trái để xem chi tiết.</p>
            </div>
          )}
        </div>
      )}

      {showGamePreview && (
        <GamePreview 
          gameType={newGameType} 
          questions={parsedQuestionsData.parsedQuestions} 
          tugOfWarMode={newTugOfWarMode}
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

      {showFlashcardQuizTest && (
        <>
          {examTimeRemaining !== null && (
            <div className="fixed top-4 right-4 z-[99999] flex items-center gap-1.5 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl shadow-xl border border-slate-700/50">
              <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-amber-400 font-mono font-black text-xl tracking-wider">
                {formatTimeRemaining(examTimeRemaining)}
              </span>
            </div>
          )}
          <FlashcardQuizGame
            assignmentTitle={showCreateModal ? (newTitle || 'Xem trước bài kiểm tra Flashcard') : (selectedAssignment?.title || newTitle || 'Bài kiểm tra Flashcard')}
            flashcards={showCreateModal ? (newFlashcards.length > 0 ? newFlashcards : (selectedAssignment?.flashcards || [])) : (displayFlashcards.length > 0 ? displayFlashcards : (selectedAssignment?.flashcards || newFlashcards))}
            questions={
              showCreateModal
                ? (parsedQuestionsData.parsedQuestions.length > 0 ? parsedQuestionsData.parsedQuestions : (selectedAssignment?.questions || []))
                : (shuffledExamQuestions || (selectedAssignment ? selectedAssignment.questions : parsedQuestionsData.parsedQuestions))
            }
            studentName={user.name}
            timeLimitRemaining={examTimeRemaining}
            onFinish={(score, correctCount, answersMap, totalQuestions, quizItems) => {
            setShowFlashcardQuizTest(false);
            if (selectedAssignment && !showCreateModal) {
              const totalQ = totalQuestions || (selectedAssignment.flashcards?.length || selectedAssignment.questions?.length || 1);
              if (isTeacher) {
                alert(`[XEM TRƯỚC] Đã hoàn thành bài kiểm tra Flashcard (Đúng ${correctCount}/${totalQ} câu). Điểm: ${score}/10.`);
              } else {
                onSubmitWork({
                  assignmentId: selectedAssignment.id,
                  studentId: user.id,
                  studentName: user.name,
                  content: `Đã hoàn thành bài kiểm tra Flashcard (Đúng ${correctCount}/${totalQ} câu). Điểm: ${score}/10.`,
                  quizAnswers: answersMap,
                  quizDetails: {
                    totalQuestions: totalQ,
                    correctCount: correctCount,
                    score: score,
                    questions: (quizItems || []).map(item => ({
                      id: item.id,
                      question: item.question,
                      options: item.options,
                      correctAnswer: item.correctAnswer,
                      studentAnswer: answersMap[item.id],
                      isCorrect: answersMap[item.id] === item.correctAnswer,
                      solutionText: item.solutionText
                    }))
                  },
                  grade: score
                });
              }
            }
          }}
          onExit={() => setShowFlashcardQuizTest(false)}
        />
        </>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl w-full max-w-5xl shadow-2xl h-[92vh] max-h-[850px] flex flex-col overflow-hidden transition-all">
            
            {/* PINNED MODAL HEADER */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center justify-between sm:justify-start gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        createStep === 1
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">1</span>
                      <span className="hidden xs:inline">1. Soạn nội dung</span>
                      <span className="xs:hidden">Nội dung</span>
                    </button>
                    <span className="text-slate-400 text-xs px-0.5">➔</span>
                    <button
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        createStep === 2
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">2</span>
                      <span className="hidden xs:inline">2. Thiết lập & Giao</span>
                      <span className="xs:hidden">Giao bài</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Close Button */}
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)} 
                  className="sm:hidden p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Right controls: Type switcher (if assignments & step 1) + Desktop Close Button */}
              <div className="flex items-center gap-2 justify-between sm:justify-end">
                {createStep === 1 && viewMode === 'assignments' && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto custom-scrollbar w-full sm:w-auto">
                    {([
                      { key: 'file_upload', label: 'Offline', icon: '📁' },
                      { key: 'online_test', label: 'Online', icon: '📝' },
                      { key: 'simulation', label: 'Mô phỏng', icon: '🧪' },
                      { key: 'lesson_check', label: 'Chép bài', icon: '📷' }
                    ] as const).map(t => (
                      <button 
                        key={t.key}
                        type="button"
                        onClick={() => setNewType(t.key)}
                        className={`py-1.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0 ${
                          newType === t.key 
                            ? 'bg-white text-blue-700 shadow-sm border border-slate-200/80' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <span className="text-xs">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Desktop Close Button */}
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)} 
                  className="hidden sm:flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 ml-1"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Editor Content Area (Smoothly Scrollable, No Top Clipping) */}
            <div className="flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-5 md:p-6 custom-scrollbar">
              {createStep === 1 ? (
                <div className="w-full max-w-5xl mx-auto flex flex-col">
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
                      tugOfWarMode={newTugOfWarMode}
                      setTugOfWarMode={setNewTugOfWarMode}
                      user={user}
                    />
                  )}

                  {/* Flashcard Configuration */}
                  {newType === 'flashcard' && (
                    <FlashcardWizard
                      flashcardSubStep={flashcardSubStep}
                      setFlashcardSubStep={setFlashcardSubStep}
                      newFlashcards={newFlashcards}
                      setNewFlashcards={setNewFlashcards}
                      newSubFlashcardSets={newSubFlashcardSets}
                      setNewSubFlashcardSets={setNewSubFlashcardSets}
                      rawQuestionCode={rawQuestionCode}
                      setRawQuestionCode={setRawQuestionCode}
                      setShowFlashcardPreview={setShowFlashcardPreview}
                      setShowFlashcardQuizTest={setShowFlashcardQuizTest}
                      handleDownloadSampleFlashcards={handleDownloadSampleFlashcards}
                      handleImportFlashcards={handleImportFlashcards}
                      allAssignments={assignments}
                    />
                  )}

                  {/* 1. OFFLINE WORKSPACE (File Upload Type) */}
                  {newType === 'file_upload' && (
                    <div className="w-full max-w-2xl mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
                      <div className="text-center pb-3 border-b border-slate-100">
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center justify-center gap-2">
                          <span>📁</span> Tạo đề Offline (Nộp bài tự luận)
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">Học sinh tải đề hoặc xem online, sau đó làm bài tự luận và chụp ảnh/gửi tệp để nộp.</p>
                      </div>
                      
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
                              className="px-4 sm:px-5 py-2.5 sm:py-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-colors"
                            >
                              Dùng đề mẫu
                            </button>
                          </div>
                        </div>

                        <div className="text-center font-bold text-slate-400 text-xs sm:text-sm">HOẶC</div>

                        <div>
                          <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                            2. Tải tệp đề bài lên từ máy tính (PDF, Ảnh):
                          </label>
                          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 p-5 sm:p-8 rounded-2xl text-center cursor-pointer transition-all relative">
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
                            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-2 sm:mb-3" />
                            <p className="text-xs sm:text-sm font-bold text-slate-800">
                              {newPdfUrl?.startsWith('data:') ? '✅ Đã tải file đề bài thành công!' : 'Bấm để chọn file đề bài từ thiết bị (.pdf, .png, .jpg)'}
                            </p>
                            <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5">Học sinh sẽ nhìn thấy tệp đính kèm này để xem đề bài và tải về làm bài tập.</p>
                            <button 
                              type="button" 
                              onClick={() => document.getElementById('offlineTeacherFileInput')?.click()}
                              className="mt-3 sm:mt-4 px-5 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
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
                    <div className="w-full max-w-2xl mx-auto bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6 text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 text-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-2 border border-blue-100">
                        <Camera className="w-8 h-8 sm:w-10 sm:h-10" />
                      </div>
                      <h4 className="text-lg sm:text-xl font-black text-slate-800">
                        Kiểm tra Chép bài / Ghi bài trên lớp
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-lg mx-auto">
                        Học sinh sẽ được yêu cầu chụp ảnh vở ghi chép trực tiếp bằng camera trên thiết bị (điện thoại, máy tính bảng, laptop). Hệ thống tự động xử lý hình ảnh thành file để giáo viên dễ dàng kiểm tra mức độ chuyên cần.
                      </p>
                    </div>
                  )}

                  {/* 2. ONLINE TEST WORKSPACE */}
                  {newType === 'online_test' && (() => {
                    const parsedData = parsedQuestionsData;

                    return (
                      <div className="flex-1 flex flex-col xl:flex-row gap-4 h-full min-h-0">
                        {/* Left: Cards Preview */}
                        <div className="w-full xl:w-auto xl:flex-[5] bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[340px] xl:min-h-0">
                          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 mb-2.5 sm:mb-3 shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                                <span>👁️</span> Trực quan câu hỏi ({parsedData.parsedQuestions.length} câu)
                              </span>
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              Tổng: {parsedData.parsedQuestions.reduce((acc, q) => acc + (q.points || 0), 0)} điểm
                            </span>
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 custom-scrollbar">
                            {parsedData.parsedQuestions.map((pq, idx) => (
                              <div key={pq.id || idx} className="p-3 sm:p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5 sm:space-y-3 shadow-sm">
                                
                                {/* Card Toolbar */}
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pb-2 border-b border-slate-100 text-[10px] sm:text-[11px]">
                                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 bg-blue-50 text-blue-700 border border-blue-200 font-extrabold rounded-lg">
                                    {pq.numStr}
                                  </span>
                                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-50 text-slate-700 font-bold border border-slate-200 rounded-lg">
                                    {pq.points} điểm
                                  </span>
                                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-bold">
                                    {pq.type === 'multiple_choice' ? 'Trắc nghiệm nhiều phương án' : pq.type === 'true_false' ? 'Trắc nghiệm đúng sai' : 'Trả lời ngắn'}
                                  </span>
                                </div>

                                <div className="p-2.5 sm:p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
                                  <MarkdownMath content={pq.question} />
                                </div>

                                {/* Options rendering based on type */}
                                {pq.type === 'multiple_choice' && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {['A', 'B', 'C', 'D'].map((lbl, optIdx) => {
                                      const isCorrect = pq.correctAnswer === optIdx;
                                      return (
                                        <div 
                                          key={optIdx} 
                                          className={`p-2 sm:p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                                            isCorrect ? 'bg-blue-50/70 border-blue-400 text-blue-900 font-bold ring-1 ring-blue-300' : 'bg-white border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                            isCorrect ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                          }`}>
                                            {lbl}
                                          </span>
                                          <div className="overflow-hidden flex-1"><MarkdownMath content={pq.options[optIdx] || ''} /></div>
                                          {isCorrect && <Check className="w-4 h-4 text-blue-600 ml-auto shrink-0" />}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {pq.type === 'true_false' && pq.subOptions && (
                                  <div className="space-y-1.5 sm:space-y-2">
                                    {['a', 'b', 'c', 'd'].map((lbl, optIdx) => {
                                      const isCorrect = Array.isArray(pq.correctAnswer) ? pq.correctAnswer[optIdx] === 1 : undefined;
                                      const isFalse = Array.isArray(pq.correctAnswer) ? pq.correctAnswer[optIdx] === 0 : undefined;
                                      return (
                                      <div key={optIdx} className="p-2 rounded-xl border border-slate-200 text-xs font-semibold flex items-center gap-2 sm:gap-3 bg-white">
                                        <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                          {lbl})
                                        </span>
                                        <div className="flex-1 overflow-hidden"><MarkdownMath content={pq.subOptions![optIdx] || ''} /></div>
                                        <div className="flex gap-1 shrink-0">
                                          <span className={`px-2 py-0.5 sm:py-1 border rounded text-[10px] ${isCorrect ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Đúng</span>
                                          <span className={`px-2 py-0.5 sm:py-1 border rounded text-[10px] ${isFalse ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>Sai</span>
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

                                {(pq.solutionText || pq.method || pq.correctAnswer !== undefined) && (
                                  <div className="pt-2.5 sm:pt-3 border-t border-dashed border-slate-200 text-xs space-y-1.5 bg-amber-50/40 p-2.5 sm:p-3 rounded-xl border border-amber-200/60">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">Hướng dẫn giải</p>
                                    {pq.method && <div className="text-slate-700 mt-1"><strong>Phương pháp:</strong> <MarkdownMath content={pq.method} /></div>}
                                    {pq.solutionText && <div className="text-slate-700 mt-1 leading-relaxed"><MarkdownMath content={pq.solutionText} /></div>}
                                    {pq.type === 'multiple_choice' && typeof pq.correctAnswer === 'number' && (
                                      <div className="text-emerald-800 font-bold mt-1 text-xs">
                                        Đáp án đúng là: {['A', 'B', 'C', 'D'][pq.correctAnswer]}.
                                      </div>
                                    )}
                                    {pq.type === 'true_false' && Array.isArray(pq.correctAnswer) && (
                                      <div className="text-emerald-800 font-bold mt-1 text-xs">
                                        Đáp án: {pq.correctAnswer.map((v, i) => `${['a', 'b', 'c', 'd'][i]}) ${v === 1 ? 'Đúng' : 'Sai'}`).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right: Code Input */}
                        <div className="w-full xl:w-auto xl:flex-[4] bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[340px] xl:min-h-0">
                          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100 mb-2.5 sm:mb-3">
                            <span className="text-xs font-bold text-slate-700">Mã nguồn đề thi</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">{rawQuestionCode.split('\n').length} dòng</span>
                              <button
                                type="button"
                                onClick={() => setRawQuestionCode('')}
                                title="Xóa nhanh toàn bộ nội dung khung soạn thảo"
                                className="p-1.5 px-3 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 border border-rose-200 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold shadow-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa trắng</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex-1 border border-slate-200 rounded-2xl bg-white overflow-hidden flex shadow-inner min-h-[160px]">
                            <textarea 
                              value={rawQuestionCode}
                              onChange={e => setRawQuestionCode(e.target.value)}
                              className="flex-1 w-full p-3 sm:p-4 text-xs font-mono text-slate-800 outline-none resize-none leading-relaxed whitespace-pre font-medium"
                              spellCheck={false}
                              placeholder="Nhập nội dung đề thi..."
                            />
                          </div>
                          
                          <div className="mt-2.5 sm:mt-3 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 sm:space-y-2">
                            <p className="text-[11px] font-bold text-slate-600">Nội dung mẫu:</p>
                            <div className="flex flex-wrap gap-1.5 sm:gap-2">
                              <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau1)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">Mẫu 1 (Trắc nghiệm)</button>
                              <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau2)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">Mẫu 2 (Đúng / Sai)</button>
                              <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau3)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">Mẫu 3 (Sắp xếp từ)</button>
                              <button onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau_matching)} className="text-[11px] text-indigo-600 font-bold hover:underline px-2 sm:px-2.5 py-1 sm:py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors">🚃 Mẫu 4 (Ghép vế)</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. SIMULATION WORKSPACE */}
                  {newType === 'simulation' && (
                    <div className="w-full max-w-3xl mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-5">
                      <div className="text-center pb-3 border-b border-slate-100">
                        <h4 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center justify-center gap-2">
                          <span>🧪</span> Lựa chọn từ Kho Mô phỏng
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">Bấm chọn một mô phỏng tương tác dưới đây để tích hợp trực tiếp vào bài tập:</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-[45vh] overflow-y-auto p-3 sm:p-4 border border-slate-200 rounded-2xl bg-slate-50 custom-scrollbar">
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
                              className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all ${
                                isSelected 
                                  ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-100 shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1.5">
                                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">
                                  {sim.category || 'Toán học'}
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                              </div>
                              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1">{sim.title}</h4>
                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">{sim.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* STEP 2: METADATA & SCHEDULE CONFIGURATION */
                <div className="w-full max-w-xl mx-auto bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
                  <div className="text-center pb-3 border-b border-slate-100">
                    <h4 className="text-lg sm:text-xl font-extrabold text-slate-800">2. Thông tin bài tập</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Hoàn tất các thông tin chung trước khi giao bài cho học sinh.</p>
                  </div>
                  
                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tên bài tập / Đề thi:</label>
                      <input 
                        required 
                        type="text"
                        value={newTitle} 
                        onChange={e => setNewTitle(e.target.value)}
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-shadow"
                        placeholder="Nhập tên bài tập..." 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Thuộc buổi học / Khóa học:</label>
                      <input 
                        type="text"
                        value={newSessionTitle} 
                        onChange={e => setNewSessionTitle(e.target.value)}
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-shadow placeholder:text-slate-400 font-normal"
                        placeholder="VD: Đại số 10 - Tiết 23" 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Khối lớp (1 - 12):</label>
                          {newGrade && (
                            <button
                              type="button"
                              onClick={() => setNewGrade('')}
                              className="text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={newGrade}
                          onChange={e => {
                            const val = e.target.value;
                            const numOnly = val.replace(/\D/g, '');
                            if (numOnly && !val.startsWith('Khối') && Number(numOnly) >= 1 && Number(numOnly) <= 12) {
                              setNewGrade(`Khối ${numOnly}`);
                            } else {
                              setNewGrade(val);
                            }
                          }}
                          placeholder="Điền số 1 - 12 (VD: 10) hoặc chọn..."
                          className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-shadow placeholder:text-slate-400 placeholder:font-normal"
                        />
                        {/* Quick Selection Buttons 1 to 12 */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((gNum) => {
                            const gStr = `Khối ${gNum}`;
                            const isSelected = newGrade === gStr || newGrade === `${gNum}`;
                            return (
                              <button
                                key={gNum}
                                type="button"
                                onClick={() => setNewGrade(isSelected ? '' : gStr)}
                                className={`px-2 py-0.5 text-[11px] rounded-lg font-bold border transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-105'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                }`}
                              >
                                K{gNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Chọn Lớp đang dạy:</label>
                          {newClassName && (
                            <button
                              type="button"
                              onClick={() => setNewClassName('')}
                              className="text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                            >
                              Toàn trường (Tất cả)
                            </button>
                          )}
                        </div>
                        
                        {/* Select dropdown from system classes */}
                        <select
                          value={availableTeacherClasses.includes(newClassName) ? newClassName : (newClassName ? '__custom__' : '')}
                          onChange={e => {
                            if (e.target.value === '__custom__') {
                              // keep current or leave empty to type
                            } else {
                              setNewClassName(e.target.value);
                            }
                          }}
                          className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-shadow mb-2"
                        >
                          <option value="">🌐 Toàn bộ học sinh (Áp dụng tất cả các lớp)</option>
                          <optgroup label="Danh sách các lớp trong hệ thống">
                            {availableTeacherClasses.map((cls) => (
                              <option key={cls} value={cls}>
                                🏫 Lớp {cls}
                              </option>
                            ))}
                          </optgroup>
                        </select>

                        {/* Quick Selection Buttons */}
                        {availableTeacherClasses.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {availableTeacherClasses.map((clsTitle) => {
                              const isSelected = newClassName === clsTitle;
                              return (
                                <button
                                  key={clsTitle}
                                  type="button"
                                  onClick={() => setNewClassName(isSelected ? '' : clsTitle)}
                                  className={`px-2.5 py-1 text-[11px] rounded-lg font-bold border transition-all ${
                                    isSelected
                                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs scale-105'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                                  }`}
                                >
                                  {clsTitle}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <DateTimePicker24h
                        label="Thời gian giao đề (Hạn nộp 24H):"
                        value={newDueDate}
                        onChange={setNewDueDate}
                        required
                      />
                    </div>

                    {/* Number of attempts options (1, 2, 3, ... vĩnh viễn) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Số lần làm bài cho phép:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { value: 0, label: 'Vĩnh viễn', desc: 'Không giới hạn số lần' },
                          { value: 1, label: '1 lần', desc: 'Kiểm tra nghiêm túc' },
                          { value: 2, label: '2 lần', desc: 'Cho phép làm lại 1 lần' },
                          { value: 3, label: '3 lần', desc: 'Cho phép làm 3 lần' },
                          { value: 5, label: '5 lần', desc: 'Tối đa 5 lượt làm' },
                          { value: 10, label: '10 lần', desc: 'Tối đa 10 lượt làm' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setNewMaxAttempts(opt.value)}
                            className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-left transition-all ${
                              newMaxAttempts === opt.value
                                ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200 text-indigo-950 font-bold shadow-sm'
                                : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-700 font-medium hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold">{opt.label}</span>
                              {newMaxAttempts === opt.value && <Check className="w-4 h-4 text-indigo-600" />}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                      <div className="mt-2.5 bg-blue-50/70 border border-blue-200/70 rounded-xl p-2.5 text-[11px] text-blue-800 space-y-1">
                        <p className="font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <strong>Cơ chế thời hạn & Số lần làm:</strong>
                        </p>
                        <p className="text-blue-700 leading-relaxed">
                          Trong thời gian giáo viên quy định, học sinh <strong>bắt buộc phải làm</strong>. Sau khi lố thời gian nộp, học sinh <strong>vẫn được làm tiếp</strong> bao nhiêu lần cũng được để chủ động luyện tập và ôn lại kiến thức.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Mô tả & Hướng dẫn:</label>
                      <textarea 
                        required rows={3}
                        value={newDescription} onChange={e => setNewDescription(e.target.value)}
                        className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-blue-600 resize-none transition-shadow leading-relaxed"
                        placeholder="VD: Các em làm bài đầy đủ trước khi lên lớp học..."
                      />
                    </div>

                    <div className="flex flex-col gap-3 pt-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isMandatory"
                          checked={newIsMandatory}
                          onChange={e => setNewIsMandatory(e.target.checked)}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600 cursor-pointer"
                        />
                        <label htmlFor="isMandatory" className="text-xs sm:text-sm font-bold text-slate-700 cursor-pointer select-none">
                          Bài tập bắt buộc hoàn thành
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="isPublished"
                          checked={newIsPublished}
                          onChange={e => setNewIsPublished(e.target.checked)}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-600 cursor-pointer"
                        />
                        <label htmlFor="isPublished" className="text-xs sm:text-sm font-bold text-slate-700 cursor-pointer select-none">
                          Hiển thị với học sinh (On Air)
                        </label>
                      </div>
                    </div>

                    {(newType === 'online_test' || newType === 'game' || newType === 'flashcard') && (
                      <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4">
                        <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Timer className="w-4 h-4" />
                          Thiết lập Chế độ thi
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                              Thời gian làm bài (Phút):
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newTimeLimit || ''}
                              onChange={e => setNewTimeLimit(Number(e.target.value))}
                              placeholder="0 = Không giới hạn"
                              className="w-full px-3.5 py-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                            />
                            <p className="mt-1.5 text-[11px] text-slate-500 font-medium">Để trống hoặc 0 để không giới hạn. Tự động thu bài khi hết giờ.</p>
                          </div>
                          
                          <div className="flex flex-col justify-center">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newShuffleQuestions}
                                onChange={e => setNewShuffleQuestions(e.target.checked)}
                                className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600 cursor-pointer"
                              />
                              <span className="text-sm font-bold text-slate-700">Trộn ngẫu nhiên câu hỏi</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PINNED MODAL FOOTER */}
            <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-bold text-xs sm:text-sm rounded-xl transition-all active:scale-95"
                >
                  Hủy bỏ (Esc)
                </button>
                <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span>Phím tắt:</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-600">Esc: Đóng</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-600">Ctrl + Enter: Lưu</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {createStep === 1 ? (
                  <button 
                    type="button"
                    onClick={() => setCreateStep(2)}
                    className="px-5 sm:px-8 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-200 transition-all flex items-center gap-1.5 uppercase tracking-wider"
                    title="Phím tắt: Ctrl + Enter"
                  >
                    <span>Tiếp tục thiết lập</span>
                    <span>→</span>
                  </button>
                ) : (
                  <button 
                    type="button"
                    disabled={isSavingAssignment}
                    onClick={handleSaveAssignment}
                    className="px-5 sm:px-8 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50"
                    title="Phím tắt: Ctrl + Enter"
                  >
                    <span>{isSavingAssignment ? 'Đang lưu bài học...' : (editingAssignment ? 'Lưu thay đổi' : 'Tạo & Giao bài ngay')}</span>
                    <span>{isSavingAssignment ? '⏳' : '✓'}</span>
                  </button>
                )}
              </div>
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
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium text-slate-500">Nhận xét của cô Hoa:</span>
                <span className="text-indigo-700 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
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
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors border border-slate-200"
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

      {/* Submission Success Confirmation Modal */}
      {submittedSuccessModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setSubmittedSuccessModal(null)}
          />
          <div className="relative bg-white w-full max-w-md rounded-3xl p-6 sm:p-7 text-center shadow-2xl border border-emerald-100 overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
            
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-1">
              Đã gửi bài về cho Giáo viên! 🎉
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Hệ thống đã chuyển bài làm của bạn đến giáo viên bộ môn thành công.
            </p>

            {/* Details Box */}
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 mb-5 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Bài tập:</span>
                <span className="font-bold text-slate-800 text-right line-clamp-1 max-w-[200px]">
                  {submittedSuccessModal.assignmentTitle}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Thời gian nộp:</span>
                <span className="font-bold text-slate-700">{submittedSuccessModal.submittedAt}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Tệp bài làm:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {submittedSuccessModal.fileName}
                  {submittedSuccessModal.pageCount && ` (${submittedSuccessModal.pageCount} trang)`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Trạng thái:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                  Chờ giáo viên chấm điểm
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSubmittedSuccessModal(null)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Đã hiểu & Hoàn tất
            </button>
          </div>
        </div>
      )}

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

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebration && celebrationDetails && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCelebration(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                transition: { type: 'spring', damping: 20, stiffness: 300 }
              }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-8 text-center shadow-2xl border border-amber-100 overflow-hidden flex flex-col items-center"
            >
              {/* Top Decorative Sparkles */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500" />
              
              {/* Big Animated Trophy/Star Circle */}
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-yellow-200 flex items-center justify-center text-4xl shadow-md border-4 border-white mb-5 relative"
              >
                <span className="animate-pulse">🏆</span>
                {/* Miniature floating sparkles */}
                <span className="absolute -top-1 -right-1 text-base animate-bounce">✨</span>
                <span className="absolute -bottom-2 -left-1 text-lg animate-bounce delay-150">⭐</span>
              </motion.div>

              {/* Title */}
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 tracking-wide uppercase mb-1"
              >
                {celebrationDetails.title}
              </motion.h3>

              {/* Assignment Title */}
              <p className="text-xs text-slate-400 font-bold mb-4 px-4 py-1 bg-slate-50 border border-slate-100 rounded-full max-w-full truncate">
                📚 {celebrationDetails.assignmentTitle}
              </p>

              {/* Reward stats */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="grid grid-cols-2 gap-3 w-full mb-6"
              >
                <div className="bg-gradient-to-b from-amber-50 to-amber-100/40 p-4 rounded-2xl border border-amber-100 text-center flex flex-col justify-center items-center shadow-sm">
                  <span className="text-2xl mb-1">🎯</span>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Điểm số đạt</p>
                  <p className="text-xl font-extrabold text-amber-700 font-mono mt-0.5">{celebrationDetails.gradeText}</p>
                </div>
                <div className="bg-gradient-to-b from-indigo-50 to-indigo-100/40 p-4 rounded-2xl border border-indigo-100 text-center flex flex-col justify-center items-center shadow-sm">
                  <span className="text-2xl mb-1">🔥</span>
                  <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Điểm tích lũy</p>
                  <p className="text-xl font-extrabold text-indigo-700 font-mono mt-0.5">+{celebrationDetails.points} XP</p>
                </div>
              </motion.div>

              {/* Motivational Quote */}
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-sm text-slate-600 font-semibold leading-relaxed mb-6 px-1 max-w-xs"
              >
                "{celebrationDetails.feedbackMsg}"
              </motion.p>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCelebration(false)}
                className="w-full py-3.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white font-extrabold text-sm rounded-2xl shadow-xl hover:shadow-indigo-900/10 transition-all flex items-center justify-center gap-2"
              >
                <span>🚀 Tiếp tục học tập</span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE SUBMISSION CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!submissionToDelete}
        onClose={() => setSubmissionToDelete(null)}
        onConfirm={handleDeleteSubmission}
        title="Xác nhận xóa bài nộp"
        message={`Bạn có chắc chắn muốn xóa bài nộp này không? Hành động này không thể hoàn tác.`}
        confirmText="Xóa bài"
        cancelText="Hủy"
        variant="danger"
        loading={isDeletingSubmission}
      />

      {/* DELETE ASSIGNMENT CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteConfirmAssignment}
        onClose={() => setDeleteConfirmAssignment(null)}
        onConfirm={() => {
          if (deleteConfirmAssignment) {
            handleDeleteAssignment(deleteConfirmAssignment.id);
          }
        }}
        title="Xác nhận xóa bài tập"
        message={`Bạn có chắc chắn muốn xóa bài tập "${deleteConfirmAssignment?.title}"? Tất cả dữ liệu liên quan bài tập này sẽ bị xóa khỏi hệ thống.`}
        confirmText="Xóa bài tập"
        cancelText="Hủy"
        variant="danger"
      />

      {/* BULK DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBulkDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-black shadow-inner">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Xác nhận xóa hàng loạt
                    </h3>
                    <p className="text-xs text-slate-500">Bạn đang thực hiện xóa {selectedIdsForDeletion.length} mục đã chọn.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="p-1.5 hover:bg-slate-200/60 active:scale-95 text-slate-400 hover:text-slate-700 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Table / List Body */}
              <div className="p-6 overflow-y-auto max-h-[300px] space-y-4">
                <p className="text-xs font-bold text-slate-600">
                  Danh sách các bài học / bài tập sẽ bị xóa vĩnh viễn khỏi hệ thống:
                </p>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 font-extrabold text-slate-700 w-12">#</th>
                        <th className="p-3 font-extrabold text-slate-700">Tiêu đề bài tập</th>
                        <th className="p-3 font-extrabold text-slate-700 w-24">Thể loại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignments
                        .filter(a => selectedIdsForDeletion.includes(a.id))
                        .map((a, index) => (
                          <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-500">{index + 1}</td>
                            <td className="p-3 font-bold text-slate-800 truncate max-w-[250px]">{a.title}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase">
                                {a.type === 'online_test' ? 'Kiểm tra' : a.type === 'simulation' ? 'Mô phỏng' : a.type === 'game' ? 'Trò chơi' : a.type === 'flashcard' ? 'Flashcard' : 'Nộp bài'}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs leading-relaxed text-rose-950 font-medium">
                  <p className="font-extrabold text-rose-900 flex items-center gap-1">🚨 Cảnh báo hệ thống:</p>
                  <p className="mt-1">
                    Hành động này là <b>không thể khôi phục</b>. Tất cả dữ liệu điểm số, danh sách học sinh nộp bài và nhận xét liên quan đến các mục này sẽ biến mất vĩnh viễn khỏi cơ sở dữ liệu Firestore.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleBulkDeleteAssignments}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-rose-100 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Xác nhận xóa hết
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STUDENT SUBMISSION DETAIL MODAL */}
      <StudentSubmissionDetailModal
        isOpen={!!inspectingSubmission}
        onClose={() => setInspectingSubmission(null)}
        submission={inspectingSubmission}
        assignment={selectedAssignment}
        allSubmissions={selectedAssignment ? submissions.filter(s => s.assignmentId === selectedAssignment.id) : []}
        onSelectSubmission={(sub) => setInspectingSubmission(sub)}
        onGrade={(subId, grade, feedback) => {
          onGrade(subId, grade, feedback);
          // If the currently inspected submission was updated, update local state
          if (inspectingSubmission && inspectingSubmission.id === subId) {
            setInspectingSubmission(prev => prev ? { ...prev, grade, feedback } : null);
          }
        }}
        isTeacher={isTeacher}
        currentUser={user}
        usersList={usersList}
      />

      {/* CHAT / STUDENT QUESTION MODAL */}
      <AnimatePresence>
        {showChatModal && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (chatStatus.type !== 'sending') {
                  setShowChatModal(false);
                }
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-lg font-bold shadow-inner">
                    💬
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Gửi Thắc mắc / Chat với Giáo viên
                    </h3>
                    <p className="text-xs text-slate-500">Giúp bạn giải đáp nhanh câu hỏi về bài tập</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  disabled={chatStatus.type === 'sending'}
                  className="p-1.5 hover:bg-slate-200/60 active:scale-95 text-slate-400 hover:text-slate-700 rounded-xl transition-all disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Assignment context info */}
                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex flex-col gap-1 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Bài tập đang thắc mắc</span>
                  <span className="font-black text-indigo-900 text-sm">{selectedAssignment.title}</span>
                  {selectedAssignment.classSessionTitle && (
                    <span className="text-indigo-600 font-semibold">Buổi học: {selectedAssignment.classSessionTitle}</span>
                  )}
                </div>

                {/* Form Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">Câu hỏi hoặc Thắc mắc của bạn:</label>
                  <textarea
                    rows={4}
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder="Thưa thầy/cô, phần này em làm đến bước... thì chưa hiểu rõ..."
                    disabled={chatStatus.type === 'sending' || chatStatus.type === 'success'}
                    className="w-full px-3.5 py-3 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded-2xl transition-all resize-none placeholder-slate-400"
                  />
                </div>

                {/* Status alert */}
                {chatStatus.type !== 'idle' && (
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-bold flex items-center gap-2 ${
                    chatStatus.type === 'sending'
                      ? 'bg-indigo-50 border border-indigo-100 text-indigo-800'
                      : chatStatus.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                      : 'bg-rose-50 border border-rose-100 text-rose-800'
                  }`}>
                    {chatStatus.type === 'sending' && (
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                    <span>{chatStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Footer / Actions */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div />

                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowChatModal(false)}
                    disabled={chatStatus.type === 'sending'}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSendChatQuestion}
                    disabled={chatStatus.type === 'sending' || chatStatus.type === 'success' || !chatQuestion.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Gửi thắc mắc
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
