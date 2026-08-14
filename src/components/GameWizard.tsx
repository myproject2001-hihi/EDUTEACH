import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Eye, Play, X, RotateCw, HelpCircle, Download, Upload, Plus } from 'lucide-react';
import { SAMPLE_TEMPLATES } from '../views/AssignmentsView';

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
}) => {
  const supportMap: Record<string, string[]> = {
    quiz_nghieng_dau: ['multiple_choice', 'true_false'],
    pose_matching: ['multiple_choice', 'true_false'],
    cuoc_dua_ngon_tay: ['multiple_choice', 'true_false', 'word_reorder'],
    do_min: ['multiple_choice', 'true_false', 'short_answer', 'matching'],
    doan_tau_tri_thuc: ['multiple_choice', 'true_false', 'word_reorder', 'matching'],
    game_map: ['multiple_choice', 'true_false', 'short_answer'],
    tu_ngu_biet_bay: ['multiple_choice', 'true_false', 'word_reorder'],
    keo_tha_noi_y: ['matching'],
    o_chu_khoa: ['short_answer'],
    san_kho_bau: ['multiple_choice', 'true_false', 'matching'],
    lat_manh_ghep: ['multiple_choice', 'true_false', 'short_answer', 'matching'],
    domino: ['matching'],
    dao_chu: ['word_reorder'],
    mo_hop: ['multiple_choice', 'true_false', 'short_answer', 'matching'],
    gan_nhan_so_do: ['matching'],
    no_bong_bay: ['multiple_choice', 'true_false'],
    dap_chuot_chui: ['multiple_choice', 'true_false']
  };

  const gamesList = [
    { id: 'quiz_nghieng_dau', name: 'Quiz Nghiêng Đầu', category: 'ai', desc: 'Sử dụng camera nghiêng đầu để trả lời A, B, C, D cực nhạy', emoji: '🧠', color: 'border-blue-100 hover:border-blue-500 bg-blue-50/20 hover:bg-blue-50/40' },
    { id: 'pose_matching', name: 'Tư Thế Mô Phỏng', category: 'ai', desc: 'Mô phỏng tư thế hình học trước camera AI nhận diện cơ thể', emoji: '🧍', color: 'border-amber-100 hover:border-amber-500 bg-amber-50/20 hover:bg-amber-50/40' },
    { id: 'cuoc_dua_ngon_tay', name: 'Cuộc Đua Ngón Tay', category: 'speed', desc: 'Đua xe trả lời đúng để bứt tốc vượt lên đối thủ trên đường đua', emoji: '🏎️', color: 'border-rose-100 hover:border-rose-500 bg-rose-50/20 hover:bg-rose-50/40' },
    { id: 'do_min', name: 'Dò Mìn', category: 'puzzle', desc: 'Khám phá ô mìn an toàn thông qua giải các phép tính toán học', emoji: '💣', color: 'border-emerald-100 hover:border-emerald-500 bg-emerald-50/20 hover:bg-emerald-50/40' },
    { id: 'doan_tau_tri_thuc', name: 'Đoàn Tàu Tri Thức', category: 'puzzle', desc: 'Đưa đoàn tàu vượt các ga học liệu cập bến ga cuối an toàn', emoji: '🚂', color: 'border-sky-100 hover:border-sky-500 bg-sky-50/20 hover:bg-sky-50/40' },
    { id: 'game_map', name: 'Game Map', category: 'adventure', desc: 'Bản đồ truy tìm kho báu toán học cổ xưa đầy thú vị', emoji: '🗺️', color: 'border-yellow-100 hover:border-yellow-500 bg-yellow-50/20 hover:bg-yellow-50/40' },
    { id: 'tu_ngu_biet_bay', name: 'Từ Ngữ Biết Bay', category: 'adventure', desc: 'Chạm từ chuyển động đúng chính tả và logic ngữ văn', emoji: '🛸', color: 'border-violet-100 hover:border-violet-500 bg-violet-50/20 hover:bg-violet-50/40' },
    { id: 'keo_tha_noi_y', name: 'Kéo Thả Nối Ý', category: 'adventure', desc: 'Ghép nối vế trái logic với vế phải tạo câu đúng hoàn chỉnh', emoji: '🔗', color: 'border-teal-100 hover:border-teal-500 bg-teal-50/20 hover:bg-teal-50/40' },
    { id: 'o_chu_khoa', name: 'Ô Chữ Khóa Bí Mật', category: 'puzzle', desc: 'Giải ô chữ giải mã từ khóa cốt lõi của bài học hôm nay', emoji: '🔐', color: 'border-green-100 hover:border-green-500 bg-green-50/20 hover:bg-green-50/40' },
    { id: 'san_kho_bau', name: 'Săn Kho Báu', category: 'adventure', desc: 'Tìm rương vàng cổ vật thông qua thử thách toán thực tế', emoji: '🏴‍☠️', color: 'border-slate-100 hover:border-slate-500 bg-slate-50/30 hover:bg-slate-50/50' },
    { id: 'lat_manh_ghep', name: 'Lật Mảnh Ghép', category: 'puzzle', desc: 'Lật câu hỏi khám phá bức tranh chủ đề bí mật đằng sau', emoji: '🧩', color: 'border-indigo-100 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/40' },
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
    if (gameSearchQuery && !game.name.toLowerCase().includes(gameSearchQuery.toLowerCase()) && !game.desc.toLowerCase().includes(gameSearchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const selectedGame = gamesList.find(g => g.id === newGameType) || gamesList[0];

  return (
    <div id="game-wizard-container" className="w-full h-full flex flex-col overflow-hidden bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">
      {/* Stepper Header */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-4 border-b border-slate-100 pb-4 select-none shrink-0">
        <button
          type="button"
          onClick={() => setGameSubStep(1)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${gameSubStep === 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-102' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">1</span>
          Chọn Game
        </button>
        <span className="text-slate-300 text-xs sm:inline hidden">➔</span>
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${gameSubStep === 2 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-102' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50'}`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">2</span>
          Cấu Hình Dạng
        </button>
        <span className="text-slate-300 text-xs sm:inline hidden">➔</span>
        <button
          type="button"
          disabled={!newGameType}
          onClick={() => setGameSubStep(3)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${gameSubStep === 3 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-102' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50'}`}
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">3</span>
          Nhập Đề Câu Hỏi
        </button>
      </div>

      {/* Step Contents */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0 flex flex-col">
        <AnimatePresence mode="wait">
          {gameSubStep === 1 && (
            <motion.div 
              key="game-step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="space-y-4 flex flex-col h-full"
            >
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                  <span className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 1</span>
                  <h4 className="text-lg font-black text-slate-800 mt-1 flex items-center gap-2">
                    <span>🎮</span> Chọn Trò Chơi Học Tập
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-extrabold bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl">17 Trò chơi tương tác</span>
              </div>

              {/* Search & Categories */}
              <div className="space-y-3 shrink-0">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 text-sm">🔍</span>
                  <input 
                    type="text"
                    placeholder="Tìm kiếm nhanh trò chơi..."
                    value={gameSearchQuery}
                    onChange={(e) => setGameSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold transition-all outline-none"
                  />
                  {gameSearchQuery && (
                    <button 
                      onClick={() => setGameSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin select-none">
                  {[
                    { id: 'all', name: 'Tất cả', emoji: '✨' },
                    { id: 'ai', name: 'AI & Tương Tác', emoji: '🤖' },
                    { id: 'speed', name: 'Tốc độ & Phản xạ', emoji: '⚡' },
                    { id: 'puzzle', name: 'Giải đố & Logic', emoji: '🧩' },
                    { id: 'adventure', name: 'Khám phá & Bản đồ', emoji: '🗺️' }
                  ].map(cat => {
                    const isCatSelected = selectedGameCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedGameCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 border shrink-0 ${
                          isCatSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10 scale-102' 
                            : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200/80 hover:text-slate-800'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[48vh] pr-1 pb-4 custom-scrollbar">
                {filteredGames.map(game => {
                  const isSelected = newGameType === game.id;
                  const supportedFormats = supportMap[game.id] || ['multiple_choice'];
                  const isSingleFormat = supportedFormats.length === 1;

                  return (
                    <motion.div 
                      key={game.id}
                      whileHover={{ y: -4, transition: { duration: 0.12 } }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setNewGameType(game.id);
                        if (isSingleFormat) {
                          setNewGameFormats(supportedFormats);
                          setGameSubStep(3);
                        } else {
                          setNewGameFormats([supportedFormats[0]]);
                          setGameSubStep(2);
                        }
                      }}
                      className={`group cursor-pointer p-3.5 rounded-2xl border-2 transition-all duration-300 flex items-start gap-3 ${game.color} ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' 
                          : 'border-slate-100 bg-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform shrink-0">
                        {game.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight">{game.name}</h5>
                        <p className="text-[10px] text-slate-500 font-medium mt-1 leading-normal line-clamp-2">
                          {game.desc}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 mt-2.5">
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
                      </div>
                    </motion.div>
                  );
                })}
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
              className="space-y-4 max-w-3xl mx-auto w-full flex flex-col h-full justify-center py-4"
            >
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Bước 2</span>
                  <h4 className="text-base font-black text-slate-800 mt-1 flex items-center gap-2">
                    <span>⚙️</span> Cấu Hình Dạng Câu Hỏi
                  </h4>
                </div>
                <button 
                  type="button"
                  onClick={() => setGameSubStep(1)}
                  className="text-[11px] font-extrabold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200/80 active:scale-95"
                >
                  ⬅️ Đổi Game khác
                </button>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100/50 flex items-center gap-3 shrink-0">
                <span className="text-3xl animate-pulse">{selectedGame.emoji}</span>
                <div>
                  <p className="text-[9px] text-indigo-600 font-extrabold uppercase tracking-wider">Trò chơi đã chọn:</p>
                  <p className="text-sm font-black text-slate-800">{selectedGame.name}</p>
                </div>
              </div>

              <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[35vh] pr-1 custom-scrollbar">
                <p className="text-xs text-slate-500 font-black uppercase tracking-wider">
                  Chọn các dạng câu hỏi được phép xuất hiện (Có thể chọn nhiều dạng):
                </p>
                
                <div className="space-y-2.5">
                  {[
                    { id: 'multiple_choice', name: '1. Dạng Trắc nghiệm nhiều phương án', sub: 'Học sinh chọn 1 đáp án chính xác nhất trong 3-4 phương án', emoji: '🔘' },
                    { id: 'true_false', name: '2. Dạng Đúng/sai', sub: 'Mệnh đề kiểm tra kiến thức chỉ có hai lựa chọn Đúng hoặc Sai', emoji: '⚖️' },
                    { id: 'word_reorder', name: '3. Dạng Sắp xếp từ/chữ', sub: 'Kéo thả, sắp xếp các từ xáo trộn thành câu hoàn chỉnh, đúng logic', emoji: '🔠' },
                    { id: 'short_answer', name: '4. Dạng Trả lời ngắn', sub: 'Học sinh tự điền từ khóa hoặc số kết quả trực tiếp bằng bàn phím', emoji: '📝' },
                    { id: 'matching', name: '5. Dạng Nối các thành phần', sub: 'Kết nối vế trái với vế phải tạo mối liên hệ đúng đắn', emoji: '🔗' }
                  ].filter(fmt => (supportMap[newGameType] || ['multiple_choice']).includes(fmt.id))
                   .map(fmt => {
                    const isChecked = newGameFormats.includes(fmt.id);
                    return (
                      <motion.div 
                        key={fmt.id}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          if (isChecked) {
                            if (newGameFormats.length > 1) {
                              setNewGameFormats(newGameFormats.filter(id => id !== fmt.id));
                            }
                          } else {
                            setNewGameFormats([...newGameFormats, fmt.id]);
                          }
                        }}
                        className={`p-3.5 bg-white border-2 rounded-2xl cursor-pointer flex items-center justify-between transition-all hover:shadow-sm duration-200 ${
                          isChecked 
                            ? 'border-indigo-600 bg-indigo-50/20 shadow-sm' 
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${
                            isChecked ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 border border-slate-100 text-slate-700'
                          }`}>
                            {fmt.emoji}
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{fmt.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium leading-normal block mt-0.5">{fmt.sub}</span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'
                        }`}>
                          {isChecked && '✓'}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGameSubStep(3)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider shrink-0 mt-2"
              >
                🎯 Xác nhận & Tiếp tục nhập đề
              </button>
            </motion.div>
          )}

          {gameSubStep === 3 && (
            <motion.div 
              key="game-step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="space-y-4 flex flex-col h-full w-full"
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
                    onClick={() => setGameSubStep(supportMap[newGameType]?.length > 1 ? 2 : 1)}
                    className="px-3 py-1.5 text-slate-600 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200"
                  >
                    ⬅️ Quay lại
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowGamePreview(true)} 
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs border border-emerald-500 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" /> Xem trước đề chơi
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 border border-slate-200 rounded-2xl bg-white overflow-hidden flex shadow-inner min-h-[220px]">
                <div className="w-10 bg-slate-50 border-r border-slate-200 text-right pt-4 text-[11px] font-mono text-slate-400 select-none overflow-hidden pb-4 shrink-0">
                  {Array.from({ length: Math.max(rawQuestionCode.split('\n').length, 12) }, (_, i) => i + 1).map(num => (
                    <div key={num} className="pr-2 leading-relaxed h-[21px]">{num}</div>
                  ))}
                </div>
                <textarea
                  value={rawQuestionCode}
                  onChange={(e) => setRawQuestionCode(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="flex-1 w-full p-4 text-[12px] font-mono text-slate-800 outline-none resize-none leading-relaxed whitespace-pre font-medium"
                  spellCheck={false}
                />
              </div>

              {/* Templates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shrink-0">
                <p className="text-[11px] font-bold text-slate-600">Nội dung mẫu đề bài:</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau1)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 1 (Trắc nghiệm lịch sử)</button>
                  <button type="button" onClick={() => setRawQuestionCode(SAMPLE_TEMPLATES.mau2)} className="text-[11px] text-blue-600 font-bold hover:underline px-2 py-1 bg-white border border-blue-100 rounded-lg">Mẫu 2 (Đúng / sai Toán)</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
