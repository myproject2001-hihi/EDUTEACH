const fs = require('fs');

let code = fs.readFileSync('src/components/GamePreview.tsx', 'utf8');

// We need to add the import for mediapipe if not present.
if (!code.includes('@mediapipe/tasks-vision')) {
  code = code.replace(
    "import { CameraCapture } from './CameraCapture';",
    "import { CameraCapture } from './CameraCapture';\nimport { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';"
  );
}

const oldLiveCamera = /function LiveCamera\(\) \{[\s\S]*?return <video ref=\{videoRef\} autoPlay playsInline muted className="w-full h-full object-cover scale-x-\[-1\] absolute inset-0 z-10 opacity-70" \/>;\n\}/;

const newLiveCamera = `function LiveCamera({ onTilt }: { onTilt?: (dir: 'left' | 'right' | 'none') => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState('');
  const [isLoaded, setIsLoaded] = React.useState(false);
  
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
            if (dy > 0.05) {
               onTilt?.('left');
            } else if (dy < -0.05) {
               onTilt?.('right');
            } else {
               onTilt?.('none');
            }
          } else {
             onTilt?.('none');
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
  }, [onTilt]);

  if (error) return <div className="text-rose-500 text-xs font-bold text-center px-4 z-30">{error}</div>;
  
  return (
    <>
      {!isLoaded && <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80"><div className="text-white text-xs font-bold animate-pulse">Đang tải mô hình AI...</div></div>}
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10 opacity-70" />
    </>
  );
}`;

code = code.replace(oldLiveCamera, newLiveCamera);

// Now update GamePreview to use tilt state
if (!code.includes('const [tiltDir, setTiltDir]')) {
  code = code.replace(
    'const [capturedPoseImg, setCapturedPoseImg] = useState<string | null>(null);',
    'const [capturedPoseImg, setCapturedPoseImg] = useState<string | null>(null);\n  const [tiltDir, setTiltDir] = useState<\'left\' | \'right\' | \'none\'>(\'none\');'
  );
}

// Update the quiz_nghieng_dau case to pass onTilt and highlight the answer
const oldQuizCase = `case 'quiz_nghieng_dau':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-64 h-64 bg-slate-800 rounded-3xl overflow-hidden relative border-4 border-indigo-500 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <LiveCamera />
              <Camera className="w-16 h-16 text-white/30 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-[10px] px-2">
                Camera đang bật (Preview)
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
        );`;
        
const newQuizCase = `case 'quiz_nghieng_dau':
        return (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className={\`w-64 h-64 bg-slate-800 rounded-3xl overflow-hidden relative border-4 shadow-2xl flex items-center justify-center transition-colors duration-300 \${tiltDir === 'left' ? 'border-blue-500 shadow-blue-500/50' : tiltDir === 'right' ? 'border-rose-500 shadow-rose-500/50' : 'border-indigo-500'}\`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <LiveCamera onTilt={setTiltDir} />
              <Camera className="w-16 h-16 text-white/30 z-20" />
              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-[10px] px-2">
                {tiltDir === 'left' ? 'Đang nghiêng TRÁI' : tiltDir === 'right' ? 'Đang nghiêng PHẢI' : 'Camera đang bật (Preview)'}
              </div>
            </div>
            <div className="w-full max-w-2xl text-center mb-4">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">{questions[0]?.question || 'Câu hỏi mẫu: Đâu là thủ đô của Việt Nam?'}</h3>
              <p className="text-slate-500 text-sm">Nghiêng đầu sang trái hoặc phải để chọn đáp án</p>
            </div>
            <div className="flex w-full max-w-2xl gap-4">
              <div className={\`flex-1 rounded-2xl p-6 text-white text-center font-bold text-xl transition-all duration-300 border-4 flex flex-col justify-center min-h-[120px] \${tiltDir === 'left' ? 'bg-blue-600 border-blue-300 shadow-[0_4px_0_#1e3a8a] scale-105' : 'bg-blue-500 border-blue-400 shadow-[0_8px_0_#1e3a8a]'}\`}>
                <span className="text-3xl mb-2">⬅️</span>
                {questions[0]?.options?.[0] || 'Đáp án A'}
              </div>
              <div className={\`flex-1 rounded-2xl p-6 text-white text-center font-bold text-xl transition-all duration-300 border-4 flex flex-col justify-center min-h-[120px] \${tiltDir === 'right' ? 'bg-rose-600 border-rose-300 shadow-[0_4px_0_#be123c] scale-105' : 'bg-rose-500 border-rose-400 shadow-[0_8px_0_#be123c]'}\`}>
                <span className="text-3xl mb-2">➡️</span>
                {questions[0]?.options?.[1] || 'Đáp án B'}
              </div>
            </div>
          </div>
        );`;

if (code.includes("case 'quiz_nghieng_dau':")) {
  code = code.replace(oldQuizCase, newQuizCase);
  fs.writeFileSync('src/components/GamePreview.tsx', code);
  console.log("Updated GamePreview.tsx");
} else {
  console.log("Could not find quiz_nghieng_dau case");
}
