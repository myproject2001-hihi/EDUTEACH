import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  X, 
  RefreshCw, 
  Check, 
  Loader2, 
  FileText, 
  Plus, 
  Trash2, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Send,
  AlertCircle,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  onCapture: (dataUrl: string, pdfDataUrl?: string, pageCount?: number) => void;
  onCancel: () => void;
  onSubmitDirectly?: (dataUrl: string, pdfDataUrl?: string, pageCount?: number) => void;
  mode?: 'homework' | 'pose' | 'avatar'; // 'homework' = multi-page PDF document scanner, 'pose' = single image, 'avatar' = profile picture
  assignmentTitle?: string;
}

export function CameraCapture({ onCapture, onCancel, onSubmitDirectly, mode = 'homework', assignmentTitle }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(mode === 'avatar' ? 'user' : 'environment');
  const [shutterFlash, setShutterFlash] = useState(false);

  // Multi-page state
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [viewState, setViewState] = useState<'camera' | 'preview'>('camera');
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);

  // Single pose capture
  const [singleCaptured, setSingleCaptured] = useState<string | null>(null);

  // Stop camera stream safely and release hardware resources
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
          track.enabled = false;
        } catch (e) {
          console.error('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }
    setStream(null);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (e) {
          console.log('Video play policy notice:', e);
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Không thể truy cập camera. Vui lòng kiểm tra và cấp quyền máy ảnh trong cài đặt trình duyệt của bạn.');
    }
  }, [facingMode, stopCamera]);

  // Manage camera lifecycle based on facingMode & viewState
  useEffect(() => {
    if (viewState === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [viewState, facingMode, startCamera, stopCamera]);

  // Unconditionally stop camera on unmount or page exit
  useEffect(() => {
    const handleBeforeUnload = () => stopCamera();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopCamera();
    };
  }, [stopCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleClose = () => {
    stopCamera();
    onCancel();
  };

  // Capture photo from video feed
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    const imageData = canvas.toDataURL('image/jpeg', 0.92);

    // Visual shutter flash effect
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 150);

    if (mode === 'pose' || mode === 'avatar') {
      setSingleCaptured(imageData);
      stopCamera();
      return;
    }

    // Homework mode
    if (replaceIndex !== null && replaceIndex >= 0 && replaceIndex < capturedPages.length) {
      // Replace specific page
      setCapturedPages(prev => {
        const next = [...prev];
        next[replaceIndex] = imageData;
        return next;
      });
      setActivePageIndex(replaceIndex);
      setReplaceIndex(null);
      setViewState('preview');
    } else {
      // Add new page
      setCapturedPages(prev => {
        const next = [...prev, imageData];
        setActivePageIndex(next.length - 1);
        return next;
      });
    }
  };

  // Rotate a page 90 degrees clockwise
  const handleRotatePage = (index: number) => {
    const pageSrc = capturedPages[index];
    if (!pageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = img.height;
      rotCanvas.height = img.width;
      const ctx = rotCanvas.getContext('2d');
      if (ctx) {
        ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotatedData = rotCanvas.toDataURL('image/jpeg', 0.92);
        setCapturedPages(prev => {
          const next = [...prev];
          next[index] = rotatedData;
          return next;
        });
      }
    };
    img.src = pageSrc;
  };

  // Remove a page
  const handleRemovePage = (index: number) => {
    const nextPages = capturedPages.filter((_, i) => i !== index);
    setCapturedPages(nextPages);
    if (nextPages.length === 0) {
      setActivePageIndex(0);
      setViewState('camera');
      setReplaceIndex(null);
    } else if (activePageIndex >= nextPages.length) {
      setActivePageIndex(nextPages.length - 1);
    }
  };

  // Retake a specific page
  const handleStartRetake = (index: number) => {
    setReplaceIndex(index);
    setViewState('camera');
  };

  // Add more pages
  const handleAddMorePages = () => {
    setReplaceIndex(null);
    setViewState('camera');
  };

  // Generate multi-page PDF document
  const generatePdfDataUrl = (images: string[]): string | undefined => {
    if (images.length === 0) return undefined;
    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      images.forEach((imgData, idx) => {
        if (idx > 0) {
          pdf.addPage('a4', 'p');
        }
        // Top header label
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 140);
        pdf.text(
          `Trang ${idx + 1}/${images.length} - ${assignmentTitle ? `Bài: ${assignmentTitle}` : 'Bài làm học sinh'}`,
          margin,
          margin - 2
        );

        pdf.addImage(imgData, 'JPEG', margin, margin, maxWidth, maxHeight, undefined, 'FAST');
      });

      return pdf.output('datauristring');
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      return undefined;
    }
  };

  // Finish and return captured data
  const handleFinalConfirm = (sendDirectly = false) => {
    stopCamera();
    setIsProcessing(true);

    setTimeout(() => {
      if ((mode === 'pose' || mode === 'avatar') && singleCaptured) {
        onCapture(singleCaptured);
      } else if (mode === 'homework' && capturedPages.length > 0) {
        const pdfData = generatePdfDataUrl(capturedPages);
        const primaryThumbnail = capturedPages[0];

        if (sendDirectly && onSubmitDirectly) {
          onSubmitDirectly(primaryThumbnail, pdfData, capturedPages.length);
        } else {
          onCapture(primaryThumbnail, pdfData, capturedPages.length);
        }
      }
      setIsProcessing(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 z-[10000] flex flex-col items-center justify-center backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col h-[95vh] sm:h-[90vh]">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
                {mode === 'avatar' ? 'Chụp ảnh đại diện mới' : mode === 'homework' ? 'Máy chụp bài tập & Đóng gói PDF' : 'Nhận diện tư thế (Camera)'}
                {mode === 'homework' && capturedPages.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    {capturedPages.length} trang
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 line-clamp-1">
                {mode === 'homework'
                  ? viewState === 'camera'
                    ? replaceIndex !== null
                      ? `Đang chụp lại Trang ${replaceIndex + 1}... Căn chỉnh trang vở và bấm Chụp.`
                      : 'Căn chỉnh trang vở ngay ngắn trong khung hình rồi bấm Chụp ảnh.'
                    : 'Xem lại các trang đã chụp, xoay hoặc chụp lại nếu mờ trước khi gửi cho giáo viên.'
                  : mode === 'avatar'
                  ? 'Căn chỉnh khuôn mặt vào giữa khung hình rồi bấm nút Chụp ảnh.'
                  : 'Giữ tư thế chuẩn trong khung hình.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'homework' && capturedPages.length > 0 && (
              <div className="hidden sm:flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setReplaceIndex(null);
                    setViewState('camera');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    viewState === 'camera'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Chụp thêm
                </button>
                <button
                  type="button"
                  onClick={() => setViewState('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    viewState === 'preview'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Xem trước PDF ({capturedPages.length})
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
              title="Đóng camera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {/* Shutter flash animation */}
          {shutterFlash && (
            <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-150 pointer-events-none" />
          )}

          {/* Processing loader */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="text-center p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
                <p className="text-white font-bold text-sm">Đang đóng gói file PDF & chuẩn bị nộp bài...</p>
                <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
              </div>
            </div>
          )}

          {/* VIEW: CAMERA LIVE FEED */}
          {viewState === 'camera' && (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              {error ? (
                <div className="text-white text-center p-6 max-w-md bg-slate-900 rounded-2xl border border-rose-500/30">
                  <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                  <p className="font-bold mb-1 text-rose-200">Không thể mở Camera</p>
                  <p className="text-xs text-slate-400 mb-4">{error}</p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`max-h-full max-w-full object-contain ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />

                  {/* Document Framing Guidelines */}
                  <div className="absolute inset-4 sm:inset-10 border-2 border-dashed border-indigo-400/40 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                    <div className="flex justify-between items-start">
                      <span className="bg-slate-950/80 text-indigo-300 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-indigo-500/30 backdrop-blur">
                        {replaceIndex !== null ? `📸 Đang chụp lại Trang ${replaceIndex + 1}` : `📸 Đang chụp Trang ${capturedPages.length + 1}`}
                      </span>
                      <span className="text-[10px] text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur">
                        Khung căn chỉnh trang vở
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[11px] text-slate-300 bg-slate-950/70 px-3 py-1 rounded-full border border-slate-700 backdrop-blur">
                        Đặt trang vở vuông vức và đủ ánh sáng
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW: MULTI-PAGE PREVIEW & REVIEW MODE */}
          {viewState === 'preview' && mode === 'homework' && capturedPages.length > 0 && (
            <div className="relative w-full h-full flex flex-col md:flex-row items-center justify-between bg-slate-950 p-4 gap-4 overflow-hidden">
              {/* Main Image Inspector */}
              <div className="flex-1 w-full h-full relative flex items-center justify-center bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
                <img
                  src={capturedPages[activePageIndex]}
                  alt={`Trang ${activePageIndex + 1}`}
                  className="max-h-full max-w-full object-contain p-2 shadow-2xl rounded-lg"
                />

                {/* Page Indicator Tag */}
                <div className="absolute top-3 left-3 bg-slate-950/90 text-white text-xs px-3 py-1.5 rounded-xl border border-slate-700 font-bold backdrop-blur flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Trang {activePageIndex + 1} / {capturedPages.length}
                </div>

                {/* Navigation Arrows */}
                {capturedPages.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={activePageIndex === 0}
                      onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-indigo-600 disabled:opacity-30 text-white rounded-full border border-slate-700 transition-colors shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={activePageIndex === capturedPages.length - 1}
                      onClick={() => setActivePageIndex(prev => Math.min(capturedPages.length - 1, prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-indigo-600 disabled:opacity-30 text-white rounded-full border border-slate-700 transition-colors shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Per-Page Actions Toolbar */}
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 px-4 pointer-events-none">
                  <div className="bg-slate-900/90 border border-slate-700 p-1.5 rounded-2xl backdrop-blur flex items-center gap-2 shadow-xl pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => handleRotatePage(activePageIndex)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                      title="Xoay ảnh 90 độ"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-indigo-400" /> Xoay 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartRetake(activePageIndex)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                      title="Chụp lại trang này nếu bị mờ"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Chụp lại trang này
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemovePage(activePageIndex)}
                      className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      title="Xóa trang này"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SINGLE POSE REVIEW OR AVATAR REVIEW */}
          {(mode === 'pose' || mode === 'avatar') && singleCaptured && (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <img src={singleCaptured} alt="Captured" className="max-h-full max-w-full object-contain" />
              <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700 font-bold backdrop-blur">
                {mode === 'avatar' ? 'Ảnh đại diện mới đã chụp' : 'Ảnh tư thế đã chụp'}
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* THUMBNAIL STRIP (MULTI-PAGE TRAY) */}
        {mode === 'homework' && capturedPages.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-3 overflow-x-auto custom-scrollbar shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1 mr-1">
                <FileText className="w-3.5 h-3.5 text-indigo-400" /> Các trang ({capturedPages.length}):
              </span>

              {capturedPages.map((pageImg, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActivePageIndex(idx);
                    setViewState('preview');
                  }}
                  className={`relative w-11 h-14 sm:w-12 sm:h-16 rounded-lg overflow-hidden border cursor-pointer shrink-0 transition-all ${
                    viewState === 'preview' && activePageIndex === idx
                      ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-105 shadow-md shadow-indigo-500/30'
                      : 'border-slate-700 hover:border-slate-500 opacity-85 hover:opacity-100'
                  }`}
                >
                  <img src={pageImg} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] text-center font-mono text-slate-200">
                    P.{idx + 1}
                  </span>
                </div>
              ))}

              {/* Add page inline button */}
              <button
                type="button"
                onClick={handleAddMorePages}
                className="w-11 h-14 sm:w-12 sm:h-16 rounded-lg border-2 border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-300 flex flex-col items-center justify-center gap-0.5 shrink-0 transition-colors"
                title="Chụp thêm trang"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] font-bold">Thêm</span>
              </button>
            </div>

            {/* Quick Action to switch to Preview on mobile */}
            {viewState === 'camera' && (
              <button
                type="button"
                onClick={() => setViewState('preview')}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" /> Xem lại ({capturedPages.length})
              </button>
            )}
          </div>
        )}

        {/* BOTTOM CONTROLS & ACTIONS BAR */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Camera rotation & secondary helper */}
          <div>
            {viewState === 'camera' ? (
              <button
                type="button"
                onClick={toggleCamera}
                className="p-2.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-2 text-xs font-medium border border-slate-700"
                title="Đổi camera trước / sau"
              >
                <RefreshCw className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Xoay camera ({facingMode === 'environment' ? 'Sau' : 'Trước'})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddMorePages}
                className="px-3 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" /> Chụp thêm trang
              </button>
            )}
          </div>

          {/* Right: Main Action Buttons */}
          <div className="flex items-center gap-2">
            {mode === 'pose' || mode === 'avatar' ? (
              singleCaptured ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSingleCaptured(null);
                      startCamera();
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Chụp lại
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFinalConfirm(false)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/30"
                  >
                    <Check className="w-4 h-4" /> {mode === 'avatar' ? 'Xác nhận ảnh đại diện' : 'Xác nhận tư thế'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={takePhoto}
                  disabled={isProcessing}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/30 active:scale-95"
                >
                  <Camera className="w-4 h-4" /> Chụp ảnh
                </button>
              )
            ) : mode === 'homework' ? (
              viewState === 'camera' ? (
                <>
                  {capturedPages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setViewState('preview')}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-indigo-400" /> Xem trước PDF ({capturedPages.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={takePhoto}
                    disabled={isProcessing}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    {replaceIndex !== null
                      ? `Lưu lại Trang ${replaceIndex + 1}`
                      : capturedPages.length === 0
                      ? 'Chụp trang 1'
                      : `Chụp tiếp trang ${capturedPages.length + 1}`}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleFinalConfirm(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                    title="Lưu file đính kèm vào bài làm"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" /> Xuất & Đính kèm PDF
                  </button>

                  {onSubmitDirectly && (
                    <button
                      type="button"
                      onClick={() => handleFinalConfirm(true)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                      title="Nộp trực tiếp cho giáo viên"
                    >
                      <Send className="w-4 h-4 text-emerald-300" /> Gửi bài về cho Giáo viên
                    </button>
                  )}
                </>
              )
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}
