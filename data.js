// =========================================================================
// 1. 共用地形、國家與戰鬥結果資料庫 (data.js)
// =========================================================================

window.SCENARIO_PACKS = window.SCENARIO_PACKS || {};
const SCENARIOS = window.SCENARIO_PACKS;
window.ENCYCLOPEDIA_ENTRIES = window.ENCYCLOPEDIA_ENTRIES || {};
window.SCENARIO_NOTES = window.SCENARIO_NOTES || {};
const scenarioNotes = window.SCENARIO_NOTES;

const TERRAIN_CFG = {
  sea:      { name: "水域",      mp: 99, def: 0 },
  coast:    { name: "海岸",      mp: 99, def: 0 },
  plain:    { name: "草原",      mp: 1,  def: 0 },
  desert:   { name: "荒漠",      mp: 1,  def: 0 },
  plateau:  { name: "高原",      mp: 2,  def: 1 },
  mountain: { name: "山地",      mp: 3,  def: 2 },
  city:     { name: "城鎮",      mp: 1,  def: 2 }
};

const COUNTRIES = {
  ETH:    { name: "衣索比亞帝國",   playable: true },
  ERI:    { name: "義屬厄利垂亞",   playable: true },
  SOM_IT: { name: "義屬索馬利蘭",   playable: true },
  SOM_BR: { name: "英屬索馬利蘭",   playable: false },
  SOM_FR: { name: "法屬索馬利蘭",   playable: false },
  SUD:    { name: "英埃蘇丹",       playable: false },
  KEN:    { name: "英屬肯亞",       playable: false },
  UGA:    { name: "英屬烏干達",     playable: false },
  SAU:    { name: "沙烏地阿拉伯",   playable: false },
  YEM:    { name: "葉門王國",       playable: false },
  ADE:    { name: "亞丁保護國",     playable: false },
  SEA:    { name: "海域",           playable: false }
};

// 跨時代共用底圖座標覆寫表（依六角格座標標籤如 "O07"）
const HEX_OVERRIDES = {
  // 曼德海峽
  O07: { country: "SEA", terrain: "coast", owner: "neutral" },

  // 法屬索馬利亞
  N07: { country: "SOM_FR", terrain: "desert", owner: "neutral" },
  N08: { country: "SOM_FR", terrain: "coast", owner: "neutral", coastTitle: "索馬利亞海岸" },
  O08: { country: "SOM_FR", terrain: "coast", owner: "neutral", coastTitle: "索馬利亞海岸" },

  // 義屬索馬利亞（確保指定沿岸與內陸格維持陸地與義大利控制）
  O17: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  P16: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  S15: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  T14: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  T15: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  U13: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  U14: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  U15: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  V12: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  V13: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  V14: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  W10: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  W11: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  W12: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  W13: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  X09: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  X10: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },
  X11: { country: "SOM_IT", owner: "italy", landFallbackTerrain: "plain" },

  // 英屬烏干達
  A18: { country: "UGA", terrain: "plain", owner: "neutral" },
  A19: { country: "UGA", terrain: "plain", owner: "neutral" },
  A20: { country: "UGA", terrain: "plain", owner: "neutral" },
  A21: { country: "UGA", terrain: "plain", owner: "neutral" },
  A22: { country: "UGA", terrain: "plain", owner: "neutral" },
  A23: { country: "UGA", owner: "neutral", onlyIfLand: true },
  B17: { country: "UGA", terrain: "plain", owner: "neutral" },
  B18: { country: "UGA", terrain: "plain", owner: "neutral" },
  B19: { country: "UGA", terrain: "plain", owner: "neutral" },
  B20: { country: "UGA", terrain: "plain", owner: "neutral" },
  B21: { country: "UGA", terrain: "plain", owner: "neutral" },
  B22: { country: "UGA", owner: "neutral", onlyIfLand: true },
  B23: { country: "UGA", owner: "neutral", onlyIfLand: true },
  C17: { country: "UGA", terrain: "plain", owner: "neutral" },
  C18: { country: "UGA", terrain: "plain", owner: "neutral" },
  C19: { country: "UGA", terrain: "plain", owner: "neutral" },
  C20: { country: "UGA", terrain: "plain", owner: "neutral" },
  C21: { country: "UGA", terrain: "plain", owner: "neutral" },

  // 義屬厄利垂亞海岸
  L05: { country: "ERI", terrain: "coast", owner: "italy", coastTitle: "厄利垂亞海岸" },
  M06: { country: "ERI", terrain: "coast", owner: "italy", coastTitle: "厄利垂亞海岸" },
  N06: { country: "ERI", terrain: "coast", owner: "italy", coastTitle: "厄利垂亞海岸" },

  // 北線邊境地塊歸屬修正（K05 屬厄利垂亞、J05/J06 屬衣索比亞）
  K05: { country: "ERI", owner: "italy", landFallbackTerrain: "desert" },
  J05: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "plateau" },
  J06: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "plateau" },

  // 衣索比亞帝國（阿法爾／達納基勒窪地）
  L07: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  L08: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  L09: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  M07: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  M08: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  M09: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  M10: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  N09: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },
  N10: { country: "ETH", owner: "ethiopia", landFallbackTerrain: "desert" },

  // 沙烏地阿拉伯與亞丁保護國
  Q07: { country: "ADE", terrain: "city", owner: "neutral" },
  V01: { country: "SAU", terrain: "desert", owner: "neutral" }
};

// 戰鬥結果表 (CRT)
const CRT_TABLE = [
  ["AE", "AR", "AR", "EX", "DR"],
  ["AR", "AR", "EX", "DR", "DR"],
  ["AR", "EX", "DR", "DR", "DE"],
  ["EX", "DR", "DR", "DE", "DE"],
  ["DR", "DR", "DE", "DE", "DE"],
  ["DR", "DE", "DE", "DE", "DE"]
];
const CRT_SHORT = { AE: "攻滅", AR: "攻退", EX: "交換", DR: "守退", DE: "守殲" };
const CRT_FULL  = { AE: "攻方潰滅", AR: "攻方退卻", EX: "雙方慘烈交換", DR: "守方被迫退卻", DE: "守方全線殲滅" };

