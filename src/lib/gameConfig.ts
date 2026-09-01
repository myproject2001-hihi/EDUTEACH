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
  'no_bong_bay',
  'dap_chuot_chui'
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
  dap_chuot_chui: 'coming_soon'
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
