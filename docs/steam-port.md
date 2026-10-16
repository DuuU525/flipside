# P瓶子 Steam 上架分析（steam-port.md）

> 留档日期：2026-10-14
> 目的：为 P瓶子（Flipside）上架 Steam 提供类型定位、对标分析与内容增补路标。
> 数据来源：Steam 商店页现网信息 + P瓶子代码级了解（js/main.js / data.js 实测参数）。

---

## 一、游戏类型归类

### 本质定位

**休闲放置增量游戏（Casual Idle / Incremental）**——核心动作「抛瓶子时机判定」，外壳「数值成长 + 自动挂机 + 收集」。

三层拆解：

| 层 | 内容 | 类型标签 |
|---|---|---|
| 核心玩法 | 蓄力抛瓶 → 直立/倒立/平躺判定 | Arcade（动作时机）+ Casual（休闲） |
| 系统层 | 科技树 + 手自动抛瓶 + 离线收益 | Incremental / Idler / Automation |
| 内容层 | 图鉴收集 + 宝箱 + 稀有瓶子 | Collect-a-thon / Resource Management |

### Steam 商店页填写建议

**Genre（主类型）**：

| Genre | 是否选 |
|---|---|
| Casual | ✅ 首选主类型 |
| Indie | ✅ 必选 |
| Simulation | 可选（放置模拟属性） |
| Strategy | 可选（科技树策略层） |

**Tags（玩家标签，按权重排）**：

1. Casual（休闲）
2. Idler / Idle（放置挂机）
3. Incremental（增量成长）
4. Automation（自动化——手自动抛瓶）
5. **Pixel Graphics（像素风——P瓶子独有视觉卖点）**
6. Relaxing（放松）
7. 2D / Singleplayer（基础属性）
8. Collect-a-thon（收集——图鉴/稀有瓶）
9. Resource Management（资源管理——瓶盖经济）

> ⚠️ 慎用「Clicker」标签——P瓶子核心是「时机判定 + 放置」，不是无脑连点，用 Clicker 会误导目标玩家。

### 一句话定位

> 「抛瓶子」的休闲放置游戏——手动抛瓶是主角（技巧时机），自动挂机是辅助（手 + 离线收益），科技树 + 图鉴收集给长期目标。

---

## 二、对标游戏对比

### 直接竞品：Bottle Flip Inc（几乎同款）

| 维度 | P瓶子 | Bottle Flip Inc |
|---|---|---|
| 核心循环 | 蓄力时机判定抛瓶 | 抛瓶（同款） |
| 自动化 | 手道具（8 只）+ 离线收益 | helper hands（同款） |
| 成长系统 | 25 节点科技树 + 科技点经济 | skill tree（同款） |
| 收集 | 3 瓶图鉴 + 宝箱 | collect caps |
| 转生系统 | ❌ 无 | 未知（待发布） |
| 视觉 | 像素风 46 手绘图标 | 2D 卡通（Colorful/Cute） |
| 发行状态 | 网页已上线 v1.0.14 | Q4 2026 未发布（Demo 78% 好评） |

> **关键判断**：与一个还没发售的团队竞品**正面撞概念**。Bottle Flip Inc Demo 已 78% 好评，证明玩法有市场，但上 Steam 会正面竞争。

### 品类内横向对标

| 游戏 | 类型 | 评价 | 可借鉴点 |
|---|---|---|---|
| Bottle Flip Inc | 抛瓶 idle | Demo 78% | 直接竞品 |
| Flippin' Bottles | 抛瓶 idle | 无评价 | 有 **Prestige 转生**（P瓶子缺） |
| Unfair Flips | 抛硬币 clicker | Very Positive (2260) | 「真随机 + 技巧」反直觉设计 |
| Smashing Bottles | 砸瓶 incremental | Very Positive (117) | 爽快的数值释放感 |

---

## 三、优劣点分析

### 优势（相对竞品）

