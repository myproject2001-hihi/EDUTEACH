import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Gamepad2, X, Play, Camera, UserCheck, Download, Check, HelpCircle, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { CameraCapture } from './CameraCapture';
import { FaceLandmarker, HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { MarkdownMath } from './MarkdownMath';
import { cleanQuestionText } from '../views/AssignmentsView';
import { HandTrackingOverlay } from './HandTrackingOverlay';
import { GameMenuOverlay } from './GameMenuOverlay';
import { VictoryFireworks } from './VictoryFireworks';
import { GameCalibration } from './GameCalibration';
import { MinesweeperGame } from './MinesweeperGame';
import { FlyingWordsGame } from './FlyingWordsGame';
import { SecretWordGame } from './SecretWordGame';
import { MemoryFlipGame } from './MemoryFlipGame';
import { KnowledgeTrainGame } from './KnowledgeTrainGame';
import { TugOfWarGame } from './TugOfWarGame';
import { WhackAMoleGame } from './WhackAMoleGame';

interface Props {
  gameType: string;
  questions: any[];
  onClose: () => void;
  isStudentMode?: boolean;
  tugOfWarMode?: 'bot' | 'pvp';
  onSubmitWork?: (score: number, correctAnswers: number, answersMap: Record<string, number>) => void;
  timeLimitRemaining?: number | null;
}


function dist2D(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Hàm xử lý logic nhận diện số lượng ngón tay giơ lên từ danh sách landmark của MediaPipe.
 * Hỗ trợ nhận diện chính xác và nhạy cho CẢ TAY TRÁI LẪN TAY PHẢI, ở mọi góc nghiêng tự nhiên.
 * 
 * Sử dụng kết hợp khoảng cách hình học bất biến (Euclidean Distance từ cổ tay và các khớp)
 * cùng với cao độ trục Y để nhận diện cử chỉ 1, 2, 3, 4 ngón tay linh hoạt.
 */
export function countRaisedFingers(landmarks: any[]): number | 'none' {
  if (!landmarks || landmarks.length < 21) return 'none';

  const wrist = landmarks[0];

  // Kiểm tra 4 ngón dài (Trỏ: 8, Giữa: 12, Áp út: 16, Út: 20)
  // Ngón tay được tính là giơ lên khi đầu ngón xa cổ tay hơn các khớp gốc (PIP/MCP) hoặc vươn lên cao
  const isFingerExtended = (tipIdx: number, pipIdx: number, mcpIdx: number) => {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];
    const distTipWrist = dist2D(tip, wrist);
    const distPipWrist = dist2D(pip, wrist);
    const distMcpWrist = dist2D(mcp, wrist);
    
    const distanceExtended = distTipWrist > distPipWrist * 1.12 && distTipWrist > distMcpWrist * 1.22;
    const verticalExtended = tip.y < pip.y && tip.y < mcp.y;
    return distanceExtended || verticalExtended;
  };

  const indexRaised = isFingerExtended(8, 6, 5);
  const middleRaised = isFingerExtended(12, 10, 9);
  const ringRaised = isFingerExtended(16, 14, 13);
  const pinkyRaised = isFingerExtended(20, 18, 17);

  // Kiểm tra Ngón Cái (Thumb: Tip 4, MCP 2, Pinky Base 17, Index Base 5)
  // Khoảng cách từ đầu ngón cái (4) đến gốc ngón út (17) hoặc gốc ngón trỏ (5) hoạt động đối xứng cho cả Tay Trái và Tay Phải
  const thumbTip = landmarks[4];
  const thumbMcp = landmarks[2];
  const pinkyMcp = landmarks[17];
  const indexMcp = landmarks[5];
  
  const distThumbToPinky = dist2D(thumbTip, pinkyMcp);
  const distThumbMcpToPinky = dist2D(thumbMcp, pinkyMcp);
  const distThumbToWrist = dist2D(thumbTip, wrist);
  const distThumbMcpToWrist = dist2D(thumbMcp, wrist);

  const thumbRaised = (distThumbToPinky > distThumbMcpToPinky * 1.25) || (distThumbToWrist > distThumbMcpToWrist * 1.2 && dist2D(thumbTip, indexMcp) > 0.08);

  let fourFingerCount = 0;
  if (indexRaised) fourFingerCount++;
  if (middleRaised) fourFingerCount++;
  if (ringRaised) fourFingerCount++;
  if (pinkyRaised) fourFingerCount++;

  const totalCount = fourFingerCount + (thumbRaised ? 1 : 0);

  // 1. Trường hợp 4 ngón chính giơ rõ ràng (1, 2, 3, 4)
  if (fourFingerCount >= 1 && fourFingerCount <= 4) {
    if (fourFingerCount === 4 && thumbRaised) return 4; // Mở cả 5 ngón = Đáp án D (4)
    return fourFingerCount;
  }

  // 2. Trường hợp giơ kết hợp ngón cái (ví dụ: ngón cái + ngón trỏ = 2, ngón cái = 1)
  if (totalCount >= 1 && totalCount <= 4) {
    return totalCount;
  }
  if (totalCount === 5) {
    return 4; // Bàn tay xòe 5 ngón -> tự động khớp đáp án 4 (D)
  }

  return 'none';
}

function SuperRaceCar({ isSpeeding }: { isSpeeding: boolean }) {
  return (
    <div className="relative flex items-center select-none">
      {/* Nitro Flame Effect behind car when speeding */}
      {isSpeeding && (
        <div className="absolute -left-6 sm:-left-10 top-1/2 -translate-y-1/2 flex items-center z-0">
          <div className="w-10 h-5 sm:w-16 sm:h-8 bg-gradient-to-r from-transparent via-amber-400 to-rose-600 rounded-full blur-[2px] animate-pulse" />
          <span className="text-xl sm:text-3xl animate-ping -ml-3">🔥</span>
        </div>
      )}

      {/* Main Beautiful Sports Racecar Graphic */}
      <svg 
        viewBox="0 0 160 70" 
        className="w-24 h-12 sm:w-36 sm:h-18 md:w-44 md:h-22 drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] filter transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="raceCarBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="25%" stopColor="#dc2626" />
            <stop offset="60%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
          <linearGradient id="raceGoldStripe" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>
          <linearGradient id="raceGlassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>
          <radialGradient id="raceWheelRim" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#94a3b8" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Dynamic Shadow */}
        <ellipse cx="80" cy="62" rx="72" ry="5" fill="rgba(0,0,0,0.6)" filter="blur(2px)" />

        {/* Rear Wing / Aerodynamic Spoiler */}
        <path d="M 8 28 L 22 28 L 26 36 L 12 36 Z" fill="#7f1d1d" />
        <rect x="5" y="24" width="22" height="5" rx="2.5" fill="#ef4444" stroke="#fbbf24" strokeWidth="1" />

        {/* Aerodynamic Chassis */}
        <path 
          d="M 12 46 
             L 28 42 
             L 52 30 
             C 65 24, 90 24, 108 34 
             L 138 42 
             C 152 45, 158 50, 155 54 
             L 142 56 
             L 125 56 
             C 123 48, 111 48, 109 56 
             L 55 56 
             C 53 48, 41 48, 39 56 
             L 12 56 
             C 8 54, 8 48, 12 46 Z" 
          fill="url(#raceCarBody)" 
          stroke="#7f1d1d" 
          strokeWidth="1.5"
        />

        {/* Racing Gold Side Stripe */}
        <path 
          d="M 28 46 L 140 46 L 132 50 L 26 50 Z" 
          fill="url(#raceGoldStripe)" 
        />

        {/* Cockpit / Glass Canopy */}
        <path 
          d="M 56 32 
             L 76 25 
             C 88 25, 96 28, 102 34 
             L 66 35 Z" 
          fill="url(#raceGlassGrad)" 
          opacity="0.9"
        />
        <path d="M 60 31 L 76 26 L 73 33 Z" fill="#ffffff" opacity="0.6" />

        {/* Driver Helmet */}
        <circle cx="76" cy="29" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
        <path d="M 76 27 L 81 29 L 77 31 Z" fill="#0f172a" />

        {/* Front Splitter / Nose Wing */}
        <path d="M 145 52 L 158 52 L 156 56 L 142 56 Z" fill="#1e293b" />

        {/* Glowing Headlight */}
        <polygon points="152,48 160,46 160,54 152,52" fill="#38bdf8" opacity="0.95" />
        <ellipse cx="152" cy="50" rx="3" ry="2" fill="#f8fafc" />

        {/* Racing Decal Number #1 */}
        <circle cx="82" cy="48" r="7" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
        <text x="82" y="52" textAnchor="middle" fontSize="9" fontWeight="900" fill="#dc2626" fontFamily="sans-serif">1</text>

        {/* Rear Wheel */}
        <g transform="translate(47, 54)">
          <circle cx="0" cy="0" r="11" fill="#18181b" stroke="#09090b" strokeWidth="2" />
          <circle cx="0" cy="0" r="7" fill="url(#raceWheelRim)" />
          <circle cx="0" cy="0" r="3" fill="#ef4444" />
        </g>

        {/* Front Wheel */}
        <g transform="translate(117, 54)">
          <circle cx="0" cy="0" r="11" fill="#18181b" stroke="#09090b" strokeWidth="2" />
          <circle cx="0" cy="0" r="7" fill="url(#raceWheelRim)" />
          <circle cx="0" cy="0" r="3" fill="#ef4444" />
        </g>
      </svg>
    </div>
  );
}


function LiveCamera({ 
  mode, 
  onTilt, 
  onFingerCount 
}: { 
  mode: 'face' | 'hand'; 
  onTilt?: (dir: 'left' | 'right' | 'up' | 'down' | 'none') => void;
  onFingerCount?: (count: number | 'none') => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [error, setError] = React.useState('');
  const [isLoaded, setIsLoaded] = React.useState(false);
  
  const onTiltRef = React.useRef(onTilt);
  const onFingerCountRef = React.useRef(onFingerCount);
  React.useEffect(() => { onTiltRef.current = onTilt; }, [onTilt]);
  React.useEffect(() => { onFingerCountRef.current = onFingerCount; }, [onFingerCount]);
  
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let faceLandmarker: FaceLandmarker | null = null;
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;
    let isActive = true;
    
    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        
        if (mode === 'face') {
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
            console.warn("GPU delegate failed, falling back to CPU for FaceLandmarker", gpuErr);
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
        } else {
          try {
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "GPU"
              },
              runningMode: "VIDEO",
              numHands: 2
            });
          } catch (gpuErr) {
            console.warn("GPU delegate failed, falling back to CPU for HandLandmarker", gpuErr);
            handLandmarker = await HandLandmarker.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                delegate: "CPU"
              },
              runningMode: "VIDEO",
              numHands: 2
            });
          }
        }
        
        if (isActive) setIsLoaded(true);
      } catch (err) {
        console.error("MediaPipe load error", err);
        setError("Không thể tải mô hình nhận diện AI. Vui lòng kiểm tra kết nối mạng.");
      }
    }
    
    initMediaPipe();

    const startUserMedia = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
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
    let lastInferTime = 0;
    const INFER_INTERVAL_MS = 45; // Run AI detection at ~22 FPS to free CPU/GPU for smooth 60 FPS UI

    function predictWebcam() {
      if (videoRef.current && isActive) {
        const now = performance.now();
        if (now - lastInferTime >= INFER_INTERVAL_MS && lastVideoTime !== videoRef.current.currentTime) {
          lastInferTime = now;
          lastVideoTime = videoRef.current.currentTime;
          let startTimeMs = performance.now();
          
          if (mode === 'face' && faceLandmarker) {
            const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
              const landmarks = results.faceLandmarks[0];
              const leftEye = landmarks[33]; // Person's left eye
              const rightEye = landmarks[263]; // Person's right eye
              const forehead = landmarks[10];
              const chin = landmarks[152];
              const nose = landmarks[4];
              
              // 1. Calculate eye distance as reference
              const dx = rightEye.x - leftEye.x;
              const dy = rightEye.y - leftEye.y;
              const eyeDistance = Math.sqrt(dx * dx + dy * dy);
              
              // 2. Roll (left/right tilt) - fully scale invariant
              const rollRatio = dy / Math.max(eyeDistance, 0.01);
              
              // 3. Pitch (up/down tilt) - fully scale invariant (nose relative to forehead/chin height)
              const faceHeight = chin.y - forehead.y;
              const noseYRel = (nose.y - forehead.y) / Math.max(faceHeight, 0.01);
              
              // Enhanced sensitivity (threshold 0.09 ~ 5 degrees tilt)
              if (rollRatio > 0.09) {
                 onTiltRef.current?.('left');
              } else if (rollRatio < -0.09) {
                 onTiltRef.current?.('right');
              } else if (noseYRel < 0.46) {
                 onTiltRef.current?.('up');
              } else if (noseYRel > 0.54) {
                 onTiltRef.current?.('down');
              } else {
                 onTiltRef.current?.('none');
              }
            } else {
               onTiltRef.current?.('none');
            }
          } else if (mode === 'hand' && handLandmarker) {
            const results = handLandmarker.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.landmarks && results.landmarks.length > 0) {
              let detectedCount: number | 'none' = 'none';
              // Check detected hands (left or right hand)
              for (const handLandmarks of results.landmarks) {
                const count = countRaisedFingers(handLandmarks);
                if (count !== 'none') {
                  detectedCount = count;
                  break;
                }
              }
              onFingerCountRef.current?.(detectedCount);
            } else {
              onFingerCountRef.current?.('none');
            }
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
      if (handLandmarker) handLandmarker.close();
    };
  }, [mode]);

  if (error) return <div className="text-rose-500 text-xs font-bold text-center px-4 z-30">{error}</div>;
  
  return (
    <>
      {!isLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 p-4">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <div className="text-white text-xs font-bold animate-pulse text-center">
            Đang khởi tạo AI {mode === 'face' ? 'Khuôn mặt' : 'Bàn tay'}...
          </div>
        </div>
      )}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="w-full h-full object-cover scale-x-[-1] absolute inset-0 z-10 opacity-90" 
      />
    </>
  );
}

