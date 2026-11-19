window.SCENARIO_PACKS["1935"] = {
  id: "1935",
  mapMode: "full",
  hasWarEscalation: true,
  hasGasWarfare: true,
  badge: "1935–1936 戰役",
  title: "第二次義衣戰爭",
  maxTurns: 14,
  targetCityName: "阿迪斯阿貝巴",
  targetCoord: { c: 8, r: 11 },
  aiStrategy: {
    italy: {
      northAxis: [
        { c: 8, r: 5 },
        { c: 9, r: 8 },
        { c: 8, r: 11 }
      ],
      southStartMinRow: 13,
      southAxis: [
        { c: 15, r: 14 },
        { c: 12, r: 11 },
        { c: 8, r: 11 }
      ]
    },
    ethiopia: {
      guardTypes: ["et_grd"],
      guardAnchors: [
        { c: 8, r: 11 },
        { c: 9, r: 8 }
      ],
      guardMaxRadius: 2,
      counterAttackEscalationLevel: 6
    }
  },
  victoryHint: "義軍須於第 14 回合雨季前攻佔首都【阿迪斯阿貝巴】。",
  dates: [
    "35年10月上", "35年10月下", "35年11月上", "35年11月下",
    "35年12月上", "35年12月下", "36年01月上", "36年01月下",
    "36年02月上", "36年02月下", "36年03月上", "36年03月下",
    "36年04月上", "36年05月雨季"
  ],
  cities: [
    { c: 8,  r: 4,  name: "阿斯馬拉",     owner: "italy",    supply: null,       isCapital: false },
    { c: 9,  r: 3,  name: "馬薩瓦",       owner: "italy",    supply: "italy",    isCapital: false },
    { c: 8,  r: 5,  name: "阿杜瓦",       owner: "ethiopia", supply: null,       isCapital: false },
    { c: 6,  r: 7,  name: "貢德爾",       owner: "ethiopia", supply: "ethiopia", isCapital: false },
    { c: 9,  r: 8,  name: "德西",         owner: "ethiopia", supply: null,       isCapital: false },
    { c: 8,  r: 11, name: "阿迪斯阿貝巴", owner: "ethiopia", supply: "ethiopia", isCapital: true },
    { c: 12, r: 11, name: "哈拉爾",       owner: "ethiopia", supply: "ethiopia", isCapital: false },
    { c: 15, r: 14, name: "戈拉海",       owner: "ethiopia", supply: null,       isCapital: false },
    { c: 16, r: 19, name: "摩加迪休",     owner: "italy",    supply: "italy",    isCapital: false },
    { c: 14, r: 9,  name: "吉布地",       owner: "neutral",  supply: null,       isCapital: false },
    { c: 17, r: 9,  name: "柏培拉",       owner: "neutral",  supply: null,       isCapital: false },
    { c: 2,  r: 4,  name: "森納爾",       owner: "neutral",  supply: null,       isCapital: false },
    { c: 4,  r: 4,  name: "卡薩拉",       owner: "neutral",  supply: null,       isCapital: false },
    { c: 13, r: 1,  name: "吉贊",         owner: "neutral",  supply: null,       isCapital: false },
    { c: 15, r: 3,  name: "沙那",         owner: "neutral",  supply: null,       isCapital: true },
    { c: 16, r: 6,  name: "亞丁",         owner: "neutral",  supply: null,       isCapital: false },
    { c: 6,  r: 3,  name: "阿科達特",     owner: "italy",    supply: null,       isCapital: false }
  ],
  roads: [
    [9,3, 8,4, "rail"], [8,4, 7,3, "rail"], [7,3, 6,3, "rail"],
    [14,9, 13,9, "rail"], [13,9, 13,10, "rail"],
    [13,10, 12,11, "rail"], [12,11, 11,10, "rail"], [11,10, 10,11, "rail"], [10,11, 9,11, "rail"], [9,11, 8,11, "rail"],
    [8,4, 9,4, "road"], [9,4, 9,5, "road"], [8,4, 8,5, "trail"],
    [9,8, 9,9, "road"], [9,9, 9,10, "road"], [9,10, 8,11, "road"],
    [8,5, 7,5, "trail"], [8,5, 9,5, "trail"], [9,5, 9,6, "trail"],
    [9,6, 9,7, "trail"], [9,7, 9,8, "trail"],
    [7,5, 6,6, "trail"], [6,6, 6,7, "trail"], [6,7, 6,8, "trail"], [6,8, 6,9, "trail"],
    [6,9, 7,9, "trail"], [7,9, 7,10, "trail"], [7,10, 8,11, "trail"],
    [6,3, 6,4, "trail"], [6,4, 6,5, "trail"], [6,5, 6,6, "trail"],
    [12,11, 13,11, "trail"], [13,11, 14,11, "trail"],
    [14,11, 15,11, "trail"], [15,11, 15,12, "trail"], [15,12, 15,13, "trail"],
    [15,13, 15,14, "trail"], [15,13, 16,13, "trail"], [16,13, 17,13, "trail"],
    [16,19, 15,18, "road"], [15,18, 15,17, "road"],
    [15,17, 15,16, "trail"], [15,16, 15,15, "trail"], [15,15, 15,14, "trail"],
    [15,17, 14,17, "trail"], [14,17, 13,16, "trail"], [13,16, 12,16, "trail"],
    [2,0, 2,1, "rail"], [2,1, 2,2, "rail"], [2,2, 2,3, "rail"],
    [2,3, 2,4, "rail"], [2,4, 2,5, "rail"], [2,5, 2,6, "rail"],
    [2,6, 1,6, "rail"], [1,6, 1,7, "rail"],
    [2,4, 3,4, "trail"], [3,4, 4,4, "trail"],
    [17,9, 16,10, "trail"], [16,10, 15,10, "trail"], [15,10, 14,11, "trail"],
    [4,19, 5,19, "trail"], [5,19, 5,20, "trail"], [5,20, 6,20, "trail"],
    [6,20, 7,20, "trail"], [7,20, 7,21, "trail"],
    [13,1, 14,2, "trail"], [14,2, 14,3, "trail"], [14,3, 15,3, "trail"],
    [15,3, 15,4, "trail"], [15,4, 16,5, "trail"], [16,5, 16,6, "trail"]
  ],
  roster: [
    { id: "u1", type: "it_inf", faction: "italy", nato: "inf", echelon: "XX", name: "第30薩包達步兵師", atk: 7, def: 5, mp: 4, c: 8, r: 4 },
    { id: "u2", type: "it_ccnn", faction: "italy", nato: "ccnn", echelon: "XX", name: "第1黑衫軍3月23日師", atk: 5, def: 3, mp: 4, c: 9, r: 3 },
    { id: "u3", type: "it_alp", faction: "italy", nato: "alp", echelon: "XX", name: "第5普斯特里亞山地師", atk: 6, def: 6, mp: 4, c: 8, r: 4 },
    { id: "u4", type: "it_col", faction: "italy", nato: "col", echelon: "XX", name: "第1厄利垂亞殖民地師", atk: 4, def: 4, mp: 5, c: 7, r: 3 },
    { id: "u5", type: "it_mot", faction: "italy", nato: "mot", echelon: "III", name: "馬里奧蒂摩托化縱隊", atk: 5, def: 3, mp: 6, c: 9, r: 3 },
    { id: "u6", type: "it_eng", faction: "italy", nato: "eng", echelon: "II", name: "北線工兵第1營", atk: 1, def: 2, mp: 4, c: 8, r: 3 },
    { id: "u7", type: "it_inf", faction: "italy", nato: "inf", echelon: "XX", name: "第27錫拉步兵師", atk: 7, def: 5, mp: 4, c: 16, r: 19 },
    { id: "u8", type: "it_col", faction: "italy", nato: "col", echelon: "XX", name: "利比亞殖民地師", atk: 4, def: 4, mp: 5, c: 15, r: 17 },
    { id: "u9", type: "it_mot", faction: "italy", nato: "mot", echelon: "III", name: "南線摩托化支隊", atk: 5, def: 3, mp: 6, c: 16, r: 19 },
    { id: "u10", type: "it_eng", faction: "italy", nato: "eng", echelon: "II", name: "南線工兵第2營", atk: 1, def: 2, mp: 4, c: 14, r: 17 },
    { id: "e1", type: "et_lvy", faction: "ethiopia", nato: "lvy", echelon: "XX", name: "塞尤姆親王提格雷軍", atk: 4, def: 3, mp: 4, c: 8, r: 5 },
    { id: "e2", type: "et_lvy", faction: "ethiopia", nato: "lvy", echelon: "XX", name: "古格薩省地方軍", atk: 4, def: 3, mp: 4, c: 9, r: 6 },
    { id: "e3", type: "et_rec", faction: "ethiopia", nato: "rec", echelon: "III", name: "提格雷山地游擊隊", atk: 2, def: 2, mp: 5, c: 8, r: 5 },
    { id: "e4", type: "et_lvy", faction: "ethiopia", nato: "lvy", echelon: "XX", name: "穆魯蓋塔元帥中央軍", atk: 4, def: 3, mp: 4, c: 9, r: 8 },
    { id: "e5", type: "et_lvy", faction: "ethiopia", nato: "lvy", echelon: "XX", name: "伊姆魯親王西線軍", atk: 4, def: 3, mp: 4, c: 6, r: 7 },
    { id: "e6", type: "et_grd", faction: "ethiopia", nato: "grd", echelon: "XX", name: "皇室近衛軍主力", atk: 5, def: 6, mp: 4, c: 8, r: 11 },
    { id: "e7", type: "et_lvy", faction: "ethiopia", nato: "lvy", echelon: "XX", name: "納西布將軍哈拉爾軍", atk: 4, def: 3, mp: 4, c: 12, r: 11 },
    { id: "e8", type: "et_lvy", faction: "ethiopia", nato: "lvy", echelon: "XX", name: "德斯塔親王南線軍", atk: 4, def: 3, mp: 4, c: 15, r: 14 },
    { id: "e9", type: "et_rec", faction: "ethiopia", nato: "rec", echelon: "III", name: "歐加登山地游擊隊", atk: 2, def: 2, mp: 5, c: 17, r: 13 }
  ]
};

window.SCENARIO_NOTES["1935"] = "1935–1936戰役聚焦北線與南線的補給競逐、義軍毒氣升級，以及衣軍如何利用地形與交通線拖延戰局。";
