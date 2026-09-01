import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Eye, Play, X, RotateCw, HelpCircle, Download, Upload, Plus, Trash2, Lock, Radio, Sparkles, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SAMPLE_TEMPLATES } from '../views/AssignmentsView';
import { useGameStatuses } from '../lib/gameConfig';
import { User } from '../types';

const FORMAT_TEMPLATES: Record<string, string> = {
  multiple_choice: "Câu 1: Thủ đô của Việt Nam là gì?\nA. Hà Nội\nB. TP. Hồ Chí Minh\nC. Đà Nẵng\nD. Huế\nĐáp án: A",
  true_false: "Câu 2: Mặt trời quay quanh trái đất.\nĐáp án: Sai",
  word_reorder: `Câu 1: Tục ngữ: Lý thuyết phải đi liền với thực tiễn.
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
Nhiễu: ăn | cây | sông | biển`,
  short_answer: `Câu 1: Chủ đề: Khám Phá Khoa Học
Gợi ý: Tìm các từ khóa thuộc chủ đề Khoa Học
Đáp án: TOÁN HỌC | SINH HỌC | VẬT LÝ | HÓA HỌC | VŨ TRỤ | HÀNH TINH`,
  matching: "Câu 5: Nối các từ đồng nghĩa\nTo lớn - Vĩ đại\nXinh đẹp - Tuyệt trần"
};

const FORMAT_NAMES: Record<string, string> = {
  multiple_choice: "Trắc nghiệm nhiều phương án",
  true_false: "Đúng / Sai",
  word_reorder: "Sắp xếp từ / chữ",
  short_answer: "Trả lời ngắn",
  matching: "Nối các thành phần"
};

