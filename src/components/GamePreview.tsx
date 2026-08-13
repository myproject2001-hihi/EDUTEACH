import React, { useState } from 'react';
import { Gamepad2, X, Play, Camera, UserCheck, Download } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface Props {
  gameType: string;
  questions: any[];
  onClose: () => void;
}


function LiveCamera({ onTilt }: { onTilt?: (dir: 'left' | 'right' | 'none') => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState('');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const onTiltRef = React.useRef(onTilt);
  React.useEffect(() => { onTiltRef.current = onTilt; }, [onTilt]);
  
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let faceLandmarker: FaceLandmarker | null = null;
    let animationFrameId: number;
    let isActive = true;
    
    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });
        if (isActive) setIsLoaded(true);
      } catch (err) {
        console.error("MediaPipe load error", err);
      }
    }
    
    initMediaPipe();

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play();
             predictWebcam();
          }
        }
      })
      .catch(err => setError('Lỗi camera: Vui lòng cấp quyền truy cập camera.'));
      
    let lastVideoTime = -1;
    function predictWebcam() {
      if (videoRef.current && faceLandmarker && isActive) {
        let startTimeMs = performance.now();
        if (lastVideoTime !== videoRef.current.currentTime) {
          lastVideoTime = videoRef.current.currentTime;
          const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);
          
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            const leftEye = landmarks[33]; // Person's left eye
            const rightEye = landmarks[263]; // Person's right eye
            
            const dy = rightEye.y - leftEye.y;
            // Since camera is mirrored for the user:
            // Tilted left (their left ear to left shoulder) -> right eye is higher than left eye -> dy is positive
            if (dy > 0.04) {
               onTiltRef.current?.('left');
            } else if (dy < -0.04) {
               onTiltRef.current?.('right');
            } else {
               onTiltRef.current?.('none');
            }
          } else {
             onTiltRef.current?.('none');
          }
        }
      }
      if (isActive) {
        animationFrameId = requestAnimationFrame(predictWebcam);
      }
    }

    return () => {
      isActive = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (faceLandmarker) faceLandmarker.close();
    };
  }, []);

  if (error) return <div className="text-rose-500 text-xs font-bold text-center px-4 z-30">{error}</div>;
  
  return (
    <>
      {!isLoaded && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80"><div className="text-white text-xs font-bold animate-pulse">Đang tải mô hình AI...</div></div>}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10 opacity-70" />
    </>
  );
}

