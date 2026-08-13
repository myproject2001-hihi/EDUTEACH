import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Loader2 } from 'lucide-react';

interface Props {
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Không thể truy cập camera. Vui lòng kiểm tra quyền trên thiết bị.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCaptured(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const retake = () => {
    setCaptured(null);
    startCamera();
  };

  const confirm = () => {
    if (captured) {
      setIsProcessing(true);
      // Giả lập thời gian chuyển đổi ảnh thành PDF
      setTimeout(() => {
        onCapture(captured);
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[10000] flex flex-col">
      <div className="flex justify-between items-center p-4 text-white shrink-0">
        <h3 className="font-bold text-lg">Chụp ảnh bài học</h3>
        <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-white text-center p-6 bg-slate-900 rounded-2xl border border-slate-700">
            <p className="font-bold mb-2">⚠️ Lỗi Camera</p>
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        ) : captured ? (
          <img src={captured} alt="Captured" className="max-h-full max-w-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline className="max-h-full max-w-full object-contain" />
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-white font-bold text-lg">Đang chuyển đổi sang PDF...</p>
              <p className="text-slate-400 text-sm mt-2">Vui lòng không đóng ứng dụng</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 pb-safe flex justify-center items-center gap-6 shrink-0 bg-black h-32">
        {!isProcessing && (
          captured ? (
            <>
              <button onClick={retake} className="flex flex-col items-center gap-1.5 px-6 py-3 text-white rounded-full font-bold active:scale-95 transition-transform">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <span className="text-xs">Chụp lại</span>
              </button>
              <button onClick={confirm} className="flex flex-col items-center gap-1.5 px-6 py-3 text-emerald-400 rounded-full font-bold active:scale-95 transition-transform">
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
                <span className="text-xs">Gửi & Hoàn thành</span>
              </button>
            </>
          ) : (
            <button onClick={takePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-400 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <div className="w-16 h-16 rounded-full border-2 border-black" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