1. **手动玩法有真技巧深度**——倒立中心随机化（防肌肉记忆）、连击、完美判定、Zoom 专注领域、金色瞬间。这是「真·时机技巧」，非 idle 常见的无脑点。Unfair Flips 靠「真随机 + 技巧」拿到 2260 好评，P瓶子走的是同一条更难的路。

2. **视觉完成度异常高**——46 个手绘像素图标、WebAudio 零依赖合成音效（含「瓶身结冰冷却视觉」「金色瞬间光效」）、像素风统一。多数 indie 首发达不到这个打磨度。

3. **双轨设计清晰**——手动（主角）vs 挂机（辅助）分工明确，特殊瓶子身份差异化（玻璃稳定 / 黄金幸运 / 翡翠成长）。

4. **工程零依赖**——纯前端，跨平台成本极低，团队竞品没有的工程优势。

### 劣势（上 Steam 会吃亏）

1. **无 Prestige / 转生系统（最大缺口）**——idle 品类延长生命周期的核心机制。P瓶子 25 节点科技树 + 3 瓶子，纯挂机 2-3 小时到 autoFactory（已重测），**毕业线太短**，通关后无理由回来。

2. **数值「爽感」不足**——EV 成长曲线平缓（第 50 科技点才 33 万盖），缺 idle 常见的「大数字爆炸」爽点。

3. **无 Steam 集成**——成就、云存档、Steam 特有收集感未接，玩家会觉得「网页版搬桌面」。

4. **名字/定位对英文市场不友好**——「P瓶子 / Flipside」在英文主导的 Steam 无辨识度。

### 结论

**差异化底子是「真技巧手动玩法 + 像素风打磨」，但缺 idle 核心支柱「转生 + 数值爽感 + Steam 集成」——上 Steam 前必须补这三样，否则会输给 Bottle Flip Inc 的团队执行力。**

---

## 四、上 Steam 前内容增补清单（缺口）

### P0：转生系统（Prestige）

idle 品类延长生命周期的标配。方向：

- 转生重置科技树 + 瓶子 + 手，换取「永久加成货币」（如「幸运星」）
- 永久加成候选：全局收益倍率、初始瓶盖、科技点价格折扣、基础命中率
- 转生条件：满科技点 / 满图鉴 / 达到某收益里程碑
- 目标：把毕业线从「2-3 小时」拉到「10+ 小时」多轮转生

### P1：数值爽感曲线

- 后期收益曲线调陡（指数/多项式），让「挂机一晚上」有肉眼可见的大数字增长
- 参考 Unfair Flips / Smashing Bottles 的数值释放节奏

### P2：Steam 特有内容

- Steam 成就（22 个本地成就映射）
- 云存档（Steam Auto-Cloud）
- 可能的 Steam 集换卡牌 / 徽章（后期）

---

## 五、技术改造清单（打包 / 存档 / Steamworks / 商店页）

> 核心利好：Electron 内是完整 Chromium，WebAudio 合成、SVG 像素图标、DOM、Canvas 全部原生支持，**游戏代码约 90% 复用，不用重写**（这是相对微信小游戏的巨大优势）。

### 决策点（动手前拍板）

| 决策 | 选项 | 建议 |
|---|---|---|
| 打包壳 | Electron（~100MB）vs Tauri（~5MB） | 先 Electron 跑通 |
| Steamworks 绑定 | Steam Auto-Cloud + 极简 steam_api（只接成就） | 先最小可行 |

### 阶段 1：打包层（验收：exe 双击可玩）