export function GamePreview({ gameType, questions, onClose }: Props) {
  
  const [showGameCamera, setShowGameCamera] = useState(false);
  const [capturedPoseImg, setCapturedPoseImg] = useState<string | null>(null);
  const [tiltDir, setTiltDir] = useState<'left' | 'right' | 'none'>('none');
  
  // Game logic state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'none' | 'correct' | 'wrong'>('none');
  const [lockedAnswer, setLockedAnswer] = useState<'left' | 'right' | 'none'>('none');

  React.useEffect(() => {
    if (gameType !== 'quiz_nghieng_dau') return;
    if (answerStatus !== 'none' || tiltDir === 'none') return;
    
    // We detected a tilt! Let's lock it in after a small debounce or immediately.
    // For immediate feel with a tiny delay to avoid accidental triggers:
    const timer = setTimeout(() => {
       const question = questions[currentQuestionIndex];
       if (!question) return;
       
       const selectedIndex = tiltDir === 'left' ? 0 : 1;
       let isCorrect = false;
       
       if (typeof question.correctAnswer === 'number') {
           isCorrect = question.correctAnswer === selectedIndex;
       } else if (typeof question.correctAnswer === 'string') {
           isCorrect = question.correctAnswer === String.fromCharCode(65 + selectedIndex) || question.correctAnswer === String(selectedIndex);
       } else if (Array.isArray(question.correctAnswer)) {
           isCorrect = question.correctAnswer.includes(selectedIndex);
       } else {
           // Fallback for preview if no answer provided: just say it's correct for demonstration
           isCorrect = true; 
       }
       
       setAnswerStatus(isCorrect ? 'correct' : 'wrong');
       setLockedAnswer(tiltDir);
       
       // Move to next question after 2 seconds
       setTimeout(() => {
          setAnswerStatus('none');
          setLockedAnswer('none');
          if (currentQuestionIndex < questions.length - 1) {
             setCurrentQuestionIndex(prev => prev + 1);
          } else {
             setCurrentQuestionIndex(0); // loop
          }
       }, 2500);
       
    }, 100); // 100ms hold is much easier to trigger
    
    return () => clearTimeout(timer);
  }, [tiltDir, answerStatus, gameType, currentQuestionIndex, questions]);


  const renderGameContent = () => {
    switch (gameType) {
      case 'pose_matching':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-full max-w-2xl bg-slate-800 rounded-3xl p-6 border border-slate-700 flex flex-col items-center text-center space-y-4">
              <div className="flex items-center justify-between w-full border-b border-slate-700 pb-3">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-400" /> Nhận diện tư thế mô phỏng
                </span>
                <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-mono">
                  Pose matching
                </span>
              </div>

              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative flex flex-col items-center justify-center border border-slate-700 shadow-inner">
                {capturedPoseImg ? (
                  <div className="relative w-full h-full">
                    <img src={capturedPoseImg} alt="Pose" className="w-full h-full object-contain" />
                    <div className="absolute top-3 left-3 bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <UserCheck className="w-3.5 h-3.5" /> Đã ghi nhận tư thế
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-slate-600 animate-pulse" />
                    <span>Camera tự động khớp tư thế...</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowGameCamera(true)}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl border border-indigo-400/30 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4 text-emerald-300" /> Bật Camera mô phỏng tư thế
                  </button>
                  {capturedPoseImg && (
                    <a
                      href={capturedPoseImg}
                      download="tu_the_game.jpg"
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                    >
                      <Download className="w-4 h-4" /> Tải ảnh
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <div className="w-full max-w-2xl text-center mb-4">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{questions[0]?.question || 'Câu hỏi mẫu: Bạn hãy làm động tác vươn vai?'}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
              {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                <div key={i} className="flex-1 bg-slate-100 rounded-2xl p-4 text-slate-800 text-center font-bold text-lg border-2 border-slate-300 flex items-center justify-center min-h-[80px]">
                  Tư thế {['A', 'B', 'C', 'D'][i]}: {opt}
                </div>
              ))}
            </div>
          </div>
        );
      case 'quiz_nghieng_dau':
        const currentQ = questions[currentQuestionIndex] || questions[0];
        
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="flex items-center justify-between w-full max-w-2xl px-4">
               <div className="text-slate-500 font-bold">Câu {currentQuestionIndex + 1}/{Math.max(questions.length, 1)}</div>
               {answerStatus !== 'none' && (
                  <div className={`font-black text-lg animate-bounce ${answerStatus === 'correct' ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {answerStatus === 'correct' ? '🎉 CHÍNH XÁC!' : '❌ SAI RỒI!'}
                  </div>
               )}
            </div>
          
            <div className={`w-64 h-64 bg-slate-800 rounded-3xl overflow-hidden relative border-4 shadow-2xl flex items-center justify-center transition-colors duration-300 ${tiltDir === 'left' ? 'border-blue-500 shadow-blue-500/50' : tiltDir === 'right' ? 'border-rose-500 shadow-rose-500/50' : 'border-indigo-500'}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <LiveCamera onTilt={answerStatus === 'none' ? setTiltDir : undefined} />
              <Camera className="w-16 h-16 text-white/30 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-[10px] px-2">
                {answerStatus !== 'none' ? 'Đã khóa đáp án' : tiltDir === 'left' ? 'Đang nghiêng TRÁI' : tiltDir === 'right' ? 'Đang nghiêng PHẢI' : 'Camera đang bật (Preview)'}
              </div>
            </div>
            <div className="w-full max-w-2xl text-center mb-4">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{currentQ?.question || 'Câu hỏi mẫu: Đâu là thủ đô của Việt Nam?'}</h3>
              <p className="text-slate-500 text-sm">Nghiêng đầu sang trái hoặc phải (giữ 0.5s) để chọn đáp án</p>
            </div>
            <div className="flex w-full max-w-2xl gap-4">
              <div className={`flex-1 rounded-2xl p-6 text-white text-center font-bold text-xl transition-all duration-300 border-4 flex flex-col justify-center min-h-[120px] 
                ${lockedAnswer === 'left' ? (answerStatus === 'correct' ? 'bg-emerald-500 border-emerald-300' : 'bg-rose-500 border-rose-300') : 
                  tiltDir === 'left' && answerStatus === 'none' ? 'bg-blue-600 border-blue-300 shadow-[0_4px_0_#1e3a8a] scale-105' : 'bg-blue-500 border-blue-400 shadow-[0_8px_0_#1e3a8a]'}
              `}>
                <span className="text-3xl mb-2">⬅️</span>
                {currentQ?.options?.[0] || 'Đáp án A'}
              </div>
              <div className={`flex-1 rounded-2xl p-6 text-white text-center font-bold text-xl transition-all duration-300 border-4 flex flex-col justify-center min-h-[120px] 
                ${lockedAnswer === 'right' ? (answerStatus === 'correct' ? 'bg-emerald-500 border-emerald-300' : 'bg-rose-500 border-rose-300') : 
                  tiltDir === 'right' && answerStatus === 'none' ? 'bg-blue-600 border-blue-300 shadow-[0_4px_0_#1e3a8a] scale-105' : 'bg-blue-500 border-blue-400 shadow-[0_8px_0_#1e3a8a]'}
              `}>
                <span className="text-3xl mb-2">➡️</span>
                {currentQ?.options?.[1] || 'Đáp án B'}
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
          <div className="flex flex-col h-full min-h-[450px] bg-gradient-to-b from-sky-400 to-sky-200 rounded-3xl p-4 sm:p-8 relative overflow-hidden border-4 border-sky-500 shadow-inner">
            <div className="absolute top-4 sm:top-10 left-0 right-0 flex justify-between px-4 sm:px-12">
              <div className="bg-white/80 backdrop-blur px-3 sm:px-6 py-1.5 sm:py-3 rounded-full font-black text-xs sm:text-2xl text-rose-600 shadow-lg border-2 border-rose-200">Đội Đỏ: 450</div>
              <div className="bg-white/80 backdrop-blur px-3 sm:px-6 py-1.5 sm:py-3 rounded-full font-black text-xs sm:text-2xl text-blue-600 shadow-lg border-2 border-blue-200">Đội Xanh: 320</div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center z-10 mt-12 sm:mt-20">
              <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full text-center border-2 sm:border-4 border-slate-800">
                <h3 className="text-lg sm:text-3xl font-black text-slate-800 mb-4 sm:mb-8">{questions[0]?.question || 'Câu hỏi mẫu sẽ hiển thị ở đây?'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                    <button key={i} className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl text-white font-bold text-sm sm:text-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all ${
                      i===0 ? 'bg-rose-500 border-2 border-rose-700' : i===1 ? 'bg-blue-500 border-2 border-blue-700' : i===2 ? 'bg-amber-500 border-2 border-amber-700' : 'bg-emerald-500 border-2 border-emerald-700'
                    }`}>
                      {opt}
                    </button>
                  )) || <div className="col-span-2 p-4 bg-slate-100 rounded-xl font-bold text-slate-500">Chưa có đáp án</div>}
                </div>
              </div>
            </div>
            {/* Track decorations */}
            <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-slate-800 border-t-8 border-slate-600 flex flex-col justify-center gap-4 px-8">
              <div className="h-4 border-t-4 border-dashed border-white/50 w-full" />
              <div className="h-4 border-t-4 border-dashed border-white/50 w-full" />
            </div>
            <div className="absolute bottom-16 sm:bottom-20 left-10 sm:left-20 w-10 h-10 sm:w-16 sm:h-16 bg-rose-500 rounded-full border-2 sm:border-4 border-white shadow-lg animate-bounce" />
            <div className="absolute bottom-4 sm:bottom-6 left-28 sm:left-40 w-10 h-10 sm:w-16 sm:h-16 bg-blue-500 rounded-full border-2 sm:border-4 border-white shadow-lg animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        );
      case 'do_min':
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-200 p-3 sm:p-8 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-400 shadow-[inset_0_4px_20px_rgba(0,0,0,0.1)]">
            <div className="bg-slate-300 p-3 sm:p-6 rounded-xl border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-white border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-slate-500 shadow-2xl max-w-full">
              <div className="bg-slate-800 text-red-500 font-mono text-xl sm:text-4xl p-2 sm:p-4 rounded mb-3 sm:mb-6 flex justify-between items-center border-[4px] sm:border-[6px] border-slate-600 shadow-inner">
                <span>042</span>
                <span className="text-yellow-400">😊</span>
                <span>12:05</span>
              </div>
              <div className="grid grid-cols-5 gap-1 bg-slate-400 p-1.5 rounded">
                {Array.from({length: 20}).map((_, i) => (
                  <div key={i} className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center font-bold text-sm sm:text-xl ${
                    i === 7 ? 'bg-slate-200 border border-slate-400 text-blue-600 shadow-inner' :
                    i === 12 ? 'bg-slate-200 border border-slate-400 text-emerald-600 shadow-inner' :
                    i === 14 ? 'bg-red-500 border border-slate-400 text-white shadow-inner' :
                    'bg-slate-300 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-white border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-slate-500 hover:bg-slate-200 cursor-pointer'
                  }`}>
                    {i === 7 ? '1' : i === 12 ? '2' : i === 14 ? '💣' : ''}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 sm:mt-8 bg-white p-4 sm:p-6 rounded-2xl shadow-lg border-2 border-slate-300 max-w-xl text-center w-full">
              <h3 className="font-bold text-slate-800 mb-1 sm:mb-2 text-xs sm:text-base">Trả lời đúng để mở ô an toàn!</h3>
              <p className="text-slate-500 text-xs sm:text-sm">{questions[0]?.question || 'Câu hỏi mẫu sẽ hiển thị khi người chơi click vào một ô...'}</p>
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
    <div className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-8">
      <div className="bg-slate-100 w-full max-w-6xl h-full max-h-[95vh] sm:max-h-[90vh] rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative border border-slate-700">
        <div className="h-12 sm:h-14 bg-slate-900 flex items-center justify-between px-3 sm:px-6 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
            </div>
            <span className="text-slate-300 font-bold text-xs sm:text-sm ml-2 sm:ml-4 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Chế độ Xem trước</span>
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white rounded-full transition-colors group shrink-0">
            <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
        <div className="flex-1 p-2 sm:p-8 relative overflow-y-auto custom-scrollbar">
          {renderGameContent()}
        </div>
      </div>

      {showGameCamera && (
        <CameraCapture
          mode="pose"
          onCancel={() => setShowGameCamera(false)}
          onCapture={(img) => {
            setCapturedPoseImg(img);
            setShowGameCamera(false);
          }}
        />
      )}
    </div>
  );
}
