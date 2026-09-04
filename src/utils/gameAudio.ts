// Game Audio Engine with BGM Synthesizer and Interactive Sound Effects (Web Audio API)

export interface GameSoundConfig {
  masterEnabled: boolean;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number; // 0.0 to 1.0 (default 0.2)
  sfxVolume: number; // 0.0 to 1.0 (default 0.7)
}

const STORAGE_KEY = 'edu_game_sound_config';

export const DEFAULT_SOUND_CONFIG: GameSoundConfig = {
  masterEnabled: true,
  bgmEnabled: true,
  sfxEnabled: true,
  bgmVolume: 0.25,
  sfxVolume: 0.7,
};

// Retrieve sound configuration from localStorage
export function getSoundConfig(): GameSoundConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SOUND_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse sound config', e);
  }
  return { ...DEFAULT_SOUND_CONFIG };
}

// Save sound configuration and broadcast change
export function saveSoundConfig(config: Partial<GameSoundConfig>): GameSoundConfig {
  const current = getSoundConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('game-sound-config-changed', { detail: updated }));
  } catch (e) {
    console.warn('Failed to save sound config', e);
  }
  return updated;
}

class GameAudioManager {
  private ctx: AudioContext | null = null;
  private bgmGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private bgmIntervalId: any = null;
  private currentBgmTrack: string | null = null;
  private isBgmPlaying = false;
  private config: GameSoundConfig = getSoundConfig();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('game-sound-config-changed', ((e: CustomEvent<GameSoundConfig>) => {
        this.config = e.detail;
        this.applyConfig();
      }) as EventListener);

