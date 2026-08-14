import React, { useState } from 'react';
import { Gamepad2, X, Play, Camera, UserCheck, Download } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { MarkdownMath } from './MarkdownMath';

interface Props {
  gameType: string;
  questions: any[];
  onClose: () => void;
  isStudentMode?: boolean;
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
}


function LiveCamera({ onTilt }: { onTilt?: (dir: 'left' | 'right' | 'up' | 'down' | 'none') => void }) {
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
        try {
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU"
            },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 1
          });
        } catch (gpuErr) {
          console.warn("GPU delegate failed, falling back to CPU", gpuErr);
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU"
            },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 1
          });
        }
        if (isActive) setIsLoaded(true);
      } catch (err) {
        console.error("MediaPipe load error", err);
        setError("Không thể tải mô hình nhận diện khuôn mặt. Vui lòng kiểm tra kết nối mạng.");
      }
    }
    
    initMediaPipe();

    const startUserMedia = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      } catch (e) {
        console.warn("FacingMode user failed, trying video true", e);
        return await navigator.mediaDevices.getUserMedia({ video: true });
      }
    };

    startUserMedia()
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play()
            .then(() => {
              predictWebcam();
            })
            .catch(err => {
              console.warn("Autoplay prevented or video play interrupted", err);
              predictWebcam();
            });
        }
      })
      .catch(err => {
        console.error("Camera access error:", err);
        setError('Lỗi camera: Vui lòng cấp quyền truy cập camera hoặc kiểm tra kết nối thiết bị.');
      });
      
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
            const forehead = landmarks[10];
            const chin = landmarks[152];
            const nose = landmarks[4];
            
            // 1. Calculate left/right head tilt
            const dy = rightEye.y - leftEye.y;
            
            // 2. Calculate up/down head tilt (scale-invariant ratio of nose to forehead / nose to chin)
            const distNoseForehead = nose.y - forehead.y;
            const distNoseChin = chin.y - nose.y;
            const upDownRatio = distNoseForehead / Math.max(distNoseChin, 0.01);
            
            // Since camera is mirrored for the user:
            // Tilted left (their left ear to left shoulder) -> right eye is higher than left eye -> dy is positive
            if (dy > 0.04) {
               onTiltRef.current?.('left');
            } else if (dy < -0.04) {
               onTiltRef.current?.('right');
            } else if (upDownRatio < 0.72) {
               onTiltRef.current?.('up');
            } else if (upDownRatio > 1.35) {
               onTiltRef.current?.('down');
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
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10 opacity-90" />
    </>
  );
}