- 新增 `steam/main.js`（Electron 主进程）
- 游戏代码 js/*.js、index.html、css **100% 复用**
- electron-builder 配置产出 exe

### 阶段 2：存档适配层（验收：存档落指定目录）

- 抽 `storage` 后端：localStorage（网页）↔ 文件（桌面 `%APPDATA%/Flipside/save.json`）
- `saveState`/`loadState` 改调 storage 接口，逻辑不变
- 唯一需要动 main.js 的地方

### 阶段 3：Steamworks 集成（验收：达成成就弹 Steam 通知）

- AppID（免费 app）
- Steam Auto-Cloud 指定存档目录（零代码）
- 极简 steam_api 桥接 `SetAchievement`
- `checkAchievements()` 达成时多调一次 `steamSetAchievement(id)` + 一个映射表

### 阶段 4：商店页素材

| 素材 | 尺寸 | 现状 |
|---|---|---|
| Header capsule | 460×215 | 待做（pixel.js 图标拼） |
| Small capsule | 231×87 | 待做 |
| 库图 Library | 600×900 | 待做 |
| 截图 | ≥5 张 | 可复用 prototype/ 截图 |
| 描述/标签/系统需求 | 文本 | README 可提炼 |

### 复用 vs 新增

| 文件 | 处置 |
|---|---|
| js/data.js、pixel.js、audio.js、main.js、index.html、css | 复用（main.js 只动存档层 + 成就桥接） |
| manifest.json | 保留（网页 PWA 用） |
| 新增 steam/ 目录 | Electron 主进程 + steam_api 桥接 + 打包配置 |
| 新增商店页素材 | capsule ×3 + 截图 |

### 总工作量估算

| 阶段 | 工作量 |
|---|---|
| 1 打包 | 0.5~1 天 |
| 2 存档适配 | 0.5 天 |
| 3 Steamworks 集成 | 1~2 天 |
| 4 商店页素材 | 0.5 天 |
| **合计** | **约 3~4 天**（不含审核等待和内容加厚） |

---

## 六、战略建议（免费大厅 + 付费 DLC 模式）

> 用户设想：免费「游戏大厅」主体 + 后续收费 DLC（独立小游戏），用免费引流 + 品质 DLC 套现。**模式成立，Steam 有成熟先例**（Zaccaria Pinball / Pinball FX 的免费大厅 + 付费弹珠台；Poppy Playtime 免费本体 + 付费章节，4 DLC Steam 累计超 3000 万美元）。

### 落地方式

- 免费「游戏大厅」= base app（AppID）
- 每个小游戏 = 一个 DLC（独立 AppID，`DependsOn` 大厅）
- 玩家须先有免费大厅才能买 DLC——正好符合引流设想
- 每个 DLC 独立商店页、独立定价、独立审核

### 风险

1. **评价捆绑**——一个糙 DLC 差评会拖累整个大厅，DLC 品质必须兑现「稍高」承诺
2. **免费大厅不能空洞**——P瓶子恰好适合当大厅里第一个免费可玩的小游戏
3. **每个 DLC 独立审核 + 商店页**——重复成本
4. **退款率**——DLC 内容量须撑得起定价

### 建议推进顺序

1. P瓶子先作为**独立免费游戏**跑通 Steam 全流程（打包 → Steamworks → 商店页 → 免费上架），验证管线
2. 跑顺后把 P瓶子「降级」为大厅里的第一台街机，启动大厅 + DLC 架构

---

## 七、附：对标游戏 Steam 现网信息（2026-10-14 抓取）

- **Bottle Flip Inc**（AppID 4932820）——Genre: Casual/Indie/Simulation/Strategy，Q4 2026，Demo 78% 好评（32 评价）。功能：抛瓶赚钱 / 买瓶 / helper hands 自动化 / 独特能力 / collect caps 进科技树。
- **Flippin' Bottles**（AppID 5164360）——Genre: Casual，Nov 2 2026，无评价。有 prestige 转生 + 永久升级。
- **Unfair Flips**（AppID 3925760）——Genre: Casual/Indie，2025-09，Very Positive（2260）。抛硬币「真随机」技巧，14 成就。
- **Smashing Bottles**（AppID 4637870）——Genre: Casual/Indie/Simulation/Strategy，2026-08，Very Positive（117）。砸瓶 incremental。
