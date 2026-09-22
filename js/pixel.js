// ============================================================================
// 像素风资源库(PixelArt)
// 零依赖、纯手绘 16×16 像素图标 + 像素 SVG/canvas 渲染器 + 像素文字精灵。
// 所有图标均为字符串网格: '.'=透明, 其余字符映射到 PX 调色板。
// ============================================================================
(function () {
  'use strict';

  // ---- 调色板 -------------------------------------------------------------
  const PX = {
    K: '#14141f', // 深描边
    W: '#ffffff', // 白
    w: '#bcd8f5', // 玻璃浅蓝
    b: '#3d8fd4', // 蓝
    B: '#1d5aa8', // 深蓝
    G: '#6ee7a0', // 翡翠浅绿
    g: '#2f9e6f', // 翡翠深绿
    Y: '#ffd166', // 金
    y: '#e8890c', // 琥珀
    O: '#ff9f43', // 橙
    R: '#ff6b6b', // 红
    r: '#c23b3b', // 深红
    P: '#c792ea', // 紫
    S: '#cbd5e1', // 银灰
    s: '#64748b', // 灰
    T: '#f6ca92', // 肤色亮
    t: '#dfa25f', // 肤色暗
    F: '#ffd166', // 火黄
    H: '#e06a00', // 火橙
    D: '#a83232', // 火暗红
  };

  // ---- 图标(16×16 网格) ----------------------------------------------------
  const ICONS = {
    // 瓶子(玻璃/黄金/翡翠)
    bottle: [
      '................',
      '.....wwwwww.....',
      '.....w....w.....',
      '.....w....w.....',
      '......w..w......',
      '......w..w......',
      '......w..w......',
      '.....w....w.....',
      '....w......w....',
      '...w........w...',
      '..w..........w..',
      '..w..........w..',
      '..w..........w..',
      '...w........w...',
      '....wwwwwwww....',
      '................',
    ],
    bottleGold: [
      '................',
      '.....YYYYYY.....',
      '.....Y....Y.....',
      '.....Y....Y.....',
      '......Y..Y......',
      '......Y..Y......',
      '......Y..Y......',
      '.....Y....Y.....',
      '....Y......Y....',
      '...Y........Y...',
      '..Y..........Y..',
      '..Y..........Y..',
      '..Y..........Y..',
      '...Y........Y...',
      '....YYYYYYYY....',
      '................',
    ],
    bottleJade: [
      '................',
      '.....GGGGGG.....',
      '.....G....G.....',
      '.....G....G.....',
      '......G..G......',
      '......G..G......',
      '......G..G......',
      '.....G....G.....',
      '....G......G....',
      '...G........G...',
      '..G..........G..',
      '..G..........G..',
      '..G..........G..',
      '...G........G...',
      '....GGGGGGGG....',
      '................',
    ],
    // 手 / 手套
    hand: [
      '................',
      '....tttttttt....',
      '...tTTttttTTt...',
      '...tTTt..tTTt...',
      '...tTTt..tTTt...',
      '...tTTt..tTTt...',
      '...tTTt..tTTt...',
      '...tTTttttTTt...',
      '...tTTTTTTTTt...',
      '...tTTTTTTTTt...',
      '....tTTTTTTt....',
      '....tTTTTTTt....',
      '.....tTTTTt.....',
      '.....tTTTTt.....',
      '......tttt......',
      '................',
    ],
    glove: [
      '................',
      '.....bbbbbb.....',
      '....bBBBBBBb....',
      '....bBBBBBBb....',
      '....bBBBBBBb....',
      '.....bBBBBb.....',
      '.....tTTTTt.....',
      '....tTTTTTTt....',
      '....tTtTTtTt....',
      '....tTtTTtTt....',
      '....tTtTTtTt....',
      '....tTTTTTTt....',
      '.....tTTTTt.....',
      '......tttt......',
      '................',
      '................',
    ],
    // 瞄准靶
    target: [
      '................',
      '....WWWWWWWW....',
      '..WWWWWWWWWWWW..',
      '.WWRRRRRRRRRRWW.',
      '.WWRWWWWWWWWRWW.',
      '.WRWWWRRRRWWWRW.',
      '.WRWWWWRRWWWWRW.',
      '.WRWWWWRRWWWWRW.',
      '.WRWWWWRRWWWWRW.',
      '.WRWWWWRRWWWWRW.',
      '.WRWWWRRRRWWWRW.',
      '.WWRWWWWWWWWRWW.',
      '.WWRRRRRRRRRRWW.',
      '..WWWWWWWWWWWW..',
      '....WWWWWWWW....',
      '................',
    ],
    // 皇冠
    crown: [
      '................',
      '..Y..........Y..',
      '..YY........YY..',
      '..YYY......YYY..',
      '...YYY....YYY...',
      '....YYYYYYYY....',
      '...YYYYYYYYYY...',
      '..YYYYYYYYYYYY..',
      '..YYYYYYYYYYYY..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 火焰
    fire: [
      '.......HH.......',
      '......HHH.......',
      '......HHF.......',
      '.....HHHFF......',
      '....HHHFFF......',
      '...HHHFFFF......',
      '...HHFFFFY......',
      '..HHHFFFYY......',
      '..HHFFFYYY......',
      '..HHFFFYY.......',
      '..HFFFYY........',
      '..HFFYY.........',
      '..HFFY..........',
      '..HFY...........',
      '..HH............',
      '................',
    ],
    // 闪电
    bolt: [
      '.......YY.......',
      '......YYY.......',
      '.....YYY........',
      '....YYY.........',
      '....YYYY........',
      '...YYYYYY.......',
      '..YYYYYYY.......',
      '.YYYYYYY........',
      '..YYYYY.........',
      '..YYY...........',
      '...YY...........',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 瓶盖堆(财富)
    money: [
      '................',
      '.....YYYYYY.....',
      '....YYYYYYYY....',
      '....YyyyyyyY....',
      '....YyYYYYyY....',
      '....YyyyyyyY....',
      '....YYYYYYYY....',
      '.....yyyyyy.....',
      '.....YYYYYY.....',
      '....YYYYYYYY....',
      '....YyyyyyyY....',
      '....YyYYYYyY....',
      '....YyyyyyyY....',
      '....YYYYYYYY....',
      '.....yyyyyy.....',
      '................',
    ],
    // 单枚瓶盖(金币)
    coin: [
      '................',
      '....yyyyyyyy....',
      '...yYYYYYYYYy...',
      '..yYYYYYYYYYYy..',
      '..yYYyyyyyyYYy..',
      '..yYyyYYYYyyYy..',
      '..yYyYYYYYYyYy..',
      '..yYyYYYYYYyYy..',
      '..yYyYYYYYYyYy..',
      '..yYyyYYYYyyYy..',
      '..yYYyyyyyyYYy..',
      '..yYYYYYYYYYYy..',
      '...yYYYYYYYYy...',
      '....yyyyyyyy....',
      '................',
      '................',
    ],
    // 瓶盖(扁矩形, 与瓶子上瓶盖造型一致: 浅蓝填充 + 蓝描边)
    cap: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '..bbbbbbbbbbbb..',
      '..bwwwwwwwwwwb..',
      '..bwwwwwwwwwwb..',
      '..bwwwwwwwwwwb..',
      '..bbbbbbbbbbbb..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 钻石
    gem: [
      '................',
      '.......WW.......',
      '......WWWW......',
      '.....WWbWWW.....',
      '....WWbbWWWW....',
      '...WWbbbWWbWW...',
      '..WWbbbbWWbbWW..',
      '..WbbbbbbWbbbW..',
      '..WbbbbbbbbbbW..',
      '..WbbbbbbbbbW...',
      '...WbbbbbbbW....',
      '....WbbbbbW.....',
      '.....WbbbW......',
      '......WbW.......',
      '.......W........',
      '................',
    ],
    // 星
    star: [
      '................',
      '.......YY.......',
      '.......YY.......',
      '......YYYY......',
      '......YYYY......',
      '.YYYYYYYYYYYYYY.',
      '..YYYYYYYYYYYY..',
      '...YYYYYYYYYY...',
      '....YYYYYYYY....',
      '.....YYYYYY.....',
      '....YYYYYYYY....',
      '...YYYYYYYYYY...',
      '...YYYYYYYYYY...',
      '..YYYY....YYYY..',
      '..YY........YY..',
      '................',
    ],
    // 闪光
    sparkle: [
      '................',
      '.......WW.......',
      '......W..W......',
      '.......WW.......',
      '................',
      '...WW......WW...',
      '....W......W....',
      '...W........W...',
      '....W......W....',
      '...WW......WW...',
      '................',
      '.......WW.......',
      '......W..W......',
      '.......WW.......',
      '................',
      '................',
    ],
    // 烧瓶
    flask: [
      '................',
      '......B....B....',
      '......B....B....',
      '......B....B....',
      '.....BBBBBBBB...',
      '....BWWWWWWWWB..',
      '...BWGGGGGGGGWB.',
      '...BWGGGGGGGGWB.',
      '..BWGGGGGGGGGGWB',
      '..BWGGGGGGGGGGWB',
      '..BWGGGGGGGGGGWB',
      '...BWGGGGGGGGWB.',
      '....BWWWWWWWWB..',
      '.....BBBBBBBB...',
      '................',
      '................',
    ],
    // 学士帽
    grad: [
      '................',
      '................',
      '................',
      '....ssssssss....',
      '...sSSSSSSSSs...',
      '...sSSSSSSSSs...',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..ssssssssssss..',
      '.......ss.......',
      '......sSSs......',
      '......sSSs......',
      '......sSSs......',
      '.....ssssss.....',
      '................',
      '................',
    ],
    // 奖杯
    trophy: [
      '................',
      '.....yyyyyy.....',
      '....yYYYYYYy....',
      '....yYYYYYYy....',
      '.....yYYYYy.....',
      '......yYYy......',
      '.....yYYYYy.....',
      '....yYYYYYYy....',
      '....yyyyyyyy....',
      '...YYYYYYYYYY...',
      '..YYYYYYYYYYYY..',
      '..YYYYYYYYYYYY..',
      '..YYYYYYYYYYYY..',
      '...YYYYYYYYYY...',
      '....YYYYYYYY....',
      '................',
    ],
    // 倒立瓶(口朝下)
    updown: [
      '................',
      '....wwwwwwww....',
      '...w........w...',
      '..w..........w..',
      '..w..........w..',
      '..w..........w..',
      '..w..........w..',
      '...w........w...',
      '.....w....w.....',
      '......w..w......',
      '......w..w......',
      '......w..w......',
      '.....w....w.....',
      '.....w....w.....',
      '.....wwwwww.....',
      '................',
    ],
    // 四叶草
    clover: [
      '................',
      '................',
      '....G....G......',
      '....GG..GG......',
      '....GGGGGG......',
      '.....GGGG.......',
      '..GGGGGGGGGG....',
      '..GGGGGGGGGG....',
      '..GGGGGGGGGG....',
      '.....GGGG.......',
      '.....GGGG.......',
      '....GGGGGG......',
      '.....GGGG.......',
      '......GG........',
      '................',
      '................',
    ],
    // 盾牌
    shield: [
      '................',
      '....bbbbbbbb....',
      '...bBBBBBBBBb...',
      '..bBBBBBBBBBBb..',
      '..bBBBBBBBBBBb..',
      '..bBBBBBBBBBBb..',
      '..bBBBBBBBBBBb..',
      '...bBBBBBBBBb...',
      '....bBBBBBBb....',
      '.....bBBBBb.....',
      '......bBBb......',
      '.......bb.......',
      '................',
      '................',
      '................',
      '................',
    ],
    // 火箭
    rocket: [
      '................',
      '.......WW.......',
      '......WWWW......',
      '......WWWW......',
      '......WWWW......',
      '.....RRRRRR.....',
      '....RRRRRRRR....',
      '....RrrrrrrR....',
      '...RrrrrrrrrR...',
      '...RrrrrrrrrR...',
      '....RrrrrrrR....',
      '.....RRRRRR.....',
      '.....HHHHHH.....',
      '.....H..H..H....',
      '....HH..HH..HH..',
      '................',
    ],
    // 骰子
    dice: [
      '................',
      '................',
      '...KKKKKKKKKK...',
      '..KWWWWWWWWWWK..',
      '..KWWWWWWWWWWK..',
      '..KWWKKWWKKWWK..',
      '..KWWWWWWWWWWK..',
      '..KWWWWKKWWWWK..',
      '..KWWWWWWWWWWK..',
      '..KWWKKWWKKWWK..',
      '..KWWWWWWWWWWK..',
      '..KWWWWWWWWWWK..',
      '...KKKKKKKKKK...',
      '................',
      '................',
      '................',
    ],
    // 锤子
    hammer: [
      '................',
      '...sssssssss....',
      '..sssssssssss...',
      '..sssssssssss...',
      '..sssssssssss...',
      '...sssssssss....',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '................',
    ],
    // 玻璃锤(蓝)
    hammerGlass: [
      '................',
      '...wwwwwwwww....',
      '..wwbbbbbbwww...',
      '..wwbbbbbbwww...',
      '..wwbbbbbbwww...',
      '...wwwwwwwww....',
      '.......bb.......',
      '.......bb.......',
      '.......bb.......',
      '.......bb.......',
      '.......bb.......',
      '.......bb.......',
      '.......bb.......',
      '.......bb.......',
      '.......bb.......',
      '................',
    ],
    // 黄金锤(金)
    hammerGold: [
      '................',
      '...YYYYYYYYY....',
      '..YYYYYYYYYYY...',
      '..YYyyyyyyyYY...',
      '..YYyyyyyyyYY...',
      '...YYYYYYYYY....',
      '.......yy.......',
      '.......yy.......',
      '.......yy.......',
      '.......yy.......',
      '.......yy.......',
      '.......yy.......',
      '.......yy.......',
      '.......yy.......',
      '.......yy.......',
      '................',
    ],
    // 翡翠锤(绿)
    hammerJade: [
      '................',
      '...GGGGGGGGG....',
      '..GGgggggggGG...',
      '..GGgggggggGG...',
      '..GGgggggggGG...',
      '...GGGGGGGGG....',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '.......gg.......',
      '................',
    ],
    // 箱子
    box: [
      '................',
      '....yyyyyyyy....',
      '...yYYYYYYYYy...',
      '...yYYYYYYYYy...',
      '...yYYYYYYYYy...',
      '...yyyyyyyyyy...',
      '...yYYYYYYYYy...',
      '...yYyyyYYYyY...',
      '...yYYyyyyYYy...',
      '...yYYYYYYYYy...',
      '...yyyyyyyyyy...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 神秘宝箱(金色 + 锁扣)
    chest: [
      '................',
      '.....yyyyyy.....',
      '....yYYYYYYy....',
      '...yYYYYYYYYy...',
      '...yYYYYYYYYy...',
      '....yYYYYYYy....',
      '....yyyyyyyy....',
      '...yYYYYYYYYy...',
      '...yYYYYYYYYy...',
      '...yYYYKKYYYy...',
      '...yYYYKKYYYy...',
      '...yYYYYYYYYy...',
      '...yYYYYYYYYy...',
      '...yYYYYYYYYy...',
      '...yyyyyyyyyy...',
      '................',
    ],
    // 石头
    rock: [
      '................',
      '................',
      '.....ssssss.....',
      '...ssSSSSSSss...',
      '..sSSSSSSSSSSs..',
      '..sSSssSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSssSSSs..',
      '..sSSSSSSSSSSs..',
      '...ssSSSSSSss...',
      '....ssssssss....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 天平(平衡)
    scales: [
      '................',
      '.......ss.......',
      '......ssss......',
      '.......ss.......',
      '....sss..sss....',
      '...sSSs..sSSs...',
      '...sSSs..sSSs...',
      '...ssss..ssss...',
      '...ssss..ssss...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 打开的锁
    lockopen: [
      '................',
      '....ssssssss....',
      '...ssSSSSSSss...',
      '..ssSSSSSSSSss..',
      '..ssSSSSSSSSss..',
      '..ssSSSSSSSSss..',
      '...ssSSSSSSss...',
      '....ssssssss....',
      '.......ss.......',
      '.......ss.......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 关闭的锁
    lock: [
      '................',
      '....ssssssss....',
      '...ssSSSSSSss...',
      '..ssSSSSSSSSss..',
      '..ssSSSSSSSSss..',
      '..ssSSSSSSSSss..',
      '..ssSSSSSSSSss..',
      '...ssSSSSSSss...',
      '....ssssssss....',
      '.......ss.......',
      '.......ss.......',
      '.......ss.......',
      '................',
      '................',
      '................',
      '................',
    ],
    // 对勾
    check: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '...........GG...',
      '..........GGG...',
      '.........GGG....',
      '........GGG.....',
      '.GG....GGG......',
      '.GGG..GGG.......',
      '..GGGGGG........',
      '...GGGG.........',
      '....GG..........',
      '................',
      '................',
    ],
    // 问号
    question: [
      '................',
      '.....ssssss.....',
      '...ssSSSSSSss...',
      '..ssSSSSSSSSss..',
      '..ssSSSSSSSSss..',
      '..ssSSSSSSSSss..',
      '..ssSSSSssSSss..',
      '..ssSSSsssSSss..',
      '..ssSSssssSSss..',
      '..ssSSSSssSSss..',
      '...ssSSSSSSss...',
      '....ssssssss....',
      '.......ssss.....',
      '......ssss......',
      '................',
      '................',
    ],
    // 喇叭
    speaker: [
      '................',
      '.....sss........',
      '.....ssss.......',
      '....ssssss......',
      '...ssssssss.....',
      '..ssSSSSSSSSss..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..ssSSSSSSSSss..',
      '...ssssssss.....',
      '....ssssss......',
      '.....ssss.......',
      '.....sss........',
      '................',
    ],
    // 静音喇叭
    speakerOff: [
      '................',
      '.....sss........',
      '.....ssss.......',
      '....ssssss......',
      '...sRssssRss....',
      '..ssSRSSRSss....',
      '..sSSRSSRSSs....',
      '..sSSSRRSSSs....',
      '..sSSSRRSSSs....',
      '..sSSRSSRSSs....',
      '..ssRSSSSRss....',
      '...ssssssss.....',
      '....ssssss......',
      '.....ssss.......',
      '.....sss........',
      '................',
    ],
    // DNA 螺旋
    dna: [
      '................',
      '..WW......WW....',
      '...WW....WW.....',
      '....WW..WW......',
      '.....WWWW.......',
      '......WW........',
      '.....WWWW.......',
      '....WW..WW......',
      '...WW....WW.....',
      '..WW......WW....',
      '....WW....WW....',
      '.....WW..WW.....',
      '......WWWW......',
      '.......WW.......',
      '................',
      '................',
    ],
    // 关闭叉
    close: [
      '................',
      '................',
      '..WW........WW..',
      '...WW......WW...',
      '....WW....WW....',
      '.....WW..WW.....',
      '......WWWW......',
      '.....WW..WW.....',
      '....WW....WW....',
      '...WW......WW...',
      '..WW........WW..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 鼠标
    mouse: [
      '................',
      '.....sssss......',
      '....sSSSSSs.....',
      '....sSSSSSs.....',
      '....sSSSSSs.....',
      '.....sssss......',
      '......ss........',
      '......ss........',
      '......ss........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 机器人(挂机抛瓶标记)
    robot: [
      '................',
      '.....SSSSSS.....',
      '....SSSSSSSS....',
      '....SSSSSSSS....',
      '...SKKSSSSKKS...',
      '...SKKSSSSKKS...',
      '...SSSSSSSSSS...',
      '....SSSKKSSS....',
      '....SSSSSSSS....',
      '....SSSSSSSS....',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '....SSSSSSSS....',
      '.....SSSSSS.....',
      '................',
      '................',
    ],
    // 日历
    calendar: [
      '................',
      '...ssssssssss...',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '..sSSSSSSSSSSs..',
      '...ssssssssss...',
      '................',
      '................',
      '................',
    ],
    // 奖牌
    medal: [
      '................',
      '....YYYYYYYY....',
      '...YYYYYYYYYY...',
      '...YYYYYYYYYY...',
      '...YYYYYYYYYY...',
      '....YYYYYYYY....',
      '.....YYYYYY.....',
      '......YYYY......',
      '.......YY.......',
      '.......YY.......',
      '.......YY.......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    // 加号
    plus: [
      '................',
      '................',
      '......GGGG......',
      '......GGGG......',
      '......GGGG......',
      '......GGGG......',
      '..GGGGGGGGGGGG..',
      '..GGGGGGGGGGGG..',
      '..GGGGGGGGGGGG..',
      '......GGGG......',
      '......GGGG......',
      '......GGGG......',
      '......GGGG......',
      '................',
      '................',
      '................',
    ],
    // 雪花(冷却中瓶子结冰)
    snow: [
      '................',
      '.......WW.......',
      '.......WW.......',
      '...W...WW...W...',
      '....W..WW..W....',
      '.....W.WW.W.....',
      '......WWWW......',
      '..WWWWWWWWWWWW..',
      '......WWWW......',
      '.....W.WW.W.....',
      '....W..WW..W....',
      '...W...WW...W...',
      '.......WW.......',
      '.......WW.......',
      '................',
      '................',
    ],
    // 时钟(离线收益)
    clock: [
      '................',
      '.....KKKKKK.....',
      '....KSSSSSSK....',
      '...KS......SK...',
      '...KS..KK..SK...',
      '...KS..KK..SK...',
      '...KS......SK...',
      '...KS...KK.SK...',
      '...KS....K.SK...',
      '...KS......SK...',
      '...KS......SK...',
      '...KS......SK...',
      '....KSSSSSSK....',
      '.....KKKKKK.....',
      '................',
      '................',
    ],
    // 剪贴板(挂机报告)
    clipboard: [
      '................',
      '.....KKKKKK.....',
      '....KSSSSSSK....',
      '...KSSSSSSSSK...',
      '...KSKKKKKKSK...',
      '...KSKWWWKKSK...',
      '...KSKWWWKKSK...',
      '...KSKKKKKKSK...',
      '...KSSSSSSSSK...',
      '...KSKKSKKSKK...',
      '...KSKKSKKSKK...',
      '...KSSSSSSSSK...',
      '....KSSSSSSK....',
      '.....KKKKKK.....',
      '................',
      '................',
    ],
    // 齿轮(自动化工厂)
    gear: [
      '................',
      '......KKKK......',
      '.....KS..SK.....',
      '..KK.KS..SK.KK..',
      '.KSSKSSSSSSKSSK.',
      '.KSSKSKKSKSSSK..',
      '..KKKSKKKSKKK...',
      '....KSKKSKSSK...',
      '..KKKSKKKSKKK...',
      '.KSSKSKKSKSSSK..',
      '.KSSKSSSSSSKSSK.',
      '..KK.KS..SK.KK..',
      '.....KS..SK.....',
      '......KKKK......',
      '................',
      '................',
    ],
    // 循环箭头(重新开始/刷新)
    refresh: [
      '................',
      '......KKKK......',
      '.....KSSSSK.....',
      '....KS....SK....',
      '....KS.....K....',
      '....KS.....K....',
      '....KS.....KK...',
      '....KS....KKK...',
      '....KS.....KK...',
      '....KS......K...',
      '....KS......K...',
      '....KS......K...',
      '....KS.....K....',
      '.....KSSSSK.....',
      '......KKKK......',
      '................',
    ],
  };

  // ---- 像素字体栈(宋体在 Windows 小字号下呈点阵/位图效果) ----------------
  const FONT = '"Courier New", "SimSun", "NSimSun", "宋体", monospace';

  // ---- 像素数字字体(3×5 经典街机数字, 零依赖) -----------------------------
  const DIGITS = {
    '0': ['111', '101', '101', '101', '111'],
    '1': ['010', '110', '010', '010', '111'],
    '2': ['111', '001', '111', '100', '111'],
    '3': ['111', '001', '111', '001', '111'],
    '4': ['101', '101', '111', '001', '001'],
    '5': ['111', '100', '111', '001', '111'],
    '6': ['111', '100', '111', '101', '111'],
    '7': ['111', '001', '001', '010', '010'],
    '8': ['111', '101', '111', '101', '111'],
    '9': ['111', '101', '111', '001', '111'],
    '+': ['000', '010', '111', '010', '000'],
    '/': ['001', '001', '010', '100', '100'],
  };

  // 把数字渲染成内联 SVG 像素数字(fill=currentColor 继承文字颜色, 便于 insufficient 闪烁)
  function digits(value, cell) {
    cell = cell || 4;
    const s = String(value);
    const gw = 3, gh = 5, gap = 1;
    let rects = '', x = 0;
    for (const ch of s) {
      const g = DIGITS[ch];
      if (!g) continue;
      for (let r = 0; r < gh; r++) {
        const row = g[r];
        for (let c = 0; c < gw; c++) {
          if (row[c] === '1') rects += '<rect x="' + (x + c) + '" y="' + r + '" width="1" height="1"/>';
        }
      }
      x += gw + gap;
    }
    const w = Math.max(1, x - gap), h = gh;
    return '<svg class="px-digits" viewBox="0 0 ' + w + ' ' + h + '" width="' + (w * cell) + '" height="' + (h * cell) + '" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }

  // 把数字画到 canvas(canvas 版 3×5 像素数字, 用于连击/特效等非 DOM 场景)
  // 返回总宽度(px), 便于对齐
  function canvasDigits(c, value, x, y, cell, color) {
    const s = String(value);
    const gw = 3, gh = 5, gap = 1;
    c.fillStyle = color;
    let cx = x;
    for (const ch of s) {
      const g = DIGITS[ch];
      if (!g) continue;
      for (let r = 0; r < gh; r++) {
        const row = g[r];
        for (let cc = 0; cc < gw; cc++) {
          if (row[cc] === '1') c.fillRect(cx + cc * cell, y + r * cell, cell, cell);
        }
      }
      cx += (gw + gap) * cell;
    }
    return cx - x - gap * cell;  // 去掉末尾空隙后的总宽度
  }

  // ---- 5×5 像素字形(数字 + 大写字母 + 空格), 用于 COMBO 等 canvas 特效文字 ----
  // 与 3×5 数字不同: 5×5 更高更清晰, 且字母/数字同尺寸, 风格统一
  const GLYPHS5 = {
    '0': ['11111', '10001', '10001', '10001', '11111'],
    '1': ['00100', '01100', '00100', '00100', '01110'],
    '2': ['11111', '00001', '11111', '10000', '11111'],
    '3': ['11111', '00001', '11111', '00001', '11111'],
    '4': ['10001', '10001', '11111', '00001', '00001'],
    '5': ['11111', '10000', '11111', '00001', '11111'],
    '6': ['11111', '10000', '11111', '10001', '11111'],
    '7': ['11111', '00001', '00010', '00100', '00100'],
    '8': ['11111', '10001', '11111', '10001', '11111'],
    '9': ['11111', '10001', '11111', '00001', '11111'],
    'A': ['01110', '10001', '11111', '10001', '10001'],
    'B': ['11110', '10001', '11110', '10001', '11110'],
    'C': ['01111', '10000', '10000', '10000', '01111'],
    'D': ['11110', '10001', '10001', '10001', '11110'],
    'E': ['11111', '10000', '11110', '10000', '11111'],
    'F': ['11111', '10000', '11110', '10000', '10000'],
    'G': ['01111', '10000', '10111', '10001', '01111'],
    'H': ['10001', '10001', '11111', '10001', '10001'],
    'I': ['11111', '00100', '00100', '00100', '11111'],
    'J': ['00111', '00010', '00010', '10010', '01100'],
    'K': ['10001', '10010', '11100', '10010', '10001'],
    'L': ['10000', '10000', '10000', '10000', '11111'],
    'M': ['10001', '11011', '10101', '10101', '10001'],
    'N': ['10001', '11001', '10101', '10011', '10001'],
    'O': ['01110', '10001', '10001', '10001', '01110'],
    'P': ['11110', '10001', '11110', '10000', '10000'],
    'Q': ['01110', '10001', '10001', '10010', '01101'],
    'R': ['11110', '10001', '11110', '10010', '10001'],
    'S': ['01111', '10000', '01110', '00001', '11110'],
    'T': ['11111', '00100', '00100', '00100', '00100'],
    'U': ['10001', '10001', '10001', '10001', '01110'],
    'V': ['10001', '10001', '10001', '01010', '00100'],
    'W': ['10001', '10001', '10101', '11011', '10001'],
    'X': ['10001', '01010', '00100', '01010', '10001'],
    'Y': ['10001', '01010', '00100', '00100', '00100'],
    'Z': ['11111', '00001', '00010', '00100', '11111'],
    ' ': ['00000', '00000', '00000', '00000', '00000'],
  };

  // 5×5 像素文字宽度(px), 用于右对齐布局
  function canvasTextWidth(text, cell) {
    const gap = 1;
    let total = 0;
    for (const ch of String(text).toUpperCase()) total += (5 + gap) * cell;
    return total - gap * cell;
  }

  // 把 5×5 像素文字画到 canvas(字母+数字统一字模), 返回总宽度(px)
  function canvasText(c, text, x, y, cell, color) {
    const gap = 1;
    c.fillStyle = color;
    let cx = x;
    for (const ch of String(text).toUpperCase()) {
      const g = GLYPHS5[ch];
      if (g) {
        for (let r = 0; r < 5; r++) {
          const row = g[r];
          for (let cc = 0; cc < 5; cc++) {
            if (row[cc] === '1') c.fillRect(cx + cc * cell, y + r * cell, cell, cell);
          }
        }
      }
      cx += (5 + gap) * cell;
    }
    return cx - x - gap * cell;
  }

  // 启动时校验网格尺寸, 避免手误导致错位
  Object.keys(ICONS).forEach((name) => {
    const grid = ICONS[name];
    if (grid.length !== 16) console.warn('[PixelArt] 图标', name, '行数=', grid.length, '应为16');
    grid.forEach((row, i) => {
      if (row.length !== 16) console.warn('[PixelArt] 图标', name, '第', i, '行宽=', row.length, '应为16');
    });
  });

  // ---- 像素图标 → 内联 SVG(用于 DOM) --------------------------------------
  function svg(icon, size) {
    const grid = ICONS[icon] || ICONS.question;
    const n = grid.length;
    let rects = '';
    for (let y = 0; y < n; y++) {
      const row = grid[y];
      for (let x = 0; x < n; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + (PX[ch] || '#fff') + '"/>';
      }
    }
    return '<svg class="px-icon" viewBox="0 0 ' + n + ' ' + n + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" aria-hidden="true">' + rects + '</svg>';
  }

  // ---- 像素图标 → canvas fillRect -----------------------------------------
  function canvasIcon(c, icon, x, y, size) {
    const grid = ICONS[icon] || ICONS.question;
    const n = grid.length;
    const s = size / n;
    for (let yy = 0; yy < n; yy++) {
      const row = grid[yy];
      for (let xx = 0; xx < n; xx++) {
        const ch = row[xx];
        if (ch === '.') continue;
        c.fillStyle = PX[ch] || '#fff';
        c.fillRect(x + xx * s, y + yy * s, s, s);
      }
    }
  }

  // ---- 像素图标 → SVG <g>(用于科技树 1000×1000 viewBox, 16px→32 世界单位) ---
  function techNode(icon, cx, cy) {
    const grid = ICONS[icon] || ICONS.question;
    const n = grid.length;
    let r = '';
    for (let y = 0; y < n; y++) {
      const row = grid[y];
      for (let x = 0; x < n; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        r += '<rect x="' + (x * 2) + '" y="' + (y * 2) + '" width="2" height="2" fill="' + (PX[ch] || '#fff') + '"/>';
      }
    }
    return '<g class="t-emoji" shape-rendering="crispEdges" transform="translate(' + (cx - n) + ' ' + (cy - n) + ')">' + r + '</g>';
  }

  // ---- 像素文字精灵: 低分辨率栅格化 → 最近邻放大(让文字也有像素颗粒) --------
  const _textCache = new Map();
  function textSprite(text, size, color) {
    const key = text + '|' + size + '|' + color;
    if (_textCache.has(key)) return _textCache.get(key);
    const K = 2;                    // 缩小倍数(越大颗粒越粗)
    const pad = 6;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = 'bold ' + size + 'px ' + FONT;
    const w = Math.ceil(probe.measureText(text).width) + pad * 2;
    const h = size + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w / K));
    cv.height = Math.max(1, Math.ceil(h / K));
    const c = cv.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.setTransform(1 / K, 0, 0, 1 / K, 0, 0);
    c.font = 'bold ' + size + 'px ' + FONT;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.lineJoin = 'miter';
    c.lineWidth = 4;
    c.strokeStyle = 'rgba(0,0,0,0.6)';
    c.strokeText(text, pad, h / 2);
    c.fillStyle = color;
    c.fillText(text, pad, h / 2);
    const spr = { canvas: cv, w: w, h: h };
    _textCache.set(key, spr);
    return spr;
  }

  window.PixelArt = { PX, ICONS, FONT, svg, canvasIcon, techNode, textSprite, DIGITS, digits, canvasDigits, GLYPHS5, canvasText, canvasTextWidth };
})();
