import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  Search, 
  Filter, 
  Check, 
  X, 
  Clock, 
  BookOpen, 
  Gamepad2, 
  Library, 
  Microscope, 
  FileText, 
  Send, 
  User, 
  FolderArchive, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  Play, 
  Info,
  Calendar,
  Volume2,
  RotateCw,
  Trophy,
  Award,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Shuffle,
  Maximize2,
  Minimize2,
  Radio
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { Assignment, User as UserType, ClassSession } from '../types';
import confetti from 'canvas-confetti';
import { GamePreview } from '../components/GamePreview';
import { FlashcardQuizGame } from '../components/FlashcardQuizGame';
import { MarkdownMath } from '../components/MarkdownMath';

interface ResourcesRepositoryViewProps {
  user: UserType;
  assignments: Assignment[];
  onAwardPoints?: (points: number, reason?: string) => void;
}

interface ResourceRequest {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  fromTeacherId: string;
  fromTeacherName: string;
  toTeacherId: string;
  toTeacherName: string;
  targetGrade: string;
  targetClassName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export function ResourcesRepositoryView({ user, assignments, onAwardPoints }: ResourcesRepositoryViewProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  // Subscriptions & local states
  const [classList, setClassList] = useState<ClassSession[]>([]);
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterAuthor, setFilterAuthor] = useState('all');
  const [filterOnAir, setFilterOnAir] = useState('all');

  // Request & Preview modals
  const [requestingAssignment, setRequestingAssignment] = useState<Assignment | null>(null);
  const [targetGrade, setTargetGrade] = useState('');
  const [targetClassName, setTargetClassName] = useState('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [previewingAssignment, setPreviewingAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    if (previewingAssignment) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [previewingAssignment]);
  
  // Flashcard playing state in preview
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);

  // Interactive Sandbox states
  const [sandboxTab, setSandboxTab] = useState<'student' | 'teacher'>('student');
  const [sandboxQuizAnswers, setSandboxQuizAnswers] = useState<Record<string, number>>({});
  const [sandboxSubmitted, setSandboxSubmitted] = useState(false);
  const [sandboxScore, setSandboxScore] = useState(0);
  const [sandboxCorrectCount, setSandboxCorrectCount] = useState(0);
  const [flashcardSubMode, setFlashcardSubMode] = useState<'study' | 'quiz'>('study');

  // Text-To-Speech Pronunciation Audio Reader
  const handleSpeakText = (text: string, lang: string = 'vi-VN') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Get combined / normalized flashcards
  const displayFlashcards = React.useMemo(() => {
    if (!previewingAssignment) return [];
    if (previewingAssignment.flashcards && previewingAssignment.flashcards.length > 0) {
      return previewingAssignment.flashcards;
    }
    if (previewingAssignment.subFlashcardSets && previewingAssignment.subFlashcardSets.length > 0) {
      return previewingAssignment.subFlashcardSets.flatMap(s => s.flashcards || []);
    }
    return [];
  }, [previewingAssignment]);

  // Actual flashcards list respecting shuffle mode
  const activeFlashcardList = React.useMemo(() => {
    if (!isShuffled || shuffledOrder.length !== displayFlashcards.length) {
      return displayFlashcards;
    }
    return shuffledOrder.map(idx => displayFlashcards[idx]).filter(Boolean);
  }, [displayFlashcards, isShuffled, shuffledOrder]);

