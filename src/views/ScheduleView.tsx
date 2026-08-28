import React, { useState } from 'react';
import { ClassSession, User } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  isSameMonth
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Video, Calendar as CalendarIcon, Clock, Bell, Plus, Edit2, X, Check, Copy, Share2, CheckCircle, FileText, Users, Undo } from 'lucide-react';
import { DateTimePicker24h } from '../components/DateTimePicker24h';

interface ScheduleProps {
  user: User;
  classes: ClassSession[];
  onAddClass?: (session: ClassSession) => void;
  onUpdateClass?: (session: ClassSession) => void;
}

export function ScheduleView({ user, classes: initialClasses, onAddClass, onUpdateClass }: ScheduleProps) {
  const isTeacher = user.role === 'teacher' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  // Filter sessions: Teacher only manages their created sessions, Admin sees all
  const filteredInitialClasses = React.useMemo(() => {
    if (isAdmin) return initialClasses;
    if (user.role === 'teacher') {
      return initialClasses.filter(c => !c.teacherId || c.teacherId === user.id);
    }
    return initialClasses;
  }, [initialClasses, user, isAdmin]);

  const [sessions, setSessions] = useState<ClassSession[]>(filteredInitialClasses);
  const [scheduleTab, setScheduleTab] = useState<'upcoming' | 'completed'>('upcoming');

  React.useEffect(() => {
    setSessions(filteredInitialClasses);
  }, [filteredInitialClasses]);

  // Complete session modal state
  const [completingSession, setCompletingSession] = useState<ClassSession | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completedNoteInput, setCompletedNoteInput] = useState('');

  // View details and attendance modal state
  const [viewingSessionDetails, setViewingSessionDetails] = useState<ClassSession | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingCompletedNote, setEditingCompletedNote] = useState(false);
  const [editCompletedNoteInput, setEditCompletedNoteInput] = useState('');

  // Modal State for Teacher (Create or Edit session)
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán Học');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');

  // Notification Modal State
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Calendar Note state for Student / Teacher
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [userNotes, setUserNotes] = useState<Record<string, string>>({
    [format(new Date(), 'yyyy-MM-dd')]: 'Ôn tập công thức Toán & chuẩn bị vào phòng học đúng giờ.',
  });
  const [currentNote, setCurrentNote] = useState('');

  React.useEffect(() => {
    setCurrentNote(userNotes[selectedDate] || '');
  }, [selectedDate, userNotes]);

  const handleOpenCreate = () => {
    setEditingSession(null);
    setTitle('');
    setSubject('Toán Học');
    setStartTime('');
    setEndTime('');
    setLink('https://meet.google.com/abc-defg-hij');
    setNote('');
    setShowModal(true);
  };

  const handleOpenEdit = (session: ClassSession) => {
    setEditingSession(session);
    setTitle(session.title);
    setSubject(session.subject || 'Toán Học');
    setStartTime(session.startTime.slice(0, 16));
    setEndTime(session.endTime.slice(0, 16));
    setLink(session.link);
    setNote(session.note || '');
    setShowModal(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSession) {
      const updated: ClassSession = {
        ...editingSession,
        title,
        subject,
        startTime: startTime || editingSession.startTime,
        endTime: endTime || editingSession.endTime,
        link,
        note
      };
      if (onUpdateClass) {
        onUpdateClass(updated);
      }
      setSessions(sessions.map(s => s.id === editingSession.id ? updated : s));
    } else {
      const newS: ClassSession = {
        id: `session_${Date.now()}`,
        title,
        subject,
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date(Date.now() + 5400000).toISOString(),
        link,
        note,
        teacherId: user.id,
        teacherName: user.name,
      };
      if (onAddClass) {
        onAddClass(newS);
      }
      setSessions([...sessions, newS]);
    }
    setShowModal(false);
  };

  const handleOpenComplete = (session: ClassSession) => {
    setCompletingSession(session);
    setCompletedNoteInput('');
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = () => {
    if (!completingSession) return;
    const updated: ClassSession = {
      ...completingSession,
      isCompleted: true,
      completedNote: completedNoteInput.trim()
    };
    if (onUpdateClass) {
      onUpdateClass(updated);
    }
    setSessions(sessions.map(s => s.id === completingSession.id ? updated : s));
    setShowCompleteModal(false);
    setCompletingSession(null);
  };

  const handleOpenDetails = (session: ClassSession) => {
    setViewingSessionDetails(session);
    setEditCompletedNoteInput(session.completedNote || '');
    setEditingCompletedNote(false);
    setShowDetailsModal(true);
  };

  const handleSaveCompletedNote = () => {
    if (!viewingSessionDetails) return;
    const updated: ClassSession = {
      ...viewingSessionDetails,
      completedNote: editCompletedNoteInput.trim()
    };
    if (onUpdateClass) {
      onUpdateClass(updated);
    }
    setSessions(sessions.map(s => s.id === viewingSessionDetails.id ? updated : s));
    setViewingSessionDetails(updated);
    setEditingCompletedNote(false);
  };

  const handleRevertToUpcoming = (session: ClassSession) => {
    const updated: ClassSession = {
      ...session,
      isCompleted: false,
      completedNote: ''
    };
    if (onUpdateClass) {
      onUpdateClass(updated);
    }
    setSessions(sessions.map(s => s.id === session.id ? updated : s));
    if (viewingSessionDetails?.id === session.id) {
      setShowDetailsModal(false);
      setViewingSessionDetails(null);
    }
  };

  const handleJoinLinkClick = (session: ClassSession) => {
    if (user.role === 'student') {
      const hasJoined = session.attendedByStudents?.some(s => s.studentId === user.id);
      if (!hasJoined) {
        const updated: ClassSession = {
          ...session,
          attendedByStudents: [
            ...(session.attendedByStudents || []),
            {
              studentId: user.id,
              studentName: user.name || 'Học sinh',
              clickedAt: new Date().toISOString()
            }
          ]
        };
        if (onUpdateClass) {
          onUpdateClass(updated);
        }
        setSessions(sessions.map(s => s.id === session.id ? updated : s));
      }
    }
  };

  const handleOpenNotice = (session: ClassSession) => {
    const msg = `[THÔNG BÁO LỊCH HỌC TRỰC TUYẾN - LỚP 10A1]\nXin chào các em học sinh và Quý Phụ huynh,\nChuẩn bị diễn ra buổi học: "${session.title}".\nThời gian: ${format(new Date(session.startTime), 'HH:mm dd/MM/yyyy', { locale: vi })}\nLink phòng học Google Meet / Zoom: ${session.link}\nLưu ý: ${session.note || 'Vào phòng học đúng giờ trước 5 phút!'}`;
    setNotifyMsg(msg);
    setNotifyModal(true);
    setCopied(false);
  };

  const handleSaveNote = () => {
    if (currentNote.trim()) {
      setUserNotes({
        ...userNotes,
        [selectedDate]: currentNote.trim()
      });
    } else {
      const updated = { ...userNotes };
      delete updated[selectedDate];
      setUserNotes(updated);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Lịch học & Phòng học trực tuyến</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {isTeacher 
              ? 'Tạo, chỉnh sửa lịch học, thêm link phòng học Meet/Zoom và sao chép thông tin nhắc học sinh' 
              : 'Theo dõi lịch học, ghi chú nhắc nhở ngày giờ và truy cập link phòng học'}
          </p>
        </div>

        {isTeacher && (
          <button 
            onClick={handleOpenCreate}
            className="flex items-center px-5 py-3 bg-indigo-600 text-white font-bold text-sm rounded-2xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-1.5" />
            Tạo buổi học mới
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 cols: Class Sessions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="font-bold text-slate-900 text-base">Danh sách Buổi học</h3>
            
            {/* Tabs control */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setScheduleTab('upcoming')}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                  scheduleTab === 'upcoming'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                Lịch học sắp tới
              </button>
              <button
                type="button"
                onClick={() => setScheduleTab('completed')}
                className={`px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                  scheduleTab === 'completed'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-indigo-600'
                }`}
              >
                Nhật ký dạy & học ({sessions.filter(s => s.isCompleted).length})
              </button>
            </div>
          </div>

          {(() => {
            const displayedSessions = sessions.filter(s => {
              if (scheduleTab === 'upcoming') {
                return !s.isCompleted;
              } else {
                return s.isCompleted === true;
              }
            });

            if (displayedSessions.length === 0) {
              return (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-6 text-slate-400">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="font-extrabold text-xs">
                    {scheduleTab === 'upcoming' 
                      ? 'Không có buổi học nào sắp diễn ra.' 
                      : 'Chưa có buổi học nào được đánh dấu hoàn thành.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {displayedSessions.map(session => {
                  const isHappening = !session.isCompleted && new Date() >= new Date(session.startTime) && new Date() <= new Date(session.endTime);
                  const isUserStudent = user.role === 'student';
                  const studentAttendance = session.attendedByStudents?.find(s => s.studentId === user.id);

                  return (
                    <div 
                      key={session.id} 
                      className={`bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${
                        isHappening ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                      }`}
                    >
                      <div>
                        <div className={`p-4 border-b flex justify-between items-start ${isHappening ? 'bg-indigo-50' : 'bg-slate-50/70'}`}>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                                {session.subject || 'Lớp trực tuyến'}
                              </span>
                              {session.isCompleted && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Đã học xong
                                </span>
                              )}
                              {!session.isCompleted && isUserStudent && studentAttendance && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Đã tham gia
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-slate-900 text-base mt-1.5">{session.title}</h4>
                          </div>

                          {isTeacher && !session.isCompleted && (
                            <button 
                              onClick={() => handleOpenEdit(session)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200"
                              title="Chỉnh sửa buổi học & Link phòng"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="p-5 space-y-3 text-xs text-slate-600">
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{format(new Date(session.startTime), 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
                          </div>

                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span>{format(new Date(session.startTime), 'HH:mm')} - {format(new Date(session.endTime), 'HH:mm')}</span>
                          </div>

                          {session.note && !session.isCompleted && (
                            <p className="p-2.5 bg-slate-50 rounded-xl text-slate-500 italic text-[11px] border border-slate-100">
                              Dặn dò chuẩn bị: {session.note}
                            </p>
                          )}

                          {session.isCompleted && session.completedNote && (
                            <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-emerald-950">
                              <p className="font-bold text-[10px] uppercase text-emerald-800 mb-0.5 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                Nhật ký & Ghi chú của Giáo viên:
                              </p>
                              <p className="text-xs italic font-medium">"{session.completedNote}"</p>
                            </div>
                          )}

                          {session.isCompleted && isTeacher && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50/30 p-2 rounded-xl border border-indigo-100">
                              <Users className="w-3.5 h-3.5" />
                              <span>Sĩ số tham gia: {session.attendedByStudents?.length || 0} học sinh</span>
                            </div>
                          )}

                          {session.isCompleted && isUserStudent && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold">
                              {studentAttendance ? (
                                <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Em đã tham gia lúc {format(new Date(studentAttendance.clickedAt), 'HH:mm')}
                                </span>
                              ) : (
                                <span className="text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" />
                                  Em chưa tham gia buổi học này
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-5 pt-0 space-y-2">
                        {!session.isCompleted ? (
                          <>
                            <a 
                              href={session.link}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => handleJoinLinkClick(session)}
                              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                            >
                              <Video className="w-4 h-4" />
                              Vào phòng học (Google Meet / Zoom)
                            </a>

                            {isTeacher && (
                              <div className="grid grid-cols-2 gap-2">
                                <button 
                                  onClick={() => handleOpenNotice(session)}
                                  className="py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors"
                                >
                                  <Bell className="w-3.5 h-3.5 text-emerald-600" />
                                  Nhắc lịch
                                </button>
                                <button 
                                  onClick={() => handleOpenComplete(session)}
                                  className="py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                                  Đã học xong
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenDetails(session)}
                              className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Xem nhật ký & Sĩ số
                            </button>
                            {isTeacher && (
                              <button
                                onClick={() => handleRevertToUpcoming(session)}
                                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center transition-colors"
                                title="Đưa về lịch học sắp tới"
                              >
                                <Undo className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Right 1 col: Interactive Calendar & Reminders Note Box */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                Lịch & Ghi chú nhắc học
              </h3>
            </div>

            {/* Calendar Controller Header */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <button 
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="text-slate-600 hover:text-indigo-600 hover:bg-white px-2 py-1 rounded-lg transition-all font-bold text-sm"
              >
                &larr;
              </button>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {format(currentMonth, 'MMMM yyyy', { locale: vi })}
              </span>
              <button 
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="text-slate-600 hover:text-indigo-600 hover:bg-white px-2 py-1 rounded-lg transition-all font-bold text-sm"
              >
                &rarr;
              </button>
            </div>

            {/* Month Day Grid */}
            <div>
              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                <span>T2</span>
                <span>T3</span>
                <span>T4</span>
                <span>T5</span>
                <span>T6</span>
                <span>T7</span>
                <span>CN</span>
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {(() => {
                  const mStart = startOfMonth(currentMonth);
                  const mEnd = endOfMonth(mStart);
                  const sDate = startOfWeek(mStart, { weekStartsOn: 1 });
                  const eDate = endOfWeek(mEnd, { weekStartsOn: 1 });
                  const days = eachDayOfInterval({ start: sDate, end: eDate });

                  return days.map((day, idx) => {
                    const formattedDayStr = format(day, 'yyyy-MM-dd');
                    const hasNote = !!userNotes[formattedDayStr];
                    const hasSession = sessions.some(s => isSameDay(new Date(s.startTime), day));
                    const isSelected = selectedDate === formattedDayStr;
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDate(formattedDayStr)}
                        className={`aspect-square w-full rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105 z-10' 
                            : isToday(day)
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : isCurrentMonth
                            ? 'text-slate-700 hover:bg-slate-50'
                            : 'text-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <span>{format(day, 'd')}</span>
                        {/* Dot Indicators */}
                        <div className="flex gap-0.5 absolute bottom-1">
                          {hasSession && (
                            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></span>
                          )}
                          {hasNote && (
                            <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></span>
                          )}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Note Display for Selected Day */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-800">
                  Ngày {format(new Date(selectedDate), 'dd/MM/yyyy')}
                </p>
                {userNotes[selectedDate] && (
                  <button 
                    type="button"
                    onClick={() => {
                      const updated = { ...userNotes };
                      delete updated[selectedDate];
                      setUserNotes(updated);
                    }}
                    className="text-[10px] text-rose-500 hover:text-rose-700 font-bold"
                  >
                    Xóa ghi chú
                  </button>
                )}
              </div>

              {/* Sessions scheduled for selected date */}
              {(() => {
                const daySessions = sessions.filter(s => isSameDay(new Date(s.startTime), new Date(selectedDate)));
                if (daySessions.length > 0) {
                  return (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Buổi học trực tuyến:</p>
                      {daySessions.map(s => (
                        <div key={s.id} className="bg-white p-2 py-1.5 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                          <div className="min-w-0 flex-1 pr-1.5">
                            <p className="font-extrabold text-slate-800 text-[11px] truncate">{s.title}</p>
                            <p className="text-[9px] text-slate-500 font-medium">{format(new Date(s.startTime), 'HH:mm')}</p>
                          </div>
                          <a 
                            href={s.link} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={() => handleJoinLinkClick(s)}
                            className="text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-0.5 rounded-lg shrink-0"
                          >
                            Vào Meet
                          </a>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ghi chú nhắc nhở:</p>
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed italic">
                  {userNotes[selectedDate] ? (
                    <p className="font-medium text-slate-700 not-italic">
                      📌 {userNotes[selectedDate]}
                    </p>
                  ) : (
                    <p className="text-slate-400">Không có ghi chú nhắc nhở học tập nào cho ngày này.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {userNotes[selectedDate] ? 'Sửa ghi chú nhắc nhở:' : 'Thêm ghi chú/nhắc nhở mới:'}
                </label>
                <textarea 
                  rows={2}
                  value={currentNote}
                  onChange={e => setCurrentNote(e.target.value)}
                  placeholder="VD: Nhắc học sinh mở máy chuẩn bị vào học lúc 19h..."
                  className="w-full p-2.5 bg-white border border-slate-300 text-xs rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
                />
                <button 
                  onClick={handleSaveNote}
                  className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 shadow-sm transition-all uppercase tracking-wider text-[10px]"
                >
                  {userNotes[selectedDate] ? 'Cập nhật ghi chú' : 'Lưu ghi chú lịch học'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* TEACHER CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {editingSession ? 'Chỉnh sửa Buổi học & Link phòng' : 'Tạo Buổi học mới'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên buổi học:</label>
                <input 
                  required type="text"
                  value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="VD: Đại số 10 - Tiết 24: Bài tập Ôn tập"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Môn học:</label>
                <select 
                  value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Toán Học">Toán Học</option>
                  <option value="Vật Lý">Vật Lý</option>
                  <option value="Hóa Học">Hóa Học</option>
                  <option value="Tiếng Anh">Tiếng Anh</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DateTimePicker24h
                  label="Thời gian bắt đầu 24H:"
                  value={startTime}
                  onChange={setStartTime}
                  required
                />
                <DateTimePicker24h
                  label="Thời gian kết thúc 24H:"
                  value={endTime}
                  onChange={setEndTime}
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link Phòng học trực tuyến (Meet / Zoom):</label>
                <input 
                  required type="url"
                  value={link} onChange={e => setLink(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://meet.google.com/abc-defg-hij"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú dặn dò học sinh trước buổi học:</label>
                <textarea 
                  rows={2}
                  value={note} onChange={e => setNote(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl outline-none resize-none"
                  placeholder="Yêu cầu chuẩn bị tài liệu..."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-sm">
                  Lưu buổi học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICATION MODAL */}
      {notifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                Thông báo Lịch học trực tuyến
              </h3>
              <button onClick={() => setNotifyModal(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea 
              rows={7} 
              readOnly
              value={notifyMsg}
              className="w-full p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-950 outline-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(notifyMsg);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 shadow-sm flex items-center gap-1.5"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Đã sao chép!' : 'Sao chép tin nhắn thông báo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE SESSION MODAL */}
      {showCompleteModal && completingSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
                Hoàn thành buổi học
              </h3>
              <button 
                onClick={() => setShowCompleteModal(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Buổi học:</p>
                <p className="font-extrabold text-slate-800 text-sm">{completingSession.title}</p>
                <p className="text-xs text-slate-500 font-semibold">{completingSession.subject} • {format(new Date(completingSession.startTime), 'HH:mm dd/MM/yyyy')}</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Ghi chú dạy học / Nhật ký buổi học:</label>
                <textarea
                  rows={4}
                  value={completedNoteInput}
                  onChange={e => setCompletedNoteInput(e.target.value)}
                  placeholder="Ghi nhận nội dung đã học, dặn dò bài tập về nhà cho học sinh sau buổi học..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium resize-none"
                />
                <p className="text-[10px] text-slate-400 italic">Nhập ghi chú này để học sinh và phụ huynh có thể xem lại nội dung buổi học trực tuyến bất cứ lúc nào.</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowCompleteModal(false)} 
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-xs"
              >
                Hủy bỏ
              </button>
              <button 
                type="button"
                onClick={handleConfirmComplete}
                className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-sm text-xs flex items-center gap-1"
              >
                <Check className="w-4 h-4" />
                Xác nhận đã học xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW DETAILS & ATTENDANCE MODAL */}
      {showDetailsModal && viewingSessionDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-indigo-600" />
                Nhật ký buổi học trực tuyến
              </h3>
              <button 
                onClick={() => setShowDetailsModal(false)} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                  {viewingSessionDetails.subject}
                </span>
                <h4 className="font-extrabold text-slate-900 text-base mt-1.5">{viewingSessionDetails.title}</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 font-medium pt-1">
                  <p>📅 Ngày học: <strong>{format(new Date(viewingSessionDetails.startTime), 'dd/MM/yyyy')}</strong></p>
                  <p>⏰ Thời gian: <strong>{format(new Date(viewingSessionDetails.startTime), 'HH:mm')} - {format(new Date(viewingSessionDetails.endTime), 'HH:mm')}</strong></p>
                </div>
              </div>

              {/* Teaching logs and Notes */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Nội dung bài học & Ghi chú dặn dò
                  </h5>
                  {isTeacher && !editingCompletedNote && (
                    <button
                      onClick={() => setEditingCompletedNote(true)}
                      className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                    >
                      Sửa ghi chú
                    </button>
                  )}
                </div>

                {editingCompletedNote ? (
                  <div className="space-y-2 bg-indigo-50/20 p-3 rounded-2xl border border-indigo-100">
                    <textarea
                      rows={3}
                      value={editCompletedNoteInput}
                      onChange={e => setEditCompletedNoteInput(e.target.value)}
                      placeholder="Nội dung đã học, dặn dò bài tập về nhà..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-xs resize-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCompletedNote(false);
                          setEditCompletedNoteInput(viewingSessionDetails.completedNote || '');
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveCompletedNote}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                      >
                        Lưu ghi chú
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 leading-relaxed text-slate-700 italic">
                    {viewingSessionDetails.completedNote ? (
                      <p className="not-italic font-medium">"{viewingSessionDetails.completedNote}"</p>
                    ) : (
                      <p className="text-slate-400 text-center py-2 font-medium">Giáo viên không để lại ghi chú nào cho buổi học này.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Attendance Checklist list */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Sĩ số tham gia học trực tuyến ({viewingSessionDetails.attendedByStudents?.length || 0} học sinh)
                </h5>

                <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                  {viewingSessionDetails.attendedByStudents && viewingSessionDetails.attendedByStudents.length > 0 ? (
                    viewingSessionDetails.attendedByStudents.map((student, index) => (
                      <div key={index} className="p-3 bg-white hover:bg-slate-50 flex justify-between items-center font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                            {index + 1}
                          </div>
                          <span className="text-slate-800 font-extrabold">{student.studentName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg font-bold">
                          Đã click link vào học: {format(new Date(student.clickedAt), 'HH:mm, dd/MM')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 font-medium">
                      Chưa ghi nhận học sinh nào click tham gia phòng học trực tuyến này.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              {isTeacher && (
                <button
                  type="button"
                  onClick={() => {
                    handleRevertToUpcoming(viewingSessionDetails);
                  }}
                  className="px-4 py-2 font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl text-xs mr-auto flex items-center gap-1 transition-colors"
                >
                  <Undo className="w-3.5 h-3.5" />
                  Khôi phục lịch học
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setShowDetailsModal(false)} 
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
