(() => {
  'use strict';

  // ============================ 游戏数据(来自 js/data.js) ============================
  const { CONFIG, BOTTLE_TYPES, STREAK_FX, TECH_TREE, TECH_ROOT, ITEMS, ACHIEVEMENTS, MILESTONES, DAILY_POOL } = window.PB;
  const streakFx = window.PB.streakFx;

  const ISO_SIN = Math.SQRT1_2; // sin45° ≈ 0.7071 (深度方向压缩)
  const ISO_COS = Math.SQRT1_2; // cos45° ≈ 0.7071 (高度方向压缩)

  // ============================ 45° 俯角侧视投影 ============================
  // 相机垂直于桌边(前边 wy=0), 向下俯视 45°:
  //   wx = 左右(屏幕 x 不变), wy = 前后(深度, 越远屏幕 y 越上), h = 脚点离桌面高度
  // 返回"脚点"(瓶子底部中心)的屏幕坐标
  function project(wx, wy, h) {
    const cx = wx - CONFIG.table.w / 2;
    const cy = wy - CONFIG.table.d / 2;
    const s = CONFIG.iso.scale;
    return {
      x: cx * s + CONFIG.iso.ox,
      y: CONFIG.iso.oy - cy * ISO_SIN * s - h * ISO_COS * s,
    };
  }

  // ============================ 瓶子几何 ============================
  const BOTTOM_W = 18;   // 瓶底半宽
  const TOP_W = 7;       // 瓶口半宽
  const HALF_H = 60;     // 瓶高一半
  const BOTTLE_SCALE = 0.7;  // 瓶子整体缩放(像素风缩小, 全高 120→84px)

  // ============================ DOM ============================
  const canvas = document.getElementById('world');
  const ui = canvas.getContext('2d');             // 显示层(最近邻放大 + 清晰文字)
  ui.imageSmoothingEnabled = false;

  // 像素风: 低分辨率离屏缓冲渲染, 再最近邻放大 4 倍到显示画布, 产生复古颗粒
  const PIXEL = 4;                                // 像素尺寸(4px 一格)
  const buf = document.createElement('canvas');
  buf.width = Math.round(CONFIG.worldW / PIXEL);  // 225
  buf.height = Math.round(CONFIG.worldH / PIXEL); // 155
  const ctx = buf.getContext('2d');               // 图形上下文(游戏绘制走这里)
  ctx.imageSmoothingEnabled = false;

  // 静态桌面缓存(木纹/木节只画一次, 每帧 drawImage 复用)
  const tableCanvas = document.createElement('canvas');
  tableCanvas.width = buf.width;
  tableCanvas.height = buf.height;
  const tableCtx = tableCanvas.getContext('2d');
  tableCtx.imageSmoothingEnabled = false;
  const sortedBottles = [];   // 深度排序复用数组(避免每帧 slice().sort() 分配)

  // 像素图标 / 像素文字渲染器(来自 js/pixel.js)
  const { svg: pixelSvg, canvasIcon: pixelCanvas, techNode: pixelTechIcon, textSprite: pixelTextSprite, digits: pixelDigits, canvasDigits: pixelCanvasDigits, canvasText: pixelCanvasText, canvasTextWidth: pixelCanvasTextWidth, FONT: PIXEL_FONT } = window.PixelArt;
  const stage = document.getElementById('stage');
  const elScore = document.getElementById('score');
  const elBest = document.getElementById('best');
  const elStreak = document.getElementById('streak');
  const elAttempts = document.getElementById('attempts');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const panel = document.getElementById('panel');
  const unlockPanelBtn = document.getElementById('unlockPanelBtn');
  const previewTechBtn = document.getElementById('previewTechBtn');
  const panelUnlockCostEl = document.getElementById('panelUnlockCost');
  const capsBalance = document.getElementById('capsBalance');
  const tabTech = document.getElementById('tab-tech');
  const tabItems = document.getElementById('tab-items');
  const tabAchievements = document.getElementById('tab-achievements');
  const tabTechBtn = document.querySelector('.tab[data-tab="tech"]');    // 科技树页签按钮(红点提示)
  const tabItemsBtn = document.querySelector('.tab[data-tab="items"]');  // 道具页签按钮(红点提示)
  const restartBtn = document.getElementById('restartBtn');
  const toasts = document.getElementById('toasts');
  const soundBtn = document.getElementById('soundBtn');
  const soundPop = document.getElementById('soundPop');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeLabel = document.getElementById('volumeLabel');
  const muteToggle = document.getElementById('muteToggle');
  const musicSlider = document.getElementById('musicSlider');
  const musicLabel = document.getElementById('musicLabel');
  const musicToggle = document.getElementById('musicToggle');
  const techOverlay = document.getElementById('techOverlay');
  const techSvg = document.getElementById('techSvg');
  const techCloseBtn = document.getElementById('techCloseBtn');
  const techResetBtn = document.getElementById('techResetBtn');
  const drawer = document.getElementById('drawer');              // 底部抽屉(手机竖屏方案B)
  const drawerHandle = document.getElementById('drawerHandle');

  // ============================ 音效 + 音乐(来自 js/audio.js) ============================
  const { Sound, Music } = window.PB.createAudio({ CONFIG, onVolumeChange: () => updateSoundUI() });

  // ============================ 音效控制 ============================
  function updateSoundUI() {
    const v = Sound.getVolume();
    volumeSlider.value = Math.round(v * 100);
    volumeLabel.textContent = Math.round(v * 100) + '%';
    muteToggle.textContent = Sound.isEnabled() ? '静音' : '开启声音';
    const mv = Music.getVolume();
    musicSlider.value = Math.round(mv * 100);
    musicLabel.textContent = Math.round(mv * 100) + '%';
    musicToggle.textContent = Music.isEnabled() ? '关闭' : '开启音乐';
    const active = (Sound.isEnabled() && v > 0) || (Music.isEnabled() && mv > 0);
    soundBtn.innerHTML = pixelSvg(active ? 'speaker' : 'speakerOff', 22);
  }
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const r = soundBtn.getBoundingClientRect();
    soundPop.style.top = (r.bottom + 8) + 'px';
    soundPop.style.right = (window.innerWidth - r.right) + 'px';
    soundPop.classList.toggle('hidden');
  });
  volumeSlider.addEventListener('input', () => {
    Sound.setVolume(volumeSlider.value / 100);
    if (Sound.getVolume() > 0) Sound.setEnabled(true);
    if (Sound.isEnabled() && Sound.getVolume() > 0) Sound.flip();
    saveState();
  });
  muteToggle.addEventListener('click', () => {
    Sound.setEnabled(!Sound.isEnabled());
    if (Sound.isEnabled() && Sound.getVolume() > 0) Sound.flip();
    saveState();
  });
  musicSlider.addEventListener('input', () => {
    Music.setVolume(musicSlider.value / 100);
    if (Music.getVolume() <= 0) Music.stop();
    else if (Music.isEnabled() && started) Music.start();
    saveState();
  });
  musicToggle.addEventListener('click', () => {
    const next = !Music.isEnabled();
    Music.setEnabled(next);
    if (next && started) Music.start();
    saveState();
  });
  document.addEventListener('click', (e) => {
    if (!soundPop.classList.contains('hidden') && !soundPop.contains(e.target) && !soundBtn.contains(e.target)) {
      soundPop.classList.add('hidden');
    }
  });

  // ============================ 存档版本 ============================
  // 修改存档结构时 +1, 并在 loadState 的迁移分支里逐版本升级旧档
  const SAVE_VERSION = 6;

  // ============================ 状态 ============================
  let caps = 0, best = 0, streak = 0, attempts = 0;
  let scoreDisplay = 0;        // HUD 显示的瓶盖值(抛瓶获得延迟到瓶盖飞行到达才刷新, 其余即时同步)
  let bottles = [];
  let floatingTexts = [];
  const shards = [];         // 瓶子碎片粒子(敲碎动画)
  const hammerFx = [];       // 锤子敲击动画(落下→敲击→上弹)
  const goldenFx = [];       // 金色瞬间特效(冲击波环 + 上升星光)
  let goldenFlashUntil = 0;  // 金色瞬间全屏闪光结束时间戳
  let techAnim = null;       // 科技树解锁/升级动画 { id, kind: 'unlock'|'upgrade' }
  let techAnimTimer = null;  // 科技树动画清除定时器
  let combo = { count: 0, t0: 0, active: false };  // 街霸式连击提示
  let streakExpireAt = 0;      // 连击倒计时截止时间戳(ms); 手动成功后刷新, 超时归零
  let started = false;

  // 功能界面 / 科技树 / 道具
  let panelUnlocked = false;
  let techLevels = {};               // id -> 等级(0=未解锁)
  let itemsOwned = {};               // id -> 已购买数量
  let stats = { earned: 0, inverted: 0, specialHits: 0, maxStreak: 0, golden: 0, consecutiveLie: 0 };  // 累计统计
  let achievements = {};             // 已达成成就 id -> true
  let milestoneNotified = {};         // 已通知的里程碑 id -> true
  let daily = { date: '', ids: [], base: {}, claimed: {} };  // 每日目标状态

  // 蓄力状态
  let charging = null;               // { bottle } 正在蓄力的瓶子
  let chargePhase = 0;               // 0~2 循环(ping-pong 往返)
  let invertedCenter = CONFIG.charge.invertedCenter;  // 手动蓄力时倒立区间中心(每次蓄力随机; 挂机用 CONFIG 固定值)

  // 敲碎模式(锤子)
  let hammerMode = null;             // 激活的锤子类型: 'glass' | 'gold' | 'jade' | null

  // 自动抛瓶(勤奋之手)
  let hands = [];                    // 手(勤奋之手)运行时对象: { wx, wy, state, target, t0, didHit, acc }(每只手独立计时)

  function loadState() {
    try {
      const ver = parseInt(localStorage.getItem('pbottle.v') || '0', 10) || 0;
      // 存档迁移: 逐版本升级到 SAVE_VERSION(现在只有 v0→v1, 无结构变更, 仅打版本标记)
      if (ver < 1) {
        // v0 → v1: 首个版本号。旧 tech 存档为数组格式, 迁移逻辑见下方 tech 读取分支。
      }
      best = parseInt(localStorage.getItem('pbottle.best') || '0', 10) || 0;
      caps = parseInt(localStorage.getItem('pbottle.caps') || '0', 10) || 0;
      scoreDisplay = caps;
      attempts = parseInt(localStorage.getItem('pbottle.attempts') || '0', 10) || 0;
      panelUnlocked = localStorage.getItem('pbottle.panel') === '1';
      const t = localStorage.getItem('pbottle.tech');
      if (t) {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) {
          // 旧存档格式(数组) → 等级对象
          techLevels = {};
          parsed.forEach(id => { techLevels[id] = 1; });
        } else {
          techLevels = parsed || {};
        }
      }
      // 存档迁移 v1 → v2: 连击科技拆分。旧 'streak' 等级(连击加成) → 新 'streakReward'; 'streak' 变纯入口
      if (ver < 2) {
        const oldStreak = techLevels.streak || 0;
        if (oldStreak > 0) {
          techLevels.streakReward = oldStreak;   // 连击加成等级迁到「连击奖励」
          techLevels.streak = 1;                 // 「连击科技」视为已解锁(纯入口)
        }
      }
      itemsOwned = JSON.parse(localStorage.getItem('pbottle.items') || '{}');
      // 存档迁移 v2 → v3: 扩建/特殊/翡翠 由一次性改为可升级, 等级提升到容纳已购数量(不缩水)
      if (ver < 3) {
        techLevels.expand    = Math.max(techLevels.expand    || 0, Math.ceil((itemsOwned.extraBottle   || 0) / CONFIG.expandPerLevel));
        techLevels.special   = Math.max(techLevels.special   || 0, Math.ceil((itemsOwned.specialBottle || 0) / CONFIG.specialPerLevel));
        techLevels.jadeCraft = Math.max(techLevels.jadeCraft || 0, Math.ceil((itemsOwned.jadeBottle    || 0) / CONFIG.jadePerLevel));
      }
      // 存档迁移 v3 → v4: 「锤子工艺」节点删除, 锤子前置改为对应瓶子科技(玻璃/黄金/翡翠)
      if (ver < 4) {
        delete techLevels.hammerCraft;
      }
      // 存档迁移 v4 → v5: 锤子科技节点(hammerGlass/hammerGold/hammerJade)重新加入科技树,
      // 老档已购买的锤子道具 → 对应锤子科技节点自动解锁(否则已购锤子无法使用)
      if (ver < 5) {
        if ((itemsOwned.glassHammer || 0) > 0) techLevels.hammerGlass = 1;
        if ((itemsOwned.goldHammer || 0) > 0) techLevels.hammerGold = 1;
        if ((itemsOwned.jadeHammer || 0) > 0) techLevels.hammerJade = 1;
      }
      // 存档迁移 v5 → v6: 黄金瓶(special)前置由「瓶子分支」改为「玻璃瓶(expand)」,
      // 老档已解锁黄金瓶但未解锁玻璃瓶的玩家 → 玻璃瓶至少设为 Lv1(否则已解锁能力被剥夺)
      if (ver < 6) {
        if ((techLevels.special || 0) > 0 && (techLevels.expand || 0) <= 0) techLevels.expand = 1;
      }
      const s = localStorage.getItem('pbottle.stats');
      if (s) stats = Object.assign(stats, JSON.parse(s));
      const ach = localStorage.getItem('pbottle.achievements');
      if (ach) achievements = JSON.parse(ach) || {};
      const mn = localStorage.getItem('pbottle.milestones');
      if (mn) milestoneNotified = JSON.parse(mn) || {};
      const dv = localStorage.getItem('pbottle.daily');
      if (dv) {
        const parsed = JSON.parse(dv);
        if (parsed && Array.isArray(parsed.ids)) daily = parsed;
      }
      const snd = localStorage.getItem('pbottle.sound');
      if (snd) {
        const parsed = JSON.parse(snd);
        if (typeof parsed.volume === 'number') Sound.setVolume(parsed.volume);
        if (typeof parsed.enabled === 'boolean') Sound.setEnabled(parsed.enabled);
      }
      const mus = localStorage.getItem('pbottle.music');
      if (mus) {
        const parsed = JSON.parse(mus);
        if (typeof parsed.volume === 'number') Music.setVolume(parsed.volume);
        if (typeof parsed.enabled === 'boolean') Music.setEnabled(parsed.enabled);
      }
    } catch (e) {}
  }
  function saveState() {
    try {
      localStorage.setItem('pbottle.v', String(SAVE_VERSION));
      localStorage.setItem('pbottle.best', String(best));
      localStorage.setItem('pbottle.caps', String(caps));
      localStorage.setItem('pbottle.attempts', String(attempts));
      localStorage.setItem('pbottle.panel', panelUnlocked ? '1' : '0');
      localStorage.setItem('pbottle.tech', JSON.stringify(techLevels));
      localStorage.setItem('pbottle.items', JSON.stringify(itemsOwned));
      localStorage.setItem('pbottle.stats', JSON.stringify(stats));
      localStorage.setItem('pbottle.achievements', JSON.stringify(achievements));
      localStorage.setItem('pbottle.milestones', JSON.stringify(milestoneNotified));
      localStorage.setItem('pbottle.daily', JSON.stringify(daily));
      localStorage.setItem('pbottle.sound', JSON.stringify({ volume: Sound.getVolume(), enabled: Sound.isEnabled() }));
      localStorage.setItem('pbottle.music', JSON.stringify({ volume: Music.getVolume(), enabled: Music.isEnabled() }));
    } catch (e) {}
  }
  function owned(id) { return itemsOwned[id] || 0; }
  function techLevel(id) { return techLevels[id] || 0; }
  // 节点从 lv 级升到 lv+1 级的费用: 支持递增费用(upgradeCosts 数组)或固定费用(upgradeCost 标量)
  function upgradePrice(node, lv) {
    if (Array.isArray(node.upgradeCosts)) return node.upgradeCosts[lv - 1] || node.upgradeCost;
    return node.upgradeCost;
  }
  // 道具可购上限: 瓶子类由对应科技等级动态决定, 非瓶子类(手/锤子)读 item.max
  function itemCap(id) {
    if (id === 'extraBottle') return techLevel('expand') * CONFIG.expandPerLevel;
    if (id === 'specialBottle') return techLevel('special') * CONFIG.specialPerLevel;
    if (id === 'jadeBottle') return techLevel('jadeCraft') * CONFIG.jadePerLevel;
    const item = ITEMS.find(i => i.id === id);
    return (item && item.max) || 0;
  }
  // 瓶子抛后冷却时长(ms): 按类型查冷却科技等级, 下限 cooldownMin
  function cooldownMs(type) {
    const nodeId = type === 'gold' ? 'cdGold' : (type === 'jade' ? 'cdJade' : 'cdGlass');
    return Math.max(CONFIG.cooldownMin, CONFIG.cooldownBase - techLevel(nodeId) * CONFIG.cooldownStep);
  }

  // ============================ 瓶子模型 ============================
  function makeBottle(wx, wy, state, type, free) {
    return {
      wx, wy,                                   // 世界坐标(桌面平面)
      h: 0,                                     // 高度
      state,                                    // 'upright' | 'inverted' | 'lying'
      type: type || 'glass',                    // 'glass' | 'gold' | 'jade'
      free: !!free,                            // 免费初始瓶(不占道具名额, 敲碎不返还)
      rot: stateAngle(state),                   // 瓶口朝向角度(正视图): 0/π/π2/3π2
      flying: false,
      cooling: false,                           // 冷却中(抛后结冰, 期间不可再抛)
      coolUntil: 0,                             // 冷却结束时间戳(performance.now)
      thawUntil: 0,                             // 解冻绿光结束时间戳(冷却完毕瞬间闪绿光)
      claimed: false,                           // 已被占用(手拍击中 / 玩家蓄力中), 不可再被选为空闲
      fromWx: wx, fromWy: wy, toWx: wx, toWy: wy,
      startRot: 0, endRot: 0, spinDir: 1,
      phi: 0,                                  // 空翻角度(绕水平轴, 透视压缩用)
      tumbleTurns: 0,                          // 空翻圈数(throwBottle 时按连击设定)
      spinTurns: 2,                            // 螺旋圈数(throwBottle 时按连击设定)
      heat: 0,                                 // 连击提亮档(0/1/2)
      fxGhost: 0,                              // 残影密度(0=无残影)
      ghostLast: 0,                            // 残影采样时间戳
      golden: false,                           // 金色瞬间(稀有彩蛋, 奖励×10 + 金色视觉)
      targetAngle: 0,                          // 落地朝向(只随机一次, 避免落地瞬间重抽)
      t0: 0,
      resultState: 'lying',
    };
  }

  // 手动蓄力区间(科技解锁即生效)
  function uprightHalf() {
    return CONFIG.charge.uprightHalf + (techLevel('stability') > 0 ? CONFIG.stabilityUpright : 0);
  }
  function invertedHalf() {
    return CONFIG.charge.invertedHalf
      + (techLevel('balance') > 0 ? CONFIG.balanceInverted : 0)
      + (CONFIG.godHandInverted[techLevel('godhand') - 1] || 0);
  }
  function effectiveRanges() {
    return {
      upright: { center: CONFIG.charge.uprightCenter, half: uprightHalf() },
      inverted: { center: invertedCenter, half: invertedHalf() },  // 倒立中心用运行时随机值(手动蓄力)
    };
  }
  function effectiveStreakBonus() {
    return CONFIG.streakBonus + techLevel('streakReward') * CONFIG.streakTechBonus;
  }

  // 连击存在时间(新机制): 手动成功后连击倒计时, 超时中断归零
  function streakWindowMs() {
    return CONFIG.streakBaseWindow + techLevel('streakWindow') * CONFIG.streakWindowPerLevel;
  }

  // 断连(归零/护盾减半), 平躺与超时共用
  function breakStreak() {
    if (streak <= 0) return;
    const prevStreak = streak;
    streak = milestoneUnlocked('ms_shield') ? Math.floor(streak * CONFIG.milestone.shieldKeep) : 0;
    if (prevStreak > 0) Sound.streakBreak(prevStreak);
    if (streak < 2) combo.active = false;
    streakExpireAt = 0;
  }

  // 手自动抛瓶的判定区间(基础区间 + 提高手的几率加成); 挂机不看蓄力条, 倒立中心用固定值
  function handRanges() {
    const r = effectiveRanges();
    const b = techLevel('handLuck') * CONFIG.handLuckBonus;
    return {
      upright: { center: r.upright.center, half: r.upright.half + b },
      inverted: { center: CONFIG.charge.invertedCenter, half: r.inverted.half + b },
    };
  }

  // 每次手动蓄力开始时随机倒立区间中心(直立固定, 倒立随机):
  // 约束: 窗口完整落在 [0,1] 内, 且倒立中心不落入直立窗口内部(避免视觉完全覆盖)。
  // 满科技下两窗口总宽可能超过空间, 允许部分重叠(由 stateFromPointer 按半宽比例判定),
  // 不再用"硬性不重叠"兜底(那会导致满科技随机退化成固定值)。
  function randomInvertedCenter() {
    const uh = uprightHalf(), ih = invertedHalf();
    const uprightC = CONFIG.charge.uprightCenter;
    const lo = ih, hi = 1 - ih;
    for (let i = 0; i < 200; i++) {
      const c = lo + Math.random() * (hi - lo);
      if (Math.abs(c - uprightC) > uh) return c;   // 倒立中心落在直立窗口外
    }
    // 兜底: 全条随机(接受任意位置)
    return lo + Math.random() * (hi - lo);
  }

  // 蓄力指针位置(phase 0~2 ping-pong 往返 → 0~1)
  function chargePointer(phase) {
    const t = phase % 2;
    return t < 1 ? t : 2 - t;
  }

  // 由指针位置判定结果状态(倒立区间优先); ranges 缺省为手动蓄力区间
  function stateFromPointer(p, ranges) {
    const r = ranges || effectiveRanges();
    const inInv = Math.abs(p - r.inverted.center) <= r.inverted.half;
    const inUp  = Math.abs(p - r.upright.center)  <= r.upright.half;
    // 后期区间可能重叠(神之一手 + 提高手的几率): 重叠段按半宽比例随机, 避免倒立被无限放大
    if (inInv && inUp) {
      const wInv = r.inverted.half, wUp = r.upright.half;
      return Math.random() < wInv / (wInv + wUp) ? 'inverted' : 'upright';
    }
    if (inInv) return 'inverted';
    if (inUp)  return 'upright';
    return 'lying';
  }

  // 随机一个数 a, 按区间宽度决定最终状态(用于初始布局 / 手自动抛)
  function rollState(ranges) {
    return stateFromPointer(Math.random(), ranges);
  }

  // 平躺兜底翻正: 手动乱点也小概率正立/倒立, 概率与成功率科技(区间半宽)正相关
  function rollLyingSave() {
    const inv = invertedHalf() * CONFIG.lyingSave.invertedFactor;   // 翻倒立(更稀有, 系数更低)
    const up  = uprightHalf()  * CONFIG.lyingSave.uprightFactor;    // 翻直立
    const r = Math.random();
    if (r < inv) return 'inverted';
    if (r < inv + up) return 'upright';
    return 'lying';
  }

  // 金色瞬间触发概率: 基础 + 连击加成, 封顶(彩蛋越连击越容易遇到, 但保持稀有)
  function goldenChance() {
    return Math.min(CONFIG.golden.maxChance, CONFIG.golden.baseChance + streak * CONFIG.golden.perStreak);
  }

  // ============================ 朝向角度语义 ============================
  // 瓶子始终以"正视图"(正面朝向镜头)绘制, rot 即瓶口朝向角度:
  //   直立   upright  → 0°           (瓶口朝上)
  //   倒立   inverted → 180°         (瓶口朝下)
  //   平躺   lying    → 90° 或 270°  (瓶口朝右 / 朝左, 随机二选一)
  function stateAngle(state) {
    if (state === 'upright') return 0;
    if (state === 'inverted') return Math.PI;
    return Math.random() < 0.5 ? Math.PI / 2 : (3 * Math.PI) / 2; // 平躺
  }

  // 桌面内随机落点(世界坐标, 留出边距)
  function randomLandingSpot() {
    const m = CONFIG.hitRadius;
    return {
      wx: m + Math.random() * (CONFIG.table.w - 2 * m),
      wy: m + Math.random() * (CONFIG.table.d - 2 * m),
    };
  }

  // 桌面上限 = 基础值 + 扩容科技加成
  function currentMaxBottles() {
    return CONFIG.maxBottles + techLevel('expandCap') * CONFIG.expandCapPerLevel;
  }

  function currentBottleCount() {
    return Math.min(currentMaxBottles(), CONFIG.bottleCount + owned('extraBottle'));
  }

  function initBottles() {
    bottles = [];
    // 特殊瓶(黄金/翡翠)优先占位, 玻璃瓶受剩余空间限制让位
    for (let i = 0; i < owned('specialBottle'); i++) {
      spawnBottle('gold');
    }
    for (let i = 0; i < owned('jadeBottle'); i++) {
      spawnBottle('jade');
    }
    for (let i = 0; i < currentBottleCount(); i++) {
      spawnBottle('glass', i < CONFIG.bottleCount);   // 前 bottleCount 个是免费初始瓶, 其余是「玻璃瓶」道具
    }
  }

  // 在桌面随机空位新增一个瓶子(购买「玻璃瓶」/「黄金瓶」/「翡翠瓶」时调用)
  function spawnBottle(type = 'glass', free = false) {
    if (bottles.length >= currentMaxBottles()) return;
    let wx = 0, wy = 0, ok = false;
    for (let attempt = 0; attempt < 300 && !ok; attempt++) {
      wx = CONFIG.minGap + Math.random() * (CONFIG.table.w - 2 * CONFIG.minGap);
      wy = CONFIG.minGap + Math.random() * (CONFIG.table.d - 2 * CONFIG.minGap);
      ok = bottles.every(b => Math.hypot(b.wx - wx, b.wy - wy) > CONFIG.minGap);
    }
    bottles.push(makeBottle(wx, wy, rollState(), type, free));
  }

  // ============================ 手(勤奋之手) ============================
  // 手不常驻桌面: 只在抛瓶瞬间出现在目标瓶子上方拍击, 抛完即消失
  function rebuildHands() {
    const n = owned('hand');
    while (hands.length < n) {
      // 每只手独立计时(acc), 初始相位随机错开避免所有手同步拍击
      hands.push({ state: 'idle', target: null, t0: 0, didHit: false, sx: 0, sy: 0, sLift: 0, acc: Math.random() * 1500 });
    }
    // 手数量削减时, 被移除的手若正拍击某瓶, 需释放其占用(否则该瓶永久 claimed)
    for (let i = n; i < hands.length; i++) {
      const h = hands[i];
      if (h.state === 'slap' && h.target) h.target.claimed = false;
    }
    hands.length = n;
  }

  function slapWithHand(h, b) {
    h.state = 'slap';
    h.target = b;
    b.claimed = true;                     // 立即占用目标瓶, 其他手/玩家无法再选中它
    h.t0 = performance.now();
    h.didHit = false;
    h.sx = b.wx;                          // 锁定拍击点(瓶子飞走后手留在原地淡出, 不跟随)
    h.sy = b.wy;
    h.sLift = b.state === 'lying' ? BOTTOM_W * BOTTLE_SCALE : HALF_H * BOTTLE_SCALE;
  }

  function updateHands(now) {
    for (const h of hands) {
      if (h.state !== 'slap') continue;
      const t = (now - h.t0) / CONFIG.handSlapDuration;
      if (t >= CONFIG.handHitT && !h.didHit) {
        h.didHit = true;
        const b = h.target;
        if (b) b.claimed = false;         // 拍击命中: 释放占用, 准备抛出
        if (b && !b.flying) throwBottle(b, rollState(handRanges()), 'hand');
      }
      if (t >= 1) { h.state = 'idle'; h.target = null; h.didHit = false; }
    }
  }

  // 正视图手套(袖口在上、手指朝下/朝前)
  function drawHandFront(ctx) {
    const pw = 44, ph = 34;               // 手掌宽/高
    // 袖口
    ctx.fillStyle = '#3f5d8f';
    roundRect(ctx, -pw / 2 - 3, -ph - 16, pw + 6, 14, 6);
    ctx.fill();
    // 手掌(渐变)
    const g = ctx.createLinearGradient(0, -ph, 0, 0);
    g.addColorStop(0, '#f6ca92');
    g.addColorStop(1, '#dfa25f');
    ctx.fillStyle = g;
    roundRect(ctx, -pw / 2, -ph, pw, ph, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 手指(4 根, 朝下)
    ctx.fillStyle = '#f6ca92';
    for (const x of [-18, -6, 6, 18]) {
      roundRect(ctx, x - 4, -2, 8, 18, 4);
      ctx.fill();
      ctx.stroke();
    }
    // 拇指(左侧朝斜下)
    roundRect(ctx, -pw / 2 - 9, -6, 9, 15, 4.5);
    ctx.fill();
    ctx.stroke();
  }

  function drawHand(h) {
    if (h.state !== 'slap' || !h.target) return;   // 不常驻: 仅在拍击瞬间显示, 抛完即消失
    const now = performance.now();
    const t = Math.min(1, (now - h.t0) / CONFIG.handSlapDuration);
    const p = project(h.sx, h.sy, 0);
    const baseY = p.y - h.sLift - 28;              // 手落点(瓶肩附近), 固定在拍击点
    const hit = CONFIG.handHitT;
    let dy, scale, alpha;
    if (t < hit) {
      const k = easeOutCubic(t / hit);
      dy = -(1 - k) * 70;                          // 从瓶肩上空 70px 快速落下
      scale = 0.55 + 0.45 * k;
      alpha = 1;
    } else {
      const k = (t - hit) / (1 - hit);
      dy = -easeOutCubic(k) * 22;                  // 拍击后轻微上弹
      scale = 1 - 0.28 * k;
      alpha = 1 - k;                               // 淡出消失
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, baseY + dy);
    ctx.scale(scale, scale);
    drawHandFront(ctx);
    ctx.restore();
  }

  // 幸运瓶(里程碑): 结果升一档 lying -> upright -> inverted
  function upgradeState(s) {
    if (s === 'lying') return 'upright';
    return 'inverted';
  }

  // ============================ 抛瓶逻辑 ============================
  function throwBottle(b, forcedState, source, golden) {
    if (b.flying || !started) return;
    b.flying = true;
    b.source = source || 'manual';                          // 抛瓶来源: manual 手动 / hand 挂机
    b.golden = !!golden;                                    // 金色瞬间(稀有彩蛋)
    b.fromWx = b.wx; b.fromWy = b.wy;
    const spot = randomLandingSpot();
    b.toWx = spot.wx; b.toWy = spot.wy;
    b.spinDir = Math.random() < 0.5 ? 1 : -1;                 // 随机正转/反转
    b.startRot = b.rot;
    b.resultState = forcedState || rollState();              // 结果状态(蓄力判定 或 随机)
    if (milestoneUnlocked('ms_lucky') && Math.random() < CONFIG.milestone.luckyChance) {
      b.resultState = upgradeState(b.resultState);             // 幸运瓶: 结果升一档
    }
    b.targetAngle = stateAngle(b.resultState);
    // 连击特效: 手动瓶按当前连击决定螺旋/空翻/残影/提亮, 挂机瓶保持基础朴素旋转
    const isHandFx = b.source === 'hand';
    const fx = streakFx(isHandFx ? 0 : streak);
    b.spinTurns = fx.spin;
    b.tumbleTurns = isHandFx ? 0 : fx.tumble;                 // 挂机瓶不空翻
    b.heat = isHandFx ? 0 : fx.heat;                          // 挂机瓶不提亮
    b.fxGhost = isHandFx ? 0 : fx.ghost;                      // 残影仅手动瓶
    b.ghostLast = performance.now();
    // 旋转终点 = 目标朝向 + 整数圈(随机正/反转), 落地时正好停在目标角度
    b.endRot = b.targetAngle + b.spinDir * b.spinTurns * Math.PI * 2;
    b.t0 = performance.now();
    attempts += 1;
    updateHUD();
    Sound.flip(b.source === 'hand');   // 挂机抛瓶音效衰减(后期多手不嘈杂)
  }

  function settleResult(b) {
    let text = '', color = '#fff', icon = null;
    let gained = 0;                                       // 本次获得瓶盖数(用于飞向 HUD 动画)
    const bonus = effectiveStreakBonus();
    const bt = BOTTLE_TYPES[b.type] || BOTTLE_TYPES.glass;
    const special = b.type !== 'glass';
    const isHand = b.source === 'hand';                     // 挂机(手)抛瓶: 不吃连击, 收益打折
    const sourceMult = isHand ? CONFIG.handMult : CONFIG.manualMult;
    const baseMult = special ? bt.mult + (milestoneUnlocked('ms_god') ? CONFIG.milestone.godSpecialBonus : 0) : 1;  // 瓶子类型倍率(瓶神附体可提升特殊瓶)
    const achMult = 1 + achievementCount() * CONFIG.achievementRewardPerAch;  // 成就全局收益加成
    const goldMult = milestoneUnlocked('ms_gold') ? 1 + CONFIG.milestone.goldCapsMult : 1;  // 黄金瓶盖
    if (b.state === 'upright') {
      if (!isHand) { streak += 1; streakExpireAt = performance.now() + streakWindowMs(); if (streak >= 2) triggerCombo(streak); }  // 挂机不累计连击
      const streakTerm = isHand ? 0 : (streak - 1) * bonus;  // 挂机不吃连击, 连击项恒为0(否则 streak-1 会变 -1 导致归零)
      gained = Math.round((CONFIG.scoreBottom + streakTerm) * baseMult * achMult * goldMult * sourceMult);
      caps += gained;
      stats.earned += gained;
      if (special) stats.specialHits++;
      text = '+' + gained;                 // 纯数字飘字(去状态词)
      color = '#52e07c';                   // 直立=绿
      icon = null;                         // 直立无图标
      Sound.success(streak, isHand);   // 连击音高分层 + 挂机衰减
      if (!isHand) Music.duck(80);     // 手动命中音乐闪避(泵吸感)
      if (!isHand) stats.consecutiveLie = 0;   // 命中重置连续平躺计数
    } else if (b.state === 'inverted') {
      if (!isHand) { streak += 1; streakExpireAt = performance.now() + streakWindowMs(); if (streak >= 2) triggerCombo(streak); }  // 挂机不累计连击
      const streakTerm = isHand ? 0 : (streak - 1) * bonus;  // 挂机不吃连击, 连击项恒为0
      gained = Math.round((CONFIG.scoreMouth + streakTerm) * baseMult * achMult * goldMult * sourceMult);
      if (b.golden) {                                       // 金色瞬间: 奖励×10 + 专属视觉/音效
        gained = Math.round(gained * CONFIG.golden.mult);
        stats.golden++;
        text = '+' + gained;               // 纯数字飘字
        color = '#ffd166';                 // 金色瞬间=亮金
        icon = 'sparkle';                  // 星形图标
      } else {
        text = '+' + gained;               // 纯数字飘字
        color = '#ffc857';                 // 倒立=金黄
        icon = 'updown';                   // 上下箭头图标
      }
      caps += gained;
      stats.earned += gained;
      stats.inverted++;
      if (special) stats.specialHits++;
      if (!isHand) stats.consecutiveLie = 0;               // 命中重置连续平躺计数
      if (b.golden) Sound.golden();                        // 金色专属高光
      else Sound.bonus(streak, isHand);                    // 倒立专属高光 + 连击分层 + 挂机衰减
      if (!isHand) Music.duck(b.golden ? 150 : 110);       // 金色瞬间音乐闪避最强
    } else {
      if (!isHand) breakStreak();                           // 挂机平躺不影响连击
      if (!isHand) stats.consecutiveLie++;                  // 手动连续平躺计数(隐藏成就)
      text = '';                          // 平躺不飘任何字
      Sound.fail(isHand);   // 平躺负反馈, 挂机衰减
    }
    if (caps > best) { best = caps; }
    if (streak > stats.maxStreak) { stats.maxStreak = streak; }
    updateHUD();
    renderPanel();
    saveState();
    checkAchievements();
    checkDaily();
    const p = project(b.wx, b.wy, 0);
    // 飘字: 仅手动抛瓶 + 命中(平躺 text 为空不飘); 挂机(手)完全不飘字, 避免刷屏淹没手动反馈
    if (!isHand && text) addFloatText(p.x, p.y - 140, text, color, icon);
    // 成功站立: 瓶盖飞向 HUD 瓶盖数字(替代原彩带), 到达后数字弹跳
    if (gained > 0) flyCapsToHud(p.x, p.y, gained);
    // 金色瞬间: 金色粒子爆 + 全屏闪光
    if (b.golden) { spawnGoldenBurst(p); goldenFlashUntil = performance.now() + 350; }
  }

  // ============================ 残影(手动瓶高连击拖尾) ============================
  // 渐隐 ghost 帧, 全局池封顶防多瓶叠加变乱; 只对手动瓶采样(挂机瓶不产生残影)
  const ghosts = [];   // { wx, wy, h, rot, phi, type, born }
  function pushGhost(b) {
    if (ghosts.length >= CONFIG.streakFx.ghostMax) ghosts.shift();
    ghosts.push({ wx: b.wx, wy: b.wy, h: b.h, rot: b.rot, phi: b.phi, type: b.type, golden: b.golden, born: performance.now() });
  }

  // ============================ 动画更新 ============================
  function updateFlips(now) {
    for (const b of bottles) {
      if (!b.flying) continue;
      const t = Math.min(1, (now - b.t0) / CONFIG.flipDuration);
      if (t >= 1) {
        b.wx = b.toWx; b.wy = b.toWy; b.h = 0;
        b.state = b.resultState;
        b.rot = b.targetAngle;                // 复用抛瓶时定好的朝向, 不再重抽
        b.phi = b.tumbleTurns * Math.PI * 2;  // 空翻回正(整数圈 → 正面朝向镜头)
        b.flying = false;
        b.cooling = true;                     // 落地进入冷却(结冰), 冷却结束前不可再抛
        b.coolUntil = now + cooldownMs(b.type);
        Sound.land(b.source === 'hand');      // 落地撞击(挂机衰减)
        settleResult(b);
        continue;
      }
      b.wx = b.fromWx + (b.toWx - b.fromWx) * easeInOutQuad(t);
      b.wy = b.fromWy + (b.toWy - b.fromWy) * easeInOutQuad(t);
      b.h = CONFIG.peakH * Math.sin(Math.PI * t);            // 抛物线高度
      b.rot = b.startRot + (b.endRot - b.startRot) * easeOutCubic(t);
      b.phi = b.tumbleTurns * Math.PI * 2 * easeOutCubic(t); // 空翻(整数圈, 落地回正)
      // 残影采样(仅手动瓶高连击; 金色瞬间瓶始终采样金色拖尾)
      if (b.fxGhost > 0 || b.golden) {
        const interval = b.golden ? 30 : Math.max(25, 200 / b.fxGhost);
        if (now - b.ghostLast >= interval) { b.ghostLast = now; pushGhost(b); }
      }
    }
  }

  // 冷却结束检测: 到期解除结冰 + 触发解冻绿光(瓶身外轮廓闪一下)
  function updateCooldowns(now) {
    for (const b of bottles) {
      if (b.cooling && now >= b.coolUntil) {
        b.cooling = false;
        b.thawUntil = now + 350;               // 解冻绿光持续 350ms
        Sound.thaw();                          // 解冻"叮"(配合绿光)
      }
    }
  }

  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // ============================ 输入 ============================
  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function hitBottle(mx, my) {
    let bestB = null, bestD = Infinity;
    for (const b of bottles) {
      if (b.flying || b.claimed) continue;     // 跳过飞行中/被占用的瓶子(手拍击中或玩家蓄力中)
      const p = project(b.wx, b.wy, b.h);
      const lift = b.state === 'lying' ? BOTTOM_W * BOTTLE_SCALE : HALF_H * BOTTLE_SCALE; // 瓶子中心(平躺=脚点上方半瓶宽, 立姿=脚点上方半瓶高)
      const d = Math.hypot(p.x - mx, p.y - lift - my);
      if (d < CONFIG.hitRadius && d < bestD) { bestB = b; bestD = d; }
    }
    return bestB;
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!started) return;
    const p = canvasPoint(e);
    const b = hitBottle(p.x, p.y);
    if (hammerMode) {
      // 敲碎模式: 点瓶子敲碎对应类型, 点空白退出
      if (b && !b.flying) {
        if (b.type === hammerMode) {
          smashBottle(b);
        } else {
          const pp = project(b.wx, b.wy, b.h);
          addFloatText(pp.x, pp.y - 120, '需要用 ' + BOTTLE_TYPES[hammerMode].name + '锤', '#ff6b6b');
          Sound.fail();
        }
      } else {
        hammerMode = null;
        renderPanel();
      }
      return;
    }
    if (b && !b.flying && !charging) {
      if (b.cooling) {                        // 冷却中: 不可蓄力, 提示等待
        const pp = project(b.wx, b.wy, b.h);
        addFloatText(pp.x, pp.y - 120, '冷却中…', '#8fd0ff');
        return;
      }
      charging = { bottle: b };
      b.claimed = true;                   // 蓄力期间占用瓶子, 防止手把它当空闲抛走
      chargePhase = 0;                    // 指针从最左端开始往返
      invertedCenter = randomInvertedCenter();  // 每次蓄力随机倒立区间位置(直立固定)
      // 抽屉打开时长按瓶子蓄力: 立即关闭抽屉, 露出底部蓄力条
      if (drawer && drawer.classList.contains('open')) setDrawerOpen(false);
    }
  });

  function releaseCharge() {
    if (!charging) return;
    const b = charging.bottle;
    charging = null;
    if (b) b.claimed = false;            // 释放占用(手可重新选择该瓶)
    if (b && !b.flying) {
      let state = stateFromPointer(chargePointer(chargePhase));
      if (state === 'lying') state = rollLyingSave();   // 平躺兜底: 小概率翻正(概率随成功率科技)
      const golden = Math.random() < goldenChance();     // 金色瞬间: 小概率触发(随连击提升)
      if (golden) state = 'inverted';                    // 触发即强制倒立
      throwBottle(b, state, 'manual', golden);
    }
  }
  window.addEventListener('pointerup', releaseCharge);
  window.addEventListener('pointercancel', releaseCharge);

  startBtn.addEventListener('click', () => {
    Sound.unlock();
    if (Music.isEnabled()) Music.start();   // 背景音乐随游戏开始播放
    overlay.classList.add('hidden');
    started = true;
  });

  // ============================ 重新开始 ============================
  // 竖屏窄屏下「重新开始」按钮压缩为像素刷新图标(桌面/横屏保持文字)
  const mqNarrowPortrait = window.matchMedia('(max-width: 860px) and (orientation: portrait)');
  function renderRestartBtn() {
    if (mqNarrowPortrait.matches) {
      restartBtn.innerHTML = pixelSvg('refresh', 18);
      restartBtn.classList.add('icon-mode');
      restartBtn.setAttribute('aria-label', '重新开始');
    } else {
      restartBtn.textContent = '重新开始';
      restartBtn.classList.remove('icon-mode');
    }
  }
  function resetGame() {
    // 清空存档并重置所有状态
    caps = 0; best = 0; streak = 0; attempts = 0;
    scoreDisplay = 0;
    panelUnlocked = false;
    techLevels = {};
    itemsOwned = {};
    stats = { earned: 0, inverted: 0, specialHits: 0, maxStreak: 0, golden: 0, consecutiveLie: 0 };
    achievements = {};
    milestoneNotified = {};
    floatingTexts = [];
    shards.length = 0;
    hammerFx.length = 0;
    goldenFx.length = 0;
    techAnim = null;
    if (techAnimTimer) { clearTimeout(techAnimTimer); techAnimTimer = null; }
    combo = { count: 0, t0: 0, active: false };
    streakExpireAt = 0;
    started = false;
    Music.stop();          // 回到菜单, 停止背景音乐
    try {
      localStorage.removeItem('pbottle.best');
      localStorage.removeItem('pbottle.caps');
      localStorage.removeItem('pbottle.attempts');
      localStorage.removeItem('pbottle.panel');
      localStorage.removeItem('pbottle.tech');
      localStorage.removeItem('pbottle.items');
      localStorage.removeItem('pbottle.stats');
      localStorage.removeItem('pbottle.achievements');
      localStorage.removeItem('pbottle.milestones');
    } catch (e) {}
    initBottles();
    rebuildHands();
    updateHUD();
    renderPanel();
    render();
    overlay.classList.remove('hidden');   // 回到开始界面
  }
  // 重新开始确认框(说明影响, 防误触)
  const confirmOverlay = document.getElementById('confirmOverlay');
  const confirmOkBtn = document.getElementById('confirmOkBtn');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  function openConfirmRestart() { if (confirmOverlay) confirmOverlay.classList.remove('hidden'); }
  function closeConfirmRestart() { if (confirmOverlay) confirmOverlay.classList.add('hidden'); }
  restartBtn.addEventListener('click', openConfirmRestart);
  if (confirmOkBtn) confirmOkBtn.addEventListener('click', () => { closeConfirmRestart(); resetGame(); });
  if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirmRestart);
  // 点击遮罩空白处取消
  if (confirmOverlay) confirmOverlay.addEventListener('click', (e) => { if (e.target === confirmOverlay) closeConfirmRestart(); });
  window.addEventListener('resize', renderRestartBtn);
  window.addEventListener('orientationchange', renderRestartBtn);

  // ============================ 功能界面(道具/科技树) ============================

  // 节点状态: unlocked(已解锁) / available(前置满足且瓶盖足够,可解锁) / poor(前置满足但瓶盖不足) / locked(前置未满足)
  function techNodeState(node) {
    if (node.isRoot) {
      if (panelUnlocked) return 'unlocked';
      return caps >= node.cost ? 'available' : 'poor';  // 根节点映射「解锁功能界面」, 看瓶盖是否够解锁面板
    }
    if (!panelUnlocked) return 'locked';       // 科技树功能未解锁, 全部锁定
    const lv = techLevel(node.id);
    if (lv > 0) {                              // 已解锁: 可升级节点若未满级, 按升级费判 available/poor
      if (!node.maxLevel) return 'unlocked';
      if (lv >= node.maxLevel) return 'unlocked';
      return caps >= upgradePrice(node, lv) ? 'available' : 'poor';
    }
    if (node.prereq && techLevel(node.prereq) <= 0) return 'locked';  // 前置未满足
    return caps >= node.cost ? 'available' : 'poor';  // 前置满足, 再看瓶盖是否足够
  }

  // ============================ 科技树视图(拖拽平移 + 滚轮缩放) ============================
  const techView = { x: 0, y: 0, scale: 1, minScale: 0.4, maxScale: 3 };
  let techDrag = null;              // 拖拽状态: { sx, sy, vx, vy, moved, pid }
  let techSuppressClick = false;    // 拖拽结束后的本次 click 是否应被抑制(避免误触解锁)
  let techClickNode = null;         // pointerdown 时命中的节点(setPointerCapture 会让 click 的 target 变成 svg, 故在按下时记录)
  let techLastTouch = false;        // 最近一次 pointerdown 是否来自触摸(触屏两段式解锁用)
  let techTipNodeId = null;         // 触屏下当前 tooltip 显示的节点 id(null=无)

  function techTransform() {
    return `translate(${techView.x} ${techView.y}) scale(${techView.scale})`;
  }
  function applyTechView() {
    const vp = techSvg.querySelector('#techViewport');
    if (vp) vp.setAttribute('transform', techTransform());
  }
  function resetTechView() {
    techView.x = 0; techView.y = 0; techView.scale = 1;
    applyTechView();
  }
  // 屏幕坐标 → viewBox 用户坐标(经 getScreenCTM 逆变换, 自动处理 viewBox/preserveAspectRatio/CSS 缩放)
  function techSvgPoint(clientX, clientY) {
    const pt = techSvg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = techSvg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: clientX, y: clientY };
  }

  // 全屏科技树 SVG 渲染(放射状节点图: 根节点居中, 其余科技向四周发散)
  // 只展示前置已满足的节点: 前置未解锁的科技不显示, 随解锁逐层揭示
  function renderTech() {
    const W = 1000, H = 1000;
    const cx = W / 2, cy = H / 2;
    // 横向分层布局: X = 深度(根在最左, 向右展开), Y = 分支内叶子槽位(三大分支自然上下分组)
    const originX = 70;       // 根节点中心 X(最左)
    const layerGapX = 132;    // 每层 X 间距(向右)
    const rowGapY = 78;       // 相邻叶子 Y 间距(向下)

    // 可见节点: 根节点始终可见; 其余只保留前置已满足(非 locked)的节点
    const visibleNodes = [TECH_ROOT, ...TECH_TREE].filter(n => techNodeState(n) !== 'locked');

    // 父 -> 子 映射(基于完整树, 含不可见节点; 三大分支 prereq=null 挂在根下)
    // 位置基于完整树计算 → 解锁新节点只"多画一个", 已有节点坐标不动(不洗牌)
    const allNodes = [TECH_ROOT, ...TECH_TREE];
    const children = {};
    allNodes.forEach(n => {
      if (n.isRoot) return;
      const pid = n.prereq || TECH_ROOT.id;
      (children[pid] = children[pid] || []).push(n);
    });

    // 深度(X 坐标来源): 根=0, 逐层 +1
    const depth = { [TECH_ROOT.id]: 0 };
    (function calcDepth(id, d) {
      for (const k of (children[id] || [])) { depth[k.id] = d + 1; calcDepth(k.id, d + 1); }
    })(TECH_ROOT.id, 0);

    // 叶子按 DFS 序分配 Y 槽位, 内部节点 Y = 子节点 Y 均值(tidy tree)
    // 三大分支的子树在 Y 上自然分块: 瓶子在上、成功率在中、手在下
    const ySlot = {};
    let leafCount = 0;
    (function assignY(node) {
      const kids = children[node.id] || [];
      if (!kids.length) { ySlot[node.id] = leafCount++; return; }
      let s = 0;
      for (const k of kids) { assignY(k); s += ySlot[k.id]; }
      ySlot[node.id] = s / kids.length;
    })(TECH_ROOT);

    // 世界坐标位置: X 随深度向右, Y 让全部叶子围绕 cy 垂直居中
    const pos = {};
    allNodes.forEach(n => {
      pos[n.id] = {
        x: originX + depth[n.id] * layerGapX,
        y: cy + (ySlot[n.id] - (leafCount - 1) / 2) * rowGapY,
      };
    });

    let html = '';
    // 连线: 从父节点边缘指向子节点边缘的径向直线(子节点可见时父节点必然可见)
    for (const node of visibleNodes) {
      if (node.isRoot) continue;
      const parentId = node.prereq || TECH_ROOT.id;
      const a = pos[parentId], b = pos[node.id];
      if (!a || !b) continue;
      const st = techNodeState(node);
      const cls = st === 'unlocked' ? 'done' : (st === 'available' ? 'ready' : 'blocked');
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist, uy = dy / dist;
      html += `<path class="t-link ${cls}" d="M ${a.x + ux * 32} ${a.y + uy * 32} L ${b.x - ux * 32} ${b.y - uy * 32}"/>`;
    }
    // 节点
    for (const node of visibleNodes) {
      const p = pos[node.id];
      const st = techNodeState(node);
      const lv = techLevel(node.id);
      const isMax = !!node.maxLevel;
      let pulse = '';
      if (st === 'available') {
        pulse = `<rect class="t-pulse" x="${p.x - 32}" y="${p.y - 32}" width="64" height="64" fill="none" stroke="#ffc857"/>`;
      }
      let lvBadge = '';
      if (isMax) {
        lvBadge = `<rect class="t-lv-badge" x="${p.x + 13}" y="${p.y - 33}" width="20" height="20" rx="3"/><text class="t-lv-text" x="${p.x + 23}" y="${p.y - 23}">${lv}</text>`;
      }
      // 解锁/升级动画: 扩散环 + 节点弹跳(刚解锁/升级的节点)
      let fxHtml = '';
      const animCls = (techAnim && techAnim.id === node.id) ? ' tech-anim' : '';
      if (techAnim && techAnim.id === node.id) {
        const fxColor = techAnim.kind === 'upgrade' ? '#4cc9f0' : '#ffc857';
        fxHtml = `<rect class="t-fx-ring" x="${p.x - 32}" y="${p.y - 32}" width="64" height="64" fill="none" stroke="${fxColor}"/>`;
      }
      // 节点仅展示 icon(名称/消耗/详情见 tooltip); 可升级节点右上角保留 Lv 徽章(方形角标)
      html += `<g class="t-node ${st}${animCls}" data-tech-id="${node.id}">
        ${pulse}
        <rect class="t-ring" x="${p.x - 32}" y="${p.y - 32}" width="64" height="64"/>
        ${pixelTechIcon(node.icon || 'question', p.x, p.y)}
        ${lvBadge}
        ${fxHtml}
      </g>`;
    }
    techSvg.innerHTML = `<g id="techViewport" transform="${techTransform()}">${html}</g>`;
  }

  // ============================ 科技树悬浮提示 ============================
  const techTip = document.createElement('div');
  techTip.className = 'tech-tip';
  techTip.id = 'techTip';
  document.body.appendChild(techTip);

  function techTipHTML(node) {
    if (node.isRoot) {
      const priceLine = panelUnlocked ? '已解锁' : '解锁 ' + node.cost + ' 瓶盖';
      return `<div class="tech-tip-head"><span class="tech-tip-icon">${pixelSvg(node.icon || 'question', 30)}</span><span class="tech-tip-name">${node.name}</span></div>
        <div class="tech-tip-detail">${node.detail || node.desc}</div>
        <div class="tech-tip-meta"><span>价格：${priceLine}</span><span>前置：无</span></div>`;
    }
    const lv = techLevel(node.id);
    const prereq = node.prereq ? TECH_TREE.find(t => t.id === node.prereq) : null;
    const prereqName = prereq ? pixelSvg(prereq.icon, 14) + ' ' + prereq.name : '无';
    // 等级行(统一展示当前等级)
    let lvLine;
    if (node.maxLevel) {
      lvLine = lv >= node.maxLevel
        ? 'Lv.' + lv + '（满级）'
        : 'Lv.' + lv + ' / Lv.' + node.maxLevel;
    } else {
      lvLine = lv > 0 ? 'Lv.1' : 'Lv.0';
    }
    // 价格行(等级抽出后, 不再重复等级信息)
    let priceLine;
    if (node.maxLevel) {
      priceLine = lv >= node.maxLevel
        ? '已满级'
        : (lv > 0 ? '升级 ' + upgradePrice(node, lv) + ' 瓶盖' : '解锁 ' + node.cost + ' 瓶盖');
    } else {
      priceLine = lv > 0 ? '已解锁' : '解锁 ' + node.cost + ' 瓶盖';
    }
    return `<div class="tech-tip-head"><span class="tech-tip-icon">${pixelSvg(node.icon || 'question', 30)}</span><span class="tech-tip-name">${node.name}</span></div>
      <div class="tech-tip-detail">${node.detail || node.desc}</div>
      <div class="tech-tip-meta"><span>等级：${lvLine}</span><span>价格：${priceLine}</span><span>前置：${prereqName}</span></div>`;
  }

  function positionTechTip(x, y) {
    const tw = 260, th = techTip.offsetHeight || 110;
    let left = x + 14, top = y + 14;
    if (left + tw > window.innerWidth - 8) left = x - tw - 14;
    if (top + th > window.innerHeight - 8) top = y - th - 14;
    techTip.style.left = left + 'px';
    techTip.style.top = top + 'px';
  }
  function hideTechTip() { techTip.classList.remove('show'); }

  // 显示节点悬浮提示(桌面 hover 与触屏 tap 共用)
  function showTechTip(id, x, y) {
    const node = (id === TECH_ROOT.id) ? TECH_ROOT : TECH_TREE.find(t => t.id === id);
    if (!node) return;
    techTip.innerHTML = techTipHTML(node);
    techTip.classList.add('show');
    positionTechTip(x, y);
  }

  techSvg.addEventListener('mouseover', (e) => {
    const card = e.target.closest('.t-node[data-tech-id]');
    if (!card) return;
    showTechTip(card.dataset.techId, e.clientX, e.clientY);
  });
  techSvg.addEventListener('mousemove', (e) => {
    if (!e.target.closest('.t-node[data-tech-id]')) return;
    positionTechTip(e.clientX, e.clientY);
  });
  techSvg.addEventListener('mouseout', (e) => {
    if (techTipNodeId) return;   // 触屏两段式: tooltip 由 tap 控制, 不因合成 mouseout 隐藏
    const card = e.target.closest('.t-node[data-tech-id]');
    if (card && !card.contains(e.relatedTarget)) hideTechTip();
  });

  function renderItems() {
    // 只展示已通过科技解锁的道具, 未解锁的不显示
    const unlocked = ITEMS.filter(item => {
      const tech = item.unlockTech
        ? TECH_TREE.find(t => t.id === item.unlockTech)
        : TECH_TREE.find(t => t.unlockItem === item.id);
      return tech && techLevel(tech.id) > 0;
    });
    if (unlocked.length === 0) {
      tabItems.innerHTML = '<div class="empty-tip">暂无道具 · 请先在科技树解锁</div>';
      return;
    }
    tabItems.innerHTML = unlocked.map(item => {
      const cnt = owned(item.id);
      const isHammer = !!item.unlockTech;
      let right;
      if (isHammer) {
        // 锤子: 消耗品(可堆叠), 每次敲碎消耗 1 个; 有数量时显示「使用」+ 始终显示「购买」
        const type = item.id.replace('Hammer', '');
        const active = hammerMode === type;
        const useBtn = cnt > 0
          ? `<button class="mini-btn${active ? ' active' : ''}" data-action="hammer" data-id="${item.id}">${active ? '敲碎中…' : '使用'}</button>`
          : '';
        const afford = caps >= item.cost;
        const buyBtn = `<button class="mini-btn${afford ? '' : ' unaffordable'}" data-action="item" data-id="${item.id}">买 · ${pixelDigits(item.cost, 3)}</button>`;
        right = `<span class="card-actions">${useBtn}${buyBtn}</span>`;
      } else if (!item.repeatable && cnt > 0) {
        right = '<span class="tag tag-done">已购买</span>';
      } else if (item.repeatable && cnt >= itemCap(item.id)) {
        right = '<span class="tag tag-done">已满</span>';
      } else {
        const afford = caps >= item.cost;
        right = `<button class="mini-btn${afford ? '' : ' unaffordable'}" data-action="item" data-id="${item.id}">购买 · ${pixelDigits(item.cost, 3)}</button>`;
      }
      const ownedLabel = item.repeatable ? `<span class="count">×${cnt}</span>` : '';
      let desc = item.desc;
      if (item.id === 'hand' && cnt > 0) {
        const eff = Math.max(1, Math.min(cnt, bottles.length));
        const idleHint = cnt > bottles.length ? ' · 仅 ' + eff + ' 只在工作(瓶子不足)' : '';
        desc = '每只手每 ' + (perHandInterval() / 1000).toFixed(1) + ' 秒抛一次 · 独立计时' + idleHint;
      }
      const activeCls = (isHammer && hammerMode === item.id.replace('Hammer', '')) ? ' active' : '';
      return `<div class="card${activeCls}">
        <div class="card-head"><span class="card-name">${item.name}${ownedLabel}</span>${right}</div>
        <div class="card-desc">${desc}</div>
      </div>`;
    }).join('');
  }

  // ============================ 红点提示 ============================
  // 科技树页签红点: 存在可激活(前置满足且瓶盖足够)或可升级(未满级且升级费足够)的科技节点
  function hasTechAvailable() {
    if (!panelUnlocked) return false;
    return TECH_TREE.some(n => techNodeState(n) === 'available');
  }
  // 道具页签红点: 存在已解锁购买权、且当前可购买(瓶盖足够 + 数量未满 + 桌面未满)的道具
  function hasItemAvailable() {
    return ITEMS.some(item => {
      const tech = item.unlockTech
        ? TECH_TREE.find(t => t.id === item.unlockTech)
        : TECH_TREE.find(t => t.unlockItem === item.id);
      if (!tech || techLevel(tech.id) <= 0) return false;      // 购买权未解锁
      const cnt = owned(item.id);
      if (!item.repeatable && cnt > 0) return false;           // 一次性道具已购买
      if (item.repeatable && cnt >= itemCap(item.id)) return false;    // 可重复道具已买满
      // 瓶子类: 桌面已满时不可再买(与 buyItem 一致)
      if ((item.id === 'extraBottle' || item.id === 'specialBottle' || item.id === 'jadeBottle')
          && bottles.length >= currentMaxBottles()) return false;
      return caps >= item.cost;                                // 瓶盖足够
    });
  }
  // 刷新页签红点(随 renderPanel 调用)
  function renderTabDots() {
    if (tabTechBtn) tabTechBtn.classList.toggle('has-dot', hasTechAvailable());
    if (tabItemsBtn) tabItemsBtn.classList.toggle('has-dot', hasItemAvailable());
    renderDrawerDot();
  }
  // 面板可解锁: 功能界面尚未解锁, 且瓶盖足够支付解锁费用(引导玩家去解锁面板)
  function hasPanelUnlockable() {
    return !panelUnlocked && caps >= CONFIG.panelUnlockCost;
  }
  // 抽屉手柄红点: 面板可解锁(无论抽屉开关, 强引导) 或 抽屉关闭且内部有可操作项时亮
  function renderDrawerDot() {
    if (!drawerHandle) return;
    const closed = drawer ? !drawer.classList.contains('open') : true;
    const unlockable = hasPanelUnlockable();
    const actionable = hasTechAvailable() || hasItemAvailable();
    drawerHandle.classList.toggle('has-dot', unlockable || (actionable && closed));
  }

  // ============================ 成就 ============================
  function achievementValue(type) {
    switch (type) {
      case 'attempts':     return attempts;
      case 'maxStreak':    return stats.maxStreak;
      case 'inverted':     return stats.inverted;
      case 'earned':       return stats.earned;
      case 'specialHits':  return stats.specialHits;
      case 'techCount':    return Object.values(techLevels).filter(lv => lv > 0).length;
      case 'handCount':    return owned('hand');
      case 'bottleCount':  return bottles.length;
      case 'specialCount': return owned('specialBottle');
      case 'jadeCount':    return owned('jadeBottle');
      case 'golden':       return stats.golden;
      case 'consecutiveLie': return stats.consecutiveLie;
      default:             return 0;
    }
  }

  // 成就目标值(瓶满为患随扩容科技动态变化)
  function achievementTarget(a) {
    if (a.type === 'bottleCount') return currentMaxBottles();
    return a.target;
  }

  function notifyAchievement(a, opts = {}) {
    const el = document.createElement('div');
    el.className = 'ach-toast';
    const title = opts.title || '成就达成';
    const extra = opts.extra || (a.reward ? `<span class="ach-toast-reward">+${a.reward} 瓶盖</span>` : '');
    el.innerHTML = `<span class="ach-toast-icon">${pixelSvg(a.icon, 26)}</span><div class="ach-toast-text"><div class="ach-toast-title">${title}</div><div class="ach-toast-name">${a.name}${extra}</div></div>`;
    (toasts || document.body).appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 450);
    }, CONFIG.toastDuration);
  }

  // 轻量提示(信息型 toast, 蓝色调, 用于「已解锁」「已满级」等非成就反馈)
  function notifyTip(icon, text) {
    const el = document.createElement('div');
    el.className = 'ach-toast info';
    el.innerHTML = `<span class="ach-toast-icon">${pixelSvg(icon, 22)}</span><div class="ach-toast-text"><div class="ach-toast-name">${text}</div></div>`;
    (toasts || document.body).appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 450);
    }, 1200);
  }

  function checkAchievements() {
    let rewarded = false;
    for (const a of ACHIEVEMENTS) {
      if (achievements[a.id]) continue;
      if (achievementValue(a.type) >= achievementTarget(a)) {
        achievements[a.id] = true;
        if (a.reward) {
          caps += a.reward;
          scoreDisplay += a.reward;
          stats.earned += a.reward;
          if (caps > best) best = caps;
          rewarded = true;
        }
        notifyAchievement(a, a.hidden ? { title: '隐藏成就达成！' } : {});
        Sound.achievement();
        saveState();
      }
    }
    if (rewarded) { updateHUD(); renderPanel(); }
    checkMilestones();
    renderAchievements();
  }

  function achievementCount() { return Object.keys(achievements).length; }

  function milestoneUnlocked(id) {
    const m = MILESTONES.find(x => x.id === id);
    return !!m && achievementCount() >= m.at;
  }

  function checkMilestones() {
    for (const m of MILESTONES) {
      if (milestoneNotified[m.id]) continue;
      if (achievementCount() >= m.at) {
        milestoneNotified[m.id] = true;
        notifyAchievement({ icon: m.icon, name: m.name }, { title: '里程碑达成', extra: '<span class="ach-toast-reward">专属奖励</span>' });
        Sound.achievement();
        saveState();
      }
    }
  }

  function renderMilestones() {
    const done = achievementCount();
    const items = MILESTONES.map(m => {
      const unlocked = done >= m.at;
      const pct = Math.min(1, done / m.at);
      const nameTag = unlocked ? '<span class="ach-reward claimed">已解锁</span>' : '';
      const progress = unlocked
        ? ''
        : `<div class="ach-progress"><div class="ach-progress-bar milestone-bar" style="width:${(pct * 100).toFixed(0)}%"></div><span class="ach-progress-text">${Math.min(done, m.at)}/${m.at} 成就</span></div>`;
      return `<div class="ach-card milestone${unlocked ? ' got' : ''}">
        <div class="ach-icon">${pixelSvg(m.icon, 26)}</div>
        <div class="ach-body">
          <div class="ach-name">${m.name}${nameTag}</div>
          <div class="ach-desc">${m.desc}</div>
          ${progress}
        </div>
      </div>`;
    }).join('');
    return `<div class="ach-section-title">${pixelSvg('medal', 16)} 成就里程碑 · 专属奖励</div>` + items;
  }

  // ============================ 每日目标(后期留存) ============================
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function dailyValue(type) {
    switch (type) {
      case 'attempts':    return attempts;
      case 'inverted':    return stats.inverted;
      case 'earned':      return stats.earned;
      case 'specialHits': return stats.specialHits;
      default:            return 0;
    }
  }
  function rollDaily() {
    const today = todayStr();
    if (daily.date === today && daily.ids.length) return;  // 当天已初始化
    const pool = [...DAILY_POOL];
    const ids = [];
    while (ids.length < 3 && pool.length) {
      ids.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].type);
    }
    daily = { date: today, ids, base: {}, claimed: {} };
    ids.forEach(id => { daily.base[id] = dailyValue(id); });
    saveState();
  }
  function checkDaily() {
    let changed = false;
    for (const id of daily.ids) {
      if (daily.claimed[id]) continue;
      const task = DAILY_POOL.find(t => t.type === id);
      if (!task) continue;
      const base = daily.base[id] || 0;
      if (dailyValue(id) - base >= task.target) {
        daily.claimed[id] = true;
        caps += task.reward;
        scoreDisplay += task.reward;
        stats.earned += task.reward;
        if (caps > best) best = caps;
        notifyAchievement({ icon: task.icon, name: task.label }, { title: '每日目标达成', extra: '<span class="ach-toast-reward">+' + task.reward + ' 瓶盖</span>' });
        Sound.achievement();
        changed = true;
      }
    }
    if (changed) { updateHUD(); saveState(); checkAchievements(); }
  }
  function renderDaily() {
    const items = daily.ids.map(id => {
      const task = DAILY_POOL.find(t => t.type === id);
      if (!task) return '';
      const base = daily.base[id] || 0;
      const cur = Math.max(0, dailyValue(id) - base);
      const done = !!daily.claimed[id];
      const pct = Math.min(1, cur / task.target);
      const progress = done
        ? '<span class="tag tag-done">已完成</span>'
        : `<div class="ach-progress"><div class="ach-progress-bar" style="width:${(pct * 100).toFixed(0)}%"></div><span class="ach-progress-text">${Math.min(cur, task.target)}/${task.target}</span></div>`;
      return `<div class="ach-card${done ? ' got' : ''}">
        <div class="ach-icon">${pixelSvg(task.icon, 26)}</div>
        <div class="ach-body">
          <div class="ach-name">${task.label}<span class="ach-reward${done ? ' claimed' : ''}">+${task.reward} 瓶盖</span></div>
          ${progress}
        </div>
      </div>`;
    }).join('');
    return `<div class="ach-section-title">${pixelSvg('calendar', 16)} 每日目标</div>` + items;
  }

  function renderAchievements() {
    const doneCount = achievementCount();
    const statRows = [
      ['累计抛瓶', attempts],
      ['累计瓶盖', stats.earned],
      ['累计倒立', stats.inverted],
      ['最高连击', stats.maxStreak],
    ];
    const statsHtml = '<div class="ach-stats">' + statRows.map(([k, v]) =>
      `<div class="ach-stat"><span class="ach-stat-label">${k}</span><span class="ach-stat-value">${v}</span></div>`
    ).join('') + '</div>';
    const milestonesHtml = renderMilestones();
    const cardsHtml = ACHIEVEMENTS.map(a => {
      // 隐藏成就: 未达成前不在列表显示(达成才揭晓)
      if (a.hidden && !achievements[a.id]) return '';
      const got = !!achievements[a.id];
      const val = achievementValue(a.type);
      const target = achievementTarget(a);
      const desc = a.type === 'bottleCount' ? ('桌面放满瓶子（当前上限 ' + target + '）') : a.desc;
      const pct = Math.min(1, val / target);
      const progress = got
        ? '<span class="tag tag-done">已达成</span>'
        : `<div class="ach-progress"><div class="ach-progress-bar" style="width:${(pct * 100).toFixed(0)}%"></div><span class="ach-progress-text">${val}/${target}</span></div>`;
      const rewardTag = a.reward ? `<span class="ach-reward${got ? ' claimed' : ''}">+${a.reward} 瓶盖</span>` : '';
      const hiddenTag = a.hidden ? '<span class="ach-hidden-tag">隐藏</span>' : '';
      return `<div class="ach-card${got ? ' got' : ''}">
        <div class="ach-icon">${pixelSvg(a.icon, 26)}</div>
        <div class="ach-body">
          <div class="ach-name">${a.name}${rewardTag}${hiddenTag}</div>
          <div class="ach-desc">${desc}</div>
          ${progress}
        </div>
      </div>`;
    }).join('');
    const visibleTotal = ACHIEVEMENTS.filter(a => !a.hidden || achievements[a.id]).length;
    tabAchievements.innerHTML = `<div class="ach-header">成就 <span class="count">${doneCount}/${visibleTotal}</span><span class="ach-bonus-hint">全局收益 +${Math.round(doneCount * CONFIG.achievementRewardPerAch * 100)}%</span></div>` + statsHtml + renderDaily() + milestonesHtml + cardsHtml;
  }

  function renderPanel() {
    panel.classList.toggle('locked', !panelUnlocked);
    panelUnlockCostEl.innerHTML = pixelDigits(CONFIG.panelUnlockCost, 3);
    capsBalance.innerHTML = pixelDigits(caps, 3);
    renderTech();
    renderItems();
    renderAchievements();
    renderTabDots();
  }

  function spendCaps(n) {
    if (!isFinite(n) || n < 0) return false;               // 防御: 拒绝 NaN/Infinity/负数
    if (caps < n) { flashInsufficient(); return false; }
    caps -= n;
    scoreDisplay = caps;                       // 消耗即时反映到显示值
    updateHUD();
    renderPanel();
    pulseScore('spend');                       // 红色脉冲(消耗)
    saveState();
    return true;
  }

  function flashInsufficient() {
    [capsBalance, elScore].forEach(el => {
      el.classList.add('insufficient');
      setTimeout(() => el.classList.remove('insufficient'), 500);
    });
    Sound.fail();
  }

  function unlockPanel() {
    if (panelUnlocked) return;
    if (!spendCaps(CONFIG.panelUnlockCost)) return;
    panelUnlocked = true;
    Sound.purchase();
    renderPanel();
    saveState();
    // 手机竖屏: 解锁后自动展开一次抽屉, 引导玩家看到功能面板
    setDrawerOpen(true);
  }

  function unlockTech(id) {
    if (!panelUnlocked) return;                              // 科技树功能未解锁
    const node = TECH_TREE.find(t => t.id === id);
    if (!node) return;
    const lv = techLevel(id);
    if (lv > 0 && !node.maxLevel) return;                    // 一次性节点已解锁, 不可重复
    if (node.maxLevel && lv >= node.maxLevel) return;        // 已满级
    if (node.prereq && techLevel(node.prereq) <= 0) return;  // 前置未解锁
    const price = lv === 0 ? node.cost : upgradePrice(node, lv);
    if (!spendCaps(price)) return;
    techLevels[id] = lv + 1;
    // 解锁/升级动画: 记录节点与类型, renderTech 渲染扩散环 + 弹跳, 600ms 后清除
    techAnim = { id, kind: lv === 0 ? 'unlock' : 'upgrade' };
    if (techAnimTimer) clearTimeout(techAnimTimer);
    techAnimTimer = setTimeout(() => { techAnim = null; techAnimTimer = null; renderTech(); }, 600);
    Sound.purchase();
    renderPanel();
    saveState();
    checkAchievements();
  }

  function buyItem(id) {
    const item = ITEMS.find(i => i.id === id);
    if (!item) return;
    const tech = item.unlockTech
      ? TECH_TREE.find(t => t.id === item.unlockTech)
      : TECH_TREE.find(t => t.unlockItem === id);
    if (!tech || techLevel(tech.id) <= 0) return;
    const cnt = owned(id);
    if (!item.repeatable && cnt > 0) return;
    if (item.repeatable && cnt >= itemCap(item.id)) return;
    // 桌面已满时不允许再放置瓶子(避免白白扣费)
    if ((id === 'extraBottle' || id === 'specialBottle' || id === 'jadeBottle') && bottles.length >= currentMaxBottles()) {
      flashInsufficient();
      return;
    }
    if (!spendCaps(item.cost)) return;
    itemsOwned[id] = cnt + 1;
    if (id === 'extraBottle') spawnBottle('glass');
    if (id === 'specialBottle') spawnBottle('gold');
    if (id === 'jadeBottle') spawnBottle('jade');
    if (id === 'hand') rebuildHands();
    Sound.purchase();
    renderPanel();
    saveState();
    checkAchievements();
  }

  // ============================ 锤子(敲碎瓶子) ============================
  // 敲碎返还购买价 50%(退款不计入累计获得, 避免刷财富成就)
  // 敲碎会永久减少对应道具的拥有量(敲碎玻璃瓶减少「玻璃瓶」道具数量, 初始免费瓶不可敲碎)
  function hammerItemId(type) {
    return type === 'glass' ? 'extraBottle' : (type === 'gold' ? 'specialBottle' : 'jadeBottle');
  }

  function hammerTechId(type) {
    return type === 'glass' ? 'hammerGlass' : (type === 'gold' ? 'hammerGold' : 'hammerJade');
  }

  function bottleRefund(type) {
    const item = ITEMS.find(i => i.id === hammerItemId(type));
    if (!item) return 0;
    // 返还比例随锤子科技等级提高(非线性查表), 满级 96% < 100% 保证返还恒 < 瓶子价
    const lv = techLevel(hammerTechId(type));
    const levels = CONFIG.hammerRefundLevels;
    const ratio = levels[Math.min(levels.length - 1, Math.max(0, lv - 1))];
    return Math.floor(item.cost * ratio);
  }

  function toggleHammer(id) {
    const type = id.replace('Hammer', '');
    if (hammerMode !== type && owned(id) <= 0) {       // 尝试进入敲碎模式但无锤子
      flashInsufficient();
      return;
    }
    hammerMode = (hammerMode === type) ? null : type;
    renderPanel();
  }

  function smashBottle(b) {
    const type = b.type;
    const hammerId = type + 'Hammer';                 // 消耗的锤子道具 id
    const itemId = hammerItemId(type);                // 敲碎的瓶子道具 id(减少拥有量)
    const bt = BOTTLE_TYPES[type] || BOTTLE_TYPES.glass;
    const p = project(b.wx, b.wy, 0);
    // 无对应锤子: 提示并退出(双保险, toggleHammer 进入模式时已检查)
    if (owned(hammerId) <= 0) {
      addFloatText(p.x, p.y - 120, '没有 ' + bt.name + '锤了', '#ff6b6b');
      Sound.fail();
      return;
    }
    // 免费初始瓶: 不占道具名额、不返还瓶盖, 但可敲碎腾空间(区别于道具买的瓶)
    const isFree = !!b.free;
    const refund = isFree ? 0 : bottleRefund(type);
    itemsOwned[hammerId] -= 1;                        // 消耗 1 个对应锤子
    if (!isFree && owned(itemId) > 0) itemsOwned[itemId] -= 1;   // 仅道具买的瓶才永久减少拥有量
    bottles = bottles.filter(x => x !== b);
    if (refund > 0) { caps += refund; scoreDisplay += refund; }   // 退款只加瓶盖, 不算累计获得
    // 敲碎后: 若还有同类锤子则保持敲碎模式(连续敲), 否则退出
    hammerMode = owned(hammerId) > 0 ? type : null;
    // 保底: 桌面清空时补一个免费初始瓶, 保证游戏始终可玩
    if (bottles.length === 0) spawnBottle('glass', true);
    spawnHammerFx(p);                                 // 先锤子挥击
    spawnShards(b, p, 185);                           // 砸中瞬间(185ms)碎片爆
    addFloatText(p.x, p.y - 120, '敲碎 ' + bt.name + (refund > 0 ? ' +' + refund + ' 瓶盖' : ''), '#ff9f43');
    Sound.swing();                                    // 挥击"呼"(下扫)
    setTimeout(() => Sound.smash(), 185);             // 砸中瞬间敲击声(与碎片爆同步)
    updateHUD();
    renderPanel();
    saveState();
  }

  unlockPanelBtn.addEventListener('click', unlockPanel);
  previewTechBtn.addEventListener('click', openTechOverlay);
  panel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'tech') unlockTech(btn.dataset.id);
    else if (btn.dataset.action === 'item') buyItem(btn.dataset.id);
    else if (btn.dataset.action === 'hammer') toggleHammer(btn.dataset.id);
  });

  // 打开/关闭全屏科技树
  function openTechOverlay() {
    renderTech();
    techOverlay.classList.remove('hidden');
    requestAnimationFrame(() => techOverlay.classList.add('show'));
  }
  function closeTechOverlay() {
    hideTechTip(); techTipNodeId = null;
    techOverlay.classList.remove('show');
    setTimeout(() => techOverlay.classList.add('hidden'), 250);
  }
  techCloseBtn.addEventListener('click', closeTechOverlay);
  techOverlay.addEventListener('click', (e) => {
    if (e.target === techOverlay) closeTechOverlay();   // 点遮罩空白处关闭
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !techOverlay.classList.contains('hidden')) closeTechOverlay();
  });

  // ============================ 科技树拖拽平移 + 滚轮缩放 ============================
  techSvg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;   // 仅左键/触摸
    techLastTouch = e.pointerType === 'touch';
    const p = techSvgPoint(e.clientX, e.clientY);
    techDrag = { sx: e.clientX, sy: e.clientY, vx: techView.x, vy: techView.y, moved: false, pid: e.pointerId };
    techSuppressClick = false;
    techClickNode = e.target.closest('.t-node[data-tech-id]') || null;   // 记录命中节点(供 click 兜底)
    try { techSvg.setPointerCapture(e.pointerId); } catch (_) {}
    techSvg.classList.add('dragging');
  });
  techSvg.addEventListener('pointermove', (e) => {
    if (!techDrag) return;
    const p = techSvgPoint(e.clientX, e.clientY);
    const p0 = techSvgPoint(techDrag.sx, techDrag.sy);
    if (Math.abs(e.clientX - techDrag.sx) + Math.abs(e.clientY - techDrag.sy) > 5) techDrag.moved = true;
    techView.x = techDrag.vx + (p.x - p0.x);
    techView.y = techDrag.vy + (p.y - p0.y);
    applyTechView();
  });
  function endTechDrag(e) {
    if (!techDrag) return;
    techSuppressClick = techDrag.moved;   // 拖拽过的本次点击不触发解锁
    if (techSuppressClick) { hideTechTip(); techTipNodeId = null; }   // 拖拽时关闭触屏详情
    techDrag = null;
    techSvg.classList.remove('dragging');
    try { if (e && techSvg.hasPointerCapture(e.pointerId)) techSvg.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  techSvg.addEventListener('pointerup', endTechDrag);
  techSvg.addEventListener('pointercancel', endTechDrag);
  // 滚轮缩放(以鼠标位置为中心)
  techSvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const ns = Math.min(techView.maxScale, Math.max(techView.minScale, techView.scale * factor));
    if (ns === techView.scale) return;
    const k = ns / techView.scale;
    const vp = techSvgPoint(e.clientX, e.clientY);
    techView.x = vp.x - (vp.x - techView.x) * k;
    techView.y = vp.y - (vp.y - techView.y) * k;
    techView.scale = ns;
    applyTechView();
  }, { passive: false });
  techResetBtn.addEventListener('click', resetTechView);

  // 点击节点解锁科技
  techSvg.addEventListener('click', (e) => {
    if (techSuppressClick) return;   // 拖拽结束后的 click, 忽略
    const nodeEl = e.target.closest('.t-node[data-tech-id]') || techClickNode;  // capture 会让 target 变成 svg, 用按下时记录兜底
    if (!nodeEl) { if (techLastTouch) { techTipNodeId = null; hideTechTip(); } return; }

    // 触屏两段式: 第一次 tap 显示详情, 第二次 tap 同一节点才解锁
    if (techLastTouch) {
      if (techTipNodeId !== nodeEl.dataset.techId) {
        techTipNodeId = nodeEl.dataset.techId;
        showTechTip(nodeEl.dataset.techId, e.clientX, e.clientY);
        return;
      }
      techTipNodeId = null;
      hideTechTip();
    }

    const id = nodeEl.dataset.techId;
    // 第0层根节点: 解锁科技树功能
    if (id === TECH_ROOT.id) {
      if (panelUnlocked) { notifyTip('check', '已解锁'); return; }
      unlockPanel();
      return;
    }
    const node = TECH_TREE.find(t => t.id === id);
    if (!node) return;
    const st = techNodeState(node);
    const lv = techLevel(node.id);
    if (st === 'locked') { Sound.fail(); notifyTip('lock', '前置科技未解锁'); return; }
    if (st === 'poor') { Sound.fail(); notifyTip('coin', '瓶盖不足'); return; }
    if (st === 'unlocked') {
      notifyTip(node.maxLevel ? 'star' : 'check', node.maxLevel ? '已满级 Lv.' + lv : '已解锁');
      return;
    }
    unlockTech(node.id);
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === 'tech') { openTechOverlay(); return; }
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });

  // 抽屉开合(手机竖屏方案B; 桌面/横屏下手柄 display:none, 绑定无害)
  // 统一走 setDrawerOpen, 开合后刷新手柄红点
  function setDrawerOpen(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    renderDrawerDot();
  }
  if (drawer && drawerHandle) {
    const toggleDrawer = () => setDrawerOpen(!drawer.classList.contains('open'));
    drawerHandle.addEventListener('click', toggleDrawer);
    drawerHandle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDrawer(); }
    });
  }

  // 抽屉打开时点击桌面(舞台/画布)关闭抽屉
  if (stage && drawer) {
    stage.addEventListener('click', () => {
      if (drawer.classList.contains('open')) setDrawerOpen(false);
    });
  }

  // ============================ HUD ============================
  function updateHUD() {
    elScore.innerHTML = pixelDigits(scoreDisplay, 4);
    elBest.innerHTML = pixelDigits(best, 4);
    elStreak.innerHTML = pixelDigits(streak, 4);
    elAttempts.innerHTML = pixelDigits(attempts, 4);
    capsBalance.innerHTML = pixelDigits(caps, 3);
  }

  // ============================ 浮动文字 ============================
  function addFloatText(x, y, text, color, icon) {
    floatingTexts.push({ x, y, text, color, icon: icon || null, age: 0, life: 1000 });
  }
  function updateFloats(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const f = floatingTexts[i];
      f.age += dt;
      f.y -= 0.045 * dt;
      if (f.age >= f.life) floatingTexts.splice(i, 1);
    }
  }
  function drawFloats() {
    for (const f of floatingTexts) {
      const alpha = 1 - f.age / f.life;
      const spr = pixelTextSprite(f.text, 22, f.color);
      ui.save();
      ui.globalAlpha = alpha;
      ui.imageSmoothingEnabled = false;
      const iw = f.icon ? 24 : 0;                 // 机器人标记预留宽度
      const totalW = spr.w + iw;
      const dx = Math.round(f.x - totalW / 2);
      const dy = Math.round(f.y - spr.h / 2);
      if (f.icon) pixelCanvas(ui, f.icon, dx, f.y - 12, 24);
      ui.drawImage(spr.canvas, dx + iw, dy, spr.w, spr.h);
      ui.restore();
    }
  }

  // ============================ 街霸式连击提示 ============================
  function triggerCombo(n) {
    combo.count = n;
    combo.t0 = performance.now();
    combo.active = true;
  }

  function drawCombo() {
    if (!combo.active || combo.count < 2) return;
    const now = performance.now();
    const age = now - combo.t0;
    const POP = 340;                       // 弹跳动画时长(ms)
    const t = Math.min(1, age / POP);
    const back = 1 - t;
    const bounce = back * back;

    // 颜色随连击升级(街霸配色)
    let col;
    if (combo.count >= 20) col = '#c792ea';
    else if (combo.count >= 10) col = '#ff6b6b';
    else if (combo.count >= 5) col = '#ff9f43';
    else col = '#ffd166';

    const cell = 6;                                    // 5×5 字形每格 6px → 每字符 30×30
    const text = 'COMBO ' + combo.count;
    const textW = pixelCanvasTextWidth(text, cell);
    const textH = 5 * cell;

    // 右上角定位(右对齐)
    const rightX = CONFIG.worldW - 18;
    const topY = 40;

    const alpha = Math.min(1, age / 40);               // 快速淡入

    // 动态效果: 弹跳缩放 + 街霸斜摆 + 持续浮动 + 弹出瞬间左右微摆
    const scale = 1 + 0.5 * bounce;                    // 从 1.5 弹回 1
    const tilt = -7 * bounce;                          // 斜体感, 弹回时摆正
    const floatY = Math.sin(now / 520) * 3;            // 持续轻微上下浮动
    const sway = Math.sin(now / 90) * 2 * back;        // 弹出瞬间左右微摆

    const anchorX = rightX - textW / 2;                // 文字中心(右对齐锚点)
    const anchorY = topY + textH / 2;

    ui.save();
    ui.globalAlpha = alpha;
    ui.imageSmoothingEnabled = false;
    ui.translate(anchorX + sway, anchorY + floatY);
    ui.rotate(tilt * Math.PI / 180);
    ui.scale(scale, scale);
    // 硬阴影(深色偏移, 像素风)
    pixelCanvasText(ui, text, -textW / 2 + 3, -textH / 2 + 3, cell, 'rgba(0,0,0,0.6)');
    // 主体
    pixelCanvasText(ui, text, -textW / 2, -textH / 2, cell, col);
    ui.restore();
  }

  // ============================ 连击倒计时条(新机制) ============================
  // 竖排刻度铺满桌面右边缘(右下角=0 → 右上角=满), 剩余比例决定亮格高度。
  function drawStreakTimer() {
    if (streak < 1 || streakExpireAt <= 0) return;
    const now = performance.now();
    const win = streakWindowMs();
    const remain = Math.max(0, streakExpireAt - now);
    const ratio = Math.min(1, remain / win);

    // 铺满桌面右边缘: 桌面右缘是竖直线 x=890, 从右上角 y≈103 到右下角 y≈527
    const cellW = 6, cellH = 9, gap = 2;
    const N = 38;
    const x = 883;              // 右边缘内侧(贴桌边)
    const baseY = 526;          // 底部基准 = 右下角(=0)

    // 颜色随余量平滑渐变: 满=绿 → 半程=黄 → 空=红; 快耗尽(<15%)红色闪烁
    const G = [82, 224, 124], Y = [255, 209, 102], R = [255, 107, 107];
    const t = 1 - ratio;   // 耗尽度: 0=满(绿) → 0.5=半程(黄) → 1=空(红)
    let c;
    if (t <= 0.5) { const k = t * 2; c = [G[0] + (Y[0] - G[0]) * k, G[1] + (Y[1] - G[1]) * k, G[2] + (Y[2] - G[2]) * k]; }
    else { const k = (t - 0.5) * 2; c = [Y[0] + (R[0] - Y[0]) * k, Y[1] + (R[1] - Y[1]) * k, Y[2] + (R[2] - Y[2]) * k]; }
    let col = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
    if (ratio < 0.15 && (Math.floor(now / 180) % 2)) col = '#ff6b6b';

    const lit = Math.round(ratio * N);
    for (let i = 0; i < N; i++) {
      const y = baseY - cellH - i * (cellH + gap);   // i=0 最下(接近0), i=N-1 最上(满)
      if (i < lit) {
        ui.fillStyle = col;
        ui.fillRect(x, y, cellW, cellH);
        ui.fillStyle = 'rgba(255,255,255,0.4)';      // 亮格顶部高光
        ui.fillRect(x, y, cellW, 2);
      } else {
        ui.fillStyle = 'rgba(0,0,0,0.18)';           // 未亮格: 极淡压暗, 保留分格轮廓
        ui.fillRect(x, y, cellW, cellH);
      }
    }
  }

  // ============================ 锤子敲碎动画(碎片 + 锤子落下) ============================
  // 碎片粒子: 从瓶子位置飞出、受重力下落、旋转淡出(颜色取瓶子材质)
  function spawnShards(b, p, delay = 0) {
    const bt = BOTTLE_TYPES[b.type] || BOTTLE_TYPES.glass;
    const colors = [bt.stroke, bt.fill, 'rgba(255,255,255,0.9)'];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 3.5;
      shards.push({
        x: p.x, y: p.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2.2,
        size: 3 + Math.random() * 4,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        age: -delay, life: 450 + Math.random() * 350,   // age 从 -delay 起: 延迟期不可见不动
      });
    }
  }
  function spawnHammerFx(p) {
    hammerFx.push({ x: p.x, y: p.y, t0: performance.now() });
  }
  // 金色瞬间特效: 冲击波环(主焦点, 干净利落的"音爆") + 上升星光(点缀, 梦幻收尾)
  function spawnGoldenBurst(p) {
    const now = performance.now();
    // 冲击波环: 2 圈错峰扩散, 加速扩散(先慢后快更像冲击)
    goldenFx.push({ type: 'ring', x: p.x, y: p.y, t0: now,          r1: 95, dur: 320, w: 6,   a: 0.9 });
    goldenFx.push({ type: 'ring', x: p.x, y: p.y, t0: now + 60,     r1: 95, dur: 320, w: 3,   a: 0.6 });
    // 上升星光: 7 粒金色星点从瓶口缓慢上飘 + 轻微左右摆动, 渐隐
    for (let i = 0; i < 7; i++) {
      goldenFx.push({
        type: 'star',
        x: p.x + (Math.random() * 2 - 1) * 30,
        y: p.y,
        vx: (Math.random() * 2 - 1) * 14,
        vy: -(20 + Math.random() * 25),
        t0: now + Math.random() * 120,
        dur: 1000 + Math.random() * 400,
        size: 3 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
      });
    }
  }
  // 金色瞬间特效绘制(冲击波环 + 上升星光), 画在瓶子上方
  function drawGoldenFx() {
    if (goldenFx.length === 0) return;
    const now = performance.now();
    for (let i = goldenFx.length - 1; i >= 0; i--) {
      const g = goldenFx[i];
      const t = (now - g.t0) / g.dur;
      if (t >= 1) { goldenFx.splice(i, 1); continue; }
      if (g.type === 'ring') {
        const k = t * t;                       // 加速扩散
        const r = g.r1 * k;
        const a = g.a * (1 - t);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,209,102,' + a.toFixed(3) + ')';
        ctx.lineWidth = g.w;
        ctx.shadowColor = 'rgba(255,209,102,' + (a * 0.8).toFixed(3) + ')';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      } else {                                 // star: 上飘 + 左右摆动
        const x = g.x + g.vx * t + Math.sin(t * 6) * 3;
        const y = g.y + g.vy * (t * g.dur / 1000);
        const a = 1 - t;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(g.rot + t * 3);
        ctx.fillStyle = 'rgba(255,224,138,' + a.toFixed(3) + ')';
        ctx.shadowColor = 'rgba(255,209,102,' + (a * 0.8).toFixed(3) + ')';
        ctx.shadowBlur = 8;
        const s = g.size;
        ctx.beginPath();
        ctx.moveTo(0, -s); ctx.lineTo(s * 0.3, -s * 0.3); ctx.lineTo(s, 0); ctx.lineTo(s * 0.3, s * 0.3);
        ctx.lineTo(0, s); ctx.lineTo(-s * 0.3, s * 0.3); ctx.lineTo(-s, 0); ctx.lineTo(-s * 0.3, -s * 0.3);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
  function updateShards(dt) {
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i];
      if (s.age < 0) { s.age += dt; continue; }   // 延迟期: 只计时不移动(等锤子砸中)
      s.age += dt;
      s.x += s.vx * dt / 16;
      s.y += s.vy * dt / 16;
      s.vy += 0.22 * dt / 16;          // 重力
      s.rot += s.vr * dt / 16;
      if (s.age >= s.life) shards.splice(i, 1);
    }
  }
  function drawShards() {
    for (const s of shards) {
      if (s.age < 0) continue;          // 延迟期不绘制
      const alpha = Math.max(0, 1 - s.age / s.life);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // 锤子绕手柄根部(握柄端)旋转挥击: 举起 → 抡下砸碎 → 回弹淡出
  function drawHammerFx() {
    const now = performance.now();
    for (let i = hammerFx.length - 1; i >= 0; i--) {
      const h = hammerFx[i];
      const t = (now - h.t0) / 440;
      if (t >= 1) { hammerFx.splice(i, 1); continue; }
      let angle, alpha = 1;
      if (t < 0.42) {                          // 举起 → 抡下(加速砸向瓶子)
        const k = t / 0.42;
        angle = -0.30 + (Math.PI + 0.30) * (k * k);   // 从 -0.30 加速抡到 π(锤头朝下)
      } else if (t < 0.60) {                   // 砸中(轻微回弹)
        const k = (t - 0.42) / 0.18;
        angle = Math.PI - 0.16 * Math.sin(k * Math.PI);
      } else {                                 // 抬起淡出
        const k = (t - 0.60) / 0.40;
        angle = Math.PI - 0.55 * easeOutCubic(k);
        alpha = 1 - k;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(h.x, h.y - 24);            // 旋转轴 = 手柄根(握柄端), 位于瓶子中下部
      ctx.rotate(angle);
      pixelCanvas(ctx, 'hammer', -18, -34.9, 36);   // 图标手柄根对齐原点, 锤头绕根部旋转
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ============================ 瓶盖飞向 HUD + 数字弹跳 ============================
  // 成功获得瓶盖时, 从瓶子位置飞出一个瓶盖到 HUD「瓶盖」数字处, 到达后数字弹跳
  function flyCapsToHud(cx, cy, amount) {
    const cr = canvas.getBoundingClientRect();
    const sr = elScore.getBoundingClientRect();
    if (!cr.width || !sr.width) return;
    const startX = cr.left + cx * cr.width / canvas.width;
    const startY = cr.top + cy * cr.height / canvas.height;
    const endX = sr.left + sr.width / 2;
    const endY = sr.top + sr.height / 2;
    const cap = document.createElement('div');
    cap.className = 'cap-fly';
    cap.innerHTML = pixelSvg('coin', 20);
    cap.style.left = startX + 'px';
    cap.style.top = startY + 'px';
    document.body.appendChild(cap);
    const t0 = performance.now();
    const dur = 480;
    function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const k = t * t;                              // easeIn: 加速飞向 HUD(被吸过去)
      cap.style.left = (startX + (endX - startX) * k) + 'px';
      cap.style.top = (startY + (endY - startY) * k) + 'px';
      if (t > 0.72) cap.style.opacity = 1 - (t - 0.72) / 0.28;
      if (t >= 1) {
        cap.remove();
        scoreDisplay += amount;                    // 瓶盖到达 HUD, 显示值才增加
        updateHUD();
        pulseScore('gain');                        // 绿色脉冲(获得)
        Sound.coinDing();                          // 瓶盖到达"叮"
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  // 数字弹跳: 瓶盖数字变化时的缩放脉冲 + 颜色区分(增加=绿 / 消耗=红)
  function pulseScore(kind) {
    elScore.classList.remove('pop-gain', 'pop-spend');
    void elScore.offsetWidth;      // 强制 reflow, 使动画可重播
    elScore.classList.add(kind === 'spend' ? 'pop-spend' : 'pop-gain');
  }

  // ============================ 渲染 ============================
  function roundRect(c, px, py, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(px + r, py);
    c.arcTo(px + w, py, px + w, py + h, r);
    c.arcTo(px + w, py + h, px, py + h, r);
    c.arcTo(px, py + h, px, py, r);
    c.arcTo(px, py, px + w, py, r);
    c.closePath();
  }

  function drawTable(tc) {
    const t = CONFIG.table;

    // 背景(舞台底色, 桌面外区域)
    tc.fillStyle = '#0d1524';
    tc.fillRect(0, 0, CONFIG.worldW, CONFIG.worldH);

    // 顶面四角(后左/后右/前右/前左)
    const bl = project(0, t.d, 0);
    const br = project(t.w, t.d, 0);
    const fr = project(t.w, 0, 0);
    const fl = project(0, 0, 0);
    const thickness = 30; // 桌板前侧面厚度(px)

    function topPath() {
      tc.beginPath();
      tc.moveTo(bl.x, bl.y);
      tc.lineTo(br.x, br.y);
      tc.lineTo(fr.x, fr.y);
      tc.lineTo(fl.x, fl.y);
      tc.closePath();
    }

    // 顶面(墨蓝冰面渐变, 后→前: 深压底, 让瓶子凸显)
    const grad = tc.createLinearGradient(0, bl.y, 0, fl.y);
    grad.addColorStop(0, '#1f3d63');
    grad.addColorStop(1, '#0c1e38');
    tc.fillStyle = grad;
    topPath();
    tc.fill();

    // 前侧面(桌板厚度, 深墨蓝)
    tc.fillStyle = '#081527';
    tc.beginPath();
    tc.moveTo(fl.x, fl.y);
    tc.lineTo(fr.x, fr.y);
    tc.lineTo(fr.x, fr.y + thickness);
    tc.lineTo(fl.x, fl.y + thickness);
    tc.closePath();
    tc.fill();

    // 后缘高光(冷色)
    tc.strokeStyle = 'rgba(190,220,255,0.5)';
    tc.lineWidth = 2;
    tc.beginPath();
    tc.moveTo(bl.x, bl.y);
    tc.lineTo(br.x, br.y);
    tc.stroke();

    // 冰裂纹(顶面, 固定种子随机, 从边缘向内蔓延; 冷白为主 + 淡蓝衬底)
    let seed = 11;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    function cracks(color, count) {
      tc.strokeStyle = color;
      tc.lineWidth = 1.5;
      for (let i = 0; i < count; i++) {
        const edge = rnd();
        let x, y;
        if (edge < 0.25) { x = rnd() * CONFIG.worldW; y = 315 - (rnd() * t.d - 300) * ISO_SIN; }
        else if (edge < 0.5) { x = 450 - t.w / 2; y = 315 - (rnd() * t.d - 300) * ISO_SIN; }
        else if (edge < 0.75) { x = 450 + t.w / 2; y = 315 - (rnd() * t.d - 300) * ISO_SIN; }
        else { x = rnd() * CONFIG.worldW; y = 315 + 300 * ISO_SIN; }
        tc.beginPath();
        tc.moveTo(x, y);
        const segs = 2 + (rnd() * 2 | 0);
        for (let s = 0; s < segs; s++) {
          x += (rnd() - 0.5) * 160;
          y += (rnd() - 0.5) * 120;
          tc.lineTo(x, y);
        }
        tc.stroke();
      }
    }
    tc.save();
    topPath();
    tc.clip();
    cracks('rgba(200,230,255,0.42)', 9);
    cracks('rgba(90,150,210,0.22)', 5);
    tc.restore();
  }

  function drawShadow(b) {
    const p = project(b.wx, b.wy, 0);          // 地面脚点(瓶子底部贴地位置)
    let rw, rh, alpha;
    if (b.flying) {
      const k = Math.max(0, 1 - b.h / CONFIG.peakH);          // 高度因子
      const base = (b.state === 'lying' ? 50 : 26) * BOTTLE_SCALE;
      rw = base * (0.55 + 0.45 * k);
      rh = rw * 0.32;
      alpha = 0.32 * k;
    } else if (b.state === 'lying') {
      rw = 50 * BOTTLE_SCALE; rh = 16 * BOTTLE_SCALE; alpha = 0.30;
    } else {
      rw = 26 * BOTTLE_SCALE; rh = 9 * BOTTLE_SCALE; alpha = 0.30;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0.05, alpha);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 残影绘制(在瓶子下层, 拖尾效果)
  function drawGhosts() {
    const now = performance.now();
    for (let i = ghosts.length - 1; i >= 0; i--) {
      const g = ghosts[i];
      const age = (now - g.born) / CONFIG.streakFx.ghostLife;
      if (age >= 1) { ghosts.splice(i, 1); continue; }
      const p = project(g.wx, g.wy, g.h);
      const s = (1 + (g.h / CONFIG.peakH) * 0.3) * BOTTLE_SCALE;
      const scaleY = Math.max(0.10, Math.abs(Math.cos(g.phi)));
      ctx.save();
      ctx.translate(p.x, p.y - HALF_H * s);
      ctx.scale(s, s);
      ctx.rotate(g.rot);
      ctx.globalAlpha = (1 - age) * CONFIG.streakFx.ghostAlpha;
      ctx.scale(1, scaleY);
      drawBottleFront(ctx, g.type, false, 0, g.golden);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // 正视图瓶子(瓶口朝上, -y 方向), 始终以正面朝向镜头绘制
  // type: 瓶子类型(玻璃/黄金/翡翠), 颜色与光晕查 BOTTLE_TYPES; heat: 连击提亮档(0/1/2)
  // frozen: 冻结灰白去饱和(冷却中的瓶子失去本色, 与正常瓶区分)
  function drawBottleFront(ctx, type, highlight, heat, golden) {
    const bw = BOTTOM_W, tw = TOP_W, hh = HALF_H;
    const bt = BOTTLE_TYPES[type] || BOTTLE_TYPES.glass;
    // 连击提亮: heat 1=黄光晕, 2=红橙光晕(高连击瓶子更亮更暖)
    let stroke = bt.stroke, glow = bt.shadow, blur = bt.blur, offsetY = 4;
    if (golden) { stroke = '#ffd166'; glow = 'rgba(255,209,102,0.85)'; blur = 26; offsetY = 0; }
    else if (heat === 1) { stroke = 'rgba(255,214,130,0.95)'; glow = 'rgba(255,200,87,0.5)'; blur = 18; offsetY = 0; }
    else if (heat === 2) { stroke = 'rgba(255,150,90,1)'; glow = 'rgba(255,120,80,0.6)'; blur = 22; offsetY = 0; }
    ctx.shadowColor = glow;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offsetY;
    ctx.fillStyle = bt.fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;   // 加粗轮廓, 低分辨率下呈现像素描边
    ctx.beginPath();
    ctx.moveTo(-bw + 8, hh);
    ctx.lineTo(bw - 8, hh);
    ctx.quadraticCurveTo(bw, hh, bw, hh - 8);
    ctx.lineTo(bw, -14);
    ctx.quadraticCurveTo(bw, -28, 7, -28);
    ctx.lineTo(7, -44);
    ctx.lineTo(tw, -44);
    ctx.lineTo(tw, -hh + 0.8);
    ctx.quadraticCurveTo(tw, -hh, tw - 3, -hh);
    ctx.lineTo(-tw + 3, -hh);
    ctx.quadraticCurveTo(-tw, -hh, -tw, -hh + 0.8);
    ctx.lineTo(-tw, -44);
    ctx.lineTo(-7, -44);
    ctx.lineTo(-7, -28);
    ctx.quadraticCurveTo(-bw, -28, -bw, -14);
    ctx.lineTo(-bw, hh - 8);
    ctx.quadraticCurveTo(-bw, hh, -bw + 8, hh);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // 选中蓄力: 瓶子轮廓脉冲描边(替代原先的圆圈高亮), 更贴合像素风
    if (highlight) {
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 150);
      ctx.strokeStyle = 'rgba(76,201,240,' + (0.6 + 0.4 * pulse).toFixed(3) + ')';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  // 瓶子: 45° 俯角投影位置(脚点对齐) + 高度缩放 + 正视图(billboard)
  function drawBottle(b) {
    const p = project(b.wx, b.wy, b.h);        // 脚点(瓶子底部中心)
    const hScale = b.flying ? 1 + (b.h / CONFIG.peakH) * 0.3 : 1;
    const s = hScale * BOTTLE_SCALE;           // 瓶子整体缩放
    const lift = b.state === 'lying' ? BOTTOM_W * s : HALF_H * s; // 平躺中心在脚点上方半瓶宽(躺倒后瓶身半宽贴地), 立姿中心在脚点上方半瓶高
    const highlight = charging && charging.bottle === b;
    const heat = b.flying ? (b.heat || 0) : 0;                          // 连击提亮(仅飞行手动瓶)
    const alpha = (b.flying && b.source === 'hand') ? CONFIG.streakFx.handAlpha : 1;  // 挂机瓶降权
    const scaleY = b.flying ? Math.max(0.10, Math.abs(Math.cos(b.phi))) : 1;          // 空翻透视压缩
    ctx.save();
    ctx.translate(p.x, p.y - lift);
    ctx.scale(s, s);
    ctx.rotate(b.rot);
    ctx.globalAlpha = alpha;
    ctx.scale(1, scaleY);
    drawBottleFront(ctx, b.type, highlight, heat, b.golden);
    // 瓶盖: 非冷却期(可操作)瓶子盖上盖子, 按类型配色; 飞行中/冷却中不画
    if (!b.cooling && !b.flying) {
      const CAP_COLORS = {
        glass: { fill: '#bcd8f5', stroke: '#3d8fd4' },
        gold:  { fill: '#ffd166', stroke: '#e8890c' },
        jade:  { fill: '#6ee7a0', stroke: '#2f9e6f' },
      };
      const cc = CAP_COLORS[b.type] || CAP_COLORS.glass;
      const capHw = 9, capH = 7;                 // 盖子半宽/高(比瓶口 TOP_W=7 稍宽)
      ctx.save();
      ctx.fillStyle = cc.fill;
      ctx.strokeStyle = cc.stroke;
      ctx.lineWidth = 2;
      ctx.fillRect(-capHw, -HALF_H - capH, capHw * 2, capH);
      ctx.strokeRect(-capHw, -HALF_H - capH, capHw * 2, capH);
      ctx.restore();
    }
    // 解冻绿光: 冷却完毕瞬间瓶身外轮廓闪绿光(随 350ms 衰减)
    if (b.thawUntil > 0 && !b.flying) {
      const now = performance.now();
      const k = (b.thawUntil - now) / 350;
      if (k > 0) {
        const bw = BOTTOM_W, tw = TOP_W, hh = HALF_H;
        ctx.save();
        ctx.strokeStyle = 'rgba(82,224,124,' + (0.9 * k).toFixed(3) + ')';
        ctx.lineWidth = 4;
        ctx.shadowColor = 'rgba(82,224,124,' + (0.8 * k).toFixed(3) + ')';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-bw + 8, hh);
        ctx.lineTo(bw - 8, hh);
        ctx.quadraticCurveTo(bw, hh, bw, hh - 8);
        ctx.lineTo(bw, -14);
        ctx.quadraticCurveTo(bw, -28, 7, -28);
        ctx.lineTo(7, -44);
        ctx.lineTo(tw, -44);
        ctx.lineTo(tw, -hh + 0.8);
        ctx.quadraticCurveTo(tw, -hh, tw - 3, -hh);
        ctx.lineTo(-tw + 3, -hh);
        ctx.quadraticCurveTo(-tw, -hh, -tw, -hh + 0.8);
        ctx.lineTo(-tw, -44);
        ctx.lineTo(-7, -44);
        ctx.lineTo(-7, -28);
        ctx.quadraticCurveTo(-bw, -28, -bw, -14);
        ctx.lineTo(-bw, hh - 8);
        ctx.quadraticCurveTo(-bw, hh, -bw + 8, hh);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      } else {
        b.thawUntil = 0;
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // 冷却冰冻: 瓶底冰锥(被桌面冻住) + 瓶身冰霜覆盖, 随冷却进度融化
  function drawFrozen(b) {
    if (!b.cooling) return;
    const now = performance.now();
    const k = Math.max(0, Math.min(1, (b.coolUntil - now) / cooldownMs(b.type)));
    if (k <= 0) return;
    const p = project(b.wx, b.wy, 0);          // 贴地脚点(瓶底)
    const s = BOTTLE_SCALE;
    // 1) 冰封底座: 瓶底一圈锯齿冰锥, 从桌面冻住瓶底
    ctx.save();
    ctx.globalAlpha = 0.55 * k;
    ctx.fillStyle = '#bfe3ff';
    const spikes = 5;
    for (let i = 0; i < spikes; i++) {
      const cx = p.x + (i - (spikes - 1) / 2) * 13 * s;
      const h = (22 + 16 * k) * s * (1 - Math.abs(i - (spikes - 1) / 2) / (spikes / 2) * 0.5);
      ctx.beginPath();
      ctx.moveTo(cx - 6, p.y + 2);
      ctx.lineTo(cx, p.y + 2 - h);
      ctx.lineTo(cx + 6, p.y + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // 2) 冰霜覆瓶: 瓶身轮廓半透明覆盖, 随冷却融化
    const lift = b.state === 'lying' ? BOTTOM_W * s : HALF_H * s;
    ctx.save();
    ctx.translate(p.x, p.y - lift);
    ctx.scale(s, s);
    ctx.rotate(b.rot);
    ctx.globalAlpha = 0.40 * k;
    ctx.fillStyle = '#e8f4ff';
    const bw = BOTTOM_W, tw = TOP_W, hh = HALF_H;
    ctx.beginPath();
    ctx.moveTo(-bw, hh); ctx.lineTo(bw, hh); ctx.lineTo(bw, -28);
    ctx.lineTo(tw, -28); ctx.lineTo(tw, -hh); ctx.lineTo(-tw, -hh);
    ctx.lineTo(-tw, -28); ctx.lineTo(-bw, -28); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawDebug() {
    ui.fillStyle = '#fff';
    ui.font = '12px monospace';
    ui.textAlign = 'left';
    for (let i = 0; i < bottles.length; i++) {
      const b = bottles[i];
      ui.fillText(i + ':' + (b.flying ? '飞' : b.state[0]) + '@' + Math.round(b.wx) + ',' + Math.round(b.wy), 12, 20 + i * 14);
    }
  }

  function render() {
    // 1) 低分辨率缓冲渲染(像素风图形)
    ctx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
    ctx.clearRect(0, 0, CONFIG.worldW, CONFIG.worldH);
    ctx.drawImage(tableCanvas, 0, 0, CONFIG.worldW, CONFIG.worldH);
    drawGhosts();   // 残影画在瓶子下层(拖尾)
    // 深度排序: 越靠前(wy 越小)越后画, 前面的正确遮挡后面的
    sortedBottles.length = 0;
    for (const b of bottles) sortedBottles.push(b);
    sortedBottles.sort((x, y) => y.wy - x.wy);
    for (const b of sortedBottles) { drawShadow(b); drawBottle(b); drawFrozen(b); }
    // 手: 拍击瞬间显示在瓶子上方(画在瓶子之后, 覆盖其上), 抛完消失
    for (const h of hands) drawHand(h);
    drawShards();                     // 瓶子碎裂碎片
    drawHammerFx();                   // 锤子落下敲击
    drawGoldenFx();                   // 金色瞬间特效(冲击波环 + 上升星光)
    if (charging) drawChargeBar();

    // 2) 最近邻放大到显示画布(产生像素颗粒)
    ui.imageSmoothingEnabled = false;
    ui.clearRect(0, 0, CONFIG.worldW, CONFIG.worldH);
    ui.drawImage(buf, 0, 0, CONFIG.worldW, CONFIG.worldH);

    // 3) 文字/UI(原生分辨率, 清晰)
    if (charging) drawChargeBarLabels();
    drawFloats();
    drawCombo();
    drawStreakTimer();
    if (hammerMode) drawHammerHint();
    if (CONFIG.debug) drawDebug();
    // 金色瞬间全屏闪光(淡出)
    if (goldenFlashUntil > 0) {
      const k = (goldenFlashUntil - performance.now()) / 350;
      if (k <= 0) { goldenFlashUntil = 0; }
      else {
        ui.fillStyle = 'rgba(255,209,102,' + (0.32 * k).toFixed(3) + ')';
        ui.fillRect(0, 0, CONFIG.worldW, CONFIG.worldH);
      }
    }
  }

  // 敲碎模式顶部提示
  function drawHammerHint() {
    const bt = BOTTLE_TYPES[hammerMode];
    const txt = '敲碎模式：点击' + bt.name + '（点空白或再次使用退出）';
    ui.save();
    ui.font = 'bold 16px ' + PIXEL_FONT;
    ui.textAlign = 'left';
    const iconW = 22;
    const w = ui.measureText(txt).width + 36 + iconW + 6;
    const x0 = (CONFIG.worldW - w) / 2;
    roundRect(ui, x0, 12, w, 34, 17);
    ui.fillStyle = 'rgba(0,0,0,0.6)';
    ui.fill();
    ui.strokeStyle = 'rgba(255,159,67,0.7)';
    ui.lineWidth = 1.5;
    ui.stroke();
    pixelCanvas(ui, 'hammer', x0 + 18, 20, 18);
    ui.fillStyle = '#ffc857';
    ui.fillText(txt, x0 + 18 + iconW + 6, 34);
    ui.restore();
  }

  // 正在蓄力瓶子的高亮提示
  // 蓄力条(底部居中): 绿色=直立区间, 金色=倒立区间, 白色指针来回摆动
  function drawChargeBar() {
    const barX = 150, barY = 585, barW = 600, barH = 16;
    const r = effectiveRanges();
    const px = (v) => barX + v * barW;

    ctx.save();
    // 底板
    roundRect(ctx, barX - 6, barY - 6, barW + 12, barH + 12, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 直立区间(绿)
    const ux0 = px(r.upright.center - r.upright.half);
    const ux1 = px(r.upright.center + r.upright.half);
    ctx.fillStyle = 'rgba(82,224,124,0.55)';
    ctx.fillRect(ux0, barY, ux1 - ux0, barH);

    // 倒立区间(金)
    const ix0 = px(r.inverted.center - r.inverted.half);
    const ix1 = px(r.inverted.center + r.inverted.half);
    ctx.fillStyle = 'rgba(255,200,87,0.65)';
    ctx.fillRect(ix0, barY, ix1 - ix0, barH);

    // 指针(三角 + 竖线)
    const cp = chargePointer(chargePhase);
    const cx = px(cp);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, barY - 6);
    ctx.lineTo(cx - 7, barY - 18);
    ctx.lineTo(cx + 7, barY - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(cx - 1.5, barY - 4, 3, barH + 8);
    ctx.restore();
  }

  // 蓄力条区间标签(绘制到显示层, 原生分辨率清晰文字)
  function drawChargeBarLabels() {
    const barX = 150, barY = 585, barW = 600;
    const r = effectiveRanges();
    const px = (v) => barX + v * barW;
    ui.save();
    ui.font = 'bold 15px ' + PIXEL_FONT;
    ui.textAlign = 'center';
    ui.fillStyle = 'rgba(255,255,255,0.95)';
    ui.fillText('直立', px(r.upright.center), barY - 10);
    ui.fillText('倒立', px(r.inverted.center), barY - 10);
    ui.restore();
  }

  // ============================ 主循环 ============================
  let lastT = performance.now();

  // 蓄力指针速度(连击越高越快, 命中越难, 形成风险递增张力)
  function chargeSpeed() {
    const base = CONFIG.charge.speed + streak * CONFIG.charge.speedPerStreak;
    return milestoneUnlocked('ms_steady') ? base * CONFIG.milestone.steadySpeedMult : base;
  }
  function updateCharge(dt) {
    if (!charging) return;
    chargePhase += chargeSpeed() * dt / 1000;
    if (chargePhase >= 2) chargePhase -= 2;
  }

  // 手: 自动抛瓶
  // 每只手的独立抛瓶间隔(毫秒)。手越多, 同时工作的手越多, 总吞吐 = 手数 / 间隔
  function perHandInterval() {
    const hands = owned('hand');
    if (hands <= 0) return Infinity;
    const freqLv = techLevel('handFreq');
    let iv = Math.max(400, CONFIG.autoThrowBase - freqLv * CONFIG.autoThrowStep);
    return milestoneUnlocked('ms_hands') ? iv * CONFIG.milestone.handsSpeedMult : iv;
  }
  function updateAutoThrow(dt) {
    if (!started) return;
    const iv = perHandInterval();
    if (!isFinite(iv)) return;
    // 每只手独立计时、独立抛瓶: 到点后各自找一个空闲瓶子拍击
    for (const h of hands) {
      if (h.state !== 'idle') continue;        // 正在拍击的手跳过
      h.acc += dt;
      if (h.acc >= iv) {
        h.acc = 0;
        const idle = bottles.filter(b => !b.flying && !b.claimed && !b.cooling);
        if (idle.length) slapWithHand(h, idle[(Math.random() * idle.length) | 0]);
      }
    }
  }

  function loop(now) {
    const dt = Math.min(50, now - lastT);
    lastT = now;
    updateFlips(now);
    updateCooldowns(now);
    updateHands(now);
    updateCharge(dt);
    updateAutoThrow(dt);
    updateFloats(dt);
    updateShards(dt);
    // 连击超时: 手动成功后倒计时, 超时中断归零(新机制, 需「连击存在时间」科技延长)
    if (streak > 0 && streakExpireAt > 0 && now > streakExpireAt) {
      breakStreak();
      updateHUD();
    }
    render();
    requestAnimationFrame(loop);
  }

  // ============================ 调试钩子 ============================
  window.__pbottle = {
    bottles: () => bottles.map(b => ({ state: b.state, type: b.type, flying: b.flying, cooling: b.cooling, coolUntil: b.coolUntil, thawUntil: b.thawUntil, claimed: b.claimed, free: b.free, wx: +b.wx.toFixed(0), wy: +b.wy.toFixed(0), h: +b.h.toFixed(0), rot: +b.rot.toFixed(2), phi: +b.phi.toFixed(2), tumbleTurns: b.tumbleTurns, spinTurns: b.spinTurns, heat: b.heat, fxGhost: b.fxGhost, ghosts: ghosts.length })),
    stats: () => ({ caps, streak, best, attempts, panelUnlocked, tech: { ...techLevels }, items: { ...itemsOwned }, lifetime: { ...stats }, achievements: { ...achievements }, milestones: MILESTONES.filter(m => milestoneUnlocked(m.id)).map(m => m.id), maxBottles: currentMaxBottles(), hammerMode, streakWindowMs: streakWindowMs(), streakExpireAt }),
    music: () => ({ enabled: Music.isEnabled(), volume: +Music.getVolume().toFixed(2), playing: Music.isPlaying(), tempoTargetMs: Math.max(CONFIG.musicStreak.minStepMs, CONFIG.musicStreak.baseStepMs - streak * CONFIG.musicStreak.stepPerStreak), tempoCurrentMs: +Music.getTempo().toFixed(1), layers: { bass: streak >= CONFIG.musicStreak.bassAt, harmony: streak >= CONFIG.musicStreak.harmonyAt, hat: streak >= CONFIG.musicStreak.hatAt } }),
    hands: () => hands.map(h => ({ state: h.state, acc: +h.acc.toFixed(0), target: h.target ? h.target.type : null })),
    ranges: () => ({ ...effectiveRanges(), pointer: +chargePointer(chargePhase).toFixed(3), charging: !!charging, perHandInterval: perHandInterval() }),
    panel: { unlock: unlockPanel, unlockTech, buyItem },
    setStreak: (n) => { streak = Math.max(0, n | 0); updateHUD(); },   // 调试: 设置连击(验证音乐节奏挂钩)
    setCaps: (n) => { caps = Math.max(0, n | 0); scoreDisplay = caps; updateHUD(); renderPanel(); },      // 调试: 设置瓶盖(验证购买/锤子/红点流程)
    combo: (n) => { triggerCombo(Math.max(0, n | 0)); combo.active = n > 1; },  // 调试: 触发街霸式连击提示
    reset: resetGame,
  };

  // ============================ 初始化 ============================
  // 静态像素图标(HTML 中的空占位由 JS 填充)
  const techTitleIcon = document.getElementById('techTitleIcon');
  if (techTitleIcon) techTitleIcon.innerHTML = pixelSvg('dna', 18);
  if (techCloseBtn) techCloseBtn.innerHTML = pixelSvg('close', 16);
  Music.setStreakGetter(() => streak);   // 音乐节奏与连击挂钩
  loadState();
  rollDaily();
  updateSoundUI();
  renderRestartBtn();
  // 调试/截图: ?confirm=1 初始打开重新开始确认框(幂等, 不影响正常游玩)
  if (new URLSearchParams(location.search).get('confirm') === '1') openConfirmRestart();
  // 调试/截图: ?drawer=1 初始展开抽屉(幂等, 便于竖屏验收截图)
  if (new URLSearchParams(location.search).get('drawer') === '1') setDrawerOpen(true);
  initBottles();
  rebuildHands();
  // 预渲染静态桌面(木纹/木节只画一次)
  tableCtx.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, 0, 0);
  drawTable(tableCtx);
  updateHUD();
  renderPanel();
  render();
  requestAnimationFrame(loop);
})();
