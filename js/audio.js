// ============================================================================
// 音频 (window.PB.createAudio): WebAudio 合成音效 Sound + 背景音乐 Music, 零外部文件。
// 依赖注入 CONFIG 与 onVolumeChange 回调(由 main.js 提供), 消除对 main.js 闭包的耦合。
// ============================================================================
(() => {
  'use strict';

  window.PB = window.PB || {};
  window.PB.createAudio = function (deps) {
    const CONFIG = deps.CONFIG;
    const onVolumeChange = deps.onVolumeChange || function () {};

  // ============================ 音效 ============================
  const Sound = (() => {
    let actx = null;
    let volume = CONFIG.soundVolume;
    let enabled = true;
    function ensure() {
      if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
      if (actx && actx.state === 'suspended') actx.resume();
      return actx;
    }
    function tone(freq, dur, type, vol, when, slideTo) {
      if (!enabled || volume <= 0) return;
      const c = ensure(); if (!c) return;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      const v = Math.max(0.0001, (vol || 0.15) * volume);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.06);
    }
    return {
      unlock: ensure,
      getCtx: ensure,
      setVolume(v)  { volume = Math.max(0, Math.min(1, v)); onVolumeChange(); },
      setEnabled(b) { enabled = !!b; onVolumeChange(); },
      isEnabled()   { return enabled; },
      getVolume()   { return volume; },
      flip()        { tone(200, 0.14, 'triangle', 0.12, 0, 520); },
      success()     { tone(660, 0.12, 'sine', 0.16); tone(880, 0.18, 'sine', 0.16, 0.09); },
      bonus()       { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'sine', 0.16, i * 0.085)); },
      fail()        { tone(160, 0.22, 'sawtooth', 0.07, 0, 70); },
      smash()       { tone(120, 0.08, 'square', 0.12, 0, 60); tone(80, 0.10, 'square', 0.10, 0.03, 40); },
      streakBreak(level) { tone(440 + Math.min(level || 0, 20) * 40, 0.4, 'sawtooth', 0.09, 0, 110); },
      purchase()    { tone(520, 0.09, 'square', 0.10); tone(780, 0.14, 'square', 0.10, 0.06); },
      achievement() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.09)); },
    };
  })();

  // ============================ 音乐(背景音乐) ============================
  // WebAudio 合成一段轻快的循环旋律(主旋律 triangle + 低音 sine), 无需外部音频文件
  const Music = (() => {
    let volume = CONFIG.musicVolume;
    let enabled = true;
    let playing = false;
    let timer = null;
    let step = 0;
    let streakGetter = () => 0;   // 当前连击数(外部注入)
    let noiseBuf = null;
    let currentStepMs = CONFIG.musicStreak.baseStepMs;   // 当前实际节奏(平滑趋近目标)

    // 主旋律(C大调, 0=休止)
    const MELODY = [523.25, 0, 659.25, 0, 783.99, 0, 659.25, 0, 880, 0, 783.99, 0, 659.25, 0, 587.33, 0];
    // 低音(C3/A2/F2/G2)
    const BASS   = [130.81, 0, 0, 0, 110.00, 0, 0, 0, 87.31, 0, 0, 0, 98.00, 0, 0, 0];

    function note(freq, dur, type, vol, when) {
      if (!enabled || volume <= 0 || !freq) return;
      const c = Sound.getCtx(); if (!c) return;
      const t = (when == null) ? c.currentTime : when;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      const v = Math.max(0.0001, (vol || 0.1) * volume);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    }

    // hi-hat(高通噪声短促打击)
    function hat(t) {
      if (!enabled || volume <= 0) return;
      const c = Sound.getCtx(); if (!c) return;
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.1), c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = c.createBufferSource();
      src.buffer = noiseBuf;
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.setValueAtTime(7000, t);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.05 * volume), t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + 0.06);
    }

    function scheduleStep() {
      if (!playing) return;
      const c = Sound.getCtx(); if (!c) return;
      const t = c.currentTime + 0.06;
      const s = streakGetter();                       // 当前连击
      const mel = MELODY[step % MELODY.length];
      const bass = BASS[step % BASS.length];
      if (mel) {
        note(mel, 0.22, 'triangle', 0.11, t);
        if (s >= CONFIG.musicStreak.harmonyAt) note(mel * 1.5, 0.20, 'triangle', 0.06, t);  // 五度和声
      }
      if (bass && s >= CONFIG.musicStreak.bassAt) note(bass, 0.36, 'sine', 0.09, t);
      if (s >= CONFIG.musicStreak.hatAt) hat(t);      // 打击乐
      step++;
      // 节奏随连击加速: 每连击缩短 stepPerStreak 毫秒, 下限 minStepMs; 平滑趋近避免突变
      const target = Math.max(CONFIG.musicStreak.minStepMs, CONFIG.musicStreak.baseStepMs - s * CONFIG.musicStreak.stepPerStreak);
      currentStepMs += (target - currentStepMs) * CONFIG.musicStreak.smoothFactor;
      if (Math.abs(target - currentStepMs) < 0.5) currentStepMs = target;
      timer = setTimeout(scheduleStep, currentStepMs);
    }

    function start() {
      if (playing || !enabled || volume <= 0) return;
      Sound.getCtx();
      playing = true;
      step = 0;
      currentStepMs = CONFIG.musicStreak.baseStepMs;
      scheduleStep();
    }

    function stop() {
      playing = false;
      if (timer) { clearTimeout(timer); timer = null; }
    }

    return {
      start, stop,
      setVolume(v)  { volume = Math.max(0, Math.min(1, v)); onVolumeChange(); },
      setEnabled(b) { enabled = !!b; if (!enabled) stop(); onVolumeChange(); },
      isEnabled()   { return enabled; },
      getVolume()   { return volume; },
      isPlaying()   { return playing; },
      getTempo()    { return currentStepMs; },
      setStreakGetter(fn) { streakGetter = fn; },
    };
  })();

    return { Sound, Music };
  };
})();
