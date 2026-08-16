import React from 'react';
import { Check } from 'lucide-react';

interface HandTrackingOverlayProps {
  fingerCount: number | 'none';
  consecutiveFrames: number;
  maxRequiredFrames?: number;
  answerStatus: 'none' | 'correct' | 'wrong';
}

export function HandTrackingOverlay({
  fingerCount,
  consecutiveFrames,
  maxRequiredFrames = 10,
  answerStatus
}: HandTrackingOverlayProps) {
  if (answerStatus !== 'none') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs transition-all duration-300">
        <div className={`p-4 rounded-2xl border-2 shadow-2xl flex flex-col items-center gap-2 transform scale-110 duration-200 ${
          answerStatus === 'correct' 
            ? 'bg-emerald-500/90 border-emerald-400 text-white' 
            : 'bg-rose-500/90 border-rose-400 text-white'
        }`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-bounce">
            {answerStatus === 'correct' ? '🎉' : '❌'}
          </div>
          <span className="font-black tracking-wider uppercase text-sm">
            {answerStatus === 'correct' ? 'CHÍNH XÁC!' : 'SAI RỒI!'}
          </span>
        </div>
      </div>
    );
  }

  const isDetecting = fingerCount !== 'none' && fingerCount > 0;
  const progressPercent = isDetecting 
    ? Math.min((consecutiveFrames / maxRequiredFrames) * 100, 100)
    : 0;

  // Lựa chọn tương ứng: 1 -> A, 2 -> B, 3 -> C, 4 -> D
  const optionLabels = ['A', 'B', 'C', 'D'];
  const fingerEmojis = ['☝️', '✌️', '🤟', '✋'];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 select-none pointer-events-none">
      {/* Top indicator bar */}
      <div className="flex items-center justify-between w-full">
        <div className="bg-slate-950/70 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-lg">
          <div className={`w-2 h-2 rounded-full ${isDetecting ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
          <span className="text-[10px] text-white/90 font-extrabold uppercase tracking-wider">
            {isDetecting ? 'Đang Nhận Diện' : 'Đang tìm bàn tay'}
          </span>
        </div>

        {isDetecting && (
          <div className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full shadow-md animate-pulse uppercase tracking-wider">
            Đáp án: {optionLabels[(fingerCount as number) - 1]}
          </div>
        )}
      </div>

      {/* Center Dynamic HUD representation */}
      <div className="flex items-center justify-center flex-1">
        {isDetecting ? (
          <div className="flex flex-col items-center gap-1 animate-scaleIn bg-slate-950/80 border border-indigo-500/30 p-3 rounded-2xl backdrop-blur-md shadow-2xl">
            <span className="text-3xl filter drop-shadow-md animate-bounce">
              {fingerEmojis[(fingerCount as number) - 1]}
            </span>
            <span className="text-xs font-black text-indigo-300">
              {fingerCount} Ngón Tay
            </span>
            <span className="text-[9px] text-slate-400 font-medium">
              Giữ nguyên để chọn {optionLabels[(fingerCount as number) - 1]}
            </span>
          </div>
        ) : (
          <div className="text-center px-4 py-2 rounded-xl bg-slate-950/40 backdrop-blur-xs border border-white/5">
            <p className="text-[10px] font-bold text-slate-300">
              Giơ 1 - 4 ngón tay
            </p>
            <p className="text-[8px] text-slate-400">
              trước camera để chọn đáp án
            </p>
          </div>
        )}
      </div>

      {/* Bottom Progress Meter */}
      <div className="w-full space-y-1 bg-slate-950/80 border border-white/10 p-2 rounded-xl backdrop-blur-xs shadow-lg">
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-300 px-1">
          <span>Tiến trình chọn đáp án</span>
          <span className="text-emerald-400">
            {Math.round(progressPercent)}%
          </span>
        </div>
        
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
