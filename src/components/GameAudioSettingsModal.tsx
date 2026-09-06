import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Music, Volume1, Play, Square, X, Sliders, Check } from 'lucide-react';
import { gameAudio, getSoundConfig, saveSoundConfig, GameSoundConfig } from '../utils/gameAudio';

interface GameAudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName?: string;
  bgmTrack?: 'arcade' | 'puzzle' | 'cheerful';
}

export function GameAudioSettingsModal({
  isOpen,
  onClose,
  gameName = 'Trò chơi',
  bgmTrack = 'arcade'
}: GameAudioSettingsModalProps) {
  const [soundConfig, setSoundConfig] = useState<GameSoundConfig>(getSoundConfig);
  const [isPlayingTestBgm, setIsPlayingTestBgm] = useState(false);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSoundConfig(getSoundConfig());
    } else {
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
      if (isPlayingTestBgm) {
        gameAudio.stopBgm();
        setIsPlayingTestBgm(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateSoundField = (field: keyof GameSoundConfig, val: any) => {
    const updated = saveSoundConfig({ [field]: val });
    setSoundConfig(updated);
  };

  const handleTestBgm = () => {
    if (isPlayingTestBgm) {
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
      gameAudio.stopBgm();
      setIsPlayingTestBgm(false);
    } else {
      gameAudio.startBgm(bgmTrack);
      setIsPlayingTestBgm(true);
      testTimerRef.current = setTimeout(() => {
        gameAudio.stopBgm();
        setIsPlayingTestBgm(false);
      }, 6000);
    }
  };

  const handleTestSfx = () => {
    if (bgmTrack === 'puzzle') {
      gameAudio.playCardFlip();
      setTimeout(() => gameAudio.playMatchSuccess(), 250);
    } else {
      gameAudio.playHammerSwing();
      setTimeout(() => gameAudio.playWhack(), 180);
      setTimeout(() => gameAudio.playWhackCorrect(), 350);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">Cấu hình Âm thanh</h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">{gameName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Master Volume */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${soundConfig.masterEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                {soundConfig.masterEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Bật / Tắt tất cả âm thanh</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Bật hoặc tắt toàn bộ nhạc và hiệu ứng</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSoundField('masterEnabled', !soundConfig.masterEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                soundConfig.masterEnabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  soundConfig.masterEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Background Music (BGM) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            soundConfig.masterEnabled ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-100 border-slate-200 opacity-50 pointer-events-none'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${soundConfig.bgmEnabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Nhạc nền trò chơi (BGM)</h4>
                  <p className="text-[10px] text-slate-500">Giai điệu vui tươi đồng hành cùng bài học</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateSoundField('bgmEnabled', !soundConfig.bgmEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 ${
                  soundConfig.bgmEnabled ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                    soundConfig.bgmEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {soundConfig.bgmEnabled && (
              <div className="pt-3 border-t border-slate-200/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">Âm lượng BGM:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { label: '15% Nhẹ', vol: 0.15 },
                      { label: '25% Vừa', vol: 0.25 },
                      { label: '45% Rõ', vol: 0.45 },
                    ].map(preset => (
                      <button
                        key={preset.vol}
                        type="button"
                        onClick={() => updateSoundField('bgmVolume', preset.vol)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          Math.abs(soundConfig.bgmVolume - preset.vol) < 0.05
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestBgm}
                  className={`w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 ${
                    isPlayingTestBgm
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-amber-100/70 text-amber-900 border border-amber-200/80 hover:bg-amber-200/70'
                  }`}
                >
                  {isPlayingTestBgm ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Dừng nghe thử</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-amber-800" />
                      <span>🎵 Nghe thử giai điệu game</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Sound Effects (SFX) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            soundConfig.masterEnabled ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-100 border-slate-200 opacity-50 pointer-events-none'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${soundConfig.sfxEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                  <Volume1 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Hiệu ứng âm thanh (SFX)</h4>
                  <p className="text-[10px] text-slate-500">Phản hồi khi click, lật thẻ, đập búa, vỗ tay</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateSoundField('sfxEnabled', !soundConfig.sfxEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 p-0.5 ${
                  soundConfig.sfxEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                    soundConfig.sfxEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {soundConfig.sfxEnabled && (
              <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleTestSfx}
                  className="px-3 py-1 rounded-xl text-[11px] font-bold bg-emerald-100/80 text-emerald-900 border border-emerald-200/80 hover:bg-emerald-200/80 flex items-center gap-1.5 transition active:scale-95"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>🔊 Thử tiếng tương tác</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Hoàn tất & Tiếp tục chơi
          </button>
        </div>
      </div>
    </div>
  );
}
