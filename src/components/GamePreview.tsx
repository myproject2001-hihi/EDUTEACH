import React from 'react';
import { Gamepad2, X, Play, Camera } from 'lucide-react';

interface Props {
  gameType: string;
  questions: any[];
  onClose: () => void;
}

export function GamePreview({ gameType, questions, onClose }: Props) {
  const renderGameContent = () => {
    switch (gameType) {
      case 'quiz_nghieng_dau':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-64 h-64 bg-slate-800 rounded-3xl overflow-hidden relative border-4 border-indigo-500 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <Camera className="w-16 h-16 text-white/50 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-sm px-4">
                [Khung Camera nhận diện cử động đầu]
              </div>
            </div>
            <div className="w-full max-w-2xl text-center mb-4">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{questions[0]?.question || 'Câu hỏi mẫu: Đâu là thủ đô của Việt Nam?'}</h3>
              <p className="text-slate-500 text-sm">Nghiêng đầu sang trái hoặc phải để chọn đáp án</p>
            </div>
            <div className="flex w-full max-w-2xl gap-4">
              <div className="flex-1 bg-blue-500 rounded-2xl p-6 text-white text-center font-bold text-xl shadow-[0_8px_0_#1e3a8a] transform transition-transform active:translate-y-2 active:shadow-none border-4 border-blue-400 flex flex-col justify-center min-h-[120px]">
                <span className="text-3xl mb-2">⬅️</span>
                {questions[0]?.options?.[0] || 'Đáp án A'}
              </div>
              <div className="flex-1 bg-rose-500 rounded-2xl p-6 text-white text-center font-bold text-xl shadow-[0_8px_0_#be123c] transform transition-transform active:translate-y-2 active:shadow-none border-4 border-rose-400 flex flex-col justify-center min-h-[120px]">
                <span className="text-3xl mb-2">➡️</span>
                {questions[0]?.options?.[1] || 'Đáp án B'}
              </div>
            </div>
          </div>
        );
      case 'game_map':
      case 'san_kho_bau':
        return (
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center rounded-2xl border-4 border-[#8B4513] shadow-2xl relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <div className="z-10 bg-[#f4e4bc] border-4 border-[#8B4513] p-8 rounded-xl max-w-2xl w-full text-center shadow-2xl transform rotate-1">
              <h2 className="text-3xl font-black text-[#5c2e0e] mb-2 font-serif uppercase tracking-wider">{gameType === 'game_map' ? 'Khám Phá Bản Đồ' : 'Săn Kho Báu'}</h2>
              <div className="w-32 h-1 bg-[#8B4513] mx-auto mb-6 rounded-full opacity-50" />
              
              <div className="bg-white/80 p-6 rounded-xl border-2 border-[#8B4513] mb-8">
                <p className="text-[#5c2e0e] font-bold text-xl">{questions[0]?.question || 'Nội dung câu hỏi số 1 sẽ hiển thị tại đây trên nền bản đồ cổ...'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                  <button key={i} className="w-full py-4 px-6 bg-white border-2 border-[#8B4513] rounded-xl text-[#5c2e0e] font-bold text-lg hover:bg-[#8B4513] hover:text-white transition-colors flex items-center justify-center gap-3 group shadow-[4px_4px_0_#8B4513]">
                    <span className="w-8 h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-sm group-hover:bg-white group-hover:text-[#8B4513] transition-colors">
                      {String.fromCharCode(65+i)}
                    </span>
                    {opt}
                  </button>
                )) || (
                  <div className="col-span-2 text-slate-500 font-medium py-8 bg-black/10 rounded-xl border-2 border-dashed border-[#8B4513]/50">
                    Chưa có đáp án mẫu
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-40 h-40 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-8 animate-bounce shadow-xl shadow-indigo-200 border-8 border-white">
              <Gamepad2 className="w-20 h-20" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight text-center mb-4 uppercase">Giao Diện Game</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-lg w-full text-center">
              <p className="text-slate-600 font-medium text-lg mb-2">
                Sẵn sàng trải nghiệm <strong>{questions.length}</strong> câu hỏi
              </p>
              <p className="text-slate-500 text-sm">
                Game Engine sẽ tự động khởi tạo đồ hoạ và luật chơi tương ứng với chế độ bạn đã chọn khi học sinh bắt đầu làm bài.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
      <div className="bg-slate-100 w-full max-w-6xl h-full max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative border border-slate-700">
        <div className="h-14 bg-slate-900 flex items-center justify-between px-6 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <span className="text-slate-300 font-bold text-sm ml-4 uppercase tracking-widest flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" /> Chế độ Xem trước (Preview)
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white rounded-full transition-colors group">
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
        <div className="flex-1 p-4 sm:p-8 relative">
          {renderGameContent()}
        </div>
      </div>
    </div>
  );
}
