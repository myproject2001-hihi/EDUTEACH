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
      case 'cuoc_dua_ngon_tay':
        return (
          <div className="flex flex-col h-full bg-gradient-to-b from-sky-400 to-sky-200 rounded-3xl p-8 relative overflow-hidden border-4 border-sky-500 shadow-inner">
            <div className="absolute top-10 left-0 right-0 flex justify-between px-12">
              <div className="bg-white/80 backdrop-blur px-6 py-3 rounded-full font-black text-2xl text-rose-600 shadow-lg border-2 border-rose-200">Đội Đỏ: 450</div>
              <div className="bg-white/80 backdrop-blur px-6 py-3 rounded-full font-black text-2xl text-blue-600 shadow-lg border-2 border-blue-200">Đội Xanh: 320</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center z-10 mt-20">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-2xl w-full text-center border-4 border-slate-800">
                <h3 className="text-3xl font-black text-slate-800 mb-8">{questions[0]?.question || 'Câu hỏi mẫu sẽ hiển thị ở đây?'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                    <button key={i} className={`p-6 rounded-2xl text-white font-bold text-xl shadow-[0_6px_0_rgba(0,0,0,0.2)] active:translate-y-2 active:shadow-none transition-all ${
                      i===0 ? 'bg-rose-500 border-2 border-rose-700' : i===1 ? 'bg-blue-500 border-2 border-blue-700' : i===2 ? 'bg-amber-500 border-2 border-amber-700' : 'bg-emerald-500 border-2 border-emerald-700'
                    }`}>
                      {opt}
                    </button>
                  )) || <div className="col-span-2 p-8 bg-slate-100 rounded-xl font-bold text-slate-500">Chưa có đáp án</div>}
                </div>
              </div>
            </div>
            {/* Track decorations */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-slate-800 border-t-8 border-slate-600 flex flex-col justify-center gap-4 px-8">
              <div className="h-4 border-t-4 border-dashed border-white/50 w-full" />
              <div className="h-4 border-t-4 border-dashed border-white/50 w-full" />
            </div>
            <div className="absolute bottom-20 left-20 w-16 h-16 bg-rose-500 rounded-full border-4 border-white shadow-lg animate-bounce" />
            <div className="absolute bottom-6 left-40 w-16 h-16 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        );
      case 'do_min':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-slate-200 p-8 rounded-3xl border-4 border-slate-400 shadow-[inset_0_4px_20px_rgba(0,0,0,0.1)]">
            <div className="bg-slate-300 p-6 rounded-xl border-t-4 border-l-4 border-white border-b-4 border-r-4 border-slate-500 shadow-2xl">
              <div className="bg-slate-800 text-red-500 font-mono text-4xl p-4 rounded mb-6 flex justify-between items-center border-[6px] border-slate-600 shadow-inner">
                <span>042</span>
                <span className="text-yellow-400">😊</span>
                <span>12:05</span>
              </div>
              <div className="grid grid-cols-5 gap-1 bg-slate-400 p-2 rounded">
                {Array.from({length: 20}).map((_, i) => (
                  <div key={i} className={`w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center font-bold text-xl ${
                    i === 7 ? 'bg-slate-200 border border-slate-400 text-blue-600 shadow-inner' :
                    i === 12 ? 'bg-slate-200 border border-slate-400 text-emerald-600 shadow-inner' :
                    i === 14 ? 'bg-red-500 border border-slate-400 text-white shadow-inner' :
                    'bg-slate-300 border-t-4 border-l-4 border-white border-b-4 border-r-4 border-slate-500 hover:bg-slate-200 cursor-pointer'
                  }`}>
                    {i === 7 ? '1' : i === 12 ? '2' : i === 14 ? '💣' : ''}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-lg border-2 border-slate-300 max-w-xl text-center">
              <h3 className="font-bold text-slate-800 mb-2">Trả lời đúng để mở ô an toàn!</h3>
              <p className="text-slate-500 text-sm">{questions[0]?.question || 'Câu hỏi mẫu sẽ hiển thị khi người chơi click vào một ô...'}</p>
            </div>
          </div>
        );
      case 'doan_tau_tri_thuc':
        return (
          <div className="flex flex-col h-full bg-gradient-to-b from-blue-300 to-green-400 rounded-3xl p-8 relative overflow-hidden border-4 border-blue-500 shadow-inner">
            {/* Sun & Clouds */}
            <div className="absolute top-8 right-12 w-20 h-20 bg-yellow-300 rounded-full shadow-[0_0_40px_rgba(253,224,71,0.8)]" />
            <div className="absolute top-16 left-20 w-32 h-10 bg-white/80 rounded-full blur-sm" />
            
            <div className="flex-1 flex flex-col items-center justify-center z-10 -mt-10">
              <div className="bg-white/95 p-8 rounded-3xl shadow-2xl max-w-2xl w-full text-center border-4 border-indigo-200 backdrop-blur">
                <h3 className="text-2xl font-black text-indigo-900 mb-6 flex items-center justify-center gap-2">
                  <span>🚂</span> Trạm số 1: {questions[0]?.question || 'Câu hỏi mẫu?'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                    <button key={i} className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl text-indigo-700 font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95">
                      {opt}
                    </button>
                  )) || <div className="col-span-2 p-4 text-slate-500">Chưa có đáp án</div>}
                </div>
              </div>
            </div>

            {/* Train Tracks */}
            <div className="absolute bottom-0 left-0 right-0 h-40 flex items-end">
              <div className="w-full h-8 bg-slate-700 relative">
                {Array.from({length: 20}).map((_, i) => (
                  <div key={i} className="absolute w-2 h-12 bg-amber-700 top-1/2 -translate-y-1/2" style={{ left: `${i * 5}%` }} />
                ))}
              </div>
            </div>
            {/* Train */}
            <div className="absolute bottom-8 left-1/4 flex items-end gap-1 drop-shadow-xl z-10">
              <div className="w-32 h-24 bg-rose-600 rounded-t-xl rounded-r-3xl relative border-4 border-slate-900 flex items-center justify-center">
                <div className="absolute top-2 right-4 w-8 h-12 bg-slate-800 rounded-t-md" />
                <div className="absolute -top-6 right-6 w-4 h-4 bg-gray-400 rounded-full animate-ping" />
                <span className="text-white font-black text-2xl">🚂</span>
              </div>
              <div className="w-24 h-20 bg-blue-500 rounded-t-lg border-4 border-slate-900 flex items-center justify-center">
                <span className="text-white font-bold">Toa 1</span>
              </div>
              <div className="w-24 h-20 bg-amber-500 rounded-t-lg border-4 border-slate-900 flex items-center justify-center">
                <span className="text-white font-bold">Toa 2</span>
              </div>
            </div>
          </div>
        );
      case 'tu_ngu_biet_bay':
        return (
          <div className="flex flex-col h-full bg-slate-900 rounded-3xl p-8 relative overflow-hidden border-4 border-indigo-500 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50" />
            
            <div className="absolute top-8 left-0 right-0 text-center z-20">
              <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                {questions[0]?.question || 'Đâu là từ đúng chính tả?'}
              </h3>
            </div>

            {/* Flying Words */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                <div key={i} 
                  className={`absolute px-6 py-3 rounded-full font-bold text-xl text-white backdrop-blur-sm border-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer hover:scale-110 transition-transform ${
                    i===0 ? 'top-1/4 left-1/4 bg-rose-500/80 border-rose-300' :
                    i===1 ? 'top-1/3 right-1/4 bg-blue-500/80 border-blue-300' :
                    i===2 ? 'bottom-1/3 left-1/3 bg-emerald-500/80 border-emerald-300' :
                    'bottom-1/4 right-1/3 bg-amber-500/80 border-amber-300'
                  }`}
                  style={{ animation: `float ${3 + i}s ease-in-out infinite alternate` }}
                >
                  {opt}
                </div>
              )) || (
                <div className="text-slate-500 font-bold text-xl bg-slate-800 p-6 rounded-xl border border-slate-700">
                  Chưa có đáp án bay
                </div>
              )}
            </div>
            
            <div className="absolute bottom-8 left-0 right-0 text-center z-20">
              <div className="inline-block px-6 py-2 bg-slate-800/80 border border-slate-700 rounded-full text-slate-400 text-sm font-medium backdrop-blur">
                Chạm vào từ bay qua màn hình để chọn đáp án
              </div>
            </div>
            <style>{`
              @keyframes float {
                0% { transform: translateY(0px) rotate(0deg); }
                100% { transform: translateY(-20px) rotate(5deg); }
              }
            `}</style>
          </div>
        );
      case 'keo_tha_noi_y':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-orange-50 rounded-3xl p-8 border-4 border-orange-200 overflow-y-auto">
            <h3 className="text-2xl font-black text-orange-900 mb-8">{questions[0]?.question || 'Nối hai vế để tạo thành câu hoàn chỉnh:'}</h3>
            <div className="flex w-full max-w-3xl gap-12 sm:gap-24 relative">
              <svg className="absolute inset-0 w-full h-full z-0 opacity-20 pointer-events-none hidden sm:block">
                <path d="M 150 50 C 250 50, 250 150, 350 150" stroke="#f97316" strokeWidth="4" fill="none" />
                <path d="M 150 150 C 250 150, 250 50, 350 50" stroke="#f97316" strokeWidth="4" fill="none" />
              </svg>
              
              {/* Left Column */}
              <div className="flex-1 flex flex-col gap-6 z-10">
                {['Mèo', 'Chó'].map((word, i) => (
                  <div key={i} className="bg-white border-4 border-orange-400 p-4 rounded-xl shadow-lg text-center font-bold text-lg text-slate-800 cursor-pointer hover:bg-orange-100 flex items-center justify-between">
                    {word}
                    <div className="w-4 h-4 rounded-full bg-orange-500" />
                  </div>
                ))}
              </div>
              {/* Right Column */}
              <div className="flex-1 flex flex-col gap-6 z-10">
                {['Gâu gâu', 'Meo meo'].map((word, i) => (
                  <div key={i} className="bg-white border-4 border-blue-400 p-4 rounded-xl shadow-lg text-center font-bold text-lg text-slate-800 cursor-pointer hover:bg-blue-100 flex items-center justify-between flex-row-reverse">
                    {word}
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-12 text-orange-600/60 font-bold text-sm">Kéo thả để nối các ô màu tương ứng</p>
          </div>
        );
      case 'o_chu_khoa':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-emerald-50 rounded-3xl p-8 border-4 border-emerald-200">
            <h3 className="text-2xl font-black text-emerald-900 mb-8 uppercase tracking-widest">Ô Chữ Bí Mật</h3>
            <div className="bg-white p-8 rounded-xl shadow-2xl border border-emerald-100 flex gap-1">
              <div className="flex flex-col gap-1 items-end pr-4">
                <div className="h-12 flex items-center font-bold text-slate-500">1.</div>
                <div className="h-12 flex items-center font-bold text-slate-500">2.</div>
                <div className="h-12 flex items-center font-bold text-slate-500">3.</div>
              </div>
              <div className="flex flex-col gap-1 relative">
                {/* Highlight vertical word */}
                <div className="absolute top-0 bottom-0 left-[3.25rem] w-12 bg-yellow-200/50 rounded-lg z-0 border-2 border-yellow-400/50" />
                
                {/* Row 1 */}
                <div className="flex gap-1 z-10">
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-white flex items-center justify-center font-black text-2xl uppercase">H</div>
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-white flex items-center justify-center font-black text-2xl uppercase">Ọ</div>
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-emerald-100 flex items-center justify-center font-black text-2xl uppercase text-emerald-700">C</div>
                </div>
                {/* Row 2 */}
                <div className="flex gap-1 z-10 ml-[3.25rem]">
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-emerald-100 flex items-center justify-center font-black text-2xl uppercase text-emerald-700">T</div>
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-white flex items-center justify-center font-black text-2xl uppercase">Ậ</div>
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-white flex items-center justify-center font-black text-2xl uppercase">P</div>
                </div>
                {/* Row 3 */}
                <div className="flex gap-1 z-10 ml-[-3.25rem]">
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-white flex items-center justify-center font-black text-2xl uppercase">T</div>
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-white flex items-center justify-center font-black text-2xl uppercase">H</div>
                  <div className="w-12 h-12 border-2 border-emerald-800 bg-emerald-100 flex items-center justify-center font-black text-2xl uppercase text-emerald-700">I</div>
                </div>
              </div>
            </div>
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 max-w-xl text-center w-full">
              <p className="font-bold text-emerald-800 mb-2">Câu hỏi hàng ngang số 1:</p>
              <p className="text-slate-600">{questions[0]?.question || 'Hoạt động tiếp thu kiến thức ở trường?'}</p>
            </div>
          </div>
        );
      case 'lat_manh_ghep':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-purple-50 rounded-3xl p-8 border-4 border-purple-200 overflow-y-auto">
            <h3 className="text-2xl font-black text-purple-900 mb-6 uppercase">Khám phá bức tranh ẩn</h3>
            
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start w-full max-w-5xl">
              {/* Picture Puzzle */}
              <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] relative rounded-2xl overflow-hidden border-8 border-white shadow-2xl bg-[url('https://images.unsplash.com/photo-1546956222-dc66a867af22?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center shrink-0">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  <div className="border border-white/20 bg-purple-600 flex items-center justify-center text-white font-black text-4xl shadow-inner transition-opacity opacity-100 hover:opacity-0 cursor-pointer duration-500">1</div>
                  <div className="border border-white/20 bg-purple-600 flex items-center justify-center text-white font-black text-4xl shadow-inner transition-opacity opacity-100">2</div>
                  <div className="border border-white/20 bg-transparent flex items-center justify-center text-white font-black text-4xl shadow-inner transition-opacity opacity-0">3</div>
                  <div className="border border-white/20 bg-purple-600 flex items-center justify-center text-white font-black text-4xl shadow-inner transition-opacity opacity-100">4</div>
                </div>
              </div>

              {/* Question Side */}
              <div className="flex-1 bg-white p-8 rounded-3xl shadow-lg border-2 border-purple-100 w-full">
                <div className="inline-block px-4 py-1.5 bg-purple-100 text-purple-700 font-bold rounded-full text-sm mb-4">
                  Mảnh ghép số 1
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-6">{questions[0]?.question || 'Trả lời đúng câu hỏi này để mở mảnh ghép số 1?'}</h4>
                <div className="grid grid-cols-1 gap-3">
                  {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                    <button key={i} className="w-full p-4 text-left border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 font-medium text-slate-700 transition-colors">
                      {opt}
                    </button>
                  )) || <div className="text-slate-500">Chưa có đáp án</div>}
                </div>
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
