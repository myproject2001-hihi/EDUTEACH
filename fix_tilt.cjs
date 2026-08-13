const fs = require('fs');
let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

// 1. Fix LiveCamera onTilt dependency by using a ref
const oldLiveCamera = /function LiveCamera\(\{ onTilt \}: \{ onTilt\?: \(dir: 'left' \| 'right' \| 'none'\) => void \}\) \{[\s\S]*?return \([\s\S]*?<\/>\);\n\}/;

const newLiveCamera = `function LiveCamera({ onTilt }: { onTilt?: (dir: 'left' | 'right' | 'none') => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState('');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const onTiltRef = React.useRef(onTilt);
  
  React.useEffect(() => {
    onTiltRef.current = onTilt;
  }, [onTilt]);
  
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
            // More sensitive threshold for easier playing
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
  }, []); // Remove onTilt from deps

  if (error) return <div className="text-rose-500 text-xs font-bold text-center px-4 z-30">{error}</div>;
  
  return (
    <>
      {!isLoaded && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80"><div className="text-white text-xs font-bold animate-pulse">Đang tải mô hình AI...</div></div>}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10 opacity-70" />
    </>
  );
}`;

if (oldLiveCamera.test(code)) {
    code = code.replace(oldLiveCamera, newLiveCamera);
} else {
    console.log("Could not find LiveCamera!");
}

// 2. Adjust game logic: require less hold time or use immediate trigger.
// It's a game, immediate trigger is snappier, but let's do 100ms or just instantly.
// Wait, a quick 100ms timer is enough, or just trigger immediately. 
// Let's use 200ms to avoid micro-tilts.

const oldLogic = /const timer = setTimeout\(\(\) => \{[\s\S]*?\}, 500\); \/\/ require holding for 500ms/;
const newLogic = `const timer = setTimeout(() => {
       const question = questions[currentQuestionIndex];
       if (!question) return;
       
       const selectedIndex = tiltDir === 'left' ? 0 : 1;
       let isCorrect = false;
       
       if (typeof question.correctAnswer === 'number') {
           isCorrect = question.correctAnswer === selectedIndex;
       } else if (typeof question.correctAnswer === 'string') {
           isCorrect = question.correctAnswer === String.fromCharCode(65 + selectedIndex) || question.correctAnswer === String(selectedIndex);
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
       
    }, 100); // 100ms hold is much easier to trigger`;

if (oldLogic.test(code)) {
    code = code.replace(oldLogic, newLogic);
} else {
    console.log("Could not find Game logic timeout!");
}

fs.writeFileSync('src/components/GamePreview.tsx', code);