export function GamePreview({ gameType, questions, onClose, isStudentMode = false, tugOfWarMode, onSubmitWork, timeLimitRemaining }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [showGameCamera, setShowGameCamera] = useState(false);
  const [capturedPoseImg, setCapturedPoseImg] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(true);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        try {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } catch (err) {
          console.warn("Fullscreen request failed:", err);
          setIsFullscreen(true);
        }
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        try {
          await document.exitFullscreen();
          setIsFullscreen(false);
        } catch (err) {
          console.warn("Fullscreen exit failed:", err);
          setIsFullscreen(false);
        }
      } else {
        setIsFullscreen(false);
      }
    }
  };
  const [tiltDir, setTiltDir] = useState<'left' | 'right' | 'up' | 'down' | 'none'>('none');
  const [fingerCount, setFingerCount] = useState<number | 'none'>('none');
  const [isCalibrated, setIsCalibrated] = useState(false);
  
  const [frameTick, setFrameTick] = useState(0);
  const [tiltFrameTick, setTiltFrameTick] = useState(0);

  const handleFingerCount = (count: number | 'none') => {
    setFingerCount(count);
    setFrameTick(prev => prev + 1);
  };

  const handleTilt = (dir: 'left' | 'right' | 'up' | 'down' | 'none') => {
    setTiltDir(dir);
    setTiltFrameTick(prev => prev + 1);
  };
  
  const [consecutiveTilt, setConsecutiveTilt] = useState<{ dir: 'left' | 'right' | 'up' | 'down' | 'none'; count: number }>({ dir: 'none', count: 0 });
  const [consecutiveFinger, setConsecutiveFinger] = useState<{ count: number | 'none'; frames: number }>({ count: 'none', frames: 0 });
  
  const missedFingerFramesRef = React.useRef<number>(0);
  const missedTiltFramesRef = React.useRef<number>(0);
  const isProcessingAnswerRef = React.useRef<boolean>(false);
  const answeredQuestionIndicesRef = React.useRef<Set<number>>(new Set());
  
  // Game logic state
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback((type: 'car_speed' | 'victory' | 'correct' | 'wrong') => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'car_speed') {
        // 1. Sport Car Engine Acceleration & Turbo Nitro Boost
        const engineOsc = ctx.createOscillator();
        const engineGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(1600, now + 0.45);

        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(115, now);
        engineOsc.frequency.exponentialRampToValueAtTime(290, now + 0.18);
        engineOsc.frequency.exponentialRampToValueAtTime(460, now + 0.45);

        engineGain.gain.setValueAtTime(0.01, now);
        engineGain.gain.linearRampToValueAtTime(0.25, now + 0.08);
        engineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(ctx.destination);

        engineOsc.start(now);
        engineOsc.stop(now + 0.58);

        // 2. Playful Nitro Swoosh Whoosh
        const swooshOsc = ctx.createOscillator();
        const swooshGain = ctx.createGain();
        swooshOsc.type = 'sine';
        swooshOsc.frequency.setValueAtTime(320, now + 0.05);
        swooshOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.35);

        swooshGain.gain.setValueAtTime(0.01, now + 0.05);
        swooshGain.gain.linearRampToValueAtTime(0.2, now + 0.15);
        swooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        swooshOsc.connect(swooshGain);
        swooshGain.connect(ctx.destination);
        swooshOsc.start(now + 0.05);
        swooshOsc.stop(now + 0.5);

        // 3. Bright Arcade Chimes
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'triangle';
        chimeOsc.frequency.setValueAtTime(587.33, now + 0.12); // D5
        chimeOsc.frequency.setValueAtTime(880.00, now + 0.24); // A5
        chimeOsc.frequency.setValueAtTime(1174.66, now + 0.36); // D6

        chimeGain.gain.setValueAtTime(0.01, now + 0.12);
        chimeGain.gain.linearRampToValueAtTime(0.22, now + 0.22);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(ctx.destination);
        chimeOsc.start(now + 0.12);
        chimeOsc.stop(now + 0.65);
      } else if (type === 'victory') {
        // Triumphant Victory Brass Fanfare & Melodic Arpeggio
        const notes = [
          { f: 523.25, t: 0, d: 0.16 },    // C5
          { f: 659.25, t: 0.16, d: 0.16 }, // E5
          { f: 783.99, t: 0.32, d: 0.16 }, // G5
          { f: 1046.50, t: 0.48, d: 0.5 }, // C6
          { f: 1318.51, t: 1.0, d: 0.18 }, // E6
          { f: 1567.98, t: 1.2, d: 0.6 }  // G6
        ];

        notes.forEach(({ f, t, d }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0.01, now + t);
          gain.gain.linearRampToValueAtTime(0.3, now + t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + t);
          osc.stop(now + t + d);
        });

        // Warm celebratory brass swell
        const brassOsc = ctx.createOscillator();
        const brassGain = ctx.createGain();
        brassOsc.type = 'sawtooth';
        brassOsc.frequency.setValueAtTime(261.63, now + 0.48); // C4
        brassOsc.frequency.setValueAtTime(523.25, now + 1.0);  // C5
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now + 0.48);
        filter.frequency.exponentialRampToValueAtTime(1600, now + 1.2);

        brassGain.gain.setValueAtTime(0.01, now + 0.48);
        brassGain.gain.linearRampToValueAtTime(0.2, now + 0.65);
        brassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.9);

        brassOsc.connect(filter);
        filter.connect(brassGain);
        brassGain.connect(ctx.destination);
        brassOsc.start(now + 0.48);
        brassOsc.stop(now + 1.9);
      } else if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880.00, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(150, now + 0.14);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.32);
      }
    } catch {
      // Ignore audio synthesis errors
    }
  }, [isMuted, getAudioContext]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answerStatus, setAnswerStatus] = useState<'none' | 'correct' | 'wrong'>('none');
  const [showFireworks, setShowFireworks] = useState(false);
  const [showVictoryFireworks, setShowVictoryFireworks] = useState(false);
  const [lockedAnswer, setLockedAnswer] = useState<'left' | 'right' | 'up' | 'down' | 'none'>('none');
  const [isFinished, setIsFinished] = useState(false);
  const [isCrossingFinish, setIsCrossingFinish] = useState(false);
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
    if (isProcessingAnswerRef.current || answerStatus !== 'none' || isFinished) return;
    const question = gameQuestions[currentQuestionIndex];
    if (!question) return;

    isProcessingAnswerRef.current = true;

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
      if (gameType === 'cuoc_dua_ngon_tay') {
        playSound('car_speed');
      } else {
        playSound('correct');
      }
    } else {
      playSound('wrong');
    }

    if (isCorrect && !answeredQuestionIndicesRef.current.has(currentQuestionIndex)) {
      answeredQuestionIndicesRef.current.add(currentQuestionIndex);
      setCorrectAnswersCount(prev => Math.min(prev + 1, gameQuestions.length));
      setShowFireworks(true);
    }
    
    setAnswersMap(prev => ({
      ...prev,
      [question.id || `q_${currentQuestionIndex}`]: selectedIndex
    }));

    setAnswerStatus(isCorrect ? 'correct' : 'wrong');
    
    setTimeout(() => {
       isProcessingAnswerRef.current = false;
       setAnswerStatus('none');
       setShowFireworks(false);
       setConsecutiveTilt({ dir: 'none', count: 0 });
       setConsecutiveFinger({ count: 'none', frames: 0 });
       if (currentQuestionIndex < gameQuestions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
       } else {
          if (gameType === 'cuoc_dua_ngon_tay') {
             setIsCrossingFinish(true);
             setShowVictoryFireworks(true);
             playSound('victory');
             setTimeout(() => {
                setIsFinished(true);
             }, 2600);
          } else {
             setIsFinished(true); // Complete the game!
             setShowVictoryFireworks(true);
             playSound('victory');
          }
       }
    }, 1500);
  };

  // 1. Process head tilt with consecutive frame trigger (stable & noise-free)
  React.useEffect(() => {
    if (gameType !== 'quiz_nghieng_dau') return;
    if (answerStatus !== 'none' || isFinished) return;
    
    if (tiltDir === 'none') {
      missedTiltFramesRef.current += 1;
      if (missedTiltFramesRef.current > 4) {
        setConsecutiveTilt({ dir: 'none', count: 0 });
      }
      return;
    }
    
    missedTiltFramesRef.current = 0;
    setConsecutiveTilt(prev => {
      if (prev.dir === tiltDir) {
        const nextCount = prev.count + 1;
        // Require 4 consecutive frames of consistent direction (approx 120ms) to confirm
        if (nextCount === 4 && lockedAnswer === 'none' && isCalibrated) {
          const question = gameQuestions[currentQuestionIndex];
          if (question) {
            let selectedIndex = 0;
            if (tiltDir === 'left') selectedIndex = 0;
            else if (tiltDir === 'right') selectedIndex = 1;
            else if (tiltDir === 'up') selectedIndex = 2;
            else if (tiltDir === 'down') selectedIndex = 3;
            
            if (selectedIndex < (question.options?.length || 2)) {
              handleOptionClick(selectedIndex);
            }
          }
        }
        return { dir: tiltDir, count: nextCount };
      } else {
        return { dir: tiltDir, count: 1 };
      }
    });
  }, [tiltDir, answerStatus, gameType, currentQuestionIndex, gameQuestions, isFinished, lockedAnswer, isCalibrated, tiltFrameTick]);

  // 2. Process finger count with consecutive frame trigger (stable & noise-free)
  React.useEffect(() => {
    if (gameType !== 'cuoc_dua_ngon_tay') return;
    if (answerStatus !== 'none' || isFinished) return;
    
    if (fingerCount === 'none') {
      missedFingerFramesRef.current += 1;
      if (missedFingerFramesRef.current > 4) {
        setConsecutiveFinger({ count: 'none', frames: 0 });
      }
      return;
    }
    
    missedFingerFramesRef.current = 0;
    setConsecutiveFinger(prev => {
      if (prev.count === fingerCount) {
        const nextFrames = prev.frames + 1;
        // Require 10 consecutive frames of consistent finger count (approx 330ms) to confirm
        if (nextFrames === 10 && lockedAnswer === 'none' && isCalibrated) {
          const question = gameQuestions[currentQuestionIndex];
          if (question) {
            const selectedIndex = fingerCount - 1; // 1 finger = A (0), 2 = B (1), 3 = C (2), 4 = D (3)
            if (selectedIndex >= 0 && selectedIndex < (question.options?.length || 4)) {
              handleOptionClick(selectedIndex);
            }
          }
        }
        return { count: fingerCount, frames: nextFrames };
      } else {
        return { count: fingerCount, frames: 1 };
      }
    });
  }, [fingerCount, answerStatus, gameType, currentQuestionIndex, gameQuestions, isFinished, lockedAnswer, isCalibrated, frameTick]);


  useEffect(() => {
    if (timeLimitRemaining === 0 && !isFinished) {
      setIsFinished(true);
      const safeCorrectCount = Math.min(correctAnswersCount, gameQuestions.length);
      const score = gameQuestions.length > 0 ? Math.min(10, Math.max(0, Math.round((safeCorrectCount / gameQuestions.length) * 10))) : 10;
      if (onSubmitWork) {
        onSubmitWork(score, safeCorrectCount, answersMap);
      } else {
        onClose();
      }
    }
  }, [timeLimitRemaining, isFinished, gameQuestions.length, correctAnswersCount, answersMap, onSubmitWork, onClose]);

  const renderGameContent = () => {
    if (isFinished) {
      const safeCorrectCount = Math.min(correctAnswersCount, gameQuestions.length);
      const score = gameQuestions.length > 0 ? Math.min(10, Math.max(0, Math.round((safeCorrectCount / gameQuestions.length) * 10))) : 10;
      const pointsToEarn = score * 10;
      
      const handleFinishSubmit = () => {
        if (onSubmitWork) {
          // Submit the student's work
          onSubmitWork(score, safeCorrectCount, answersMap);
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
                {safeCorrectCount} / {gameQuestions.length}
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
              <LiveCamera mode="face" onTilt={answerStatus === 'none' ? handleTilt : undefined} />
              
              {consecutiveTilt.count > 0 && consecutiveTilt.dir !== 'none' && (
                <div className="absolute inset-x-0 bottom-0 h-2 bg-slate-700 z-20">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-75 animate-pulse" 
                    style={{ width: `${Math.min((consecutiveTilt.count / 4) * 100, 100)}%` }} 
                  />
                </div>
              )}

              <div className="absolute bottom-4 left-0 right-0 text-center z-20 text-white font-bold text-[10px] px-2">
                {answerStatus !== 'none' ? '🏁 Đã khóa đáp án!' : 
                 tiltDir === 'left' ? `Đang nghiêng TRÁI (A) - ${Math.round(Math.min((consecutiveTilt.count / 4) * 100, 100))}%` : 
                 tiltDir === 'right' ? `Đang nghiêng PHẢI (B) - ${Math.round(Math.min((consecutiveTilt.count / 4) * 100, 100))}%` : 
                 tiltDir === 'up' ? `Đang ngẩng LÊN (C) - ${Math.round(Math.min((consecutiveTilt.count / 4) * 100, 100))}%` : 
                 tiltDir === 'down' ? `Đang gật XUỐNG (D) - ${Math.round(Math.min((consecutiveTilt.count / 4) * 100, 100))}%` : 
                 'Nghiêng đầu để chọn đáp án'}
              </div>
            </div>
            <div className="w-full max-w-2xl text-center mb-2 flex flex-col items-center">
              {currentQ.image && (
                <div className="max-h-[30vh] mb-4 mx-auto overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white p-1">
                  <img src={currentQ.image} alt="Question" referrerPolicy="no-referrer" className="max-h-[25vh] w-auto object-contain rounded-lg" />
                </div>
              )}
              <div className="text-xl sm:text-2xl font-bold text-slate-800 mb-2"><MarkdownMath content={cleanQuestionText(currentQ?.question) || 'Câu hỏi mẫu: Đâu là thủ đô của Việt Nam?'} /></div>
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
              
              <div className="bg-white/80 p-5 sm:p-6 rounded-xl border-2 border-[#8B4513] mb-6 flex flex-col items-center justify-center gap-3">
                {mapQ.image && (
                  <div className="max-h-[30vh] overflow-hidden rounded-lg border border-[#8B4513]/30 bg-white p-1">
                    <img src={mapQ.image} alt="Question" referrerPolicy="no-referrer" className="max-h-[25vh] w-auto object-contain rounded-md" />
                  </div>
                )}
                <div className="text-[#5c2e0e] font-bold text-lg sm:text-xl">
                  <MarkdownMath content={cleanQuestionText(mapQ?.question) || 'Nội dung câu hỏi...'} />
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
        const carProgressRatio = gameQuestions.length > 0 ? (correctAnswersCount / gameQuestions.length) : 0;
        const carPositionPercent = isCrossingFinish 
          ? 85 
          : Math.min(Math.max(4 + carProgressRatio * 68, 4), 72);

        return (
          <div className="flex flex-col h-full min-h-[460px] bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200 rounded-2xl sm:rounded-3xl p-3 sm:p-5 relative overflow-y-auto lg:overflow-hidden border-2 sm:border-4 border-sky-500 shadow-inner pb-24 sm:pb-28">
            {/* Top Status Badges */}
            <div className="flex justify-between items-center w-full px-1 sm:px-4 z-20 shrink-0 mb-3 sm:mb-4 gap-2">
              <div className="bg-white/95 backdrop-blur px-3 py-1.5 sm:px-5 sm:py-2 rounded-full font-black text-xs sm:text-base text-slate-800 shadow-md border border-slate-200 flex items-center gap-1.5">
                <span className="text-base sm:text-lg">🏎️</span>
                <span>Quãng đường: <span className="text-amber-600 font-black">{correctAnswersCount * 100}m</span></span>
              </div>
              
              <div className="bg-white/95 backdrop-blur px-3 py-1.5 sm:px-5 sm:py-2 rounded-full font-black text-xs sm:text-base text-slate-800 shadow-md border border-slate-200 flex items-center gap-1.5">
                <span className="text-base sm:text-lg">🏁</span>
                <span>Câu {currentQuestionIndex + 1} / {gameQuestions.length}</span>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-center gap-3 sm:gap-6 z-10 w-full max-w-6xl mx-auto min-h-0">
              {/* Left: Question Box */}
              <div className="bg-white p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex-1 flex flex-col justify-between border-2 sm:border-4 border-slate-800 relative min-h-[280px] sm:min-h-[340px]">
                {isCalibrated ? (
                  <>
                    <div className="flex justify-between items-center w-full text-[10px] sm:text-xs font-extrabold text-slate-400 mb-2 uppercase tracking-wider">
                      <span>Tiến trình chặng đua</span>
                      {answerStatus !== 'none' && (
                        <span className={`text-xs sm:text-sm font-black animate-bounce ${answerStatus === 'correct' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {answerStatus === 'correct' ? '🎉 Bứt tốc +100m!' : '❌ Chưa chính xác!'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 sm:gap-3 py-2">
                      {raceQ.image && (
                        <div className="max-h-[22vh] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                          <img src={raceQ.image} alt="Question" referrerPolicy="no-referrer" className="max-h-[20vh] w-auto object-contain rounded-lg" />
                        </div>
                      )}
                      <div className="text-sm sm:text-xl md:text-2xl font-black text-slate-800 text-center leading-snug">
                        <MarkdownMath content={cleanQuestionText(raceQ?.question) || 'Câu hỏi đua xe...'} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3.5 w-full mt-2">
                      {(raceQ?.options || ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']).slice(0,4).map((opt: string, i: number) => (
                        <button 
                          key={i} 
                          type="button"
                          onClick={() => handleOptionClick(i)}
                          className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl text-white font-bold text-xs sm:text-base shadow-[0_4px_0_rgba(0,0,0,0.25)] active:translate-y-1 active:shadow-none transition-all flex flex-col items-center justify-center relative min-h-[52px] sm:min-h-[64px] touch-manipulation cursor-pointer hover:brightness-105 active:scale-95 ${
                            i===0 ? 'bg-rose-500 border-2 border-rose-700' : i===1 ? 'bg-blue-500 border-2 border-blue-700' : i===2 ? 'bg-amber-500 border-2 border-amber-700' : 'bg-emerald-500 border-2 border-emerald-700'
                          }`}
                        >
                          <span className="absolute top-1 left-2 text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-white/90">
                            {i === 0 ? '☝️ 1 ngón' : i === 1 ? '✌️ 2 ngón' : i === 2 ? '🤟 3 ngón' : '✋ 4 ngón'}
                          </span>
                          <div className="mt-2 text-center break-words max-w-full px-1"><MarkdownMath content={opt} /></div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <GameCalibration 
                    onComplete={() => setIsCalibrated(true)}
                    videoElement={null}
                    detectedFinger={fingerCount}
                    consecutiveFrames={consecutiveFinger.frames}
                  />
                )}
              </div>

              {/* Right: Camera Hand Tracking Box */}
              <div className="w-full lg:w-80 h-44 sm:h-56 lg:h-auto min-h-[160px] lg:min-h-[300px] bg-slate-900 border-2 sm:border-4 border-sky-600 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden shrink-0 flex items-center justify-center transition-all duration-300">
                <LiveCamera mode="hand" onFingerCount={answerStatus === 'none' ? handleFingerCount : undefined} />
                <HandTrackingOverlay 
                  fingerCount={fingerCount} 
                  consecutiveFrames={consecutiveFinger.frames} 
                  maxRequiredFrames={10} 
                  answerStatus={answerStatus} 
                />
              </div>
            </div>

            {/* Finish Crossing Banner */}
            {isCrossingFinish && (
              <div className="absolute inset-0 z-30 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none px-4">
                <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 p-1.5 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-bounce">
                  <div className="bg-slate-950 px-6 py-5 sm:px-12 sm:py-8 rounded-[20px] flex flex-col items-center gap-2 border border-amber-400/40">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl sm:text-5xl animate-spin">🏆</span>
                      <span className="text-3xl sm:text-5xl animate-pulse">🏁</span>
                    </div>
                    <h3 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-white uppercase tracking-wider text-center">
                      CÁN ĐÍCH XUẤT SẮC!
                    </h3>
                    <p className="text-xs sm:text-base font-bold text-amber-300 text-center">
                      🏎️ Siêu xe tăng tốc tối đa vượt qua vạch đích!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Single Racer Highway Track (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 h-20 sm:h-24 bg-slate-950 border-t-4 border-amber-400 flex flex-col justify-between px-3 sm:px-6 z-0 shadow-2xl">
              {/* Top Track Header: Xuất Phát & Về Đích - Raised up away from the dashed line */}
              <div className="flex justify-between items-center w-full pt-1 sm:pt-1.5 z-20">
                <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur px-2 sm:px-3 py-0.5 rounded-md border border-amber-400/50 shadow">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[9px] sm:text-[11px] font-black text-amber-300 uppercase tracking-widest">
                    🚦 XUẤT PHÁT
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur px-2 sm:px-3 py-0.5 rounded-md border border-emerald-400/50 shadow">
                  <span className="text-xs sm:text-sm animate-pulse">🏁</span>
                  <span className="text-[9px] sm:text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                    VỀ ĐÍCH
                  </span>
                </div>
              </div>

              {/* Asphalt Lane Dashed Line (in middle of the highway) */}
              <div className="w-full relative my-auto">
                <div className="h-0 border-t-2 sm:border-t-3 border-dashed border-amber-300/80 w-full" />
              </div>

              {/* Bottom Curb Pattern (Red/White Racing Kerbs) */}
              <div className="h-1.5 w-full flex overflow-hidden opacity-60">
                {Array.from({ length: 40 }).map((_, idx) => (
                  <div key={idx} className={`h-full flex-1 ${idx % 2 === 0 ? 'bg-rose-500' : 'bg-white'}`} />
                ))}
              </div>
            </div>

            {/* Player Racer Car */}
            <div 
              className="absolute bottom-1 sm:bottom-2 z-10 flex items-center pointer-events-none"
              style={{ 
                left: `${carPositionPercent}%`, 
                transform: 'translateX(-25%)',
                transition: isCrossingFinish 
                  ? 'left 2.3s cubic-bezier(0.22, 1, 0.36, 1)' 
                  : 'left 0.8s ease-out'
              }}
            >
              <SuperRaceCar isSpeeding={answerStatus === 'correct' || isCrossingFinish} />
            </div>
          </div>
        );
      case 'do_min':
        return (
          <MinesweeperGame 
            questions={gameQuestions}
            onClose={onClose}
            isStudentMode={isStudentMode}
            onSubmitWork={onSubmitWork}
          />
        );
      case 'doan_tau_tri_thuc':
        return (
          <KnowledgeTrainGame
            questions={gameQuestions}
            onClose={onClose}
            isStudentMode={isStudentMode}
            onSubmitWork={onSubmitWork}
          />
        );
      case 'keo_co':
        return (
          <TugOfWarGame
            questions={gameQuestions}
            onClose={onClose}
            isStudentMode={isStudentMode}
            tugOfWarMode={tugOfWarMode}
            onSubmitWork={onSubmitWork}
          />
        );
      case 'tu_ngu_biet_bay':
        return (
          <FlyingWordsGame
            questions={gameQuestions}
            onClose={onClose}
            isStudentMode={isStudentMode}
            onSubmitWork={onSubmitWork}
          />
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
          <SecretWordGame
            questions={gameQuestions}
            onClose={onClose}
            isStudentMode={isStudentMode}
            onSubmitWork={onSubmitWork}
          />
        );
      case 'lat_manh_ghep':
        return (
          <MemoryFlipGame
            questions={gameQuestions}
            onClose={onClose}
            isStudentMode={isStudentMode}
            onSubmitWork={onSubmitWork}
          />
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
          <WhackAMoleGame
            questions={gameQuestions}
            onClose={onClose}
            isStudentMode={isStudentMode}
            onSubmitWork={onSubmitWork}
            isReady={!isHelpOpen}
          />
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
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-[10000] bg-slate-900/95 backdrop-blur-md flex items-center justify-center ${
        isFullscreen ? 'p-0 w-screen h-screen' : 'p-1 sm:p-2'
      }`}
    >
      <div className={`bg-slate-100 w-full h-full max-w-full max-h-full overflow-hidden flex flex-col relative border border-slate-700 ${
        isFullscreen ? 'rounded-none border-0' : 'rounded-2xl shadow-2xl'
      }`}>
        <div className="h-12 sm:h-14 bg-slate-900 flex items-center justify-between px-3 sm:px-6 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500" />
            </div>
            <span className="text-slate-300 font-bold text-xs sm:text-sm ml-2 sm:ml-4 uppercase tracking-wider flex items-center gap-1.5 truncate">
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{isStudentMode ? '🎮 Đang Chơi Game' : 'Chế độ Xem trước'}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                if (!nextMuted) {
                  playSound('correct');
                }
              }}
              className={`p-1.5 sm:px-3 rounded-xl transition-all duration-200 group flex items-center gap-1.5 shrink-0 border ${
                isMuted
                  ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  : 'bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border-indigo-400/40 shadow-sm'
              }`}
              title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline text-slate-400">Tắt âm</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-indigo-300 group-hover:scale-110 transition-transform animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden sm:inline text-indigo-200">Âm thanh</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-1.5 sm:px-3 rounded-xl transition-all duration-200 group flex items-center gap-1.5 shrink-0 border ${
                isFullscreen
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500/50 shadow-sm'
              }`}
              title={isFullscreen ? "Thu nhỏ (Esc)" : "Phóng to toàn màn hình"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider hidden sm:inline text-amber-200">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">Phóng to</span>
                </>
              )}
            </button>
            <button 
              onClick={() => setIsHelpOpen(true)} 
              className="p-1.5 sm:px-3 bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all duration-200 group flex items-center gap-1.5 shrink-0"
            >
              <HelpCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-indigo-400 group-hover:text-white group-hover:scale-110 transition-all" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider hidden sm:inline">Cách Chơi</span>
            </button>
            <button onClick={onClose} className="p-1.5 bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white rounded-full transition-colors group shrink-0">
              <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
            </button>
          </div>
        </div>
        <div className="flex-1 p-2 sm:p-4 relative overflow-hidden flex flex-col min-h-0">
          {renderGameContent()}
          <GameMenuOverlay 
            gameType={gameType} 
            isOpen={isHelpOpen} 
            onClose={() => setIsHelpOpen(false)} 
          />
          <VictoryFireworks active={showFireworks} type="burst" />
          <VictoryFireworks active={showVictoryFireworks} type="victory" />
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
