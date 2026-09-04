import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, X, Play, BookOpen, Layers, Check, Sparkles, FolderOpen, ArrowRight, CheckCircle2, RotateCw, ChevronRight, HelpCircle, FileText, UserCheck, ShieldCheck } from 'lucide-react';
import { QuestionSetItem, User } from '../types';
import { QuestionSetPickerModal } from './QuestionSetPickerModal';
import { parseRawCodeToQuestions } from '../views/AssignmentsView';

interface GameLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
  onLaunchGame: (gameType: string, questions: any[], tugOfWarMode?: 'bot' | 'pvp') => void;
  onAssignGame?: (qSet: QuestionSetItem, gameType: string) => void;
}

const AVAILABLE_GAMES = [
  {
    id: 'super_race',
    name: 'Đua Xe Siêu Tốc',
    emoji: '🏎️',
    color: 'from-amber-500 via-orange-500 to-rose-600',
    badge: 'Tốc độ cao',
    desc: 'Đua xe rượt đuổi kịch tính! Trả lời đúng để bứt tốc xé gió vượt đối thủ.'
  },
  {
    id: 'tug_of_war',
    name: 'Kéo Co Tri Thức',
    emoji: '🪢',
    color: 'from-red-600 via-orange-600 to-amber-500',
    badge: 'Đồng đội & Đấu Bot',
    desc: 'Thi đấu kéo co gay cấn. Trả lời đúng để dồn sức kéo dây về phía đội nhà.'
  },
  {
    id: 'knowledge_train',
    name: 'Đoàn Tàu Tri Thức',
    emoji: '🚂',
    color: 'from-blue-600 via-indigo-600 to-purple-600',
    badge: 'Phiêu lưu',
    desc: 'Điều khiển đoàn tàu chạy qua các trạm tri thức. Thu thập nhiên liệu bằng câu trả lời đúng.'
  },
  {
    id: 'whack_a_mole',
    name: 'Đập Chuột Ôn Tập',
    emoji: '🔨',
    color: 'from-emerald-600 via-teal-600 to-cyan-600',
    badge: 'Phản xạ nhanh',
    desc: 'Thử thách phản xạ siêu nhạy! Đập đúng chú chuột mang đáp án chính xác.'
  },
  {
    id: 'flying_words',
    name: 'Từ Ngữ Biết Bay',
    emoji: '🎈',
    color: 'from-sky-500 via-indigo-500 to-blue-600',
    badge: 'Nhẹ nhàng & Vui vẻ',
    desc: 'Bóng bay mang từ ngữ bay qua màn hình. Chọn đúng bóng mang đáp án chuẩn xác.'
  },
  {
    id: 'memory_flip',
    name: 'Lật Thẻ Ghi Nhớ',
    emoji: '🃏',
    color: 'from-purple-600 via-pink-600 to-rose-500',
    badge: 'Ghi nhớ ngắn hạn',
    desc: 'Lật mở các cặp thẻ câu hỏi và đáp án tương ứng để ghi điểm tuyệt đối.'
  },
  {
    id: 'do_min',
    name: 'Dò Mìn Ôn Tập',
    emoji: '💣',
    color: 'from-slate-700 via-slate-800 to-zinc-900',
    badge: 'Tư duy logic',
    desc: 'Gỡ bom bằng cách giải đáp các câu hỏi trắc nghiệm đằng sau các ô số.'
  },
  {
    id: 'secret_word',
    name: 'Từ Ngữ Bí Mật',
    emoji: '🔤',
    color: 'from-pink-600 via-rose-600 to-red-500',
    badge: 'Giải đố từ vựng',
    desc: 'Giải mã từ khóa bí mật thông qua các gợi ý chi tiết từ câu hỏi trắc nghiệm.'
  }
];

