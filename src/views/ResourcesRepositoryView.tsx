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
  Calendar
} from 'lucide-react';
import { db } from '../firebase';
import { Assignment, User as UserType, ClassSession } from '../types';
import confetti from 'canvas-confetti';

interface ResourcesRepositoryViewProps {
  user: UserType;
  assignments: Assignment[];
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

export function ResourcesRepositoryView({ user, assignments }: ResourcesRepositoryViewProps) {
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

  // Request & Preview modals
  const [requestingAssignment, setRequestingAssignment] = useState<Assignment | null>(null);
  const [targetGrade, setTargetGrade] = useState('');
  const [targetClassName, setTargetClassName] = useState('');
  const [previewingAssignment, setPreviewingAssignment] = useState<Assignment | null>(null);
  
  // Flashcard playing state in preview
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

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

  // Filter lists
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

      return true;
    });
  }, [assignments, searchQuery, filterType, filterGrade, filterAuthor, user, isAdmin]);

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
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3.5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, tác giả..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              {/* Type filter */}
              <div>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="all">Tất cả loại hình</option>
                  <option value="online_test">Trắc nghiệm Online</option>
                  <option value="file_upload">Tự luận / Đính kèm PDF</option>
                  <option value="simulation">Mô phỏng Khoa học</option>
                  <option value="game">Trò chơi học tập</option>
                  <option value="flashcard">Học liệu Flashcard</option>
                </select>
              </div>

              {/* Grade filter */}
              <div>
                <select
                  value={filterGrade}
                  onChange={e => setFilterGrade(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="all">Tất cả Khối lớp</option>
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                </select>
              </div>

              {/* Author filter */}
              <div>
                <select
                  value={filterAuthor}
                  onChange={e => setFilterAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="all">Tất cả giáo viên</option>
                  {authors.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
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
                      <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between ${
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
                        {isMine && (
                          <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-lg">
                            Tài nguyên của tôi
                          </span>
                        )}
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
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Chọn Khối lớp nhận:</label>
                <select
                  value={targetGrade}
                  onChange={e => setTargetGrade(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">-- Chọn Khối --</option>
                  <option value="Khối 10">Khối 10</option>
                  <option value="Khối 11">Khối 11</option>
                  <option value="Khối 12">Khối 12</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              {/* Class select */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Chọn Lớp đang dạy nhận:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={targetClassName}
                    onChange={e => setTargetClassName(e.target.value)}
                    placeholder="VD: 10A1, 12C5..."
                    className="w-full px-4 py-2.5 bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
                  />
                  {myClasses.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.from(new Set(myClasses.map(c => c.title))).map((clsTitle: any) => {
                        if (!clsTitle) return null;
                        return (
                          <button
                            key={clsTitle}
                            type="button"
                            onClick={() => setTargetClassName(clsTitle)}
                            className={`px-2.5 py-0.5 text-[10px] rounded-lg font-bold border transition-all ${
                              targetClassName === clsTitle
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
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

            {/* Sandbox content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* If game or simulation URL */}
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

              {/* If flashcards */}
              {previewingAssignment.type === 'flashcard' && (
                <div className="space-y-5">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold flex items-center gap-2">
                    <Library className="w-4 h-4 text-rose-600" />
                    <span>Xem thử Flashcard tương tác</span>
                  </div>

                  {previewingAssignment.flashcards && previewingAssignment.flashcards.length > 0 ? (
                    <div className="space-y-4">
                      {/* Interactive Flip Card */}
                      <div 
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="relative w-full h-56 rounded-2xl border-2 border-slate-200 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg flex items-center justify-center p-6 bg-slate-50"
                      >
                        <div className="text-center">
                          <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-2">
                            {isCardFlipped ? 'MẶT SAU (Ý NGHĨA)' : 'MẶT TRƯỚC (THUẬT NGỮ)'}
                          </p>
                          <p className="text-base sm:text-lg font-extrabold text-slate-800">
                            {isCardFlipped 
                              ? previewingAssignment.flashcards[activeCardIndex]?.back 
                              : previewingAssignment.flashcards[activeCardIndex]?.front}
                          </p>
                          <p className="text-[10px] text-indigo-500 font-semibold mt-4">
                            (Bấm vào thẻ để lật)
                          </p>
                        </div>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between px-2">
                        <button
                          disabled={activeCardIndex === 0}
                          onClick={() => {
                            setActiveCardIndex(prev => prev - 1);
                            setIsCardFlipped(false);
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                        >
                          Trước đó
                        </button>
                        <span className="text-xs font-extrabold text-slate-600">
                          Thẻ {activeCardIndex + 1} / {previewingAssignment.flashcards.length}
                        </span>
                        <button
                          disabled={activeCardIndex === previewingAssignment.flashcards.length - 1}
                          onClick={() => {
                            setActiveCardIndex(prev => prev + 1);
                            setIsCardFlipped(false);
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                        >
                          Kế tiếp
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Bộ flashcard này không chứa thẻ nào.</p>
                  )}
                </div>
              )}

              {/* If online test */}
              {(previewingAssignment.type === 'online_test' || previewingAssignment.type === 'game') && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Danh sách câu hỏi trắc nghiệm ({previewingAssignment.questions?.length || 0} câu)</span>
                  </div>

                  {previewingAssignment.questions && previewingAssignment.questions.length > 0 ? (
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {previewingAssignment.questions.map((q, idx) => (
                        <div key={q.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                          <p className="text-xs font-black text-slate-800">
                            Câu {idx + 1}: {q.question}
                          </p>
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
                                  <span>{['A', 'B', 'C', 'D'][oIdx]}. {opt}</span>
                                  {q.correctAnswer === oIdx && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.solutionText && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 text-[11px] text-indigo-700 italic">
                              <strong>Lời giải:</strong> {q.solutionText}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Bài tập trắc nghiệm này chưa tạo câu hỏi.</p>
                  )}
                </div>
              )}

              {/* PDF Document Viewer if any */}
              {previewingAssignment.pdfUrl && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
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
                className="w-full py-2.5 text-xs font-black bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-sm"
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