export function GamePreview({ gameType, questions, onClose, isStudentMode = false, onSubmitWork }: Props) {
  
  const [showGameCamera, setShowGameCamera] = useState(false);
  const [capturedPoseImg, setCapturedPoseImg] = useState<string | null>(null);
  const [tiltDir, setTiltDir] = useState<'left' | 'right' | 'up' | 'down' | 'none'>('none');
  
  // Game logic state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'none' | 'correct' | 'wrong'>('none');
  const [lockedAnswer, setLockedAnswer] = useState<'left' | 'right' | 'up' | 'down' | 'none'>('none');
  const [isFinished, setIsFinished] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<string, number>>({});

  const gameQuestions = React.useMemo(() => {
    if (questions && questions.length > 0) return questions;
    return [
      {
        id: 'q1',
        question: 'Câu 1: Công thức tính diện tích hình tròn có bán kính R là?',
        options: ['S = πR²', 'S = 2πR', 'S = πD', 'S = 4πR²'],
        correctAnswer: 0,
        points: 5.0
      },
      {
        id: 'q2',
        question: 'Câu 2: Hàm số bậc nhất y = ax + b đồng biến trên R khi nào?',
        options: ['a > 0', 'a < 0', 'a = 0', 'b > 0'],
        correctAnswer: 0,
        points: 5.0
      },
      {
        id: 'q3',
        question: 'Câu 3: Đâu là phương trình của đường tròn có tâm O(0,0), bán kính R?',
        options: ['x² + y² = R²', 'x + y = R', 'x² - y² = R²', 'y = x² + R'],
        correctAnswer: 0,
        points: 5.0
      },
      {
        id: 'q4',
        question: 'Câu 4: Đường thẳng x + y - 1 = 0 đi qua điểm nào dưới đây?',
        options: ['M(1,0)', 'N(0,0)', 'P(1,1)', 'Q(-1,-1)'],
        correctAnswer: 0,
        points: 5.0
      }
    ];
  }, [questions]);

  const handleOptionClick = (selectedIndex: number) => {
    if (answerStatus !== 'none' || isFinished) return;
    const question = gameQuestions[currentQuestionIndex];
    if (!question) return;

    let isCorrect = false;
    if (typeof question.correctAnswer === 'number') {
        isCorrect = question.correctAnswer === selectedIndex;
    } else if (typeof question.correctAnswer === 'string') {
        isCorrect = question.correctAnswer === String.fromCharCode(65 + selectedIndex) || question.correctAnswer === String(selectedIndex);
    } else if (Array.isArray(question.correctAnswer)) {
        isCorrect = question.correctAnswer.includes(selectedIndex);
    } else {
        isCorrect = true; 
    }
    
    if (isCorrect) {
      setCorrectAnswersCount(prev => prev + 1);
    }
    
    setAnswersMap(prev => ({
      ...prev,
      [question.id || `q_${currentQuestionIndex}`]: selectedIndex
    }));

    setAnswerStatus(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
       setAnswerStatus('none');
       if (currentQuestionIndex < gameQuestions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
       } else {
          setIsFinished(true); // Complete the game!
       }
    }, 1500);
  };

  React.useEffect(() => {
    if (gameType !== 'quiz_nghieng_dau') return;
    if (answerStatus !== 'none' || tiltDir === 'none' || isFinished) return;
    
    // We detected a tilt! Let's lock it in after a small debounce or immediately.
    // For immediate feel with a tiny delay to avoid accidental triggers:
    const timer = setTimeout(() => {
       const question = gameQuestions[currentQuestionIndex];
       if (!question) return;
       
       let selectedIndex = 0;
       if (tiltDir === 'left') selectedIndex = 0;
       else if (tiltDir === 'right') selectedIndex = 1;
       else if (tiltDir === 'up') selectedIndex = 2;
       else if (tiltDir === 'down') selectedIndex = 3;
       
       // check if option exists (e.g. if question only has 2 options, don't trigger C or D)
       if (selectedIndex >= (question.options?.length || 2)) return;

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
       
       if (isCorrect) {
         setCorrectAnswersCount(prev => prev + 1);
       }
       
       setAnswersMap(prev => ({
         ...prev,
         [question.id || `q_${currentQuestionIndex}`]: selectedIndex
       }));

       setAnswerStatus(isCorrect ? 'correct' : 'wrong');
       setLockedAnswer(tiltDir);
       
       // Move to next question after 2 seconds
       setTimeout(() => {
          setAnswerStatus('none');
          setLockedAnswer('none');
          if (currentQuestionIndex < gameQuestions.length - 1) {
             setCurrentQuestionIndex(prev => prev + 1);
          } else {
             setIsFinished(true); // Complete the game!
          }
       }, 2500);
       
    }, 400); // 400ms hold is solid to prevent twitching
    
    return () => clearTimeout(timer);
  }, [tiltDir, answerStatus, gameType, currentQuestionIndex, gameQuestions, isFinished]);


  const renderGameContent = () => {
    if (isFinished) {
      const score = gameQuestions.length > 0 ? Math.round((correctAnswersCount / gameQuestions.length) * 10) : 10;
      const pointsToEarn = score * 10;
      
      const handleFinishSubmit = () => {
        if (onSubmitWork) {
          // Submit the student's work
          onSubmitWork(score, correctAnswersCount, answersMap);
        } else {
          // In teacher preview, just close
          onClose();
        }
      };

      return (
        <div className="flex flex-col items-center justify-center py-10 px-4 max-w-xl mx-auto text-center space-y-6">
          <div className="relative">
            {/* Glowing background halo */}
            <div className="absolute inset-0 bg-emerald-100 rounded-full blur-3xl opacity-60 scale-150 animate-pulse" />
            <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center relative shadow-xl border-4 border-white animate-bounce">
              <span className="text-5xl">🏆</span>
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight uppercase">
              Chúc Mừng Đã Hoàn Thành!
            </h2>
            <p className="text-sm text-slate-500 font-semibold max-w-sm mx-auto">
              Bạn đã hoàn thành xuất sắc tất cả câu hỏi trong bài học ngày hôm nay.
            </p>
          </div>

          {/* Scoreboard Cards */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm relative z-10">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-md text-center space-y-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Số câu trả lời đúng</p>
              <p className="text-2xl font-black text-emerald-600 font-mono">
                {correctAnswersCount} / {gameQuestions.length}
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-md text-center space-y-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Điểm hệ thống</p>
              <p className="text-2xl font-black text-indigo-600 font-mono">
                {score} / 10
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-md text-center space-y-1 col-span-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Xu vàng / Điểm tích lũy cá nhân</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xl">🪙</span>
                <span className="text-2xl font-black text-amber-500 font-mono">+{pointsToEarn}</span>
              </div>
            </div>
          </div>

          {isStudentMode ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs font-semibold w-full max-w-sm animate-pulse">
              ✓ Điểm số tích lũy cá nhân sẽ tự động cộng dồn vào hồ sơ học sinh của bạn!
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-3 rounded-xl text-xs font-semibold w-full max-w-sm">
              ℹ Chế độ xem trước của Giáo viên. Học sinh khi chơi sẽ được ghi nhận điểm thực tế.
            </div>
          )}

          <button
            type="button"
            onClick={handleFinishSubmit}
            className="w-full max-w-sm py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-wider"
          >
            {isStudentMode ? 'Nộp bài & Kết thúc' : 'Đóng Xem Trước'}
          </button>
        </div>
      );
    }

    switch (gameType) {
      case 'pose_matching':
        const currentPoseQ = gameQuestions[currentQuestionIndex] || gameQuestions[0];
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="flex items-center justify-between w-full max-w-2xl px-4">
               <div className="text-slate-500 font-bold">Câu {currentQuestionIndex + 1}/{Math.max(gameQuestions.length, 1)}</div>
               {answerStatus !== 'none' && (
                  <div className={`font-black text-lg animate-bounce ${answerStatus === 'correct' ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {answerStatus === 'correct' ? '🎉 CHÍNH XÁC!' : '❌ SAI RỒI!'}
                  </div>
               )}
            </div>

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
            
            <div className="w-full max-w-2xl text-center mb-4 flex flex-col items-center">
              <div className="text-2xl font-bold text-slate-800 mb-2"><MarkdownMath content={currentPoseQ?.question || 'Câu hỏi mẫu: Bạn hãy làm động tác vươn vai?'} /></div>
              <p className="text-xs text-slate-400 font-medium italic">Bạn có thể chọn trực tiếp phương án bên dưới để kiểm tra và tiến lên câu tiếp theo.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
              {(currentPoseQ?.options || ['Tư thế A', 'Tư thế B', 'Tư thế C', 'Tư thế D']).slice(0,4).map((opt: string, i: number) => (
                <button 
                  key={i} 
                  onClick={() => handleOptionClick(i)}
                  className="flex-1 bg-slate-100 hover:bg-indigo-50 active:scale-98 transition-all rounded-2xl p-4 text-slate-800 text-center font-bold text-lg border-2 border-slate-300 hover:border-indigo-400 flex flex-wrap items-center justify-center gap-1 min-h-[80px]"
                >
                  <span>Tư thế {['A', 'B', 'C', 'D'][i]}:</span> <MarkdownMath content={opt} />
                </button>
              ))}
            </div>
          </div>
        );
      case 'quiz_nghieng_dau':
        const currentQ = gameQuestions[currentQuestionIndex] || gameQuestions[0];
        const hasCD = currentQ?.options && currentQ.options.length > 2;

        const renderOption = (index: number, direction: 'left' | 'right' | 'up' | 'down', icon: string, bgColor: string, hoverBorderColor: string) => {
          const text = currentQ?.options?.[index] || `Đáp án ${['A', 'B', 'C', 'D'][index]}`;
          const isLocked = lockedAnswer === direction;
          const isActive = tiltDir === direction && answerStatus === 'none';
          
          let cardClass = "";
          if (isLocked) {
            cardClass = answerStatus === 'correct' ? 'bg-emerald-600 border-emerald-300 shadow-none' : 'bg-rose-600 border-rose-300 shadow-none';
          } else if (isActive) {
            cardClass = `${bgColor} ${hoverBorderColor} scale-105 shadow-md border-white`;
          } else {
            cardClass = `${bgColor} border-white/25 shadow-[0_6px_0_rgba(0,0,0,0.2)]`;
          }

          return (
            <button 
              key={index}
              onClick={() => handleOptionClick(index)}
              className={`flex-1 rounded-2xl p-4 sm:p-5 text-white text-center font-bold text-sm sm:text-base transition-all duration-300 border-4 flex flex-col items-center justify-center min-h-[90px] sm:min-h-[105px] ${cardClass}`}
            >
              <span className="text-xl sm:text-2xl mb-1">{icon}</span>
              <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 mb-1">
                {['Nghiêng Trái (A)', 'Nghiêng Phải (B)', 'Ngẩng Lên (C)', 'Gật Xuống (D)'][index]}
              </div>
              <div className="text-xs sm:text-sm font-semibold">
                <MarkdownMath content={text} />
              </div>
            </button>
          );
        };
        
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="flex items-center justify-between w-full max-w-2xl px-4">
               <div className="text-slate-500 font-bold">Câu {currentQuestionIndex + 1}/{Math.max(gameQuestions.length, 1)}</div>
               {answerStatus !== 'none' && (
                  <div className={`font-black text-lg animate-bounce ${answerStatus === 'correct' ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {answerStatus === 'correct' ? '🎉 CHÍNH XÁC!' : '❌ SAI RỒI!'}
                  </div>
               )}
            </div>
          
            <div className={`w-64 h-64 bg-slate-800 rounded-3xl overflow-hidden relative border-4 shadow-2xl flex items-center justify-center transition-all duration-300 
              ${tiltDir === 'left' ? 'border-blue-500 shadow-blue-500/40' : 
                tiltDir === 'right' ? 'border-pink-500 shadow-pink-500/40' : 
                tiltDir === 'up' ? 'border-amber-500 shadow-amber-500/40' : 
                tiltDir === 'down' ? 'border-purple-500 shadow-purple-500/40' : 
                'border-indigo-500'}`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <LiveCamera onTilt={answerStatus === 'none' ? setTiltDir : undefined} />
              <Camera className="w-16 h-16 text-white/30 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-[10px] px-2">
                {answerStatus !== 'none' ? 'Đã khóa đáp án' : 
                 tiltDir === 'left' ? 'Đang nghiêng TRÁI (A)' : 
                 tiltDir === 'right' ? 'Đang nghiêng PHẢI (B)' : 
                 tiltDir === 'up' ? 'Đang ngẩng LÊN (C)' : 
                 tiltDir === 'down' ? 'Đang gật XUỐNG (D)' : 
                 'Camera đang bật (Xem trước)'}
              </div>
            </div>
            <div className="w-full max-w-2xl text-center mb-2 flex flex-col items-center">
              <div className="text-xl sm:text-2xl font-bold text-slate-800 mb-2"><MarkdownMath content={currentQ?.question || 'Câu hỏi mẫu: Đâu là thủ đô của Việt Nam?'} /></div>
              <p className="text-slate-500 text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100">
                {hasCD 
                  ? 'Nghiêng Trái (A) | Nghiêng Phải (B) | Ngẩng Lên (C) | Gật Xuống (D) hoặc BẤM trực tiếp để trả lời'
                  : 'Nghiêng Trái (A) | Nghiêng Phải (B) hoặc BẤM trực tiếp để trả lời'}
              </p>
            </div>
            
            {hasCD ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl">
                {renderOption(0, 'left', '⬅️', 'bg-blue-600', 'border-blue-300')}
                {renderOption(1, 'right', '➡️', 'bg-pink-600', 'border-pink-300')}
                {renderOption(2, 'up', '⬆️', 'bg-amber-600', 'border-amber-300')}
                {renderOption(3, 'down', '⬇️', 'bg-purple-600', 'border-purple-300')}
              </div>
            ) : (
              <div className="flex w-full max-w-2xl gap-3 sm:gap-4">
                {renderOption(0, 'left', '⬅️', 'bg-blue-600', 'border-blue-300')}
                {renderOption(1, 'right', '➡️', 'bg-pink-600', 'border-pink-300')}
              </div>
            )}
          </div>
        );
      case 'game_map':
      case 'san_kho_bau':
        const mapQ = gameQuestions[currentQuestionIndex] || gameQuestions[0];
        return (
          <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center rounded-2xl border-4 border-[#8B4513] shadow-2xl relative overflow-hidden flex flex-col items-center justify-center p-4 min-h-[400px]">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
            <div className="z-10 bg-[#f4e4bc] border-4 border-[#8B4513] p-6 sm:p-8 rounded-xl max-w-2xl w-full text-center shadow-2xl transform rotate-1">
              <div className="flex justify-between items-center text-xs font-bold text-[#8B4513] mb-2 font-mono">
                <span>Câu {currentQuestionIndex + 1}/{gameQuestions.length}</span>
                {answerStatus !== 'none' && (
                  <span className={answerStatus === 'correct' ? 'text-emerald-700' : 'text-rose-700'}>
                    {answerStatus === 'correct' ? '✓ Đúng rồi!' : '✗ Chưa đúng!'}
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#5c2e0e] mb-2 font-serif uppercase tracking-wider">
                {gameType === 'game_map' ? 'Khám Phá Bản Đồ' : 'Săn Kho Báu'}
              </h2>
              <div className="w-32 h-1 bg-[#8B4513] mx-auto mb-6 rounded-full opacity-50" />
              
              <div className="bg-white/80 p-5 sm:p-6 rounded-xl border-2 border-[#8B4513] mb-6 flex justify-center">
                <div className="text-[#5c2e0e] font-bold text-lg sm:text-xl">
                  <MarkdownMath content={mapQ?.question || 'Nội dung câu hỏi...'} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(mapQ?.options || ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']).slice(0,4).map((opt: string, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => handleOptionClick(i)}
                    className="w-full py-3 px-4 sm:py-4 sm:px-6 bg-white border-2 border-[#8B4513] hover:bg-[#8B4513] hover:text-white rounded-xl text-[#5c2e0e] font-bold text-sm sm:text-lg transition-all flex items-center justify-center gap-3 group shadow-[4px_4px_0_#8B4513] active:translate-y-1 active:shadow-none"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-xs group-hover:bg-white group-hover:text-[#8B4513] transition-colors shrink-0">
                      {String.fromCharCode(65+i)}
                    </span>
                    <MarkdownMath content={opt} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'cuoc_dua_ngon_tay':
        const raceQ = gameQuestions[currentQuestionIndex] || gameQuestions[0];
        return (
          <div className="flex flex-col h-full min-h-[450px] bg-gradient-to-b from-sky-400 to-sky-200 rounded-3xl p-4 sm:p-8 relative overflow-hidden border-4 border-sky-500 shadow-inner">
            <div className="absolute top-4 sm:top-10 left-0 right-0 flex justify-between px-4 sm:px-12 z-20">
              <div className="bg-white/80 backdrop-blur px-3 sm:px-6 py-1.5 sm:py-3 rounded-full font-black text-xs sm:text-2xl text-rose-600 shadow-lg border-2 border-rose-200">
                Đội Đỏ (Bạn): {correctAnswersCount * 100}m
              </div>
              <div className="bg-white/80 backdrop-blur px-3 sm:px-6 py-1.5 sm:py-3 rounded-full font-black text-xs sm:text-2xl text-blue-600 shadow-lg border-2 border-blue-200">
                Đội Xanh: {currentQuestionIndex * 80}m
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center z-10 mt-12 sm:mt-20">
              <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full text-center border-2 sm:border-4 border-slate-800 flex flex-col items-center">
                <div className="flex justify-between items-center w-full text-xs font-extrabold text-slate-400 mb-2">
                  <span>Câu {currentQuestionIndex + 1} / {gameQuestions.length}</span>
                  {answerStatus !== 'none' && (
                    <span className={answerStatus === 'correct' ? 'text-emerald-600' : 'text-rose-600'}>
                      {answerStatus === 'correct' ? '🎉 Bứt tốc!' : '❌ Chậm lại!'}
                    </span>
                  )}
                </div>
                <div className="text-lg sm:text-3xl font-black text-slate-800 mb-4 sm:mb-8">
                  <MarkdownMath content={raceQ?.question || 'Câu hỏi đua xe...'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
                  {(raceQ?.options || ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']).slice(0,4).map((opt: string, i: number) => (
                    <button 
                      key={i} 
                      onClick={() => handleOptionClick(i)}
                      className={`p-3 sm:p-6 rounded-xl sm:rounded-2xl text-white font-bold text-sm sm:text-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center ${
                        i===0 ? 'bg-rose-500 border-2 border-rose-700' : i===1 ? 'bg-blue-500 border-2 border-blue-700' : i===2 ? 'bg-amber-500 border-2 border-amber-700' : 'bg-emerald-500 border-2 border-emerald-700'
                      }`}
                    >
                      <MarkdownMath content={opt} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Track decorations */}
            <div className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 bg-slate-800 border-t-8 border-slate-600 flex flex-col justify-center gap-4 px-8">
              <div className="h-4 border-t-4 border-dashed border-white/50 w-full" />
              <div className="h-4 border-t-4 border-dashed border-white/50 w-full" />
            </div>
            <div className="absolute bottom-16 sm:bottom-20 left-10 sm:left-20 w-10 h-10 sm:w-16 sm:h-16 bg-rose-500 rounded-full border-2 sm:border-4 border-white shadow-lg animate-bounce" style={{ left: `${20 + (correctAnswersCount * 15)}%` }} />
            <div className="absolute bottom-4 sm:bottom-6 left-28 sm:left-40 w-10 h-10 sm:w-16 sm:h-16 bg-blue-500 rounded-full border-2 sm:border-4 border-white shadow-lg animate-bounce" style={{ animationDelay: '0.2s', left: `${25 + (currentQuestionIndex * 12)}%` }} />
          </div>
        );
      case 'do_min':
        const mineQ = gameQuestions[currentQuestionIndex] || gameQuestions[0];
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-slate-200 p-3 sm:p-8 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-400 shadow-[inset_0_4px_20px_rgba(0,0,0,0.1)]">
            <div className="bg-slate-300 p-3 sm:p-6 rounded-xl border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-white border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-slate-500 shadow-2xl max-w-full">
              <div className="bg-slate-800 text-red-500 font-mono text-xl sm:text-4xl p-2 sm:p-4 rounded mb-3 sm:mb-6 flex justify-between items-center border-[4px] sm:border-[6px] border-slate-600 shadow-inner">
                <span>0{gameQuestions.length - currentQuestionIndex}</span>
                <span className="text-yellow-400">😊</span>
                <span>Câu {currentQuestionIndex + 1}/{gameQuestions.length}</span>
              </div>
              <div className="grid grid-cols-5 gap-1 bg-slate-400 p-1.5 rounded">
                {Array.from({length: 20}).map((_, i) => {
                  const isExplored = i < currentQuestionIndex * 4;
                  return (
                    <div key={i} className={`w-10 h-10 sm:w-16 sm:h-16 flex items-center justify-center font-bold text-sm sm:text-xl ${
                      isExplored ? 'bg-slate-200 border border-slate-400 text-blue-600 shadow-inner' :
                      i === 14 ? 'bg-red-500 border border-slate-400 text-white shadow-inner animate-pulse' :
                      'bg-slate-300 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-white border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-slate-500 hover:bg-slate-200 cursor-pointer'
                    }`}>
                      {isExplored ? '✓' : i === 14 ? '💣' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 sm:mt-8 bg-white p-4 sm:p-6 rounded-2xl shadow-lg border-2 border-slate-300 max-w-xl text-center w-full flex flex-col items-center">
              <h3 className="font-extrabold text-slate-800 mb-1 sm:mb-2 text-xs sm:text-base flex items-center gap-1.5">
                <span>⭐</span> Câu hỏi gỡ mìn an toàn:
              </h3>
              <div className="text-slate-850 font-bold mb-4">
                <MarkdownMath content={mineQ?.question || 'Câu hỏi gỡ mìn...'} />
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                {(mineQ?.options || ['Đúng', 'Sai']).slice(0,4).map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => handleOptionClick(i)}
                    className="p-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white transition-all text-xs sm:text-sm font-bold text-indigo-800 rounded-xl"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case 'doan_tau_tri_thuc':
        const trainQ = gameQuestions[currentQuestionIndex] || gameQuestions[0];
        return (
          <div className="flex flex-col h-full bg-gradient-to-b from-blue-300 to-green-400 rounded-3xl p-4 sm:p-8 relative overflow-hidden border-4 border-blue-500 shadow-inner min-h-[450px]">
            {/* Sun & Clouds */}
            <div className="absolute top-8 right-12 w-20 h-20 bg-yellow-300 rounded-full shadow-[0_0_40px_rgba(253,224,71,0.8)]" />
            <div className="absolute top-16 left-20 w-32 h-10 bg-white/80 rounded-full blur-sm" />
            
            <div className="flex-1 flex flex-col items-center justify-center z-10 -mt-4">
              <div className="bg-white/95 p-6 sm:p-8 rounded-3xl shadow-2xl max-w-2xl w-full text-center border-4 border-indigo-200 backdrop-blur flex flex-col items-center">
                <div className="flex justify-between items-center w-full text-xs text-indigo-400 font-bold mb-3">
                  <span>Trạm ga số: {currentQuestionIndex + 1} / {gameQuestions.length}</span>
                  {answerStatus !== 'none' && (
                    <span className={answerStatus === 'correct' ? 'text-emerald-600' : 'text-rose-600'}>
                      {answerStatus === 'correct' ? '🚃 Tàu chuyển bánh!' : '❌ Hãm phanh!'}
                    </span>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-black text-indigo-900 mb-6 flex items-center justify-center gap-2">
                  <span>🚂 Ga số {currentQuestionIndex + 1}:</span> <MarkdownMath content={trainQ?.question || 'Câu hỏi ga tàu...'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {(trainQ?.options || ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']).slice(0,4).map((opt: string, i: number) => (
                    <button 
                      key={i} 
                      onClick={() => handleOptionClick(i)}
                      className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl text-indigo-700 font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                    >
                      <MarkdownMath content={opt} />
                    </button>
                  ))}
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
            {/* Train representation with sliding transition */}
            <div className="absolute bottom-8 left-10 text-4xl sm:text-5xl transition-all duration-1000 animate-pulse" style={{ left: `${10 + (currentQuestionIndex * (75 / gameQuestions.length))}%` }}>
              🚂🚃🚃
            </div>
          </div>
        );
      case 'tu_ngu_biet_bay':
        return (
          <div className="flex flex-col h-full bg-slate-900 rounded-3xl p-8 relative overflow-hidden border-4 border-indigo-500 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50" />
            
            <div className="absolute top-8 left-0 right-0 text-center z-20 flex justify-center">
              <div className="text-3xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                <MarkdownMath content={questions[0]?.question || 'Đâu là từ đúng chính tả?'} />
              </div>
            </div>

            {/* Flying Words */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                <div key={i} 
                  className={`absolute px-6 py-3 rounded-full font-bold text-xl text-white backdrop-blur-sm border-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer hover:scale-110 transition-transform flex items-center justify-center ${
                    i===0 ? 'top-1/4 left-1/4 bg-rose-500/80 border-rose-300' :
                    i===1 ? 'top-1/3 right-1/4 bg-blue-500/80 border-blue-300' :
                    i===2 ? 'bottom-1/3 left-1/3 bg-emerald-500/80 border-emerald-300' :
                    'bottom-1/4 right-1/3 bg-amber-500/80 border-amber-300'
                  }`}
                  style={{ animation: `float ${3 + i}s ease-in-out infinite alternate` }}
                >
                  <MarkdownMath content={opt} />
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
            <div className="text-2xl font-black text-orange-900 mb-8"><MarkdownMath content={questions[0]?.question || 'Nối hai vế để tạo thành câu hoàn chỉnh:'} /></div>
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
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 max-w-xl text-center w-full flex flex-col items-center">
              <p className="font-bold text-emerald-800 mb-2">Câu hỏi hàng ngang số 1:</p>
              <div className="text-slate-600"><MarkdownMath content={questions[0]?.question || 'Hoạt động tiếp thu kiến thức ở trường?'} /></div>
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
              <div className="flex-1 bg-white p-8 rounded-3xl shadow-lg border-2 border-purple-100 w-full flex flex-col items-center">
                <div className="inline-block px-4 py-1.5 bg-purple-100 text-purple-700 font-bold rounded-full text-sm mb-4">
                  Mảnh ghép số 1
                </div>
                <div className="text-xl font-bold text-slate-800 mb-6 w-full text-center"><MarkdownMath content={questions[0]?.question || 'Trả lời đúng câu hỏi này để mở mảnh ghép số 1?'} /></div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  {questions[0]?.options?.slice(0,4).map((opt: string, i: number) => (
                    <button key={i} className="w-full p-4 text-left border-2 border-slate-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 font-medium text-slate-700 transition-colors flex items-center justify-start">
                      <MarkdownMath content={opt} />
                    </button>
                  )) || <div className="text-slate-500">Chưa có đáp án</div>}
                </div>
              </div>
            </div>
          </div>
        );
      case 'domino':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-cyan-50 rounded-3xl p-8 border-4 border-cyan-200 overflow-y-auto">
            <h3 className="text-2xl font-black text-cyan-900 mb-6 uppercase">Đấu Trường Domino</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-lg text-center font-medium">Ghép nối vế trái quân Domino này với vế phải quân Domino kia để tạo thành dãy logic đúng.</p>
            <div className="flex flex-wrap gap-4 justify-center items-center max-w-4xl">
              {[
                { left: 'a = b', right: 'Mệnh đề tương đương' },
                { left: 'x > 5', right: 'Bất phương trình' },
                { left: 'y = ax + b', right: 'Hàm số bậc nhất' },
                { left: 'a + b = c', right: 'Phép cộng số học' }
              ].map((domino, idx) => (
                <div key={idx} className="flex bg-white rounded-xl shadow-lg border-2 border-cyan-600 overflow-hidden transform hover:-translate-y-1 transition-transform cursor-pointer">
                  <div className="p-4 bg-cyan-50 border-r-2 border-dashed border-cyan-200 font-bold text-sm text-cyan-800 min-w-[100px] text-center flex items-center justify-center">
                    {domino.left}
                  </div>
                  <div className="p-4 bg-white font-semibold text-xs text-slate-600 min-w-[120px] text-center flex items-center justify-center">
                    {domino.right}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-cyan-200 max-w-xl text-center w-full">
              <span className="text-xs bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full font-bold">Nhiệm vụ:</span>
              <p className="text-slate-600 mt-2 text-sm"><MarkdownMath content={questions[0]?.question || 'Sắp xếp các quân Domino theo đúng trật tự logic của câu hỏi...'} /></p>
            </div>
          </div>
        );
      case 'dao_chu':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-teal-50 rounded-3xl p-8 border-4 border-teal-200 overflow-y-auto">
            <h3 className="text-2xl font-black text-teal-900 mb-2 uppercase">Đảo Chữ Anagram</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-md text-center font-medium">Kéo thả hoặc nhấp chọn các chữ cái bên dưới để sắp xếp lại thành từ hoàn chỉnh có nghĩa.</p>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-teal-100 flex flex-col items-center w-full max-w-lg space-y-6">
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Từ khóa xáo trộn:</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {['R', 'A', 'P', 'B', 'O', 'L', 'A'].map((char, idx) => (
                  <button key={idx} className="w-12 h-12 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-black text-xl flex items-center justify-center shadow-md active:scale-95 transition-all">
                    {char}
                  </button>
                ))}
              </div>
              <div className="w-full h-[2px] bg-slate-100" />
              <div className="w-full text-center">
                <p className="text-xs text-slate-400 font-bold mb-2">ĐÁP ÁN BẠN NHẬP:</p>
                <div className="inline-flex gap-1.5 h-12 items-center px-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xl font-black text-teal-700 tracking-wider">
                  PARABOL
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-teal-100 max-w-md text-center w-full">
              <p className="text-xs text-slate-500"><strong className="text-teal-700">Câu hỏi gợi ý:</strong> <MarkdownMath content={questions[0]?.question || 'Tên đồ thị của hàm số bậc hai có dạng y = ax^2 + bx + c?'} /></p>
            </div>
          </div>
        );
      case 'mo_hop':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-blue-50 rounded-3xl p-8 border-4 border-blue-200 overflow-y-auto">
            <h3 className="text-2xl font-black text-blue-900 mb-2 uppercase">Mở Hộp Bí Mật</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-8 max-w-md text-center font-medium">Click vào chiếc hộp bất kỳ để kích hoạt câu hỏi ngẫu nhiên và chinh phục điểm số.</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl w-full">
              {[
                { num: 1, open: false, color: 'bg-rose-500 hover:bg-rose-600' },
                { num: 2, open: true, color: 'bg-indigo-500 hover:bg-indigo-600' },
                { num: 3, open: false, color: 'bg-amber-500 hover:bg-amber-600' },
                { num: 4, open: false, color: 'bg-emerald-500 hover:bg-emerald-600' }
              ].map((box, idx) => (
                <div key={idx} className={`aspect-square rounded-2xl ${box.open ? 'bg-slate-100 border-4 border-dashed border-blue-300' : box.color} flex flex-col items-center justify-center text-white font-black text-3xl shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden`}>
                  {box.open ? (
                    <div className="text-center">
                      <span className="text-4xl">🔓</span>
                      <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">Đã mở</p>
                    </div>
                  ) : (
                    <>
                      <span className="text-4xl mb-1">🎁</span>
                      <span className="text-lg text-white">Hộp {box.num}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-blue-200 max-w-xl text-center w-full">
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-bold uppercase">Hộp số 2 đang mở câu hỏi:</span>
              <p className="text-slate-700 font-bold mt-3 text-sm"><MarkdownMath content={questions[0]?.question || 'Câu hỏi nằm trong hộp quà bí mật số 2...'} /></p>
            </div>
          </div>
        );
      case 'gan_nhan_so_do':
        return (
          <div className="flex flex-col items-center justify-center h-full bg-violet-50 rounded-3xl p-8 border-4 border-violet-200 overflow-y-auto">
            <h3 className="text-2xl font-black text-violet-900 mb-2 uppercase">Gắn Nhãn Sơ Đồ</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 max-w-md text-center font-medium">Kéo thả các nhãn tên gợi ý vào đúng chấm tròn vị trí trên sơ đồ học liệu minh họa.</p>
            
            <div className="flex flex-col md:flex-row gap-8 items-center w-full max-w-4xl">
              {/* Diagram Area */}
              <div className="w-[320px] h-[240px] bg-white rounded-2xl border-4 border-violet-300 relative overflow-hidden shadow-lg flex items-center justify-center">
                <div className="absolute inset-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                  {/* Drawing geometric shape */}
                  <div className="w-0 h-0 border-l-[60px] border-l-transparent border-r-[60px] border-r-transparent border-b-[100px] border-b-violet-400 relative">
                    <div className="absolute top-[40px] left-[-40px] text-xs font-bold text-violet-900">A</div>
                    <div className="absolute top-[100px] left-[-70px] text-xs font-bold text-violet-900">B</div>
                    <div className="absolute top-[100px] right-[-70px] text-xs font-bold text-violet-900">C</div>
                  </div>
                </div>
                {/* Pins */}
                <div className="absolute top-[55px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-violet-600 border-4 border-white animate-ping" />
                <div className="absolute top-[55px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-violet-600 border-4 border-white flex items-center justify-center text-[10px] text-white font-bold">1</div>
                
                <div className="absolute bottom-[55px] left-[90px] w-6 h-6 rounded-full bg-violet-600 border-4 border-white flex items-center justify-center text-[10px] text-white font-bold">2</div>
                <div className="absolute bottom-[55px] right-[90px] w-6 h-6 rounded-full bg-violet-600 border-4 border-white flex items-center justify-center text-[10px] text-white font-bold">3</div>
              </div>
              
              {/* Labels Container */}
              <div className="flex-1 bg-white p-6 rounded-2xl border-2 border-violet-100 shadow-md w-full space-y-4">
                <p className="text-xs font-bold text-slate-500 uppercase">Danh sách nhãn tên chú thích:</p>
                <div className="flex flex-col gap-2">
                  {['Đỉnh tam giác (A)', 'Góc vuông đáy trái (B)', 'Góc nhọn đáy phải (C)'].map((label, idx) => (
                    <div key={idx} className="p-3 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl font-bold text-xs text-violet-800 cursor-pointer flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-violet-600 text-white flex items-center justify-center font-bold text-[10px]">{idx+1}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 bg-white p-4 rounded-xl border border-violet-100 max-w-xl text-center w-full">
              <p className="text-xs text-slate-600"><strong className="text-violet-700">Câu hỏi định hướng:</strong> <MarkdownMath content={questions[0]?.question || 'Xác định chính xác vị trí của các góc trong tam giác ABC phẳng...'} /></p>
            </div>
          </div>
        );
      case 'no_bong_bay':
        return (
          <div className="flex flex-col h-full bg-gradient-to-b from-rose-100 to-amber-100 rounded-3xl p-8 relative overflow-hidden border-4 border-rose-300 shadow-inner">
            <h3 className="text-2xl font-black text-rose-900 mb-2 uppercase text-center">Nổ Bóng Bay Tìm Từ</h3>
            <p className="text-slate-500 text-xs sm:text-sm mb-6 text-center font-medium">Nhấn vào quả bóng bay mang câu trả lời đúng để làm nổ bóng và ghi điểm tích lũy.</p>
            
            <div className="flex-1 flex gap-4 justify-center items-end relative min-h-[220px]">
              {[
                { text: 'Khái niệm A', color: 'bg-rose-500', delay: '0s' },
                { text: 'Khái niệm B', color: 'bg-sky-500', delay: '0.5s' },
                { text: 'Khái niệm C', color: 'bg-emerald-500', delay: '1s' },
                { text: 'Khái niệm D', color: 'bg-amber-500', delay: '1.5s' }
              ].map((balloon, idx) => (
                <div 
                  key={idx} 
                  className={`w-20 h-28 ${balloon.color} rounded-full text-white font-black text-xs p-3 text-center flex flex-col justify-between items-center shadow-lg relative animate-bounce cursor-pointer hover:scale-110 transition-transform`}
                  style={{ animationDuration: '4s', animationDelay: balloon.delay }}
                >
                  <span className="mt-2 text-[10px] uppercase leading-tight">{balloon.text}</span>
                  <div className="w-1 h-8 bg-slate-400 absolute -bottom-8 left-1/2 -translate-x-1/2" />
                </div>
              ))}
            </div>
            
            <div className="mt-12 bg-white p-6 rounded-2xl border border-rose-200 max-w-xl mx-auto text-center w-full">
              <span className="text-[10px] bg-rose-100 text-rose-700 px-3 py-1 rounded-full font-bold uppercase">Tìm quả bóng chứa:</span>
              <p className="text-slate-800 font-bold mt-2 text-sm"><MarkdownMath content={questions[0]?.question || 'Công thức tính chu vi hình tròn bán kính R...'} /></p>
            </div>
          </div>
        );
      case 'dap_chuot_chui':
        return (
          <div className="flex flex-col h-full bg-gradient-to-b from-amber-200 to-amber-400 rounded-3xl p-8 relative overflow-hidden border-4 border-amber-600 shadow-inner">
            <h3 className="text-2xl font-black text-amber-950 mb-2 uppercase text-center">Đập Chuột Chũi Đúng Sai</h3>
            <p className="text-slate-900 text-xs sm:text-sm mb-8 text-center font-medium">Búa gõ nhanh vào chú chuột nhô lên mang đáp án Đúng nhất cho mệnh đề toán học.</p>
            
            <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto w-full">
              {[
                { id: 1, text: 'Đúng', active: true },
                { id: 2, text: 'Sai', active: false },
                { id: 3, text: 'Chưa biết', active: true }
              ].map((mole, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <div className="w-24 h-12 bg-amber-900 rounded-full border-b-8 border-amber-950 flex items-center justify-center relative overflow-hidden shadow-inner">
                    {mole.active && (
                      <div className="w-16 h-16 bg-amber-700 border-4 border-amber-600 rounded-full absolute bottom-0 flex flex-col items-center justify-center text-white font-extrabold text-xs shadow-md animate-bounce cursor-pointer hover:bg-amber-600">
                        <span>🐹</span>
                        <span className="bg-amber-900/60 px-1 rounded text-[9px]">{mole.text}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-28 h-2 bg-amber-950/20 rounded-full mt-2" />
                </div>
              ))}
            </div>

            <div className="mt-8 bg-white p-6 rounded-2xl border border-amber-300 max-w-xl mx-auto text-center w-full">
              <span className="text-[10px] bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-bold uppercase">Khẳng định:</span>
              <p className="text-slate-800 font-extrabold mt-2 text-sm"><MarkdownMath content={questions[0]?.question || 'Đồ thị y = x^2 luôn có bề lõm hướng lên trên khi hệ số a > 0. Đúng hay Sai?'} /></p>
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