const GenericFormatForm = ({ formatId, blockText, onChange, onApplyTemplate }: any) => {
  const lineCount = Math.max(blockText.split('\n').length, 5);
  return (
    <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden flex flex-col shadow-sm flex-1">
      <div className="bg-slate-50 border-b border-slate-200 p-2.5 px-4 flex items-center justify-between shrink-0">
        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          Khung nhập: {FORMAT_NAMES[formatId] || formatId}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange('')}
            title="Xóa trắng nội dung khung này"
            className="p-1 px-2 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa trắng</span>
          </button>
          <button
            type="button"
            onClick={() => onApplyTemplate(formatId)}
            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 hover:text-indigo-700 transition-colors shadow-sm"
          >
            Dùng mẫu chuẩn
          </button>
        </div>
      </div>
      <div className="flex flex-1 min-h-[140px]">
        <textarea
          value={blockText}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Nhập câu hỏi dạng ${FORMAT_NAMES[formatId]}...`}
          className="flex-1 w-full p-3.5 text-[12px] font-mono text-slate-800 outline-none resize-none leading-relaxed whitespace-pre font-medium bg-transparent"
          spellCheck={false}
        />
      </div>
    </div>
  );
};

const MultipleChoiceForm = (props: any) => <GenericFormatForm {...props} />;
const TrueFalseForm = (props: any) => <GenericFormatForm {...props} />;
const WordReorderForm = (props: any) => <GenericFormatForm {...props} />;
const ShortAnswerForm = (props: any) => <GenericFormatForm {...props} />;
const MatchingForm = (props: any) => <GenericFormatForm {...props} />;
const EssayForm = (props: any) => <GenericFormatForm {...props} />;

const FORMAT_COMPONENTS: Record<string, React.FC<any>> = {
  multiple_choice: MultipleChoiceForm,
  true_false: TrueFalseForm,
  word_reorder: WordReorderForm,
  short_answer: ShortAnswerForm,
  matching: MatchingForm,
  essay: EssayForm
};

interface GameWizardProps {
  gameSubStep: 1 | 2 | 3;
  setGameSubStep: (step: 1 | 2 | 3) => void;
  newGameType: string;
  setNewGameType: (type: string) => void;
  selectedGameCategory: string;
  setSelectedGameCategory: (cat: string) => void;
  gameSearchQuery: string;
  setGameSearchQuery: (query: string) => void;
  newGameFormats: string[];
  setNewGameFormats: (formats: string[]) => void;
  rawQuestionCode: string;
  setRawQuestionCode: (code: string) => void;
  setShowGamePreview: (show: boolean) => void;
  tugOfWarMode?: 'bot' | 'pvp';
  setTugOfWarMode?: (mode: 'bot' | 'pvp') => void;
  user?: User;
}

export const GameWizard: React.FC<GameWizardProps> = ({
  gameSubStep,
  setGameSubStep,
  newGameType,
  setNewGameType,
  selectedGameCategory,
  setSelectedGameCategory,
  gameSearchQuery,
  setGameSearchQuery,
  newGameFormats,
  setNewGameFormats,
  rawQuestionCode,
  setRawQuestionCode,
  setShowGamePreview,
  tugOfWarMode = 'bot',
  setTugOfWarMode,
  user
}) => {
  const { gameStatuses, toggleGameStatus } = useGameStatuses();
  const isAdmin = user?.role === 'admin';
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_air' | 'coming_soon'>('all');
  const [questionBlocks, setQuestionBlocks] = useState<Record<string, string>>({});
  const [activeFormat, setActiveFormat] = useState<string>('');

  // Initialize blocks when formats change
  useEffect(() => {
    setQuestionBlocks(prev => {
      let changed = false;
      const next = { ...prev };
      newGameFormats.forEach(fmt => {
        if (next[fmt] === undefined) {
          next[fmt] = FORMAT_TEMPLATES[fmt] || '';
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    if (newGameFormats.length > 0 && !newGameFormats.includes(activeFormat)) {
      setActiveFormat(newGameFormats[0]);
    }
  }, [newGameFormats]);

  // Sync to rawQuestionCode
  useEffect(() => {
    // Only combine currently selected formats
    if (Object.keys(questionBlocks).length > 0) {
      const code = newGameFormats
        .map(fmt => questionBlocks[fmt] || '')
        .filter(t => t.trim().length > 0)
        .join('\n\n');
      setRawQuestionCode(code);
    }
  }, [questionBlocks, newGameFormats, setRawQuestionCode]);

  const handleApplyTemplate = (fmt: string) => {
    setQuestionBlocks(prev => ({
      ...prev,
      [fmt]: FORMAT_TEMPLATES[fmt] || ''
    }));
  };

  const supportMap: Record<string, string[]> = {
    quiz_nghieng_dau: ['multiple_choice', 'true_false'],
    cuoc_dua_ngon_tay: ['multiple_choice', 'true_false', 'word_reorder'],
    do_min: ['multiple_choice', 'true_false', 'short_answer', 'matching'],
    doan_tau_tri_thuc: ['matching'],
    keo_co: ['multiple_choice', 'true_false'],
    game_map: ['multiple_choice', 'true_false', 'short_answer'],
    tu_ngu_biet_bay: ['word_reorder'],
    keo_tha_noi_y: ['matching'],
    o_chu_khoa: ['short_answer'],
    san_kho_bau: ['multiple_choice', 'true_false', 'matching'],
    lat_manh_ghep: ['matching'],
    domino: ['matching'],
    dao_chu: ['word_reorder'],
    mo_hop: ['multiple_choice', 'true_false', 'short_answer', 'matching'],
    gan_nhan_so_do: ['matching'],
    no_bong_bay: ['multiple_choice', 'true_false'],
    dap_chuot_chui: ['multiple_choice', 'true_false']
  };

  const gamesList = [
    { id: 'quiz_nghieng_dau', name: 'Quiz Nghiêng Đầu', category: 'ai', desc: 'Sử dụng camera nghiêng đầu để trả lời A, B, C, D cực nhạy', emoji: '🧠', color: 'border-blue-100 hover:border-blue-500 bg-blue-50/20 hover:bg-blue-50/40' },
    { id: 'cuoc_dua_ngon_tay', name: 'Cuộc Đua Ngón Tay', category: 'speed', desc: 'Đua xe trả lời đúng để bứt tốc vượt lên đối thủ trên đường đua', emoji: '🏎️', color: 'border-rose-100 hover:border-rose-500 bg-rose-50/20 hover:bg-rose-50/40' },
    { id: 'do_min', name: 'Dò Mìn', category: 'puzzle', desc: 'Khám phá ô mìn an toàn thông qua giải các phép tính toán học', emoji: '💣', color: 'border-emerald-100 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40' },
    { id: 'doan_tau_tri_thuc', name: 'Đoàn Tàu Tri Thức', category: 'puzzle', desc: 'Đưa đoàn tàu vượt các ga học liệu cập bến ga cuối an toàn', emoji: '🚂', color: 'border-sky-100 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/40' },
    { id: 'keo_co', name: 'Kéo Co Kiến Thức', category: 'speed', desc: 'Đấu trí kéo co kịch tính đấu với máy hoặc hai người chơi', emoji: '🪢', color: 'border-orange-100 hover:border-orange-500 bg-orange-50/20 hover:bg-orange-50/40' },
    { id: 'game_map', name: 'Game Map', category: 'adventure', desc: 'Bản đồ truy tìm kho báu toán học cổ xưa đầy thú vị', emoji: '🗺️', color: 'border-yellow-100 hover:border-yellow-500 bg-yellow-50/20 hover:bg-yellow-50/40' },
    { id: 'tu_ngu_biet_bay', name: 'Từ Ngữ Biết Bay', category: 'adventure', desc: 'Chạm từ chuyển động đúng chính tả và logic ngữ văn', emoji: '🛸', color: 'border-violet-100 hover:border-violet-500 bg-violet-50/20 hover:bg-violet-50/40' },
    { id: 'keo_tha_noi_y', name: 'Kéo Thả Nối Ý', category: 'adventure', desc: 'Ghép nối vế trái logic với vế phải tạo câu đúng hoàn chỉnh', emoji: '🔗', color: 'border-teal-100 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/40' },
    { id: 'o_chu_khoa', name: 'Ô Chữ Khóa Bí Mật', category: 'puzzle', desc: 'Giải ô chữ giải mã từ khóa cốt lõi của bài học hôm nay', emoji: '🔐', color: 'border-green-100 hover:border-green-500 bg-green-50/20 hover:bg-green-50/40' },
    { id: 'san_kho_bau', name: 'Săn Kho Báu', category: 'adventure', desc: 'Tìm rương vàng cổ vật thông qua thử thách toán thực tế', emoji: '🏴‍☠️', color: 'border-slate-100 hover:border-slate-500 bg-slate-50/30 hover:bg-slate-50/50' },
    { id: 'lat_manh_ghep', name: 'Lật Mảnh Ghép', category: 'puzzle', desc: 'Lật và ghép nối các cặp câu hỏi - đáp án tương ứng', emoji: '🧩', color: 'border-indigo-100 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/40' },
    { id: 'domino', name: 'Đấu Trường Domino', category: 'puzzle', desc: 'Chuỗi logic ghép nối domino liên tiếp đầy kịch tính', emoji: '🀄', color: 'border-cyan-100 hover:border-cyan-500 bg-cyan-50/20 hover:bg-cyan-50/40' },
    { id: 'dao_chu', name: 'Đảo Chữ Anagram', category: 'puzzle', desc: 'Xáo trộn ký tự để xếp lại thuật ngữ có nghĩa chuẩn xác nhất', emoji: '🔠', color: 'border-teal-100 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/40' },
    { id: 'mo_hop', name: 'Mở Hộp Bí Mật', category: 'puzzle', desc: 'Hộp quà chứa các thử thách toán học ngẫu nhiên bất ngờ', emoji: '🎁', color: 'border-sky-100 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/40' },
    { id: 'gan_nhan_so_do', name: 'Gắn Nhãn Sơ Đồ', category: 'adventure', desc: 'Kéo các nhãn vào đúng chấm tròn sơ đồ minh họa hình học', emoji: '📊', color: 'border-purple-100 hover:border-purple-500 bg-purple-50/20 hover:bg-purple-50/40' },
    { id: 'no_bong_bay', name: 'Nổ Bóng Bay', category: 'speed', desc: 'Chạm nổ những quả bóng bay mang đáp án đúng bay lượn', emoji: '🎈', color: 'border-pink-100 hover:border-pink-500 bg-pink-50/20 hover:bg-pink-50/40' },
    { id: 'dap_chuot_chui', name: 'Đập Chuột Chũi', category: 'speed', desc: 'Đập búa vào chú chuột mang mệnh đề toán học chính xác', emoji: '🔨', color: 'border-amber-100 hover:border-amber-600 bg-amber-50/20 hover:bg-amber-50/40' }
  ];

  const filteredGames = gamesList.filter(game => {
    if (selectedGameCategory !== 'all' && game.category !== selectedGameCategory) {
      return false;
    }
    const st = gameStatuses[game.id] || 'coming_soon';
    if (statusFilter !== 'all' && st !== statusFilter) {
      return false;
    }
    if (gameSearchQuery && !game.name.toLowerCase().includes(gameSearchQuery.toLowerCase()) && !game.desc.toLowerCase().includes(gameSearchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const selectedGame = gamesList.find(g => g.id === newGameType) || gamesList[0];

  return (
    <div id="game-wizard-container" className="flex-1 flex flex-col md:overflow-hidden bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
      {/* Stepper Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4 border-b border-slate-100 pb-3 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar flex-1 pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setGameSubStep(1)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${gameSubStep === 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">1</span>
            Chọn Game
          </button>
          <span className="text-slate-300 text-xs shrink-0">➔</span>
          <button
            type="button"
            disabled={!newGameType}
            onClick={() => {
              const formats = supportMap[newGameType] || ['multiple_choice'];
              if (formats.length > 1) {
                setGameSubStep(2);
              } else {
                setGameSubStep(3);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${gameSubStep === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-50'}`}
          >
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">2</span>
            Dạng Câu
          </button>
          <span className="text-slate-300 text-xs shrink-0">➔</span>
          <button
            type="button"
            disabled={!newGameType}
            onClick={() => setGameSubStep(3)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${gameSubStep === 3 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-50'}`}
          >
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-black">3</span>
            Nhập Đề
          </button>
        </div>
      </div>

      {/* Step Contents */}
      <div className="flex-1 md:overflow-hidden min-h-0 flex flex-col">
        <AnimatePresence mode="wait">
          {gameSubStep === 1 && (
            <motion.div 
              key="game-step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col space-y-3"
            >
              {/* Toast Notice Banner for Teachers */}
              {toastNotice && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg border border-amber-600 flex items-center justify-between gap-3 text-xs font-bold"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{toastNotice}</span>
                  </div>
                  <button 
                    onClick={() => setToastNotice(null)}
                    className="bg-black/20 hover:bg-black/30 text-white p-1 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Search & Categories & Status Filter - Compact */}
              <div className="flex flex-col sm:flex-row gap-2 shrink-0 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative w-full sm:max-w-xs shrink-0">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 text-xs">🔍</span>
                  <input 
                    type="text"
                    placeholder="Tìm nhanh..."
                    value={gameSearchQuery}
                    onChange={(e) => setGameSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold transition-all outline-none h-full"
                  />
                  {gameSearchQuery && (
                    <button 
                      onClick={() => setGameSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none select-none flex-1">
                  {[
                    { id: 'all', name: 'Tất cả', emoji: '✨' },
                    { id: 'ai', name: 'AI', emoji: '🤖' },
                    { id: 'speed', name: 'Tốc độ', emoji: '⚡' },
                    { id: 'puzzle', name: 'Giải đố', emoji: '🧩' },
                    { id: 'adventure', name: 'Bản đồ', emoji: '🗺️' }
                  ].map(cat => {
                    const isCatSelected = selectedGameCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedGameCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                          isCatSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-800'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Filter by Status */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${statusFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('on_air')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${statusFilter === 'on_air' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'}`}
                  >
                    <Radio className="w-2.5 h-2.5" /> On Air
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('coming_soon')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 ${statusFilter === 'coming_soon' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'}`}
                  >
                    <Lock className="w-2.5 h-2.5" /> Coming Soon
                  </button>
                </div>
              </div>

              {/* Grid List */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredGames.map(game => {
                    const isSelected = newGameType === game.id;
                    const supportedFormats = supportMap[game.id] || ['multiple_choice'];
                    const isSingleFormat = supportedFormats.length === 1;
                    const st = gameStatuses[game.id] || 'coming_soon';
                    const isComingSoon = st === 'coming_soon';

                    const handleCardClick = () => {
                      if (!isAdmin && isComingSoon) {
                        setToastNotice(`Trò chơi "${game.name}" đang ở chế độ Coming Soon (Sắp ra mắt)! Admin đang thử nghiệm và sẽ bật On Air sớm cho Giáo viên.`);
                        setTimeout(() => setToastNotice(null), 5000);
                        return;
                      }

                      setNewGameType(game.id);
                      if (isSingleFormat) {
                        setNewGameFormats(supportedFormats);
                        setGameSubStep(3);
                      } else {
                        setNewGameFormats([supportedFormats[0]]);
                        setGameSubStep(2);
                      }
                    };

                    return (
                      <motion.div 
                        key={game.id}
                        whileHover={{ y: !isAdmin && isComingSoon ? 0 : -4, transition: { duration: 0.12 } }}
                        whileTap={{ scale: !isAdmin && isComingSoon ? 1 : 0.98 }}
                        onClick={handleCardClick}
                        className={`group cursor-pointer p-3.5 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between gap-2.5 relative ${game.color} ${
                          !isAdmin && isComingSoon
                            ? 'opacity-85 bg-slate-50/90 border-amber-200 hover:border-amber-300'
                            : isSelected 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' 
                            : 'border-slate-100 bg-white shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform shrink-0">
                            {game.emoji}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight flex items-center gap-1.5">
                                <span>{game.name}</span>
                              </h5>

                              {/* Status Badge */}
                              {isComingSoon ? (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-full shrink-0">
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Coming Soon</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full shrink-0">
                                  <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                                  <span>On Air</span>
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-slate-500 font-medium mt-1 leading-normal line-clamp-2">
                              {game.desc}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer: Formats & Admin Action */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 w-full mt-auto">
                          <div className="flex flex-wrap gap-1">
                            {supportedFormats.map(fmtId => {
                              const fmtLabel = 
                                fmtId === 'multiple_choice' ? 'Trắc nghiệm' :
                                fmtId === 'true_false' ? 'Đúng/Sai' :
                                fmtId === 'word_reorder' ? 'Sắp xếp' :
                                fmtId === 'short_answer' ? 'Trả lời ngắn' : 'Ghép nối';
                              return (
                                <span key={fmtId} className="text-[8px] bg-white border border-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-md uppercase">
                                  {fmtLabel}
                                </span>
                              );
                            })}
                          </div>

                          {/* Admin Toggle Switch on Card */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGameStatus(game.id);
                              }}
                              className={`text-[9px] font-extrabold px-2.5 py-1 rounded-xl transition-all shadow-xs border flex items-center gap-1 shrink-0 ${
                                isComingSoon
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 hover:shadow-emerald-200'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                              title={isComingSoon ? "Bật On Air cho Giáo viên sử dụng" : "Chuyển về trạng thái Coming Soon"}
                            >
                              {isComingSoon ? (
                                <>
                                  <Radio className="w-2.5 h-2.5 text-white" />
                                  <span>Bật On Air</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-2.5 h-2.5 text-amber-700" />
                                  <span>Khóa CS</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {gameSubStep === 2 && (
            <motion.div 
              key="game-step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col space-y-4 max-w-3xl mx-auto w-full py-2"
            >
              <div className="flex-1 min-h-0 flex flex-col space-y-3">
                <div className="border-b border-slate-100 pb-2 mb-1 shrink-0 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 2</span>
                    <h4 className="text-sm font-black text-slate-800 mt-1 flex items-center gap-2">
                      <span>⚙️</span> Cấu Hình Dạng Câu Hỏi
                    </h4>
                  </div>
                  <button
                    onClick={() => setGameSubStep(1)}
                    className="text-xs font-bold text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Đổi Game</span>
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                  <p className="text-xs text-slate-500 font-bold mb-3">
                    Chọn các dạng câu hỏi được phép xuất hiện:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    {[
                      { id: 'multiple_choice', name: 'Trắc nghiệm', sub: 'Chọn 1 đáp án đúng', emoji: '🔘' },
                      { id: 'true_false', name: 'Đúng/sai', sub: 'Chỉ có Đúng hoặc Sai', emoji: '⚖️' },
                      { id: 'word_reorder', name: 'Sắp xếp', sub: 'Sắp xếp từ thành câu', emoji: '🔠' },
                      { id: 'short_answer', name: 'Trả lời ngắn', sub: 'Học sinh tự điền kết quả', emoji: '📝' },
                      { id: 'matching', name: 'Ghép nối', sub: 'Nối các thành phần', emoji: '🔗' }
                    ].filter(fmt => (supportMap[newGameType] || ['multiple_choice']).includes(fmt.id))
                     .map(fmt => {
                      const isChecked = newGameFormats.includes(fmt.id);
                      return (
                        <motion.div 
                          key={fmt.id}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (isChecked) {
                              if (newGameFormats.length > 1) {
                                setNewGameFormats(newGameFormats.filter(id => id !== fmt.id));
                              }
                            } else {
                              setNewGameFormats([...newGameFormats, fmt.id]);
                            }
                          }}
                          className={`p-3 border-2 rounded-xl cursor-pointer flex items-center gap-3 transition-all hover:shadow-sm duration-200 ${
                            isChecked 
                              ? 'border-indigo-600 bg-indigo-50/50' 
                              : 'border-slate-200 bg-white hover:border-indigo-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                            isChecked ? 'bg-white shadow-sm' : 'bg-slate-50 border border-slate-100'
                          }`}>
                            {fmt.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs sm:text-sm font-bold block truncate ${isChecked ? 'text-indigo-900' : 'text-slate-700'}`}>{fmt.name}</span>
                            <span className="text-[10px] text-slate-500 block truncate mt-0.5">{fmt.sub}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {isChecked && '✓'}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Tug of War Game Mode Setting (Teacher Only) */}
                  {newGameType === 'keo_co' && setTugOfWarMode && (
                    <div className="my-3 p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">🪢</span>
                        <span className="text-xs font-black text-orange-950 uppercase tracking-wide">
                          Thiết lập chế độ Kéo Co (Chỉ Giáo viên quyết định):
                        </span>
                      </div>
                      <p className="text-[11px] text-orange-800 font-medium mb-3">
                        Học sinh khi nhận bài sẽ tuân theo chế độ thầy/cô đã định sẵn và không thể tự ý thay đổi.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div
                          onClick={() => setTugOfWarMode('bot')}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                            tugOfWarMode === 'bot'
                              ? 'border-orange-600 bg-white shadow-md ring-2 ring-orange-500/20'
                              : 'border-orange-200 bg-white/70 hover:bg-white'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                            tugOfWarMode === 'bot' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100'
                          }`}>
                            🤖
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800">Đấu Với Máy (Bot AI)</span>
                              {tugOfWarMode === 'bot' && <span className="text-[10px] font-black text-orange-600">✓ Đã chọn</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              1 học sinh tự luyện tập, hệ thống bot AI đóng vai Đội Đỏ đối kháng.
                            </p>
                          </div>
                        </div>

                        <div
                          onClick={() => setTugOfWarMode('pvp')}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-2.5 ${
                            tugOfWarMode === 'pvp'
                              ? 'border-orange-600 bg-white shadow-md ring-2 ring-orange-500/20'
                              : 'border-orange-200 bg-white/70 hover:bg-white'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                            tugOfWarMode === 'pvp' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100'
                          }`}>
                            👥
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800">Đối Kháng 2 Đội / 2 Người</span>
                              {tugOfWarMode === 'pvp' && <span className="text-[10px] font-black text-orange-600">✓ Đã chọn</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              2 học sinh hoặc 2 nhóm thi đấu trực tiếp cùng lúc trên một thiết bị.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGameSubStep(3)}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    Tiếp tục nhập đề ➔
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {gameSubStep === 3 && (
            <motion.div 
              key="game-step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="flex-1 min-h-0 flex flex-col space-y-4 w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 3</span>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span>📝</span> Mã nguồn câu hỏi Game
                  </h4>
                  <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {rawQuestionCode.split('\n').length} dòng
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => setRawQuestionCode('')}
                    title="Xóa trắng mã nguồn câu hỏi"
                    className="p-1.5 px-3 text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa trắng</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowGamePreview(true)} 
                    title="Xem trước trò chơi học tập"
                    className="px-4 sm:px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl text-xs sm:text-sm border border-indigo-500 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-100 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" /> Preview
                  </button>
                </div>
              </div>

              {/* Format Tab Selector */}
              <div className="flex flex-wrap gap-2 shrink-0 pb-2">
                {newGameFormats.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setActiveFormat(fmt)}
                    className={`px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm border ${
                      activeFormat === fmt 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {FORMAT_NAMES[fmt] || fmt}
                  </button>
                ))}
              </div>

              {/* State-based rendering of the input form using a switch statement */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4 flex flex-col">
                {(() => {
                  const CurrentForm = FORMAT_COMPONENTS[activeFormat];
                  if (!CurrentForm) return null;

                  const blockText = questionBlocks[activeFormat] || '';
                  const onChange = (val: string) => setQuestionBlocks(prev => ({ ...prev, [activeFormat]: val }));

                  switch (activeFormat) {
                    case 'multiple_choice':
                    case 'true_false':
                    case 'word_reorder':
                    case 'short_answer':
                    case 'matching':
                    case 'essay':
                      return (
                        <CurrentForm 
                          formatId={activeFormat}
                          blockText={blockText}
                          onChange={onChange}
                          onApplyTemplate={handleApplyTemplate}
                        />
                      );
                    default:
                      return null;
                  }
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
