// ============================================================================
// 游戏数据 (window.PB): 配置 / 瓶子类型 / 连击特效档位 / 科技树 / 道具 / 成就 / 里程碑 / 每日目标
// 零依赖纯数据, 由 js/main.js 解构使用。修改数值只需动这里。
// ============================================================================
(() => {
  'use strict';

  // ============================ 配置 ============================
  const CONFIG = {
    worldW: 900,          // 画布宽度(px)
    worldH: 620,          // 画布高度(px)

    // 桌面(世界坐标, 等距投影平面上的尺寸)——铺满左侧舞台
    table: { w: 880, d: 600 },

    // 45° 俯角侧视投影(相机垂直于桌边, 向下俯视 45°)
    iso: {
      scale: 1.0,         // 地面缩放
      ox: 450, oy: 315,   // 桌面中心在屏幕上的位置
    },

    // 瓶子
    bottleCount: 2,       // 初始瓶子数量
    hitRadius: 48,        // 点击命中半径(屏幕px)
    minGap: 95,           // 初始布局最小间距(世界单位)
    maxBottles: 8,        // 桌面上瓶子数量上限

    // 抛瓶动画
    flipDuration: 900,    // 抛瓶动画时长(ms)
    peakH: 130,           // 抛瓶峰值高度(世界单位)
    spinTurns: 2,         // 抛瓶旋转圈数

    // 蓄力条(指针来回摆动, 松手时指针落在哪个区间决定结果; 区间越宽越容易命中)
    charge: {
      speed: 1.6,           // 指针摆动速度(phase/秒, 完整往返约 1.25 秒)
      speedPerStreak: 0.06, // 每 1 连击指针加速(phase/秒), 连击越高越难命中
      uprightCenter: 0.55,  // 直立区间中心(0~1)
      uprightHalf: 0.12,    // 直立区间半宽
      invertedCenter: 0.88, // 倒立区间默认中心(挂机/初始用; 手动每次蓄力随机)
      invertedHalf: 0.10,   // 倒立区间半宽(加宽, 手动随机位置下仍可达)
    },

    // 平躺兜底(手动乱点也小概率翻正, 概率与成功率科技正相关)
    lyingSave: {
      uprightFactor: 0.5,   // 翻直立概率 = 直立半宽 × 此系数(基础 6% → 满科技 9%)
      invertedFactor: 0.3,  // 翻倒立概率 = 倒立半宽 × 此系数(基础 3% → 满科技 7.8%)
    },

    // 计分(瓶盖)
    scoreBottom: 1,       // 直立获得瓶盖数
    scoreMouth: 5,        // 倒立获得瓶盖数(特殊奖励)
    streakBonus: 1,       // 连击额外加成(每次 +1 瓶盖)

    // 手动/挂机收益倍率(方案1+2: 挂机不吃连击 + 收益倍率分层)
    manualMult: 1.5,      // 手动抛瓶收益倍率(技巧奖励)
    handMult: 0.5,        // 挂机(手)抛瓶收益倍率(稳定底薪, 不吃连击)

    // 瓶子类型与倍率见 BOTTLE_TYPES(玻璃×1 / 黄金×2.5 / 翡翠×5)
    expandCapPerLevel: 2,    // 扩容科技: 每级瓶子上限 +2(桌面总上限)
    expandPerLevel: 4,       // 玻璃瓶科技: 每级可购上限 +4
    specialPerLevel: 2,      // 黄金瓶科技: 每级可购上限 +2
    jadePerLevel: 2,         // 翡翠瓶科技: 每级可购上限 +2

    // 冷却(抛瓶后瓶子进入冷却, 期间不可再抛, 瓶身结冰)
    cooldownBase: 2000,      // 冷却基础时长(ms)
    cooldownStep: 100,       // 冷却科技: 每级缩减(ms)
    cooldownMin: 1500,       // 冷却下限(ms, 硬约束: 再降手数接管过早点, 瓶数=收益失效)

    // 锤子返还(敲碎返还购买价的比例, 随锤子科技升级提高; 非线性, 满级 96% < 100% 保证返还恒 < 瓶子价)
    hammerRefundLevels: [0.60, 0.72, 0.82, 0.90, 0.96],  // 锤子 Lv1~Lv5 返还比例

    // 科技效果(稳定/平衡/连击/神之一手, 解锁即生效)
    stabilityUpright: 0.06,  // 稳定科技: 直立区间半宽 +0.06
    balanceInverted: 0.04,   // 平衡科技: 倒立区间半宽 +0.04
    streakTechBonus: 1,      // 连击奖励科技: 每级连击加成 +1(可升级 Lv3, 累计 +3)
    godHandInverted: [0.03, 0.07, 0.12],  // 神之一手: 各等级累计倒立半宽加成(可升级 Lv3, 满级 +0.12)

    // 连击存在时间(新机制): 手动成功后连击进入倒计时窗口, 超时中断归零
    streakBaseWindow: 4000,     // 连击基础存在时间(ms)
    streakWindowPerLevel: 2000, // 连击存在时间科技: 每级 +2 秒

    // 手(道具: 自动抛瓶)
    autoThrowBase: 4000,     // 自动抛瓶基础间隔(ms)
    autoThrowStep: 500,      // 提高手的频率: 每级缩减间隔(ms)
    handLuckBonus: 0.03,     // 提高手的几率: 每级直立+倒立区间半宽各 +0.03
    handSlapDuration: 600,   // 手拍击动画时长(ms)
    handHitT: 0.5,           // 拍击动画中触发抛瓶的时刻(0~1)
    handReach: 62,           // 手向前伸出的距离(世界单位)

    // 方向 A 新节点效果(阶段三)
    pointerSlowMult: 0.85,   // 指针减速: 蓄力指针速度 ×0.85(更易命中)
    perfectHalf: 0.02,       // 完美判定: 直立区间中心的窄「完美区」半宽
    perfectMult: 1.5,        // 完美判定: 完美区命中奖励 ×1.5
    goldenLuckBonus: 0.005,  // 金色概率+: 金色瞬间基础触发概率 +0.5%(每点? 一次性)

    // 方向 B 新节点效果(阶段三)
    offlineCapHours: 8,      // 离线收益: 累计上限(小时)
    offlineRate: 0.5,        // 离线收益: 折减系数(50%)
    handStreakCap: 3,        // 挂机连击: 手命中也累计连击的上限
    handGoldenChance: 0.005, // 手幸运: 手触发金色瞬间概率(0.5%)
    handSyncMult: 0.8,       // 手速共享: 手总间隔 ×0.8(协同加速)
    harvestSlots: 3,         // 自动收获: 收获格子数量

    debug: false,         // 调试: 显示瓶子索引与状态

    // 功能界面
    panelUnlockCost: 30,  // 解锁功能界面所需瓶盖
    toastDuration: 2600,  // 成就达成通知停留时长(ms)
    achievementRewardPerAch: 0.02,  // 每个已达成成就使全局瓶盖收益 +2%

    // 科技点经济(阶段一: 瓶盖兑换科技点, 通用池 60 上限, 节点占点解锁)
    techPoints: {
      max: 60,            // 科技点上限(累计可购买)
      baseCost: 100,      // 第 1 个科技点价格(瓶盖)
      growth: 1.15,       // 每点价格几何递增(第 N 点 = baseCost × growth^(N-1))
      achieveGate: false, // 成就门槛开关(默认关): 开启后第 N 点需达成 ceil(N/5) 成就
    },

    // 成就里程碑专属奖励(达成对应成就数自动解锁, 即时生效)
    milestone: {
      luckyChance: 0.08,     // 幸运瓶(3成就): 抛瓶结果升一档的概率
      goldCapsMult: 0.10,    // 黄金瓶盖(6成就): 收益 +10%
      handsSpeedMult: 0.80,  // 手速强化(9成就): 手抛瓶间隔 ×0.8
      steadySpeedMult: 0.80, // 稳如泰山(12成就): 蓄力指针速度 ×0.8
      shieldKeep: 0.5,       // 连击护盾(15成就): 平躺保留连击比例(向下取整)
      godSpecialBonus: 0.5,  // 瓶神附体(18成就): 特殊瓶奖励倍率额外 +0.5
    },

    // 抛瓶旋转特效: 连击越高螺旋/空翻越烈、残影越多、越提亮(仅手动瓶; 挂机瓶保持基础朴素)
    streakFx: {
      ghostLife: 170,     // 残影存活时长(ms)
      ghostAlpha: 0.28,   // 残影最大透明度
      ghostMax: 14,       // 全局残影池上限(防多瓶叠加变乱)
      handAlpha: 0.45,    // 飞行中挂机瓶降权透明度(主次分明)
    },

    // 金色瞬间(稀有彩蛋): 手动抛瓶小概率触发, 强制倒立 + 奖励×10 + 金色视觉/音效
    golden: {
      baseChance: 0.004,   // 基础触发概率 0.4%(约每 250 次一次)
      perStreak: 0.0008,   // 每 1 连击 +0.08%
      maxChance: 0.02,     // 触发概率上限 2%(连击 20 时封顶)
      mult: 10,            // 奖励倍率
    },

    soundVolume: 0.7,        // 默认音效音量(0~1)
    musicVolume: 0.5,        // 默认音乐音量(0~1)

    // 音乐节奏与连击挂钩(连击越高节奏越快、层次越丰富)
    musicStreak: {
      baseStepMs: 240,       // 基础节奏(每步毫秒; 一步=8分音符, 125 BPM)
      minStepMs: 140,        // 最快节奏(每步毫秒下限)
      stepPerStreak: 4,      // 每 1 连击缩短的毫秒数
      kickEvery: 4,          // 底鼓(强拍)间隔(步): 每 4 步一个"咚", 基础律动始终有
      bassAt: 5,             // 连击达到该值加入低音
      snareAt: 8,            // 连击达到该值加入军鼓(反拍"啪")
      harmonyAt: 10,         // 连击达到该值加入和声(五度)
      hatDenseAt: 15,        // 连击达到该值 hi-hat 加密(基础每 2 步 → 每步)
      intenseAt: 20,         // 连击达到该值切换激昂段(音域更高、旋律更密)
      smoothFactor: 0.2,      // 节奏平滑趋近系数(每步向目标靠近的比例)
    },
  };

  // 瓶子类型(颜色 / 命中倍率 / 对应锤子)
  const BOTTLE_TYPES = {
    glass: { name: '玻璃瓶', mult: 1,   fill: 'rgba(150,205,255,0.30)', stroke: 'rgba(255,255,255,0.45)', shadow: 'rgba(0,0,0,0.4)', blur: 12 },
    gold:  { name: '黄金瓶', mult: 2.5, fill: 'rgba(255,196,90,0.34)',  stroke: 'rgba(255,214,130,0.85)',  shadow: 'rgba(255,200,87,0.9)', blur: 18 },
    jade:  { name: '翡翠瓶', mult: 5,   fill: 'rgba(90,230,150,0.34)',  stroke: 'rgba(130,240,180,0.85)',  shadow: 'rgba(90,230,150,0.9)', blur: 20 },
  };

  // 连击特效档位(手动瓶): 连击越高螺旋圈数越多、空翻越烈、残影越密、描边越暖
  // heat: 0=默认描边, 1=黄(提亮), 2=红橙(升温); ghost: 残影密度(0=无, 越大越密)
  const STREAK_FX = [
    { min: 0,  spin: 2, tumble: 1, heat: 0, ghost: 0 },  // 连击 0-4 : 基线, 无残影
    { min: 5,  spin: 3, tumble: 2, heat: 0, ghost: 2 },  // 连击 5-9 : 圈数↑ 空翻↑ 残影稀疏
    { min: 10, spin: 5, tumble: 3, heat: 1, ghost: 4 },  // 连击 10-19: 提亮, 残影中密
    { min: 20, spin: 7, tumble: 4, heat: 2, ghost: 6 },  // 连击 20+ : 升温, 残影最密
  ];
  function streakFx(streak) {
    let fx = STREAK_FX[0];
    for (const f of STREAK_FX) if (streak >= f.min) fx = f;
    return fx;
  }

  // 科技树(解锁道具购买权 / 强化手 / 强化手动蓄力)
  // 结构: 沙漏形双方向 — 方向 A 倒立瓶(手动, 向上) / 方向 B 正立瓶(挂机, 向下) / 基建环绕腰部
  // 模型A: 节点花「科技点」(points 占点数)一次性解锁=直接满级效果(maxLevel 仅用于计算满级效果值)
  // side: 'infra'=中立基建(两方向共享) / 'A'=手动技巧方向 / 'B'=自动挂机方向
  // 对称: A满=35点(基础10+进阶25) = B满=35点; 基建15点; 60=基建15+满35+另一方向基础10
  const TECH_TREE = [
    // ============ 中立基建 15 点(环绕腰部) ============
    { id: 'branchBottle', name: '瓶子分支',   icon: 'bottle', points: 1, side: 'infra', prereq: null, desc: '开启瓶子分支',   detail: '开启瓶子分支：瓶子类型（黄金/翡翠）、对应锤子、桌面瓶子数量与上限。' },
    { id: 'expand',       name: '玻璃瓶',     icon: 'bottle', points: 2, side: 'infra', prereq: 'branchBottle', unlockItem: 'extraBottle', maxLevel: 5, desc: '玻璃瓶可购上限 20', detail: '解锁道具「玻璃瓶」购买权，可购上限 20 个。' },
    { id: 'special',      name: '黄金瓶',     icon: 'bottleGold', points: 2, side: 'infra', prereq: 'expand',      unlockItem: 'specialBottle', maxLevel: 10, desc: '黄金瓶可购上限 20', detail: '解锁道具「黄金瓶」购买权（命中 ×2.5），可购上限 20 个。' },
    { id: 'expandCap',    name: '扩容工程',   icon: 'box', points: 2, side: 'infra', prereq: 'branchBottle', maxLevel: 6, desc: '桌面瓶子上限 +12', detail: '桌面瓶子数量上限 +12（共 20 个）。' },
    { id: 'jadeCraft',    name: '翡翠瓶',     icon: 'bottleJade', points: 2, side: 'infra', prereq: 'special',      unlockItem: 'jadeBottle', maxLevel: 10, desc: '翡翠瓶可购上限 20', detail: '解锁道具「翡翠瓶」购买权（命中 ×5），可购上限 20 个。' },
    { id: 'hammerGlass',  name: '玻璃锤',     icon: 'hammer', points: 1, side: 'infra', prereq: 'expand',    maxLevel: 5, desc: '解锁玻璃锤 · 返还 96%', detail: '解锁道具页签的「玻璃锤」购买权，返还满级 96%。' },
    { id: 'hammerGold',   name: '黄金锤',     icon: 'hammer', points: 1, side: 'infra', prereq: 'special',   maxLevel: 5, desc: '解锁黄金锤 · 返还 96%', detail: '解锁道具页签的「黄金锤」购买权，返还满级 96%。' },
    { id: 'hammerJade',   name: '翡翠锤',     icon: 'hammer', points: 1, side: 'infra', prereq: 'jadeCraft', maxLevel: 5, desc: '解锁翡翠锤 · 返还 96%', detail: '解锁道具页签的「翡翠锤」购买权，返还满级 96%。' },
    { id: 'cdGlass',      name: '玻璃冷却',   icon: 'snow', points: 1, side: 'infra', prereq: 'expand',      maxLevel: 5, desc: '玻璃瓶冷却 -0.5s', detail: '玻璃瓶抛后冷却时间 -0.5 秒（2.0→1.5 秒）。' },
    { id: 'cdGold',       name: '黄金冷却',   icon: 'snow', points: 1, side: 'infra', prereq: 'special',     maxLevel: 5, desc: '黄金瓶冷却 -0.5s', detail: '黄金瓶抛后冷却时间 -0.5 秒。' },
    { id: 'cdJade',       name: '翡翠冷却',   icon: 'snow', points: 1, side: 'infra', prereq: 'jadeCraft',   maxLevel: 5, desc: '翡翠瓶冷却 -0.5s', detail: '翡翠瓶抛后冷却时间 -0.5 秒。' },

    // ============ 方向 A(倒立瓶 · 手动技巧) 35 点 = 基础10 + 进阶25 ============
    // 基础(4节点, 10点): 入口 + 稳定 + 平衡 + 连击入口
    { id: 'branchLuck',   name: '成功率分支', icon: 'target', points: 1, side: 'A', prereq: null, desc: '开启成功率分支', detail: '开启成功率分支：提升直立率与倒立率，让抛瓶更准、连击收益更高。' },
    { id: 'stability',    name: '稳定科技',   icon: 'rock', points: 3, side: 'A', prereq: 'branchLuck',   desc: '直立区间扩宽', detail: '直立区间半宽 +0.06，蓄力时更容易命中直立。' },
    { id: 'balance',      name: '平衡科技',   icon: 'scales', points: 3, side: 'A', prereq: 'branchLuck',    desc: '倒立区间扩宽', detail: '倒立区间半宽 +0.04，蓄力时更容易命中倒立。' },
    { id: 'streak',       name: '连击科技',   icon: 'fire', points: 3, side: 'A', prereq: 'branchLuck',      desc: '开启连击强化', detail: '开启连击强化分支，解锁「连击奖励」与「连击存在时间」。' },
    // 进阶(7节点, 25点)
    { id: 'godhand',      name: '神之一手',   icon: 'crown', points: 4, side: 'A', prereq: 'balance',      maxLevel: 3, desc: '倒立几率大幅提升', detail: '倒立区间半宽 +0.12，大幅提升倒立几率。' },
    { id: 'streakReward', name: '连击奖励',   icon: 'coin', points: 4, side: 'A', prereq: 'streak',       maxLevel: 3, desc: '连击加成 +3', detail: '连击加成 +3 瓶盖，连击越高每次奖励越多。' },
    { id: 'streakWindow', name: '连击存在时间', icon: 'bolt', points: 3, side: 'A', prereq: 'streak',     maxLevel: 3, desc: '连击时间 +6 秒', detail: '连击存在时间 +6 秒（4→10 秒），更充足的时间保持连击。' },
    { id: 'pointerSlow',  name: '指针减速',   icon: 'target', points: 3, side: 'A', prereq: 'stability',   desc: '指针速度 -15%', detail: '蓄力指针速度 ×0.85，更慢更好瞄准，技巧有纵深。' },
    { id: 'perfect',      name: '完美判定',   icon: 'star', points: 4, side: 'A', prereq: 'godhand',      desc: '完美区命中 ×1.5', detail: '直立区间中心分窄「完美区」（±0.02），命中奖励 ×1.5，给高手更高天花板。' },
    { id: 'goldenLuck',   name: '金色概率+',  icon: 'sparkle', points: 3, side: 'A', prereq: 'streakReward', desc: '金色瞬间几率 +0.5%', detail: '金色瞬间基础触发概率 +0.5%，手动专属惊喜。' },
    { id: 'invertedMaster', name: '倒立宗师', icon: 'crown', points: 4, side: 'A', prereq: 'perfect',     desc: '解锁 Zoom 专注领域', detail: '解锁「Zoom 专注领域」：连击≥20 时几率进入，只抛一个瓶子挑战极限，成功高额奖励。', final: true },

    // ============ 方向 B(正立瓶 · 自动挂机) 35 点 = 基础10 + 进阶25 ============
    // 基础(4节点, 10点): 入口 + 解锁手 + 手频率 + 手几率
    { id: 'branchHand',   name: '手分支',     icon: 'hand', points: 1, side: 'B', prereq: null, desc: '开启手分支',     detail: '开启手分支：手的个数（购买权）、冷却时间与命中率。' },
    { id: 'unlockHand',   name: '解锁手',     icon: 'glove', points: 3, side: 'B', prereq: 'branchHand',   unlockItem: 'hand', desc: '解锁道具「手」', detail: '解锁道具页签的「手」购买权，手会自动抛空闲瓶子。' },
    { id: 'handFreq',     name: '提高手的频率', icon: 'rocket', points: 3, side: 'B', prereq: 'branchHand', maxLevel: 5, desc: '手抛瓶间隔缩短', detail: '手抛瓶间隔缩短 2500ms。挂机收益越高。' },
    { id: 'handLuck',     name: '提高手的几率', icon: 'dice', points: 3, side: 'B', prereq: 'branchHand', maxLevel: 5, desc: '手抛瓶命中率提升', detail: '手抛瓶的直立/倒立区间各 +0.15，手更“准”。' },
    // 进阶(7节点, 25点)
    { id: 'handStreak',   name: '挂机连击',   icon: 'fire', points: 4, side: 'B', prereq: 'unlockHand',  desc: '手命中也累计连击', detail: '手命中也积累少量连击（上限 +3），打破「挂机不吃连击」但低于手动。' },
    { id: 'handGolden',   name: '手幸运',     icon: 'sparkle', points: 3, side: 'B', prereq: 'handFreq',   desc: '手小概率金色瞬间', detail: '手抛瓶 0.5% 概率触发金色瞬间，挂机也有「回来收惊喜」期待。' },
    { id: 'handSync',     name: '手速共享',   icon: 'rocket', points: 3, side: 'B', prereq: 'handLuck',   desc: '手总间隔 -20%', detail: '手协同加速，总抛瓶间隔 ×0.8。' },
    { id: 'offline',      name: '离线收益',   icon: 'clock', points: 4, side: 'B', prereq: 'handStreak', desc: '关页也产出(上限8h)', detail: '关页后按挂机配置产出（上限 8 小时，折减 50%），回来领取。' },
    { id: 'autoHarvest',  name: '自动收获',   icon: 'box', points: 4, side: 'B', prereq: 'handGolden',  desc: '自动收过期掉落+格子', detail: '桌面事件掉落物：格子满了进过期，本节点自动收取过期掉落，并 +3 收获格子。' },
    { id: 'handReport',   name: '挂机报告',   icon: 'clipboard', points: 3, side: 'B', prereq: 'handSync',   desc: '回来弹挂机总结', detail: '回来时弹出本次挂机产出总结（时长/瓶盖/亮点），让挂机「有期待」。' },
    { id: 'autoFactory',  name: '自动化工厂', icon: 'gear', points: 4, side: 'B', prereq: 'autoHarvest', desc: '解锁桌面奇妙事件', detail: '解锁「桌面奇妙事件」：挂机产出时几率掉落奖励，丰富挂机趣味。', final: true },
  ];

  // 科技树第0层根节点: 解锁科技树功能本身(对应「解锁功能界面」)
  // 该节点不在 TECH_TREE 内, 由 renderTech 单独置于第0列; 其余科技整体右移一层
  const TECH_ROOT = {
    id: '_unlockTechTree',
    name: '解锁科技树功能',
    icon: 'lockopen',
    cost: CONFIG.panelUnlockCost,
    isRoot: true,
    desc: '解锁科技树功能',
    detail: '消耗 ' + CONFIG.panelUnlockCost + ' 瓶盖解锁科技树，之后才能研究「瓶子分支」「成功率分支」「手分支」三大分支。',
  };

  // 道具(购买到的拥有物, 有数量; 需对应科技解锁购买权)
  const ITEMS = [
    { id: 'extraBottle', name: '玻璃瓶', cost: 25, repeatable: true, desc: '桌面增加 1 个玻璃瓶（买现成的）' },
    { id: 'hand',        name: '手',       cost: 60, repeatable: true, max: 8, desc: '自动抛空闲瓶子 · 每只手需要一个瓶子' },
    { id: 'specialBottle', name: '黄金瓶', cost: 150, repeatable: true, desc: '桌面增加 1 个黄金瓶 · 命中奖励 ×2.5' },
    { id: 'jadeBottle', name: '翡翠瓶', cost: 300, repeatable: true, desc: '桌面增加 1 个翡翠瓶 · 命中奖励 ×5' },
    { id: 'glassHammer', name: '玻璃锤', cost: 15,  repeatable: true, max: 99, unlockTech: 'hammerGlass', desc: '敲碎玻璃瓶时消耗 1 个 · 返还 60% 起' },
    { id: 'goldHammer',  name: '黄金锤', cost: 75,  repeatable: true, max: 99, unlockTech: 'hammerGold',  desc: '敲碎黄金瓶时消耗 1 个 · 返还 60% 起' },
    { id: 'jadeHammer',  name: '翡翠锤', cost: 150, repeatable: true, max: 99, unlockTech: 'hammerJade',  desc: '敲碎翡翠瓶时消耗 1 个 · 返还 60% 起' },
  ];

  // 成就(达成条件基于累计统计或当前状态)
  const ACHIEVEMENTS = [
    { id: 'firstThrow',  name: '初次抛瓶',   desc: '抛出第一个瓶子',      icon: 'target', type: 'attempts',     target: 1,     reward: 10 },
    { id: 'throw100',    name: '抛瓶达人',   desc: '累计抛瓶 100 次',     icon: 'target', type: 'attempts',     target: 100,   reward: 100 },
    { id: 'throw500',    name: '抛瓶狂人',   desc: '累计抛瓶 500 次',     icon: 'trophy', type: 'attempts',     target: 500,   reward: 500 },
    { id: 'streak5',     name: '连击新手',   desc: '单次连击达到 5',      icon: 'fire', type: 'maxStreak',    target: 5,     reward: 30 },
    { id: 'streak10',    name: '连击高手',   desc: '单次连击达到 10',     icon: 'fire', type: 'maxStreak',    target: 10,    reward: 120 },
    { id: 'streak20',    name: '连击之神',   desc: '单次连击达到 20',     icon: 'bolt', type: 'maxStreak',    target: 20,    reward: 500 },
    { id: 'inv1',        name: '第一次倒立', desc: '累计倒立 1 次',       icon: 'updown', type: 'inverted',     target: 1,     reward: 20 },
    { id: 'inv20',       name: '倒立达人',   desc: '累计倒立 20 次',      icon: 'updown', type: 'inverted',     target: 20,    reward: 100 },
    { id: 'inv100',      name: '倒立大师',   desc: '累计倒立 100 次',     icon: 'crown', type: 'inverted',     target: 100,   reward: 500 },
    { id: 'earn500',     name: '小有积蓄',   desc: '累计获得 500 瓶盖',   icon: 'money', type: 'earned',       target: 500,   reward: 30 },
    { id: 'earn5000',    name: '瓶盖大亨',   desc: '累计获得 5000 瓶盖',  icon: 'money', type: 'earned',       target: 5000,  reward: 300 },
    { id: 'earn20000',   name: '富可敌国',   desc: '累计获得 20000 瓶盖', icon: 'gem', type: 'earned',       target: 20000, reward: 1000 },
    { id: 'special10',   name: '特殊瓶专家', desc: '特殊瓶命中 10 次',    icon: 'sparkle', type: 'specialHits',  target: 10,    reward: 50 },
    { id: 'tech5',       name: '科技先驱',   desc: '解锁 5 个科技',       icon: 'flask', type: 'techCount',    target: 5,     reward: 50 },
    { id: 'techAll',     name: '学富五车',   desc: '解锁全部 15 个科技', icon: 'grad', type: 'techCount',    target: 15,    reward: 400 },
    { id: 'hand8',       name: '八爪鱼',     desc: '拥有 8 只手',         icon: 'hand', type: 'handCount',    target: 8,     reward: 100 },
    { id: 'bottle8',     name: '瓶满为患',   desc: '桌面放满瓶子',         icon: 'bottle', type: 'bottleCount',  target: 8,     reward: 80 },
    { id: 'special3',    name: '收藏家',     desc: '拥有 3 个黄金瓶',   icon: 'star', type: 'specialCount', target: 3,     reward: 100 },
    { id: 'jade3',       name: '翡翠收藏家', desc: '拥有 3 个翡翠瓶',     icon: 'bottleJade', type: 'jadeCount',    target: 3,     reward: 150 },
    // 隐藏成就(不在列表显示, 达成才揭晓): 金色瞬间彩蛋 + 幽默向
    { id: 'golden1',     name: '天降横财',   desc: '触发 1 次金色瞬间', icon: 'sparkle', type: 'golden',         target: 1,   reward: 50,  hidden: true },
    { id: 'golden10',    name: '金色眷顾',   desc: '触发 10 次金色瞬间', icon: 'crown', type: 'golden',         target: 10,  reward: 500, hidden: true },
    { id: 'lie5',        name: '躺平大师',   desc: '连续平躺 5 次',     icon: 'star', type: 'consecutiveLie', target: 5,   reward: 30,  hidden: true },
  ];

  // 成就里程碑(专属奖励): 达成对应成就数自动解锁, 即时生效
  const MILESTONES = [
    { id: 'ms_lucky',   at: 3,  name: '幸运瓶',   icon: 'clover', desc: '每次抛瓶 8% 概率结果提升一档' },
    { id: 'ms_gold',    at: 6,  name: '黄金瓶盖', icon: 'coin', desc: '所有瓶盖收益 +10%' },
    { id: 'ms_hands',   at: 9,  name: '手速强化', icon: 'bolt', desc: '手抛瓶间隔 -20%' },
    { id: 'ms_steady',  at: 12, name: '稳如泰山', icon: 'target', desc: '蓄力指针速度 -20%' },
    { id: 'ms_shield',  at: 15, name: '连击护盾', icon: 'shield', desc: '平躺连击减半而非清零' },
    { id: 'ms_god',     at: 18, name: '瓶神附体', icon: 'crown', desc: '特殊瓶奖励倍率 +0.5' },
  ];

  // 每日目标池(每天随机抽 3 个, 跨天自动重置; 达成即发奖励, 后期留存钩子)
  const DAILY_POOL = [
    { type: 'attempts',    icon: 'target', label: '抛瓶 30 次',     target: 30,  reward: 50 },
    { type: 'inverted',    icon: 'updown', label: '倒立 5 次',       target: 5,   reward: 80 },
    { type: 'earned',      icon: 'money', label: '赚 200 瓶盖',     target: 200, reward: 60 },
    { type: 'specialHits', icon: 'sparkle', label: '特殊瓶命中 3 次', target: 3,   reward: 70 },
  ];

  window.PB = window.PB || {};
  window.PB.CONFIG = CONFIG;
  window.PB.BOTTLE_TYPES = BOTTLE_TYPES;
  window.PB.STREAK_FX = STREAK_FX;
  window.PB.streakFx = streakFx;
  window.PB.TECH_TREE = TECH_TREE;
  window.PB.TECH_ROOT = TECH_ROOT;
  window.PB.ITEMS = ITEMS;
  window.PB.ACHIEVEMENTS = ACHIEVEMENTS;
  window.PB.MILESTONES = MILESTONES;
  window.PB.DAILY_POOL = DAILY_POOL;
})();
