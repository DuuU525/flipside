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
    // 单音: freq 基频, dur 时长, type 波形, vol 相对音量(0~1, 乘全局 volume),
    // when 延迟(秒), slideTo 滑音终点, attack 起音时长, decay 衰减时长
    function tone(freq, dur, type, vol, when, slideTo, attack, decay) {
      if (!enabled || volume <= 0 || !freq) return;
      const c = ensure(); if (!c) return;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      const v = Math.max(0.0001, (vol || 0.15) * volume);
      const atk = attack || 0.012;
      const dec = decay || dur;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + atk);        // 起音(attack)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);   // 衰减(decay)
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dec + 0.06);
    }
    // 和弦/泛音叠加: 基频 + 多个泛音(五度/八度) 提升音色层次
    function toneChord(freq, dur, type, vol, when, opts) {
      opts = opts || {};
      tone(freq, dur, type, vol, when, opts.slideTo, opts.attack, opts.decay);
      (opts.partials || []).forEach(p =>
        tone(p.f, p.d || dur, p.t || 'sine', p.v || vol * 0.5, when, null, opts.attack, opts.decay));
    }

    // 噪声缓冲(缓存, 用于落地撞击/挥击的噪声成分)
    let noiseBuf = null;
    function getNoiseBuf() {
      const c = ensure(); if (!c) return null;
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.12), c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    }
    // 噪声 burst: 带通/低通滤波噪声短促打击(落地撞击/挥击), freqStart→freqEnd sweep
    function noiseBurst(dur, freqStart, freqEnd, vol, when, type) {
      if (!enabled || volume <= 0) return;
      const c = ensure(); if (!c) return;
      const buf = getNoiseBuf(); if (!buf) return;
      const t = c.currentTime + (when || 0);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = type || 'bandpass';
      f.Q.value = 0.8;
      f.frequency.setValueAtTime(freqStart, t);
      if (freqEnd && freqEnd !== freqStart) f.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
      const g = c.createGain();
      const v = Math.max(0.0001, (vol || 0.1) * volume);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + dur + 0.05);
    }

    // 节流表: 同类型音效极短时间内去重, 防后期多瓶多手同时落地导致音效叠加刺耳
    const lastPlayed = {};
    function throttled(name, ms) {
      const now = performance.now();
      if (lastPlayed[name] && now - lastPlayed[name] < ms) return false;
      lastPlayed[name] = now;
      return true;
    }

    return {
      unlock: ensure,
      getCtx: ensure,
      setVolume(v)  { volume = Math.max(0, Math.min(1, v)); onVolumeChange(); },
      setEnabled(b) { enabled = !!b; onVolumeChange(); },
      isEnabled()   { return enabled; },
      getVolume()   { return volume; },

      // 抛瓶: isHand 挂机音量衰减, 同类型 50ms 节流
      flip(isHand) {
        if (!throttled('flip', 50)) return;
        tone(200, 0.14, 'triangle', isHand ? 0.05 : 0.12, 0, 520);
      },

      // 直立命中: streak 连击分层(音高递增), isHand 挂机衰减且不升音高
      success(streak, isHand) {
        if (!throttled('success', 45)) return;
        const s = isHand ? 0 : Math.min(streak || 0, 20);
        const base = 660 + s * 18;                             // 连击越高音越亮 660→1020
        const vol = isHand ? 0.08 : 0.16;
        toneChord(base, 0.14, 'triangle', vol, 0, {
          partials: [
            { f: base * 1.5, v: vol * 0.5, t: 'sine' },        // 五度泛音
            { f: base * 2,   v: vol * 0.3, t: 'sine' },        // 八度泛音
          ],
          attack: 0.008, decay: 0.16,
        });
        tone(base * 1.33, 0.16, 'sine', vol * 0.6, 0.07);      // 清脆收尾上行音
      },

      // 倒立命中(瓶口站立, 核心奖励): 快速上行滑音 + 琶音 + 高八度泛音, 专属高光
      bonus(streak, isHand) {
        if (!throttled('bonus', 45)) return;
        const s = isHand ? 0 : Math.min(streak || 0, 20);
        const base = 523 + s * 16;                             // 连击越高越亮 523→843
        const vol = isHand ? 0.08 : 0.16;
        tone(base, 0.10, 'triangle', vol, 0, base * 1.5);      // 闪亮上行滑音
        [base, base * 1.25, base * 1.5, base * 2].forEach((f, i) =>
          tone(f, 0.16, 'sine', vol * (1 - i * 0.15), i * 0.06));  // C-E-G-C 上行琶音
        tone(base * 2, 0.20, 'sine', vol * 0.4, 0.24);         // 高八度延音尾
      },

      // 平躺(失败): 负反馈, 挂机衰减
      fail(isHand) {
        if (!throttled('fail', 45)) return;
        tone(160, 0.22, 'sawtooth', isHand ? 0.035 : 0.07, 0, 70);
      },

      smash()       { tone(120, 0.08, 'square', 0.12, 0, 60); tone(80, 0.10, 'square', 0.10, 0.03, 40); },
      // 落地撞击桌面: 低频"啪"(方波下滑 + 低通噪声), 挂机衰减 + 节流(多瓶同时落地不炸)
      land(isHand) {
        if (!throttled('land', 55)) return;
        tone(180, 0.09, 'square', isHand ? 0.04 : 0.08, 0, 70);
        noiseBurst(0.06, 1200, 300, isHand ? 0.03 : 0.06, 0, 'lowpass');
      },
      // 瓶盖到达 HUD: 清脆高频"叮"(G6→C7 双音)
      coinDing() {
        if (!throttled('coinDing', 45)) return;
        tone(1568, 0.10, 'sine', 0.09);
        tone(2093, 0.14, 'sine', 0.06, 0.045);
      },
      // 冷却解冻: 更短促清脆的高频"叮"(与瓶盖区分, 配合解冻绿光)
      thaw() {
        if (!throttled('thaw', 45)) return;
        tone(1319, 0.07, 'sine', 0.05);
        tone(1760, 0.09, 'sine', 0.04, 0.03);
      },
      // 锤子挥击: 噪声下扫"呼"(砸中前播, smash 延迟到碎片爆瞬间同步)
      swing() {
        if (!throttled('swing', 70)) return;
        noiseBurst(0.14, 2200, 500, 0.08, 0, 'bandpass');
      },
      // 连击断掉: 下坠音 + 更低更弱的延迟回声(戏剧性"跌回平静")
      streakBreak(level) {
        if (!throttled('streakBreak', 200)) return;
        const lv = Math.min(level || 0, 20);
        tone(440 + lv * 40, 0.35, 'sawtooth', 0.09, 0, 110);
        tone(330 + lv * 30, 0.30, 'sawtooth', 0.05, 0.18, 82);
      },
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

    // 主旋律(C大调, 0=休止) —— 轻快段(低连击)
    const MELODY = [523.25, 0, 659.25, 0, 783.99, 0, 659.25, 0, 880, 0, 783.99, 0, 659.25, 0, 587.33, 0];
    // 低音(C3/A2/F2/G2)
    const BASS   = [130.81, 0, 0, 0, 110.00, 0, 0, 0, 87.31, 0, 0, 0, 98.00, 0, 0, 0];
    // 激昂段(高连击): 音域更高、旋律更密集(几乎每步有音), 上行推进 C5-E5-G5-A5-C6-E6
    const MELODY_INTENSE = [659.25, 783.99, 880, 783.99, 1046.5, 880, 783.99, 659.25, 880, 1046.5, 1318.51, 1046.5, 880, 783.99, 659.25, 587.33];
    // 激昂段低音更活跃(C3-E3-C3-G3-C3-E3-G2-C3)
    const BASS_INTENSE   = [130.81, 0, 164.81, 0, 130.81, 0, 196.00, 0, 130.81, 0, 164.81, 0, 98.00, 0, 130.81, 0];

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
      const intense = s >= CONFIG.musicStreak.intenseAt;   // 高连击切换激昂段
      const mel = (intense ? MELODY_INTENSE : MELODY)[step % MELODY.length];
      const bass = (intense ? BASS_INTENSE : BASS)[step % BASS.length];
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
