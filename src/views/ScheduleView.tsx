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
import { Video, Calendar as CalendarIcon, Clock, Bell, Plus, Edit2, X, Check, Copy, Share2 } from 'lucide-react';
import { DateTimePicker24h } from '../components/DateTimePicker24h';

interface ScheduleProps {
  user: User;
  classes: ClassSession[];
  onAddClass?: (session: ClassSession) => void;
}

export function ScheduleView({ user, classes: initialClasses, onAddClass }: ScheduleProps) {
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

  React.useEffect(() => {
    setSessions(filteredInitialClasses);
  }, [filteredInitialClasses]);

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
      setSessions(sessions.map(s => s.id === editingSession.id ? {
        ...s,
        title,
        subject,
        startTime: startTime || s.startTime,
        endTime: endTime || s.endTime,
        link,
        note
      } : s));
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
          <h3 className="font-bold text-slate-900 text-base">Danh sách Buổi học trong tuần</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {sessions.map(session => {
              const isHappening = new Date() >= new Date(session.startTime) && new Date() <= new Date(session.endTime);

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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase">
                          {session.subject || 'Lớp trực tuyến'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-base mt-1.5">{session.title}</h4>
                      </div>

                      {isTeacher && (
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

                      {session.note && (
                        <p className="p-2.5 bg-slate-50 rounded-xl text-slate-500 italic text-[11px] border border-slate-100">
                          Ghi chú: {session.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-2">
                    <a 
                      href={session.link}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      Vào phòng học (Google Meet / Zoom)
                    </a>

                    {isTeacher && (
                      <button 
                        onClick={() => handleOpenNotice(session)}
                        className="w-full py-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5 text-emerald-600" />
                        Sao chép thông báo lịch học
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

    </div>
  );
}
