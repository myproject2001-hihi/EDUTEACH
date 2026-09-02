import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export type GameStatus = 'coming_soon' | 'on_air';

export const COMING_SOON_GAME_IDS = [
  'cuoc_dua_ngon_tay',
  'do_min',
  'game_map',
  'san_kho_bau',
  'domino',
  'mo_hop',
  'gan_nhan_so_do',
  'no_bong_bay'
];

export const DEFAULT_GAME_STATUSES: Record<string, GameStatus> = {
  quiz_nghieng_dau: 'on_air',
  cuoc_dua_ngon_tay: 'coming_soon',
  do_min: 'coming_soon',
  doan_tau_tri_thuc: 'on_air',
  keo_co: 'on_air',
  game_map: 'coming_soon',
  tu_ngu_biet_bay: 'on_air',
  keo_tha_noi_y: 'on_air',
  o_chu_khoa: 'on_air',
  san_kho_bau: 'coming_soon',
  lat_manh_ghep: 'on_air',
  domino: 'coming_soon',
  dao_chu: 'on_air',
  mo_hop: 'coming_soon',
  gan_nhan_so_do: 'coming_soon',
  no_bong_bay: 'coming_soon',
  dap_chuot_chui: 'on_air'
};

const LOCAL_STORAGE_KEY = 'app_game_statuses_v2';

export function getLocalGameStatuses(): Record<string, GameStatus> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_GAME_STATUSES, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse local game statuses', e);
  }
  return { ...DEFAULT_GAME_STATUSES };
}

export function saveLocalGameStatuses(statuses: Record<string, GameStatus>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(statuses));
  } catch (e) {
    console.error('Failed to save local game statuses', e);
  }
}

export async function setGameStatusInFirestore(gameId: string, status: GameStatus, currentStatuses: Record<string, GameStatus>) {
  const updated = { ...currentStatuses, [gameId]: status };
  saveLocalGameStatuses(updated);
  try {
    const docRef = doc(db, 'system_config', 'game_statuses');
    await setDoc(docRef, updated, { merge: true });
  } catch (e) {
    console.warn('Could not update game status in Firestore, falling back to local storage', e);
  }
  return updated;
}

export function useGameStatuses() {
  const [gameStatuses, setGameStatuses] = useState<Record<string, GameStatus>>(() => getLocalGameStatuses());

  useEffect(() => {
    // Listen to real-time updates from Firestore
    const docRef = doc(db, 'system_config', 'game_statuses');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Record<string, GameStatus>;
        const merged = { ...DEFAULT_GAME_STATUSES, ...data };
        setGameStatuses(merged);
        saveLocalGameStatuses(merged);
      }
    }, (err) => {
      console.warn('Firestore game_statuses snapshot listener error, using local fallback:', err);
    });

    return () => unsubscribe();
  }, []);

  const toggleGameStatus = async (gameId: string) => {
    const currentStatus = gameStatuses[gameId] || 'coming_soon';
    const nextStatus: GameStatus = currentStatus === 'coming_soon' ? 'on_air' : 'coming_soon';
    
    // Optimistic UI update
    const updated = { ...gameStatuses, [gameId]: nextStatus };
    setGameStatuses(updated);
    
    await setGameStatusInFirestore(gameId, nextStatus, gameStatuses);
  };

  return { gameStatuses, toggleGameStatus, setGameStatuses };
}

export function getSampleQuestionsForGame(gameId: string) {
  if (gameId === 'tu_ngu_biet_bay') {
    return [
      {
        id: 'q1',
        question: 'Tục ngữ: Học đi đôi với...',
        suggestedWords: ['hành', 'chơi', 'ngủ', 'nói'],
        targetWord: 'hành',
        options: ['hành', 'chơi', 'ngủ', 'nói'],
        correctAnswer: 0
      },
      {
        id: 'q2',
        question: 'Điền từ còn thiếu: Ăn quả nhớ kẻ...',
        suggestedWords: ['trồng cây', 'hái quả', 'bán hàng', 'tưới cây'],
        targetWord: 'trồng cây',
        options: ['trồng cây', 'hái quả', 'bán hàng', 'tưới cây'],
        correctAnswer: 0
      }
    ];
  }

  if (gameId === 'o_chu_khoa' || gameId === 'dao_chu') {
    return [
      {
        id: 'q1',
        question: 'Thành phố mang tên Bác là gì?',
        answer: 'HỒ CHÍ MINH',
        hint: 'Thành phố lớn nhất miền Nam Việt Nam',
        options: ['HÀ NỘI', 'HỒ CHÍ MINH', 'ĐÀ NẴNG', 'CẦN THƠ'],
        correctAnswer: 1
      },
      {
        id: 'q2',
        question: 'Thủ đô của Việt Nam là gì?',
        answer: 'HÀ NỘI',
        hint: 'Thành phố nghìn năm văn hiến',
        options: ['HÀ NỘI', 'HỒ CHÍ MINH', 'HẢI PHÒNG', 'HUẾ'],
        correctAnswer: 0
      }
    ];
  }

  if (gameId === 'keo_tha_noi_y' || gameId === 'domino' || gameId === 'lat_manh_ghep') {
    return [
      {
        id: 'q1',
        question: 'Ghép nối các quốc gia với thủ đô tương ứng:',
        pairs: [
          { left: 'Việt Nam', right: 'Hà Nội' },
          { left: 'Nhật Bản', right: 'Tokyo' },
          { left: 'Pháp', right: 'Paris' },
          { left: 'Hàn Quốc', right: 'Seoul' }
        ],
        options: ['Hà Nội', 'Tokyo', 'Paris', 'Seoul'],
        correctAnswer: 0
      }
    ];
  }

  return [
    {
      id: 'q1',
      question: 'Câu 1: Thủ đô của Việt Nam là thành phố nào?',
      options: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
      correctAnswer: 0,
      points: 5.0
    },
    {
      id: 'q2',
      question: 'Câu 2: Số nguyên tố nhỏ nhất là số nào?',
      options: ['1', '2', '3', '0'],
      correctAnswer: 1,
      points: 5.0
    },
    {
      id: 'q3',
      question: 'Câu 3: Kết quả của phép tính 25 × 4 là?',
      options: ['50', '80', '100', '120'],
      correctAnswer: 2,
      points: 5.0
    }
  ];
}

