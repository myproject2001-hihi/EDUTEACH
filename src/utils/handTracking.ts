import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let handLandmarkerInstance: HandLandmarker | null = null;
let isInitializing = false;
let initPromise: Promise<HandLandmarker> | null = null;

/**
 * Khởi tạo và tải mô hình nhận diện bàn tay (HandLandmarker) từ CDN của Google MediaPipe.
 * Sử dụng cơ chế Singleton để đảm bảo mô hình chỉ được tải một lần duy nhất.
 */
export async function getHandLandmarker(): Promise<HandLandmarker> {
  if (handLandmarkerInstance) {
    return handLandmarkerInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      let landmarker: HandLandmarker;
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
      } catch (gpuErr) {
        console.warn("GPU delegate failed, falling back to CPU for HandLandmarker in utility", gpuErr);
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "CPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
      }
      
      handLandmarkerInstance = landmarker;
      isInitializing = false;
      return landmarker;
    } catch (err) {
      isInitializing = false;
      initPromise = null;
      console.error("Failed to initialize HandLandmarker utility", err);
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Hàm xử lý bất đồng bộ nhận diện số lượng ngón tay giơ lên từ một phần tử video (videoElement).
 * Thuật toán phân tích vị trí cao độ (Y) của 4 ngón chính (Trỏ, Giữa, Áp út, Út)
 * so với các khớp liền kề để xác định trạng thái mở rộng.
 * 
 * @param videoElement Phần tử HTMLVideoElement đang chạy luồng video camera
 * @returns Trả về Promise chứa số lượng ngón tay mở rộng từ 1 đến 4 (trả về 0 nếu không nhận diện được)
 */
export async function detectFingerCount(videoElement: HTMLVideoElement): Promise<number> {
  try {
    const landmarker = await getHandLandmarker();
    const timestamp = performance.now();
    
    // Thực hiện nhận diện trên khung hình hiện tại của video
    const result = landmarker.detectForVideo(videoElement, timestamp);
    
    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      
      // Index tip (8) vs PIP (6)
      const indexRaised = landmarks[8].y < landmarks[6].y;
      // Middle tip (12) vs PIP (10)
      const middleRaised = landmarks[12].y < landmarks[10].y;
      // Ring tip (16) vs PIP (14)
      const ringRaised = landmarks[16].y < landmarks[14].y;
      // Pinky tip (20) vs PIP (18)
      const pinkyRaised = landmarks[20].y < landmarks[18].y;
      
      let count = 0;
      if (indexRaised) count++;
      if (middleRaised) count++;
      if (ringRaised) count++;
      if (pinkyRaised) count++;
      
      // Giới hạn kết quả trả về trong phạm vi từ 1 đến 4 ngón phục vụ game
      if (count >= 1 && count <= 4) {
        return count;
      }
    }
    return 0;
  } catch (err) {
    console.error("Error in detectFingerCount utility", err);
    return 0;
  }
}
