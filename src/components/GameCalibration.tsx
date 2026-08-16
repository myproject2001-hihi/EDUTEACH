import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { countRaisedFingers } from './GamePreview';
import { HandTrackingOverlay } from './HandTrackingOverlay';

interface GameCalibrationProps {
  onComplete: () => void;
  videoElement: HTMLVideoElement | null;
  detectedFinger: number | 'none';
  consecutiveFrames: number;
}

export function GameCalibration({ onComplete, videoElement, detectedFinger, consecutiveFrames }: GameCalibrationProps) {
  const [step, setStep] = useState<'position' | 'test' | 'ready'>('position');
  const [handStatus, setHandStatus] = useState<'not_found' | 'too_close' | 'too_far' | 'perfect'>('not_found');

  // Simulate or check bounds of hand coordinates if available
  useEffect(() => {
    if (detectedFinger !== 'none') {
      setHandStatus('perfect');
    } else {
      setHandStatus('not_found');
    }
  }, [detectedFinger]);

  // Handle auto progression once the student successfully shows 2 fingers
  useEffect(() => {
    if (step === 'test' && detectedFinger === 2 && consecutiveFrames >= 8) {
      setStep('ready');
    }
  }, [detectedFinger, consecutiveFrames, step]);

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/95 flex flex-col items-center justify-between p-6 select-none overflow-y-auto">
      {/* Header Calibration Status */}
      <div className="w-full max-w-md text-center space-y-1">
        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" /> Hiệu Chuẩn Camera AI
        </h3>
        <p className="text-xs text-slate-400 font-medium">
          Đảm bảo camera nhận diện tay chính xác trước khi xuất phát cuộc đua!
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2 w-full max-w-xs my-1">
        <div className={`h-1.5 rounded-full flex-1 transition-all ${step === 'position' ? 'bg-indigo-500 w-12' : 'bg-slate-800'}`} />
        <div className={`h-1.5 rounded-full flex-1 transition-all ${step === 'test' ? 'bg-indigo-500 w-12' : step === 'ready' ? 'bg-emerald-500' : 'bg-slate-800'}`} />
        <div className={`h-1.5 rounded-full flex-1 transition-all ${step === 'ready' ? 'bg-emerald-500 w-12' : 'bg-slate-800'}`} />
      </div>

      {/* Guidance Cards based on Step */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        {step === 'position' && (
          <div className="space-y-2 animate-scaleIn">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Bước 1: Căn chỉnh vị trí</span>
            <h4 className="text-sm font-extrabold text-white">Đưa tay trước ống kính</h4>
            <p className="text-xs text-slate-400 leading-normal">
              Hãy ngồi thẳng, đưa tay lên cao tầm ngang ngực và cách xa camera khoảng <span className="text-white font-bold">50cm - 80cm</span>. Đảm bảo phòng có đủ ánh sáng.
            </p>
            
            <button
              onClick={() => setStep('test')}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl active:scale-95 transition-all mt-2 uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              Tiếp theo: Kiểm tra nhận diện ➔
            </button>
          </div>
        )}

        {step === 'test' && (
          <div className="space-y-2 animate-scaleIn">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Bước 2: Chạy kiểm thử AI</span>
            <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Hãy giơ 2 ngón tay</span>
              <span className="text-base animate-bounce">✌️</span>
            </h4>
            <p className="text-xs text-slate-400 leading-normal">
              Giơ <span className="text-white font-bold">2 ngón tay (Trỏ + Giữa)</span> trước ống kính để kiểm tra độ nhạy của bộ đếm ngón tay AI.
            </p>

            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Trạng thái nhận diện:</span>
              {detectedFinger === 'none' ? (
                <span className="text-rose-400 flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> Chưa phát hiện
                </span>
              ) : detectedFinger === 2 ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã khớp 2 ngón ({Math.round((consecutiveFrames / 8) * 100)}%)
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 font-bold">
                  <AlertCircle className="w-3.5 h-3.5" /> Thấy {detectedFinger} ngón
                </span>
              )}
            </div>
          </div>
        )}

        {step === 'ready' && (
          <div className="space-y-2 text-center py-2 animate-scaleIn">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-400 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6 animate-bounce" />
            </div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Hiệu chuẩn thành công</span>
            <h4 className="text-sm font-extrabold text-white">Bạn đã sẵn sàng bứt tốc!</h4>
            <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
              Camera AI đã nhận diện tay cực tốt. Nhấp nút bắt đầu bên dưới để lái xe đua về đích an toàn!
            </p>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setStep('test')}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl active:scale-95 transition-all text-xs flex items-center justify-center"
                title="Hiệu chuẩn lại"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onComplete}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 uppercase tracking-widest active:scale-95 transition-all"
              >
                Bắt đầu Đua Xe 🏎️
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview area context note */}
      <div className="text-[10px] text-slate-500 text-center max-w-xs mt-2 leading-relaxed">
        ℹ Bạn có thể di chuyển tay ra xa hoặc lại gần hơn một chút để AI điều chỉnh khoảng cách lấy nét hoàn hảo.
      </div>
    </div>
  );
}