  const handleToggleShuffle = () => {
    if (isShuffled) {
      setIsShuffled(false);
      setShuffledOrder([]);
      setActiveCardIndex(0);
      setIsCardFlipped(false);
    } else {
      const order = Array.from({ length: displayFlashcards.length }, (_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      setShuffledOrder(order);
      setIsShuffled(true);
      setActiveCardIndex(0);
      setIsCardFlipped(false);
    }
  };

  // Load classes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'class_sessions'), (snapshot) => {
      const list: ClassSession[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ClassSession);
      });
      setClassList(list);
    });
    return () => unsub();
  }, []);

  // Load sharing requests
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'resource_requests'), (snapshot) => {
      const list: ResourceRequest[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ResourceRequest);
      });
      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRequests(list);
    });
    return () => unsub();
  }, []);

  // Reset sandbox states when previewing assignment changes
  useEffect(() => {
    if (previewingAssignment) {
      setSandboxQuizAnswers({});
      setSandboxSubmitted(false);
      setSandboxScore(0);
      setSandboxCorrectCount(0);
      setActiveCardIndex(0);
      setIsCardFlipped(false);
      setIsShuffled(false);
      setShuffledOrder([]);
      setSandboxTab('student');
      setFlashcardSubMode('study');
    }
  }, [previewingAssignment]);

  // Filter lists
  const availableTeacherClasses = React.useMemo(() => {
    const classSet = new Set<string>();

    // 1. Classes from teacher's sessions/classes in database (or all for admin)
    classList.forEach((c: any) => {
      if (isAdmin || c.teacherId === user.id || c.teacherName === user.name) {
        if (c.className && typeof c.className === 'string') classSet.add(c.className.trim());
        if (c.title && typeof c.title === 'string') {
          classSet.add(c.title.trim());
        }
      }
    });

    // 2. Class from teacher's own profile
    if (user.className && typeof user.className === 'string') {
      classSet.add(user.className.trim());
    }

    // 3. Classes from assignments created by this teacher (or all for admin)
    assignments.forEach(a => {
      const isOwner = a.teacherId === user.id || a.teacherName === user.name;
      if (isAdmin || isOwner) {
        if (a.className && typeof a.className === 'string') {
          classSet.add(a.className.trim());
        }
      }
    });

    // 4. Fallback from localStorage
    const localClass = localStorage.getItem('class_name');
    if (localClass && typeof localClass === 'string' && localClass.trim()) {
      classSet.add(localClass.trim());
    }

    // Default standard classes ONLY if the list is completely empty, to prevent broken UI
    if (classSet.size === 0) {
      if (user.className) {
        classSet.add(user.className.trim());
      } else {
        const defaults = ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'];
        defaults.forEach(d => classSet.add(d));
      }
    }

    return Array.from(classSet)
      .filter(Boolean)
      .filter(name => {
        const trimmed = name.trim();
        // Allow any valid non-empty class name, including those starting with Vietnamese words like "Lớp" or custom names like "Yêu thương"
        return trimmed.length > 0;
      })
      .sort((a, b) => 
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [classList, user, isAdmin, assignments]);

  const myClasses = React.useMemo(() => {
    return classList.filter(c => c.teacherId === user.id || isAdmin);
  }, [classList, user, isAdmin]);

  const authors = React.useMemo(() => {
    const names = new Set<string>();
    assignments.forEach(a => {
      if (a.teacherName) names.add(a.teacherName);
    });
    return Array.from(names);
  }, [assignments]);

  const filteredResources = React.useMemo(() => {
    return assignments.filter(a => {
      // Show all except drafts of other teachers (unless admin)
      if (!isAdmin && a.teacherId !== user.id && a.isPublished === false) return false;

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const titleMatch = (a.title || '').toLowerCase().includes(q);
        const descMatch = (a.description || '').toLowerCase().includes(q);
        const authorMatch = (a.teacherName || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !authorMatch) return false;
      }

      // Type Filter
      if (filterType !== 'all') {
        if (a.type !== filterType) return false;
      }

      // Grade Filter
      if (filterGrade !== 'all') {
        if (a.grade !== filterGrade) return false;
      }

      // Author Filter
      if (filterAuthor !== 'all') {
        if (a.teacherName !== filterAuthor) return false;
      }

      // On Air Filter
      if (filterOnAir !== 'all') {
        if (filterOnAir === 'on_air' && a.isPublished === false) return false;
        if (filterOnAir === 'draft' && a.isPublished !== false) return false;
      }

      return true;
    });
  }, [assignments, searchQuery, filterType, filterGrade, filterAuthor, filterOnAir, user, isAdmin]);

  // Request assignment modal open
  const handleOpenRequestModal = (assignment: Assignment) => {
    setRequestingAssignment(assignment);
    setTargetGrade(assignment.grade || '');
    setTargetClassName(assignment.className || '');
  };

  // Submit request
  const handleSubmitRequest = async () => {
    if (!requestingAssignment) return;
    if (!targetClassName.trim()) {
      alert('Vui lòng chọn hoặc nhập tên lớp để chuyển tài nguyên về!');
      return;
    }

    try {
      const id = `req_${Date.now()}`;
      const payload: ResourceRequest = {
        id,
        assignmentId: requestingAssignment.id,
        assignmentTitle: requestingAssignment.title,
        assignmentType: requestingAssignment.type,
        fromTeacherId: user.id,
        fromTeacherName: user.name || 'Giáo viên',
        toTeacherId: requestingAssignment.teacherId || 'admin',
        toTeacherName: requestingAssignment.teacherName || 'Hệ thống',
        targetGrade,
        targetClassName,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'resource_requests', id), payload);
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });

      alert(`🎉 Đã gửi yêu cầu xin tài nguyên "${requestingAssignment.title}" tới giáo viên ${payload.toTeacherName}. Vui lòng chờ phê duyệt!`);
      setRequestingAssignment(null);
    } catch (err) {
      console.error('Error submitting request:', err);
      alert('Có lỗi xảy ra khi gửi yêu cầu!');
    }
  };

  // Approve request
  const handleApproveRequest = async (request: ResourceRequest) => {
    try {
      // 1. Get assignment data
      const originDoc = await getDoc(doc(db, 'assignments', request.assignmentId));
      if (!originDoc.exists()) {
        alert('Tài nguyên gốc không tồn tại hoặc đã bị xóa!');
        return;
      }

      const originData = originDoc.data() as Assignment;
      const clonedId = `a_cloned_${Date.now()}`;
      
      // 2. Build cloned assignment
      const clonedAssignment: Assignment = {
        ...originData,
        id: clonedId,
        teacherId: request.fromTeacherId,
        teacherName: request.fromTeacherName,
        grade: request.targetGrade,
        className: request.targetClassName,
        isPublished: true, // Make it active for the requesting teacher
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString() // Default due date in 3 days
      };

      // 3. Save to database
      await setDoc(doc(db, 'assignments', clonedId), clonedAssignment);

      // 4. Update request status
      await setDoc(doc(db, 'resource_requests', request.id), {
        ...request,
        status: 'accepted'
      });

      // 5. Celebration effects
      confetti({
        particleCount: 150,
        spread: 85,
        origin: { y: 0.6 }
      });

      alert(`✅ Đã phê duyệt thành công! Tài nguyên "${request.assignmentTitle}" đã được sao chép và chuyển về cho giáo viên ${request.fromTeacherName} tại lớp ${request.targetClassName}.`);
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Có lỗi xảy ra khi phê duyệt!');
    }
  };

  // Decline request
  const handleDeclineRequest = async (request: ResourceRequest) => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối yêu cầu chia sẻ này không?')) return;
    try {
      await setDoc(doc(db, 'resource_requests', request.id), {
        ...request,
        status: 'declined'
      });
      alert('Đã từ chối yêu cầu chia sẻ.');
    } catch (err) {
      console.error('Error declining request:', err);
      alert('Có lỗi xảy ra khi từ chối!');
    }
  };

  // Cancel request (by sender)
  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy yêu cầu này không?')) return;
    try {
      await deleteDoc(doc(db, 'resource_requests', requestId));
      alert('Đã hủy yêu cầu thành công.');
    } catch (err) {
      console.error('Error deleting request:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto custom-scrollbar">
      {/* Header section */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderArchive className="w-6 h-6 text-indigo-600" />
              Kho Tài Nguyên Dùng Chung
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Nơi chia sẻ, tham khảo và xin bản quyền tài nguyên giảng dạy giữa các Giáo viên & Admin toàn hệ thống.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mt-5 border-b border-slate-100">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Kho tài nguyên hệ thống
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'sent'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            Yêu cầu đã gửi ({requests.filter(r => r.fromTeacherId === user.id).length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'received'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            Yêu cầu nhận được ({requests.filter(r => r.toTeacherId === user.id || (isAdmin && r.toTeacherId === 'admin')).length})
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 p-6">
        {activeTab === 'all' ? (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, tác giả..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400 rounded-xl transition-all font-medium text-slate-800 outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                {/* Type filter */}
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="all">📂 Tất cả loại hình</option>
                  <option value="online_test">📝 Trắc nghiệm Online</option>
                  <option value="file_upload">📄 Tự luận / PDF</option>
                  <option value="simulation">🔬 Mô phỏng Khoa học</option>
                  <option value="game">🎮 Trò chơi học tập</option>
                  <option value="flashcard">🎴 Học liệu Flashcard</option>
                </select>

                {/* Grade filter */}
                <select
                  value={filterGrade}
                  onChange={e => setFilterGrade(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="all">🏫 Tất cả Khối lớp</option>
                  {Array.from({ length: 12 }, (_, i) => `Khối ${i + 1}`).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                  <option value="Khác">Khác</option>
                </select>

                {/* Author filter */}
                <select
                  value={filterAuthor}
                  onChange={e => setFilterAuthor(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="all">👤 Tất cả giáo viên</option>
                  {authors.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                {/* On Air filter */}
                <select
                  value={filterOnAir}
                  onChange={e => setFilterOnAir(e.target.value)}
                  className="px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                >
                  <option value="all">📻 Tất cả On Air</option>
                  <option value="on_air">🟢 Đã On Air</option>
                  <option value="draft">🟡 Bản Nháp</option>
                </select>
              </div>
            </div>

            {/* Resources List */}
            {filteredResources.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center text-slate-400">
                <FolderArchive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-extrabold text-slate-700">Chưa có tài nguyên nào phù hợp</p>
                <p className="text-xs text-slate-400 mt-1">Các giáo viên khác trong hệ thống khi tạo bài tập sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredResources.map(resource => {
                  const isMine = resource.teacherId === user.id;
                  const hasRequested = requests.some(r => r.assignmentId === resource.id && r.fromTeacherId === user.id);
                  const currentRequest = requests.find(r => r.assignmentId === resource.id && r.fromTeacherId === user.id);

                  return (
                    <div 
                      key={resource.id} 
                      className="bg-white rounded-2xl border border-slate-200/95 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                    >
                      {/* Top banner type-specific */}
                      <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 ${
                        resource.type === 'game' ? 'bg-amber-50/50' : 
                        resource.type === 'flashcard' ? 'bg-rose-50/50' : 
                        resource.type === 'online_test' ? 'bg-blue-50/50' : 'bg-slate-50/50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {resource.type === 'game' ? <Gamepad2 className="w-4 h-4 text-amber-600" /> :
                           resource.type === 'flashcard' ? <Library className="w-4 h-4 text-rose-600" /> :
                           resource.type === 'online_test' ? <CheckCircle className="w-4 h-4 text-blue-600" /> :
                           resource.type === 'simulation' ? <Microscope className="w-4 h-4 text-emerald-600" /> :
                           <FileText className="w-4 h-4 text-slate-600" />}
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                            {resource.type === 'game' ? 'Trò chơi' :
                             resource.type === 'flashcard' ? 'Flashcard' :
                             resource.type === 'online_test' ? 'Trắc nghiệm' :
                             resource.type === 'simulation' ? 'Mô phỏng' : 'Tự luận / File'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* On Air Status Badge */}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (isMine || isAdmin) {
                                const newStatus = resource.isPublished === false ? true : false;
                                try {
                                  await setDoc(doc(db, 'assignments', resource.id), { isPublished: newStatus }, { merge: true });
                                } catch (err) {
                                  alert('Lỗi cập nhật trạng thái On Air');
                                }
                              }
                            }}
                            disabled={!isMine && !isAdmin}
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                              resource.isPublished !== false 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            } ${(isMine || isAdmin) ? 'hover:scale-105 cursor-pointer shadow-2xs' : 'cursor-default'}`}
                            title={(isMine || isAdmin) ? "Nhấn để bật/tắt On Air" : "Trạng thái On Air"}
                          >
                            <Radio className={`w-3 h-3 ${resource.isPublished !== false ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
                            <span>{resource.isPublished !== false ? 'On Air' : 'Bản nháp'}</span>
                          </button>
                          {isMine && (
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-lg">
                              Của tôi
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Info body */}
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1">{resource.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed flex-1">{resource.description}</p>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              Tác giả: <strong className="text-slate-800 font-bold ml-0.5">{resource.teacherName || 'Hệ thống'}</strong>
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {resource.grade && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-lg border border-emerald-150">
                                {resource.grade}
                              </span>
                            )}
                            {resource.className && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-lg border border-purple-150">
                                Lớp: {resource.className}
                              </span>
                            )}
                            {resource.classSessionTitle && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-lg border border-indigo-150">
                                Buổi học: {resource.classSessionTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                        {/* Test run button */}
                        <button
                          onClick={() => setPreviewingAssignment(resource)}
                          className="flex-1 py-2 text-xs font-black border border-slate-300 rounded-xl bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 text-indigo-600" />
                          Chạy thử
                        </button>

                        {/* Request sharing button */}
                        {isMine ? (
                          <div className="flex-1 text-center py-2 text-xs text-slate-400 font-bold bg-slate-100 border border-slate-200 rounded-xl">
                            Chính chủ
                          </div>
                        ) : hasRequested ? (
                          <div className={`flex-1 text-center py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 ${
                            currentRequest?.status === 'accepted' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            currentRequest?.status === 'declined' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                            'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                          }`}>
                            {currentRequest?.status === 'accepted' ? <Check className="w-3.5 h-3.5" /> : null}
                            {currentRequest?.status === 'accepted' ? 'Đã duyệt' : 
                             currentRequest?.status === 'declined' ? 'Bị từ chối' : 'Chờ duyệt'}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenRequestModal(resource)}
                            className="flex-1 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Xin GV này
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'sent' ? (
          <div className="space-y-4">
            {/* Sent request listing */}
            {requests.filter(r => r.fromTeacherId === user.id).length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center text-slate-400">
                <Send className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-extrabold text-slate-700">Chưa gửi yêu cầu nào</p>
                <p className="text-xs text-slate-400 mt-1">Khi bạn gửi yêu cầu xin tài nguyên của giáo viên khác, chúng sẽ được lưu tại đây.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                      <th className="p-4">Tên tài nguyên</th>
                      <th className="p-4">Chủ sở hữu</th>
                      <th className="p-4">Lớp nhận bài</th>
                      <th className="p-4">Ngày yêu cầu</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {requests.filter(r => r.fromTeacherId === user.id).map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{req.assignmentTitle}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{req.assignmentType}</div>
                        </td>
                        <td className="p-4 font-bold text-slate-800">{req.toTeacherName}</td>
                        <td className="p-4">
                          <span className="bg-purple-50 text-purple-700 border border-purple-150 px-2 py-0.5 rounded font-black">
                            {req.targetGrade} - {req.targetClassName}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'declined' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status === 'accepted' ? <CheckCircle className="w-3 h-3" /> :
                             req.status === 'declined' ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {req.status === 'accepted' ? 'Đã phê duyệt' :
                             req.status === 'declined' ? 'Từ chối' : 'Đang chờ'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {req.status === 'pending' ? (
                            <button
                              onClick={() => handleCancelRequest(req.id)}
                              className="px-2.5 py-1 border border-slate-300 text-[11px] font-bold text-slate-600 hover:text-rose-600 hover:border-rose-300 bg-white hover:bg-rose-50 rounded-lg transition-all"
                            >
                              Hủy yêu cầu
                            </button>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[11px]">Hoàn tất</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Received requests list */}
            {requests.filter(r => r.toTeacherId === user.id || (isAdmin && r.toTeacherId === 'admin')).length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center text-slate-400">
                <FolderArchive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-extrabold text-slate-700">Không có yêu cầu chia sẻ nào</p>
                <p className="text-xs text-slate-400 mt-1">Các giáo viên khác khi cần sử dụng tài nguyên của bạn sẽ gửi yêu cầu phê duyệt tại đây.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                      <th className="p-4">Tên tài nguyên</th>
                      <th className="p-4">Người xin</th>
                      <th className="p-4">Lớp chuyển về</th>
                      <th className="p-4">Ngày yêu cầu</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {requests.filter(r => r.toTeacherId === user.id || (isAdmin && r.toTeacherId === 'admin')).map(req => (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900">{req.assignmentTitle}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{req.assignmentType}</div>
                        </td>
                        <td className="p-4 font-bold text-slate-850">{req.fromTeacherName}</td>
                        <td className="p-4">
                          <span className="bg-purple-50 text-purple-700 border border-purple-150 px-2 py-0.5 rounded font-black">
                            {req.targetGrade} - {req.targetClassName}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            req.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'declined' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status === 'accepted' ? <CheckCircle className="w-3 h-3" /> :
                             req.status === 'declined' ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {req.status === 'accepted' ? 'Đã phê duyệt' :
                             req.status === 'declined' ? 'Từ chối' : 'Đang chờ'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {req.status === 'pending' ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleApproveRequest(req)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                              >
                                Đồng ý
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(req)}
                                className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-300 text-[11px] font-bold text-slate-700 hover:text-rose-600 rounded-lg transition-all active:scale-95 shadow-sm"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[11px]">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REQUEST MODAL: XIN TÀI NGUYÊN */}
      {requestingAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Đăng Ký Nhận Tài Nguyên</h3>
                <p className="text-xs text-slate-500 mt-0.5">Vui lòng chọn lớp bạn muốn chuyển giao tài nguyên này.</p>
              </div>
              <button 
                onClick={() => setRequestingAssignment(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-150 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 space-y-1">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">Tên tài nguyên gốc</span>
                <span className="font-black text-slate-900 text-sm block">{requestingAssignment.title}</span>
                <span className="text-xs text-slate-500 block">Tác giả: <strong className="text-slate-700 font-bold">{requestingAssignment.teacherName || 'Hệ thống'}</strong></span>
              </div>

              {/* Grade select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Chọn / Nhập Khối (1 - 12):</label>
                  {targetGrade && (
                    <button
                      type="button"
                      onClick={() => setTargetGrade('')}
                      className="text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={targetGrade}
                  onChange={e => {
                    const val = e.target.value;
                    const numOnly = val.replace(/\D/g, '');
                    if (numOnly && !val.startsWith('Khối') && Number(numOnly) >= 1 && Number(numOnly) <= 12) {
                      setTargetGrade(`Khối ${numOnly}`);
                    } else {
                      setTargetGrade(val);
                    }
                  }}
                  placeholder="Điền khối lớp (VD: Khối 10, Khối 11)..."
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Class select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Chọn Lớp đang dạy nhận:</label>
                  {targetClassName && (
                    <button
                      type="button"
                      onClick={() => setTargetClassName('')}
                      className="text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-colors"
                    >
                      Toàn trường (Tất cả)
                    </button>
                  )}
                </div>

                <div className="relative">
                  {/* Dropdown Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                    className="w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs transition-all outline-none focus:ring-2 focus:ring-indigo-600/20"
                  >
                    <span className="flex items-center gap-2">
                      {targetClassName ? (
                        <>
                          <span className="text-base">🏫</span>
                          <span>Lớp {targetClassName}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-base">🌐</span>
                          <span>Toàn bộ học sinh (Áp dụng tất cả các lớp)</span>
                        </>
                      )}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu Popup */}
                  {isClassDropdownOpen && (
                    <>
                      {/* Backdrop to close */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsClassDropdownOpen(false)} 
                      />
                      
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Option: All students */}
                        <button
                          type="button"
                          onClick={() => {
                            setTargetClassName('');
                            setIsClassDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-colors ${
                            !targetClassName 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>🌐</span>
                            <span>Toàn bộ học sinh (Áp dụng tất cả các lớp)</span>
                          </span>
                          {!targetClassName && <Check className="w-4 h-4 text-indigo-600" />}
                        </button>

                        <div className="border-t border-slate-100 my-1" />

                        {/* Optgroup Header */}
                        <div className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                          Danh sách các lớp trong hệ thống
                        </div>

                        {/* Class options */}
                        {availableTeacherClasses.map((cls) => {
                          const isSelected = targetClassName === cls;
                          return (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => {
                                setTargetClassName(cls);
                                setIsClassDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-colors ${
                                isSelected 
                                  ? 'bg-indigo-50 text-indigo-700' 
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span>🏫</span>
                                <span>Lớp {cls}</span>
                              </span>
                              {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-[11px] text-blue-800 flex gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-semibold">
                  <strong>Thông tin thêm:</strong> Khi được chấp nhận, hệ thống tự động sao chép nguyên vẹn câu hỏi, flashcards, file và lưu thuộc về bạn để giao cho lớp nhận.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setRequestingAssignment(null)}
                className="flex-1 py-2.5 text-xs font-black border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmitRequest}
                className="flex-1 py-2.5 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md active:scale-95 transition-all"
              >
                Gửi yêu cầu xin bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL: TEST / CHẠY THỬ */}
      {previewingAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-3xl w-full border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all duration-300 ${
            previewingAssignment.type === 'game' || previewingAssignment.type === 'online_test' || (previewingAssignment.type === 'flashcard' && flashcardSubMode === 'quiz')
              ? 'max-w-4xl' 
              : 'max-w-2xl'
          }`}>
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <span className="px-2 py-0.5 text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 rounded-lg uppercase tracking-wider">
                  Chế độ chạy thử (Sandbox)
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-1">{previewingAssignment.title}</h3>
              </div>
              <button 
                onClick={() => {
                  setPreviewingAssignment(null);
                  setActiveCardIndex(0);
                  setIsCardFlipped(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-150 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Mode Switcher Tab Bar */}
            <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/55 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSandboxTab('student')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                    sandboxTab === 'student'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Trải nghiệm Học sinh</span>
                </button>
                {(previewingAssignment.type === 'online_test' || previewingAssignment.type === 'game' || previewingAssignment.type === 'flashcard') && (
                  <button
                    type="button"
                    onClick={() => setSandboxTab('teacher')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      sandboxTab === 'teacher'
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Xem bộ đề & đáp án</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider hidden sm:inline-block">
                🟢 Chạy thử trực quan
              </span>
            </div>

            {/* Sandbox content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {sandboxTab === 'student' ? (
                /* --- STUDENT INTERACTIVE VIEW --- */
                <div>
                  {/* If simulation URL */}
                  {previewingAssignment.type === 'simulation' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-800 font-semibold flex items-center gap-2">
                        <Microscope className="w-4 h-4 text-teal-600" />
                        <span>Học liệu mô phỏng khoa học tương tác!</span>
                      </div>
                      {previewingAssignment.simulationUrl ? (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden aspect-video bg-slate-950">
                          <iframe 
                            src={previewingAssignment.simulationUrl} 
                            className="w-full h-full border-none" 
                            title="Simulation Play"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Không có liên kết mô phỏng hợp lệ.</p>
                      )}
                    </div>
                  )}

                  {/* If Online Test (Quiz Exam) */}
                  {previewingAssignment.type === 'online_test' && (
                    <div>
                      {!sandboxSubmitted ? (
                        <div className="space-y-6">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-emerald-950">BÀI THI THỬ TRẮC NGHIỆM</p>
                              <p className="text-[10px] text-emerald-700">Hãy làm bài như học sinh. Click Nộp bài Sandbox để xem điểm số & lời giải chi tiết.</p>
                            </div>
                            <div className="bg-white border border-emerald-200 text-xs text-emerald-800 font-mono font-bold px-3 py-1.5 rounded-xl shrink-0">
                              Câu đã chọn: {Object.keys(sandboxQuizAnswers).length} / {previewingAssignment.questions?.length || 0}
                            </div>
                          </div>

                          <div className="space-y-5">
                            {previewingAssignment.questions && previewingAssignment.questions.length > 0 ? (
                              previewingAssignment.questions.map((q, idx) => (
                                <div key={q.id || idx} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                                      {idx + 1}
                                    </span>
                                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                                      Câu Hỏi {idx + 1} ({q.points || 2}đ)
                                    </span>
                                  </div>
                                  
                                  <div className="text-sm font-semibold text-slate-850 leading-relaxed pl-1">
                                    <MarkdownMath content={q.question} />
                                  </div>

                                  {q.options && q.options.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1 pt-1">
                                      {q.options.map((opt, oIdx) => {
                                        const ansKey = q.id || `q_${idx}`;
                                        const isSelected = sandboxQuizAnswers[ansKey] === oIdx;
                                        return (
                                          <button
                                            key={oIdx}
                                            type="button"
                                            onClick={() => {
                                              setSandboxQuizAnswers({
                                                ...sandboxQuizAnswers,
                                                [ansKey]: oIdx
                                              });
                                            }}
                                            className={`p-3.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-all duration-200 active:scale-[0.98] ${
                                              isSelected
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                          >
                                            <span>{['A', 'B', 'C', 'D'][oIdx]}. {opt}</span>
                                            {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 italic py-4 text-center">Đề kiểm tra này chưa được thiết lập câu hỏi.</p>
                            )}
                          </div>

                          {previewingAssignment.questions && previewingAssignment.questions.length > 0 && (
                            <div className="pt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  let correct = 0;
                                  const total = previewingAssignment.questions?.length || 0;
                                  previewingAssignment.questions?.forEach((q, idx) => {
                                    const ansKey = q.id || `q_${idx}`;
                                    if (sandboxQuizAnswers[ansKey] === q.correctAnswer) {
                                      correct++;
                                    }
                                  });
                                  const calculatedScore = total > 0 ? Math.round((correct / total) * 10) : 0;
                                  setSandboxScore(calculatedScore);
                                  setSandboxCorrectCount(correct);
                                  setSandboxSubmitted(true);
                                  confetti({
                                    particleCount: 100,
                                    spread: 70,
                                    origin: { y: 0.7 }
                                  });
                                  if (onAwardPoints) {
                                    const pointsEarned = Math.max(10, calculatedScore * 10);
                                    onAwardPoints(pointsEarned, `Luyện tập bài tập "${previewingAssignment.title}"`);
                                  }
                                }}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all uppercase tracking-wider flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Nộp bài & Xem kết quả</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Submission Results */
                        <div className="space-y-6">
                          <div className="max-w-md mx-auto bg-gradient-to-b from-indigo-50/70 to-white border border-indigo-100 rounded-3xl p-6 shadow-sm space-y-4 text-center">
                            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
                              <Trophy className="w-7 h-7 text-indigo-600 animate-bounce" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-lg font-black text-indigo-950">BÀI LÀM ĐÃ HOÀN THÀNH</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hệ thống đã tự động chấm điểm thử nghiệm</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                              <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Điểm Số</p>
                                <p className="text-2xl font-black text-indigo-600 mt-1">{sandboxScore} / 10</p>
                              </div>
                              <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Câu đúng</p>
                                <p className="text-2xl font-black text-emerald-600 mt-1">{sandboxCorrectCount} / {previewingAssignment.questions?.length || 0}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSandboxSubmitted(false);
                                setSandboxQuizAnswers({});
                                setSandboxScore(0);
                                setSandboxCorrectCount(0);
                              }}
                              className="w-full py-2.5 border border-indigo-250 hover:bg-indigo-50 text-indigo-600 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Làm lại thử nghiệm</span>
                            </button>
                          </div>

                          <div className="text-left space-y-4 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Chi tiết câu trả lời & đáp án:</h4>
                            <div className="space-y-4">
                              {previewingAssignment.questions?.map((q, idx) => {
                                const ansKey = q.id || `q_${idx}`;
                                const stuAns = sandboxQuizAnswers[ansKey];
                                const isCorrect = stuAns === q.correctAnswer;
                                return (
                                  <div key={q.id || idx} className={`p-5 rounded-3xl border ${isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'} space-y-3`}>
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-black text-white w-6 h-6 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-600' : 'bg-rose-500'}`}>
                                          {idx + 1}
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                          Câu hỏi {idx + 1}
                                        </span>
                                      </div>
                                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {isCorrect ? 'Đúng' : 'Sai'}
                                      </span>
                                    </div>

                                    <div className="text-sm font-semibold text-slate-800 pl-1">
                                      <MarkdownMath content={q.question} />
                                    </div>

                                    {q.options && q.options.length > 0 && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                                        {q.options.map((opt, oIdx) => {
                                          const isStuSelected = stuAns === oIdx;
                                          const isCorrectOpt = q.correctAnswer === oIdx;
                                          return (
                                            <div
                                              key={oIdx}
                                              className={`p-3 rounded-xl text-xs font-semibold border flex items-center justify-between ${
                                                isCorrectOpt
                                                  ? 'bg-emerald-100/90 border-emerald-300 text-emerald-800 font-bold'
                                                  : isStuSelected
                                                  ? 'bg-rose-100/90 border-rose-300 text-rose-850 font-bold'
                                                  : 'bg-white border-slate-200 text-slate-505'
                                              }`}
                                            >
                                              <span>{['A', 'B', 'C', 'D'][oIdx]}. {opt}</span>
                                              {isCorrectOpt && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {q.solutionText && (
                                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 text-[11px] text-indigo-700 italic leading-relaxed">
                                        <strong>Giải thích:</strong> {q.solutionText}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* If Game (Interactive Game Playing Mode) */}
                  {previewingAssignment.type === 'game' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-2xl text-xs text-indigo-800 font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gamepad2 className="w-4 h-4 text-indigo-600" />
                          <span>Chơi thử trò chơi học tập như Học sinh!</span>
                        </div>
                        <span className="text-[10px] bg-indigo-200/60 px-2 py-0.5 rounded font-black text-indigo-900 uppercase">
                          Game: {previewingAssignment.gameType || 'do_min'}
                        </span>
                      </div>

                      <div className="w-full h-[540px] bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                        <GamePreview
                          gameType={previewingAssignment.gameType || 'do_min'}
                          questions={previewingAssignment.questions && previewingAssignment.questions.length > 0 ? previewingAssignment.questions : []}
                          tugOfWarMode={previewingAssignment.tugOfWarMode || 'bot'}
                          isStudentMode={true}
                          onClose={() => {
                            setPreviewingAssignment(null);
                          }}
                          onSubmitWork={(finalScore, correctCount, answers) => {
                            setSandboxScore(finalScore);
                            setSandboxCorrectCount(correctCount);
                            setSandboxSubmitted(true);
                            confetti({
                              particleCount: 100,
                              spread: 70,
                              origin: { y: 0.7 }
                            });
                            if (onAwardPoints) {
                              const pointsEarned = Math.max(10, Math.round(finalScore * 10));
                              onAwardPoints(pointsEarned, `Luyện tập trò chơi "${previewingAssignment.title}"`);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* If Flashcard (Study / Quiz Selectable Player) */}
                  {previewingAssignment.type === 'flashcard' && (
                    <div className="space-y-4">
                      {/* Submode togglers */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl max-w-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => setFlashcardSubMode('study')}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                              flashcardSubMode === 'study'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            🎴 Thẻ lật học tập
                          </button>
                          <button
                            type="button"
                            onClick={() => setFlashcardSubMode('quiz')}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                              flashcardSubMode === 'quiz'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            📝 Đề thi kiểm tra
                          </button>
                        </div>

                        {flashcardSubMode === 'study' && activeFlashcardList.length > 1 && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleToggleShuffle}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                isShuffled
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                              title={isShuffled ? "Tắt xáo trộn thẻ" : "Xáo trộn thứ tự thẻ"}
                            >
                              <Shuffle className="w-3.5 h-3.5" />
                              <span>{isShuffled ? 'Đã xáo trộn' : 'Xáo thẻ'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {flashcardSubMode === 'study' ? (
                        <div className="space-y-5">
                          {activeFlashcardList && activeFlashcardList.length > 0 ? (
                            <div className="space-y-4">
                              {/* Progress bar */}
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                                  style={{ width: `${((activeCardIndex + 1) / activeFlashcardList.length) * 100}%` }}
                                />
                              </div>

                              {/* Interactive Flip Card with 3D animation, Math & Images */}
                              <div 
                                onClick={() => setIsCardFlipped(!isCardFlipped)}
                                className="relative w-full h-[380px] sm:h-[460px] perspective-1000 cursor-pointer group select-none my-2"
                              >
                                <motion.div 
                                  animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                                  className="relative w-full h-full transform-style-3d"
                                >
                                  {/* FRONT SIDE */}
                                  <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-b from-white to-slate-50 border-2 border-slate-200 group-hover:border-indigo-400 rounded-3xl shadow-md flex flex-col justify-between p-4 sm:p-5 overflow-hidden">
                                    {/* Top Floating Header */}
                                    <div className="flex justify-between items-center w-full z-10 shrink-0">
                                      <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] sm:text-xs font-black tracking-wider uppercase rounded-full bg-rose-100 text-rose-800 shadow-xs">
                                        Mặt Trước #{activeCardIndex + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const activeCard = activeFlashcardList[activeCardIndex];
                                          if (activeCard && activeCard.front) {
                                            handleSpeakText(activeCard.front, 'vi-VN');
                                          }
                                        }}
                                        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-full shadow-xs transition-all active:scale-95"
                                        title="Phát âm tiếng"
                                      >
                                        <Volume2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {/* Center Image & Content - Maximize Space */}
                                    <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center text-center my-auto overflow-hidden gap-2 p-1">
                                      {(activeFlashcardList[activeCardIndex]?.frontImage || activeFlashcardList[activeCardIndex]?.image) && (
                                        <div className="flex-1 min-h-0 w-full h-full rounded-2xl overflow-hidden bg-slate-50/50 p-1 flex items-center justify-center">
                                          <img
                                            src={activeFlashcardList[activeCardIndex]?.frontImage || activeFlashcardList[activeCardIndex]?.image}
                                            alt="Mặt trước flashcard"
                                            referrerPolicy="no-referrer"
                                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl"
                                          />
                                        </div>
                                      )}

                                      {/* Show text ONLY IF text exists and is non-empty */}
                                      {activeFlashcardList[activeCardIndex]?.front && activeFlashcardList[activeCardIndex]?.front.trim().length > 0 && (
                                        <div className="shrink-0 text-base sm:text-xl md:text-2xl font-black text-slate-850 tracking-tight leading-relaxed px-2">
                                          <MarkdownMath content={activeFlashcardList[activeCardIndex]?.front || ''} />
                                        </div>
                                      )}

                                      {/* Only show fallback message if BOTH image and text are completely missing */}
                                      {!activeFlashcardList[activeCardIndex]?.front?.trim() && !(activeFlashcardList[activeCardIndex]?.frontImage || activeFlashcardList[activeCardIndex]?.image) && (
                                        <div className="shrink-0 text-sm font-semibold text-slate-400 italic">
                                          (Chưa nhập nội dung mặt trước)
                                        </div>
                                      )}
                                    </div>

                                    {/* Bottom Hint */}
                                    <div className="text-center pt-1 z-10 shrink-0">
                                      <p className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center justify-center gap-1">
                                        <RotateCw className="w-3.5 h-3.5" />
                                        <span>Chạm để lật mặt sau</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* BACK SIDE */}
                                  <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-b from-indigo-50/90 to-purple-50/90 border-2 border-indigo-200 group-hover:border-indigo-400 rounded-3xl shadow-md flex flex-col justify-between p-4 sm:p-5 rotate-y-180 overflow-hidden">
                                    {/* Top Floating Header */}
                                    <div className="flex justify-between items-center w-full z-10 shrink-0">
                                      <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] sm:text-xs font-black tracking-wider uppercase rounded-full bg-indigo-100 text-indigo-800 shadow-xs">
                                        Mặt Sau #{activeCardIndex + 1}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const activeCard = activeFlashcardList[activeCardIndex];
                                          if (activeCard && activeCard.back) {
                                            handleSpeakText(activeCard.back, 'vi-VN');
                                          }
                                        }}
                                        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 rounded-full shadow-xs transition-all active:scale-95"
                                        title="Phát âm tiếng"
                                      >
                                        <Volume2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {/* Center Image & Content - Maximize Space */}
                                    <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center text-center my-auto overflow-hidden gap-2 p-1">
                                      {(activeFlashcardList[activeCardIndex]?.backImage || activeFlashcardList[activeCardIndex]?.image) && (
                                        <div className="flex-1 min-h-0 w-full h-full rounded-2xl overflow-hidden bg-white/70 p-1 flex items-center justify-center">
                                          <img
                                            src={activeFlashcardList[activeCardIndex]?.backImage || activeFlashcardList[activeCardIndex]?.image}
                                            alt="Mặt sau flashcard"
                                            referrerPolicy="no-referrer"
                                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl"
                                          />
                                        </div>
                                      )}

                                      {/* Show text ONLY IF text exists and is non-empty */}
                                      {activeFlashcardList[activeCardIndex]?.back && activeFlashcardList[activeCardIndex]?.back.trim().length > 0 && (
                                        <div className="shrink-0 text-base sm:text-xl md:text-2xl font-black text-slate-850 tracking-tight leading-relaxed px-2">
                                          <MarkdownMath content={activeFlashcardList[activeCardIndex]?.back || ''} />
                                        </div>
                                      )}

                                      {/* Only show fallback message if BOTH image and text are completely missing */}
                                      {!activeFlashcardList[activeCardIndex]?.back?.trim() && !(activeFlashcardList[activeCardIndex]?.backImage || activeFlashcardList[activeCardIndex]?.image) && (
                                        <div className="shrink-0 text-sm font-semibold text-slate-400 italic">
                                          (Chưa nhập nội dung mặt sau)
                                        </div>
                                      )}
                                    </div>

                                    {/* Bottom Hint */}
                                    <div className="text-center pt-1 z-10 shrink-0">
                                      <p className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center justify-center gap-1">
                                        <RotateCw className="w-3.5 h-3.5" />
                                        <span>Chạm để quay lại mặt trước</span>
                                      </p>
                                    </div>
                                  </div>
                                </motion.div>
                              </div>

                              {/* Pagination Controls */}
                              <div className="flex items-center justify-between px-1">
                                <button
                                  disabled={activeCardIndex === 0}
                                  onClick={() => {
                                    setActiveCardIndex(prev => prev - 1);
                                    setIsCardFlipped(false);
                                  }}
                                  className="px-4 py-2 text-xs font-black border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-all flex items-center gap-1 shadow-xs active:scale-95"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                  <span>Trước đó</span>
                                </button>

                                <span className="text-xs font-black text-slate-700 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200/60 shadow-xs">
                                  Thẻ {activeCardIndex + 1} / {activeFlashcardList.length}
                                </span>

                                <button
                                  disabled={activeCardIndex === activeFlashcardList.length - 1}
                                  onClick={() => {
                                    setActiveCardIndex(prev => prev + 1);
                                    setIsCardFlipped(false);
                                  }}
                                  className="px-4 py-2 text-xs font-black border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-all flex items-center gap-1 shadow-xs active:scale-95"
                                >
                                  <span>Kế tiếp</span>
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-6 text-center">Bộ flashcard này không chứa thẻ nào.</p>
                          )}
                        </div>
                      ) : (
                        /* Flashcard Quiz Game (Test) */
                        <div className="w-full h-[520px] bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                          <FlashcardQuizGame
                            assignmentTitle={previewingAssignment.title}
                            flashcards={displayFlashcards}
                            questions={previewingAssignment.questions || []}
                            studentName={user.name}
                            onFinish={(score, correctCount, answersMap) => {
                              setSandboxScore(score);
                              setSandboxCorrectCount(correctCount);
                              setSandboxSubmitted(true);
                              confetti({
                                particleCount: 100,
                                spread: 70,
                                origin: { y: 0.7 }
                              });
                              if (onAwardPoints) {
                                const pointsEarned = Math.max(10, Math.round(score * 10));
                                onAwardPoints(pointsEarned, `Luyện tập Flashcard Quiz "${previewingAssignment.title}"`);
                              }
                            }}
                            onExit={() => setFlashcardSubMode('study')}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* --- TEACHER STATIC OVERVIEW AND SOLUTIONS VIEW --- */
                <div className="space-y-6">
                  {/* For flashcards */}
                  {previewingAssignment.type === 'flashcard' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                        <Library className="w-4 h-4 text-rose-600" />
                        <span>Danh sách thẻ học tập ({displayFlashcards.length} thẻ)</span>
                      </div>

                      {displayFlashcards.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                          {displayFlashcards.map((card, idx) => (
                            <div key={card.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Thẻ {idx + 1}</p>
                                {(card.frontImage || card.backImage || card.image) && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                                    Có hình ảnh
                                  </span>
                                )}
                              </div>

                              {/* Front */}
                              <div className="space-y-1">
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Mặt trước (Khái niệm):</p>
                                {(card.frontImage || card.image) && (
                                  <img 
                                    src={card.frontImage || card.image} 
                                    alt="Mặt trước" 
                                    className="max-h-24 rounded-lg object-contain border border-slate-200 bg-white p-1 mb-1" 
                                  />
                                )}
                                {card.front && card.front.trim() ? (
                                  <div className="text-sm font-bold text-slate-850">
                                    <MarkdownMath content={card.front} />
                                  </div>
                                ) : !(card.frontImage || card.image) ? (
                                  <div className="text-sm font-bold text-slate-400 italic">
                                    (Trống)
                                  </div>
                                ) : null}
                              </div>

                              {/* Back */}
                              <div className="pt-2.5 border-t border-slate-200/60 space-y-1">
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Mặt sau (Giải thích):</p>
                                {(card.backImage || card.image) && (
                                  <img 
                                    src={card.backImage || card.image} 
                                    alt="Mặt sau" 
                                    className="max-h-24 rounded-lg object-contain border border-slate-200 bg-white p-1 mb-1" 
                                  />
                                )}
                                {card.back && card.back.trim() ? (
                                  <div className="text-sm font-semibold text-slate-750">
                                    <MarkdownMath content={card.back} />
                                  </div>
                                ) : !(card.backImage || card.image) ? (
                                  <div className="text-sm font-semibold text-slate-400 italic">
                                    (Trống)
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Bộ flashcard này không chứa thẻ nào.</p>
                      )}
                    </div>
                  )}

                  {/* Danh sách Bộ đề & Đáp án (cho tất cả loại bài tập / flashcard / game) */}
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span className="font-bold">
                          Khung Bộ Đề & Đáp Án Trắc Nghiệm ({previewingAssignment.questions?.length || displayFlashcards.length} câu)
                        </span>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">
                        {previewingAssignment.questions && previewingAssignment.questions.length > 0 ? 'Đề Trắc Nghiệm' : 'Đề Từ Flashcard'}
                      </span>
                    </div>

                    {previewingAssignment.questions && previewingAssignment.questions.length > 0 ? (
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                        {previewingAssignment.questions.map((q, idx) => (
                          <div key={q.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shadow-xs">
                            <div className="text-xs font-black text-slate-800 flex items-start gap-1.5">
                              <span className="shrink-0 bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <MarkdownMath content={q.question} />
                              </div>
                            </div>
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                                {q.options.map((opt, oIdx) => (
                                  <div 
                                    key={oIdx} 
                                    className={`p-2.5 rounded-xl text-xs font-semibold border flex items-center justify-between ${
                                      q.correctAnswer === oIdx 
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' 
                                        : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 flex-1">
                                      <span className="font-bold shrink-0">{['A', 'B', 'C', 'D'][oIdx]}.</span>
                                      <div className="flex-1">
                                        <MarkdownMath content={opt} />
                                      </div>
                                    </div>
                                    {q.correctAnswer === oIdx && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.solutionText && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 text-[11px] text-indigo-750 italic leading-relaxed">
                                <strong>Lời giải:</strong> <MarkdownMath content={q.solutionText} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : displayFlashcards && displayFlashcards.length > 0 ? (
                      /* Q&A derived from Flashcards */
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                        {displayFlashcards.map((card, idx) => (
                          <div key={card.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                            <div className="flex items-center gap-2">
                              <span className="shrink-0 bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Câu hỏi / Đề bài {idx + 1}
                              </span>
                            </div>

                            {/* Front = Question */}
                            <div className="pl-7 space-y-1">
                              {(card.frontImage || card.image) && (
                                <img 
                                  src={card.frontImage || card.image} 
                                  alt="Hình đề bài" 
                                  className="max-h-24 rounded-lg object-contain border border-slate-200 bg-white p-1 mb-1" 
                                />
                              )}
                              <div className="text-xs sm:text-sm font-bold text-slate-900">
                                <MarkdownMath content={card.front && card.front.trim() ? card.front : (card.frontImage || card.image ? '' : '(Nội dung câu hỏi trống)')} />
                              </div>
                            </div>

                            {/* Back = Answer */}
                            <div className="pl-7 pt-2 border-t border-slate-200/60 space-y-1">
                              <div className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Đáp án chuẩn / Lời giải:</span>
                              </div>
                              {(card.backImage || card.image) && (
                                <img 
                                  src={card.backImage || card.image} 
                                  alt="Hình đáp án" 
                                  className="max-h-24 rounded-lg object-contain border border-slate-200 bg-white p-1 mb-1" 
                                />
                              )}
                              <div className="text-xs sm:text-sm font-semibold text-emerald-900 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/80">
                                <MarkdownMath content={card.back && card.back.trim() ? card.back : (card.backImage || card.image ? '' : '(Nội dung đáp án trống)')} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Học liệu này chưa được thiết lập câu hỏi và đáp án.</p>
                    )}
                  </div>
                </div>
              )}

              {/* PDF Document Viewer if any */}
              {previewingAssignment.pdfUrl && (
                <div className="space-y-3 pt-4 border-t border-slate-100 shrink-0">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Tài liệu PDF đi kèm:</h4>
                  <a 
                    href={previewingAssignment.pdfUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline"
                  >
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Mở file tài liệu đính kèm ({previewingAssignment.pdfUrl.substring(0, 30)}...)</span>
                  </a>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setPreviewingAssignment(null);
                  setActiveCardIndex(0);
                  setIsCardFlipped(false);
                }}
                className="w-full py-2.5 text-xs font-black bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm transition-all"
              >
                Đóng Sandbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