export const GameLauncherModal: React.FC<GameLauncherModalProps> = ({
  isOpen,
  onClose,
  user,
  onLaunchGame,
  onAssignGame
}) => {
  const [selectedSet, setSelectedSet] = useState<QuestionSetItem | null>(null);
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [selectedGameType, setSelectedGameType] = useState<string>('super_race');
  const [tugOfWarMode, setTugOfWarMode] = useState<'bot' | 'pvp'>('bot');
  const [showQuestionsPreview, setShowQuestionsPreview] = useState<boolean>(false);

  // Parse questions from selected set
  const parsedData = useMemo(() => {
    if (!selectedSet) return { groupTitle: '', parsedQuestions: [] };
    if (selectedSet.questions && selectedSet.questions.length > 0) {
      return { groupTitle: selectedSet.title, parsedQuestions: selectedSet.questions };
    }
    if (selectedSet.rawCode) {
      return parseRawCodeToQuestions(selectedSet.rawCode);
    }
    return { groupTitle: '', parsedQuestions: [] };
  }, [selectedSet]);

  if (!isOpen) return null;

  const handleStartGame = () => {
    if (!selectedSet) {
      setShowPicker(true);
      return;
    }
    if (parsedData.parsedQuestions.length === 0) {
      alert('Bộ đề này chưa có câu hỏi nào! Vui lòng chọn bộ đề khác từ Ngân hàng.');
      return;
    }

    onLaunchGame(selectedGameType, parsedData.parsedQuestions, tugOfWarMode);
    onClose();
  };

  const handleAssignClick = () => {
    if (!selectedSet) {
      setShowPicker(true);
      return;
    }
    if (onAssignGame) {
      onAssignGame(selectedSet, selectedGameType);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9990] flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-sm shrink-0">
              <Gamepad2 className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-black/20 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Bảng Điều Khiển Trò Chơi
                </span>
              </div>
              <h3 className="font-black text-white text-base sm:text-lg tracking-tight leading-tight mt-0.5">
                Chọn 'Bộ Đề' Từ Ngân Hàng Để Bắt Đầu Game
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-2xl transition-colors shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1 bg-slate-50/70">
          
          {/* STEP 1: QUESTION SET SELECTION */}
          <div className="bg-white rounded-2xl border-2 border-indigo-100 p-4 sm:p-5 shadow-sm space-y-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                  Bộ Đề Đã Chọn Từ Ngân Hàng Câu Hỏi
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
              >
                <FolderOpen className="w-4 h-4" />
                <span>{selectedSet ? '🔄 Đổi Bộ Đề Khác' : '📂 Chọn Bộ Đề Từ Ngân Hàng'}</span>
              </button>
            </div>

            {selectedSet ? (
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 sm:p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-extrabold text-[10px] rounded-full">
                        {selectedSet.subject || 'Môn học'}
                      </span>
                      {selectedSet.grade && (
                        <span className="px-2.5 py-0.5 bg-sky-600 text-white font-extrabold text-[10px] rounded-full">
                          {selectedSet.grade}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {parsedData.parsedQuestions.length} câu hỏi sẵn sàng
                      </span>
                    </div>

                    <h5 className="font-black text-slate-900 text-base mt-2">
                      {selectedSet.title}
                    </h5>
                    {selectedSet.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {selectedSet.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowQuestionsPreview(!showQuestionsPreview)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{showQuestionsPreview ? 'Ẩn xem trước' : 'Xem trước các câu hỏi'}</span>
                  </button>
                </div>

                {/* Question Preview List */}
                {showQuestionsPreview && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/80 space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {parsedData.parsedQuestions.map((q, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-indigo-100 text-xs text-slate-800 space-y-1">
                        <p className="font-bold">
                          Câu {idx + 1}: {q.question}
                        </p>
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pt-1">
                            {q.options.map((opt: string, optIdx: number) => (
                              <div key={optIdx} className={`px-2 py-0.5 rounded ${q.correctAnswer === optIdx ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-50'}`}>
                                {['A', 'B', 'C', 'D'][optIdx]}. {opt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={() => setShowPicker(true)}
                className="border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 rounded-xl p-6 text-center cursor-pointer transition-colors space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Chưa chọn bộ đề nào từ Ngân hàng câu hỏi
                </p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Bấm vào đây để mở Ngân hàng bộ đề, tìm và chọn bộ câu hỏi trắc nghiệm mong muốn để tải trực tiếp vào trò chơi!
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Chọn Bộ Đề Ngay</span>
                </button>
              </div>
            )}
          </div>

          {/* STEP 2: GAME TYPE SELECTION */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">
                Lựa Chọn Định Dạng Trò Chơi Tương Tác
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {AVAILABLE_GAMES.map(game => {
                const isSelected = selectedGameType === game.id;
                return (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGameType(game.id)}
                    className={`cursor-pointer p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-2 relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20 scale-[1.02]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}

                    <div className="flex items-start gap-2.5">
                      <span className="text-2xl p-2 rounded-xl bg-slate-100 shadow-xs border border-slate-200 shrink-0">
                        {game.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">
                          {game.badge}
                        </span>
                        <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight mt-0.5">
                          {game.name}
                        </h5>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-normal line-clamp-2 mt-1">
                      {game.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Tug of war options if selected */}
            {selectedGameType === 'tug_of_war' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-amber-900">
                  Chế độ chơi Kéo Co:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTugOfWarMode('bot')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                      tugOfWarMode === 'bot'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🤖 Thi Đấu Với Máy (Bot)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTugOfWarMode('pvp')}
                    className={`px-3 py-1.5 rounded-lg font-extrabold text-xs transition-all ${
                      tugOfWarMode === 'pvp'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    👥 Đối Kháng 2 Người (PvP)
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            {selectedSet ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                Đã chọn: "{selectedSet.title}" ({parsedData.parsedQuestions.length} câu)
              </span>
            ) : (
              <span className="text-amber-600 font-bold">
                ⚠️ Vui lòng chọn một bộ đề từ Ngân hàng trước khi khởi động game
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onAssignGame && (
              <button
                type="button"
                onClick={handleAssignClick}
                disabled={!selectedSet}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 border border-slate-300"
              >
                <span>📌 Giao Bài Tập Game Cho Lớp</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStartGame}
              disabled={!selectedSet}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-orange-200 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>🎮 Khởi Động Trò Chơi Ngay</span>
            </button>
          </div>
        </div>

      </div>

      {/* QUESTION BANK PICKER MODAL */}
      <QuestionSetPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelectSet={(qSet) => {
          setSelectedSet(qSet);
          setShowPicker(false);
        }}
        title="Ngân Hàng Bộ Đề - Chọn Bộ Đề Chơi Game"
        subtitle="Lựa chọn 1 bộ đề trắc nghiệm có sẵn để chơi trò chơi ngay lập tức"
      />
    </div>
  );
};
