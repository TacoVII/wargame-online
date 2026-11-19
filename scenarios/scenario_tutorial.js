window.SCENARIO_PACKS["tutorial"] = {
  id: "tutorial",
  mapMode: "full",
  hasWarEscalation: false,
  hasGasWarfare: false,
  badge: "實戰教學關卡",
  title: "阿杜瓦前線實戰演習",
  maxTurns: 6,
  targetCityName: "阿杜瓦",
  targetCoord: { c: 8, r: 5 },
  victoryHint: "依地圖紅色蠟筆手繪標識完成 3 項實戰步驟，攻克北方重鎮【阿杜瓦】。",
  dates: ["演習階段 I", "演習階段 II", "演習總結", "演習總結", "演習總結", "演習總結"],
  cities: window.SCENARIO_PACKS["1935"].cities,
  roads: [
    ...window.SCENARIO_PACKS["1935"].roads,
    [8,3, 8,4, "rail"],
    [9,4, 8,5, "trail"]
  ],
  tutorialSteps: [
    {
      step: 1,
      unitId: "tut_inf",
      title: "步驟 1：選取與沿路機動",
      desc: "點擊地圖上紅色蠟筆圈選的【第30薩包達步兵師】(I04)，再推進至邊境格 J05。",
      unitHex: { c: 8, r: 3 },
      targetHex: { c: 9, r: 4 }
    },
    {
      step: 2,
      unitId: "tut_eng",
      title: "步驟 2：北線工兵修築往阿杜瓦公路",
      desc: "選取【北線工兵第1營】(I05)，點擊右側閃爍的「修築往【阿杜瓦】公路」按鈕。",
      unitHex: { c: 8, r: 4 },
      targetHex: { c: 8, r: 5 }
    },
    {
      step: 3,
      unitId: null,
      title: "步驟 3：選取部隊攻擊阿杜瓦",
      desc: "選取與阿杜瓦相鄰的義軍部隊，點擊阿杜瓦 (I06) 發動總攻並完成擲骰結算。",
      unitHex: { c: 9, r: 4 },
      targetHex: { c: 8, r: 5 }
    }
  ],
  roster: [
    { id: "tut_inf", type: "it_inf", faction: "italy", nato: "inf", echelon: "XX", name: "第30薩包達步兵師", atk: 7, def: 5, mp: 4, c: 8, r: 3 },
    { id: "tut_eng", type: "it_eng", faction: "italy", nato: "eng", echelon: "II", name: "北線工兵第1營", atk: 1, def: 2, mp: 4, c: 8, r: 4 },
    { id: "tut_mot", type: "it_mot", faction: "italy", nato: "mot", echelon: "III", name: "馬里奧蒂摩托化縱隊", atk: 5, def: 3, mp: 6, c: 9, r: 3 },
    { id: "tut_et1", type: "et_lvy", faction: "ethiopia", nato: "lvy", echelon: "XX", name: "塞尤姆親王提格雷軍", atk: 4, def: 3, mp: 4, c: 8, r: 5 }
  ]
};

window.SCENARIO_NOTES["tutorial"] = "阿杜瓦前線演習聚焦沿公路機動、工兵築路與選擇步兵或摩托化縱隊發動攻擊，不啟用戰爭態勢或毒氣戰。";
