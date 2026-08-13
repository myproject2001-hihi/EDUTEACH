import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Loader2, FileText, Plus, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  onCapture: (dataUrl: string, pdfDataUrl?: string) => void;
  onCancel: () => void;
  mode?: 'homework' | 'pose'; // 'homework' = multi-page PDF, 'pose' = single image
}

export function CameraCapture({ onCapture, onCancel, mode = 'homework' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Multi-page photos list for homework mode
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera(); // Stop any existing stream
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode } 
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

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.85);
        setCaptured(imageData);
        if (mode === 'homework') {
          setCapturedPages(prev => [...prev, imageData]);
        }
        // For pose mode, we only need one picture
        if (mode === 'pose') {
          stopCamera();
        }
      }
    }
  };

  const retake = () => {
    setCaptured(null);
    if (mode === 'pose') {
      startCamera();
    }
  };

  const handleRemovePage = (index: number) => {
    const updated = capturedPages.filter((_, i) => i !== index);
    setCapturedPages(updated);
    if (updated.length === 0) {
      setCaptured(null);
    } else {
      setCaptured(updated[updated.length - 1]);
    }
  };

  const generatePdfDataUrl = (images: string[]): string | undefined => {
    if (images.length === 0) return undefined;
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      images.forEach((imgData, idx) => {
        if (idx > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 5, 5, 200, 287);
      });
      return pdf.output('datauristring');
    } catch (err) {
      console.error("Failed to generate PDF", err);
      return undefined;
    }
  };

  const confirm = () => {
    if (mode === 'pose' && captured) {
      setIsProcessing(true);
      onCapture(captured);
    } else if (mode === 'homework' && capturedPages.length > 0) {
      setIsProcessing(true);
      setTimeout(() => {
        const pdfData = generatePdfDataUrl(capturedPages);
        onCapture(capturedPages[capturedPages.length - 1], pdfData);
      }, 500); // UI feedback
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[10000] flex flex-col items-center justify-center backdrop-blur-md p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[95vh] sm:h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm sm:text-base text-slate-200">
              {mode === 'homework' ? 'Chụp bài chép tay & Xuất PDF' : 'Nhận diện tư thế (Camera)'}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Camera View */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="text-white text-center p-6 bg-slate-900 rounded-2xl border border-slate-700">
              <p className="font-bold mb-2">⚠️ Lỗi Camera</p>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          ) : (mode === 'pose' && captured) ? (
            <img src={captured} alt="Captured" className="max-h-full max-w-full object-contain" />
          ) : (mode === 'homework' && captured) ? (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <img src={captured} alt="Captured page" className="max-w-full max-h-full object-contain" />
              <div className="absolute top-3 left-3 bg-slate-900/90 text-slate-200 text-xs px-3 py-1.5 rounded-full border border-slate-700 font-bold backdrop-blur">
                Trang {capturedPages.length} vừa chụp
              </div>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline className={`max-h-full max-w-full object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
          )}
          <canvas ref={canvasRef} className="hidden" />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                <p className="text-white font-bold">{mode === 'homework' ? 'Đang đóng gói PDF...' : 'Đang nhận diện...'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Captured Pages Strip (Multi-page PDF feature) */}
        {mode === 'homework' && capturedPages.length > 0 && (
          <div className="p-3 bg-slate-950 border-t border-b border-slate-800 flex items-center gap-3 overflow-x-auto custom-scrollbar shrink-0">
            <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" /> Đã chụp ({capturedPages.length}):
            </span>
            <div className="flex items-center gap-2">
              {capturedPages.map((pageImg, idx) => (
                <div key={idx} className="relative w-12 h-16 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shrink-0 group">
                  <img src={pageImg} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleRemovePage(idx)}
                    className="absolute top-0.5 right-0.5 bg-rose-600 text-white p-0.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                    title="Xóa trang này"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-slate-900/80 text-[10px] text-center font-mono text-slate-300">
                    P.{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={toggleCamera}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Đổi camera"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Xoay camera</span>
          </button>

          <div className="flex items-center gap-2">
            {mode === 'pose' && captured ? (
              <>
                <button
                  onClick={retake}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Chụp lại
                </button>
                <button
                  onClick={confirm}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30"
                >
                  <Check className="w-4 h-4" /> Gửi tư thế
                </button>
              </>
            ) : mode === 'homework' && captured ? (
              <>
                <button
                  onClick={() => setCaptured(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-emerald-400" /> Chụp thêm trang
                </button>
                <button
                  onClick={confirm}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30"
                >
                  <FileText className="w-4 h-4 text-emerald-300" /> Xuất PDF ({capturedPages.length} trang)
                </button>
              </>
            ) : (
              <button
                onClick={takePhoto}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/30 active:scale-95"
              >
                <Camera className="w-4 h-4" /> Chụp ảnh
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

