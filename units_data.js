// =========================================================================
// 共用部隊兵種基準資料 (units_data.js) —— 與 units_data.xlsx 同步
// =========================================================================

const UNIT_TYPES = {
  // 義大利王國 (Regio Esercito / MVSN / RCTC)
  it_inf:  { faction: "italy",    nato: "inf",  echelon: "XX",  name: "義大利正規步兵師", atk: 7, def: 5, mp: 4, bg: "#2d4a34" },
  it_alp:  { faction: "italy",    nato: "alp",  echelon: "XX",  name: "阿爾卑斯山地師",   atk: 6, def: 6, mp: 4, bg: "#2d4a34" },
  it_ccnn: { faction: "italy",    nato: "ccnn", echelon: "XX",  name: "黑衫軍民兵師",     atk: 5, def: 3, mp: 4, bg: "#2d4a34" },
  it_col:  { faction: "italy",    nato: "col",  echelon: "XX",  name: "殖民地步兵師",     atk: 4, def: 4, mp: 5, bg: "#2d4a34" },
  it_mot:  { faction: "italy",    nato: "mot",  echelon: "III", name: "摩托化突擊縱隊",   atk: 5, def: 3, mp: 6, bg: "#2d4a34" },
  it_eng:  { faction: "italy",    nato: "eng",  echelon: "II",  name: "工兵築路營",       atk: 1, def: 2, mp: 4, bg: "#2d4a34" },

  // 衣索比亞帝國 (Imperial Ethiopian Army)
  et_grd:  { faction: "ethiopia", nato: "grd",  echelon: "XX",  name: "皇室近衛軍",       atk: 5, def: 6, mp: 4, bg: "#8f1d1d" },
  et_lvy:  { faction: "ethiopia", nato: "lvy",  echelon: "XX",  name: "地方領主大軍",     atk: 4, def: 3, mp: 4, bg: "#8f1d1d" },
  et_rec:  { faction: "ethiopia", nato: "rec",  echelon: "III", name: "山地游擊支隊",     atk: 2, def: 2, mp: 5, bg: "#8f1d1d" }
};

function getScenarioRoster(scenId) {
  return (window.SCENARIO_PACKS[scenId]?.roster ||
    window.SCENARIO_PACKS["1935"]?.roster || []).map(item => ({ ...item }));
}