      // Resume context on first user interaction if locked
      const unlockAudio = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      };
      window.addEventListener('click', unlockAudio, { passive: true, once: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
      window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtxClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (!this.bgmGainNode && this.ctx) {
        this.bgmGainNode = this.ctx.createGain();
        this.bgmGainNode.connect(this.ctx.destination);
      }
      if (!this.sfxGainNode && this.ctx) {
        this.sfxGainNode = this.ctx.createGain();
        this.sfxGainNode.connect(this.ctx.destination);
      }
      this.applyConfig();
      return this.ctx;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
      return null;
    }
  }

  private applyConfig() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // SFX Gain
    if (this.sfxGainNode) {
      const sfxVol = (this.config.masterEnabled && this.config.sfxEnabled) ? this.config.sfxVolume : 0;
      this.sfxGainNode.gain.setValueAtTime(sfxVol, now);
    }

    // BGM Gain
    if (this.bgmGainNode) {
      const bgmVol = (this.config.masterEnabled && this.config.bgmEnabled) ? this.config.bgmVolume : 0;
      this.bgmGainNode.gain.setValueAtTime(bgmVol, now);
    }

    if (!this.config.masterEnabled || !this.config.bgmEnabled) {
      if (this.isBgmPlaying) {
        this.pauseBgm();
      }
    }
  }

  public getConfig(): GameSoundConfig {
    return this.config;
  }

  // ==================== BACKGROUND MUSIC SYNTHESIZER ====================

  /**
   * Start Background Music loop
   * @param track 'arcade' | 'puzzle' | 'cheerful'
   */
  public startBgm(track: 'arcade' | 'puzzle' | 'cheerful' = 'arcade') {
    this.config = getSoundConfig();
    if (!this.config.masterEnabled || !this.config.bgmEnabled) {
      this.currentBgmTrack = track;
      return;
    }

    const ctx = this.initContext();
    if (!ctx) return;

    if (this.isBgmPlaying && this.currentBgmTrack === track) return;
    this.stopBgm();

    this.currentBgmTrack = track;
    this.isBgmPlaying = true;

    // Set BGM volume
    if (this.bgmGainNode) {
      this.bgmGainNode.gain.setValueAtTime(this.config.bgmVolume, ctx.currentTime);
    }

    // Educational BGM Musical Sequences (Chords & Melodies in C Major / G Major)
    // Tempo in BPM
    let step = 0;
    const bpm = track === 'arcade' ? 128 : 104;
    const stepDuration = 60 / bpm / 2; // Eighth note duration

    // Melodic notes frequencies (Hz)
    const noteFreq: Record<string, number> = {
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
    };

    // 16-step melodic patterns
    const arcadeMelody = [
      'C5', null, 'E5', 'G5', 'E5', null, 'C5', 'D5',
      'E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', null
    ];
    const arcadeBass = [
      'C3', null, 'G3', null, 'A3', null, 'F3', null,
      'C3', null, 'G3', null, 'F3', null, 'G3', null
    ];

    const puzzleMelody = [
      'E5', null, 'G5', null, 'C5', 'D5', 'E5', null,
      'D5', null, 'F5', null, 'D5', null, 'C5', null
    ];
    const puzzleBass = [
      'C4', null, 'E4', null, 'A3', null, 'F3', null,
      'G3', null, 'B3', null, 'C4', null, 'E4', null
    ];

    const melodyArray = track === 'puzzle' ? puzzleMelody : arcadeMelody;
    const bassArray = track === 'puzzle' ? puzzleBass : arcadeBass;

    const playBgmStep = () => {
      if (!this.isBgmPlaying || !this.ctx || !this.bgmGainNode) return;

      const now = this.ctx.currentTime;
      const melNote = melodyArray[step % melodyArray.length];
      const bassNote = bassArray[step % bassArray.length];

      // Play soft melody chime
      if (melNote && noteFreq[melNote]) {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = track === 'puzzle' ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(noteFreq[melNote], now);
          
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);
          
          osc.connect(gain);
          gain.connect(this.bgmGainNode);
          
          osc.start(now);
          osc.stop(now + stepDuration * 1.5);
        } catch {
          // ignore
        }
      }

      // Play gentle bass groove
      if (bassNote && noteFreq[bassNote]) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = 'sine';
          bassOsc.frequency.setValueAtTime(noteFreq[bassNote], now);

          bassGain.gain.setValueAtTime(0.12, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.8);

          bassOsc.connect(bassGain);
          bassGain.connect(this.bgmGainNode);

          bassOsc.start(now);
          bassOsc.stop(now + stepDuration * 1.8);
        } catch {
          // ignore
        }
      }

      // Play soft rhythmic percussion tap on even steps
      if (step % 2 === 0 && track === 'arcade') {
        try {
          const percOsc = this.ctx.createOscillator();
          const percGain = this.ctx.createGain();
          percOsc.type = 'sine';
          percOsc.frequency.setValueAtTime(80, now);
          percOsc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

          percGain.gain.setValueAtTime(0.04, now);
          percGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          percOsc.connect(percGain);
          percGain.connect(this.bgmGainNode);

          percOsc.start(now);
          percOsc.stop(now + 0.05);
        } catch {
          // ignore
        }
      }

      step = (step + 1) % 64;
    };

    // Start clock interval with requestAnimationFrame
    let lastStepTime = performance.now();
    const stepDurationMs = stepDuration * 1000;

    const bgmStepLoop = (now: number) => {
      if (!this.isBgmPlaying) return;
      if (now - lastStepTime >= stepDurationMs) {
        lastStepTime = now;
        playBgmStep();
      }
      this.bgmIntervalId = requestAnimationFrame(bgmStepLoop) as any;
    };

    this.bgmIntervalId = requestAnimationFrame(bgmStepLoop) as any;
  }

  public pauseBgm() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      cancelAnimationFrame(this.bgmIntervalId as any);
      this.bgmIntervalId = null;
    }
    this.isBgmPlaying = false;
  }

  public stopBgm() {
    this.pauseBgm();
    this.currentBgmTrack = null;
  }

  // ==================== INTERACTIVE SOUND EFFECTS ====================

  private canPlaySfx(): boolean {
    return this.config.masterEnabled && this.config.sfxEnabled;
  }

  /**
   * Sound: Whack / Hammer Hit (Impactful punchy mallet hit)
   */
  public playWhack() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      // Low impact thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      gain.gain.setValueAtTime(1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.12);

      // Click snap
      const snap = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snap.type = 'sine';
      snap.frequency.setValueAtTime(540, now);
      snap.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      snapGain.gain.setValueAtTime(0.4, now);
      snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      snap.connect(snapGain);
      snapGain.connect(this.sfxGainNode);
      snap.start(now);
      snap.stop(now + 0.04);
    } catch (e) {
      console.warn('playWhack error', e);
    }
  }

  /**
   * Sound: Whack Correct Mole (Satisfying mallet hit + bright chime bell)
   */
  public playWhackCorrect() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      // Punchy mallet thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.14);

      // Bright cheerful ding chime (C6 -> G6)
      const chimeNotes = [1046.50, 1567.98];
      chimeNotes.forEach((freq, idx) => {
        const chimeOsc = ctx.createOscillator();
        const chimeGain = ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(freq, now + 0.03 + idx * 0.08);
        chimeGain.gain.setValueAtTime(0.35, now + 0.03 + idx * 0.08);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03 + idx * 0.08 + 0.25);
        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.sfxGainNode!);
        chimeOsc.start(now + 0.03 + idx * 0.08);
        chimeOsc.stop(now + 0.03 + idx * 0.08 + 0.25);
      });
    } catch (e) {
      console.warn('playWhackCorrect error', e);
    }
  }

  /**
   * Sound: Whack Wrong Mole (Comic low bonk + buzz)
   */
  public playWhackWrong() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      // Heavy dull bonk
      const bonk = ctx.createOscillator();
      const bonkGain = ctx.createGain();
      bonk.type = 'sawtooth';
      bonk.frequency.setValueAtTime(220, now);
      bonk.frequency.exponentialRampToValueAtTime(60, now + 0.18);
      bonkGain.gain.setValueAtTime(0.6, now);
      bonkGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      bonk.connect(bonkGain);
      bonkGain.connect(this.sfxGainNode);
      bonk.start(now);
      bonk.stop(now + 0.18);

      // Cartoon spring down
      const spring = ctx.createOscillator();
      const springGain = ctx.createGain();
      spring.type = 'sine';
      spring.frequency.setValueAtTime(160, now + 0.05);
      spring.frequency.linearRampToValueAtTime(90, now + 0.22);
      springGain.gain.setValueAtTime(0.3, now + 0.05);
      springGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      spring.connect(springGain);
      springGain.connect(this.sfxGainNode);
      spring.start(now + 0.05);
      spring.stop(now + 0.22);
    } catch (e) {
      console.warn('playWhackWrong error', e);
    }
  }

  /**
   * Sound: Whack Miss / Trượt (Whoosh swish + light hollow ground tap)
   */
  public playWhackMiss() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      // Air whoosh / swish
      const swish = ctx.createOscillator();
      const swishGain = ctx.createGain();
      swish.type = 'sine';
      swish.frequency.setValueAtTime(520, now);
      swish.frequency.exponentialRampToValueAtTime(110, now + 0.12);
      swishGain.gain.setValueAtTime(0.22, now);
      swishGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      swish.connect(swishGain);
      swishGain.connect(this.sfxGainNode);
      swish.start(now);
      swish.stop(now + 0.12);

      // Hollow ground thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(110, now + 0.08);
      thud.frequency.exponentialRampToValueAtTime(35, now + 0.16);
      thudGain.gain.setValueAtTime(0.3, now + 0.08);
      thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      thud.connect(thudGain);
      thudGain.connect(this.sfxGainNode);
      thud.start(now + 0.08);
      thud.stop(now + 0.16);
    } catch (e) {
      console.warn('playWhackMiss error', e);
    }
  }

  /**
   * Sound: Whoosh / Hammer Swing
   */
  public playHammerSwing() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.warn('playHammerSwing error', e);
    }
  }

  /**
   * Sound: Card Flip / Click (Light crisp wooden tap)
   */
  public playCardFlip() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.06);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.warn('playCardFlip error', e);
    }
  }

  /**
   * Sound: Mole Pop Up (Cute squeak/bubble pop)
   */
  public playMolePop() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.08);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('playMolePop error', e);
    }
  }

  /**
   * Sound: Correct Answer / Pair Match (Joyful chime arpeggio)
   */
  public playCorrect() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.28, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGainNode!);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.28);
      });
    } catch (e) {
      console.warn('playCorrect error', e);
    }
  }

  /**
   * Sound: Match Success for Memory Flip (Sparkling chime)
   */
  public playMatchSuccess() {
    this.playCorrect();
  }

  /**
   * Sound: Wrong Answer / Mismatch (Cartoon boing / buzzer)
   */
  public playWrong() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.24);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {
      console.warn('playWrong error', e);
    }
  }

  /**
   * Sound: Card Mismatch (Gentle wobble)
   */
  public playMatchFail() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      console.warn('playMatchFail error', e);
    }
  }

  /**
   * Sound: Streak combo celebration
   */
  public playCombo(streak: number = 2) {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const baseFreq = Math.min(523.25 * Math.pow(1.12, streak), 1200);
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.3, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxGainNode!);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.22);
      });
    } catch (e) {
      console.warn('playCombo error', e);
    }
  }

  /**
   * Sound: Victory Fanfare
   */
  public playVictory() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      // C5 - E5 - G5 - C6 - G5 - C6 long
      const melody = [
        { f: 523.25, d: 0.12, t: 0 },
        { f: 659.25, d: 0.12, t: 0.14 },
        { f: 783.99, d: 0.12, t: 0.28 },
        { f: 1046.50, d: 0.22, t: 0.42 },
        { f: 783.99, d: 0.15, t: 0.68 },
        { f: 1046.50, d: 0.55, t: 0.86 },
      ];

      melody.forEach(item => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, now + item.t);
        gain.gain.setValueAtTime(0.35, now + item.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + item.d);
        osc.connect(gain);
        gain.connect(this.sfxGainNode!);
        osc.start(now + item.t);
        osc.stop(now + item.t + item.d);
      });
    } catch (e) {
      console.warn('playVictory error', e);
    }
  }

  /**
   * Sound: UI Button Click / Tap
   */
  public playClick() {
    if (!this.canPlaySfx()) return;
    const ctx = this.initContext();
    if (!ctx || !this.sfxGainNode) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.warn('playClick error', e);
    }
  }
}

export const gameAudio = new GameAudioManager();
