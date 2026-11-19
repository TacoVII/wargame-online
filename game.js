// =========================================================================
// 2. 六角格運算、Canvas 繪圖、補給線、教學蠟筆標識與 CRT 結算核心邏輯 (game.js)
// =========================================================================

function createFullMapConfig() {
  const cols = 26;
  const rows = 23;
  const boardW = 1320;
  const boardH = 1320;
  const hexR = 31.5;
  const rowHeight = Math.sqrt(3) * hexR;
  const gridW = (2 + (cols - 1) * 1.5) * hexR;
  const gridH = (rows + 0.5) * rowHeight;

  return {
    cols,
    rows,
    boardW,
    boardH,
    hexR,
    ox: (boardW - gridW) / 2 + hexR,
    oy: (boardH - gridH) / 2 + rowHeight / 2
  };
}

let MAP_CFG = createFullMapConfig();

let setupChoice = { scenario: "tutorial", faction: "italy" };

const FACTION_THEME = {
  italy: {
    accentText: "text-[#9fd1a8]",
    logTag: "bg-[#2d4a34] text-[#f2e8cf]",
    statusText: "text-[#2d4a34]"
  },
  ethiopia: {
    accentText: "text-[#f2a6a6]",
    logTag: "bg-[#8f1d1d] text-[#f2e8cf]",
    statusText: "text-[#8f1d1d]"
  }
};

let game = {
  scenarioId: "tutorial",
  turn: 1,
  maxTurns: 6,
  playerFaction: "italy",
  activeFaction: "italy",
  warEscalation: 1,
  lp: 6,
  airGas: 2,
  sabotage: 2,
  airGasArmed: false,
  tutorialStep: 1,
  tutorialComplete: false,
  hexes: [],
  roads: [],
  units: [],
  selectedHex: null,
  selectedUnitId: null,
  hoveredHex: null,
  reachableHexes: new Map(),
  reachablePaths: new Map(),
  attackableHexes: new Set(),
  movementInProgress: false,
  unitRenderOverride: null,
  actionVersion: 0,
  pendingCombat: null,
  attackerOriginHex: null,
  gameOver: false,
  logs: []
};

let view = {
  scale: 1,
  minScale: 1,
  tx: 0,
  ty: 0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  hasMoved: false
};

let paperPattern = null;
let staticBoardCanvas = null;
let staticLayerDirty = true;
let territoryCanvas = null;
let territoryLayerDirty = true;
let lastStaticLayerState = null;
let compassPosition = null;
let baseMapImage = null;
let baseMapImageLoading = false;
let baseMapRaster = null;
const MAP_SPRITES = {
  compass: null,
  sea: null,
  plain: null,
  desert: null,
  mountain: null,
  city: null
};
const COUNTER_SPRITES = {
  italy: null,
  ethiopia: null,
  neutral: null
};
const NATO_SPRITES = {
  inf: null,
  alp: null,
  ccnn: null,
  col: null,
  mot: null,
  eng: null,
  grd: null,
  lvy: null,
  rec: null
};
const DIE_SPRITES = {
  1: null,
  2: null,
  3: null,
  4: null,
  5: null,
  6: null
};
let cameraAnimation = null;
let cameraAnimationFrame = null;
let unitAnimationToken = 0;
let currentEncyclopediaCategory = "全部";
let currentEncyclopediaEntryId = null;
let showAllEraPeople = false;
let encyclopediaSearchQuery = "";

const BASE_MAP_COUNTRY_CODES = ["ETH", "ERI", "SOM_IT", "SOM_FR", "SOM_BR", "SUD", "KEN", "YEM", "SAU", "ADE"];
const BASE_MAP_COUNTRY_SEEDS = [
  { country: "ETH", c: 8, r: 12 },
  { country: "ETH", c: 8, r: 5 },
  { country: "ETH", c: 6, r: 7 },
  { country: "ETH", c: 9, r: 8 },
  { country: "ETH", c: 8, r: 11 },
  { country: "ETH", c: 12, r: 11 },
  { country: "ETH", c: 15, r: 14 },
  { country: "ERI", c: 7, r: 2 },
  { country: "ERI", c: 8, r: 4 },
  { country: "ERI", c: 9, r: 3 },
  { country: "SOM_IT", c: 17, r: 16 },
  { country: "SOM_IT", c: 16, r: 19 },
  { country: "SOM_FR", c: 12, r: 8 },
  { country: "SOM_BR", c: 16, r: 10 },
  { country: "SUD", c: 2, r: 8 },
  { country: "SUD", c: 2, r: 2 },
  { country: "KEN", c: 6, r: 19 },
  { country: "KEN", c: 0, r: 21 },
  { country: "KEN", c: 0, r: 22 },
  { country: "YEM", c: 15, r: 3 },
  { country: "ADE", c: 19, r: 2 },
  { country: "SAU", c: 15, r: 2 }
];
const BASE_MAP_PORT_CITY_NAMES = new Set([
  "馬薩瓦", "摩加迪休", "吉布地", "柏培拉", "吉贊", "亞丁"
]);

function getActiveScenarioPack(scenId = game.scenarioId) {
  return SCENARIOS[scenId] || SCENARIOS["1935"];
}

function hasScenarioFlag(flagName) {
  return getActiveScenarioPack()[flagName] === true;
}

function getEscalationSideLabel(faction) {
  return faction === game.playerFaction ? "我方" : faction === "italy" ? "義軍" : "衣軍";
}

function getWarEscalationEffectSummary(level = game.warEscalation) {
  if (level < 4) return "Lv.1–3：目前無額外效果。";
  if (level <= 5) return `國聯制裁：${getEscalationSideLabel("italy")}工程補給每回合 +2 LP（-1）。`;
  if (level <= 7) {
    return `${getEscalationSideLabel("ethiopia")}補給範圍 +1 格；偶數回合游擊爆破配額 +1。`;
  }
  if (level <= 9) {
    return `石油禁運：${getEscalationSideLabel("italy")}工程補給 +1 LP；停止補充毒氣。`;
  }
  return "全面國際干預：衣索比亞帝國贏得戰略勝利。";
}

function getScenarioCities(scenId = game.scenarioId) {
  const activePack = getActiveScenarioPack(scenId);
  return activePack.cities || SCENARIOS["1935"].cities || [];
}

function getScenarioRoads(scenId = game.scenarioId) {
  const activePack = getActiveScenarioPack(scenId);
  return activePack.roads || SCENARIOS["1935"].roads || [];
}

function getScenarioTutorialSteps(scenId = game.scenarioId) {
  return getActiveScenarioPack(scenId).tutorialSteps || [];
}

function getArabianHexCountry(c, r) {
  const isYemen = (c === 13 && r >= 2 && r <= 4) ||
    (c === 14 && r >= 2 && r <= 5) ||
    (c === 15 && r >= 1 && r <= 4) ||
    (c === 16 && r >= 2 && r <= 4) ||
    (c === 17 && r === 2);
  if (isYemen) return "YEM";

  const isAden = (c === 15 && r === 5) ||
    (c === 16 && r === 5) ||
    (c === 17 && r >= 3 && r <= 4) ||
    (c === 18 && r >= 2 && r <= 4) ||
    ((c === 19 || c === 20) && r <= 3) ||
    (c === 21 && r >= 1 && r <= 2);
  return isAden ? "ADE" : null;
}

function applyArabianHexClassification(hex, c, r) {
  if (hex.terrain === "sea" || hex.terrain === "coast") return;
  const country = getArabianHexCountry(c, r);
  if (!country) return;
  hex.country = country;
  hex.owner = "neutral";
}

function isFixedLakeHex(c, r) {
  return (c === 5 && r === 8) ||
    (c === 5 && r >= 15 && r <= 17) ||
    (c === 6 && r === 18) ||
    (c >= 1 && c <= 3 && r === 22);
}

function applyFixedLakeClassification(hex) {
  hex.country = "SEA";
  hex.terrain = "sea";
  hex.owner = "neutral";
  hex.supplySource = null;
  hex.suppliedItaly = false;
  hex.suppliedEthiopia = false;
}

function requestVisualFrame(callback) {
  if (document.visibilityState === "hidden") {
    return window.setTimeout(() => callback(performance.now()), 16);
  }
  return window.requestAnimationFrame(callback);
}

function loadBaseMapImage() {
  if (baseMapImage || baseMapImageLoading) return;
  baseMapImageLoading = true;

  const image = new Image();
  image.onload = () => {
    baseMapImage = image;
    baseMapImageLoading = false;
    staticLayerDirty = true;
    if (game.hexes.length > 0) refreshHexesFromBaseMap();
  };
  image.onerror = () => {
    baseMapImageLoading = false;
    console.error("Unable to load the East Africa base map SVG.");
    if (game.hexes.length > 0) {
      addLog("【底圖載入錯誤】東非之角 SVG 底圖無法讀取，請確認檔案仍在專案資料夾。", "event");
      updateSidebarUI();
    }
  };
  image.src = new URL("./東非之角底圖最終版.svg", document.baseURI).href;
}

function preloadMapSprites() {
  const spriteGroups = [
    {
      basePath: "./assets/map/",
      target: MAP_SPRITES,
      files: {
        compass: "compass_rose.svg",
        sea: "terrain_sea.svg",
        plain: "terrain_plain.svg",
        desert: "terrain_desert.svg",
        mountain: "terrain_mountain.svg",
        city: "terrain_city.svg"
      }
    },
    {
      basePath: "./assets/counters/",
      target: COUNTER_SPRITES,
      files: {
        italy: "counter_italy.svg",
        ethiopia: "counter_ethiopia.svg",
        neutral: "counter_neutral.svg"
      }
    },
    {
      basePath: "./assets/nato/",
      target: NATO_SPRITES,
      files: {
        inf: "nato_inf.svg",
        alp: "nato_alp.svg",
        ccnn: "nato_ccnn.svg",
        col: "nato_col.svg",
        mot: "nato_mot.svg",
        eng: "nato_eng.svg",
        grd: "nato_grd.svg",
        lvy: "nato_lvy.svg",
        rec: "nato_rec.svg"
      }
    },
    {
      basePath: "./assets/dice/",
      target: DIE_SPRITES,
      files: {
        1: "dice_1.svg",
        2: "dice_2.svg",
        3: "dice_3.svg",
        4: "dice_4.svg",
        5: "dice_5.svg",
        6: "dice_6.svg"
      }
    }
  ];
  const loads = spriteGroups.flatMap(({ basePath, target, files }) =>
    Object.entries(files).map(([name, filename]) => new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        target[name] = image;
        resolve();
      };
      image.onerror = () => {
        console.error(`Unable to load SVG sprite: ${basePath}${filename}`);
        resolve();
      };
      image.src = new URL(`${basePath}${filename}`, document.baseURI).href;
    }))
  );
  Promise.all(loads).then(() => {
    staticLayerDirty = true;
    renderBoard();
  });
}

function getBaseMapDrawRect(image) {
  const scale = Math.min(MAP_CFG.boardW / image.naturalWidth, MAP_CFG.boardH / image.naturalHeight);
  const imgW = image.naturalWidth * scale;
  const imgH = image.naturalHeight * scale;
  return {
    imgX: (MAP_CFG.boardW - imgW) / 2,
    imgY: (MAP_CFG.boardH - imgH) / 2,
    imgW,
    imgH
  };
}

function createBaseMapRaster(image) {
  if (baseMapRaster) return baseMapRaster;

  const width = 1200;
  const height = Math.round(width * image.naturalHeight / image.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Unable to create the base-map sampling canvas.");
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const passable = new Uint8Array(width * height);
  for (let i = 0; i < passable.length; i++) {
    const p = i * 4;
    const red = pixels[p];
    const green = pixels[p + 1];
    const blue = pixels[p + 2];
    const isSea = blue > red + 15 && blue > 120;
    const isCountryBorder = red > 110 && green < 75 && blue < 65;
    if (!isSea && !isCountryBorder) passable[i] = 1;
  }

  baseMapRaster = { width, height, imageData, passable, countryLabels: null };
  return baseMapRaster;
}

function rasterPixelAtBoardPoint(x, y, imageRect, raster) {
  const px = Math.round((x - imageRect.imgX) * raster.width / imageRect.imgW);
  const py = Math.round((y - imageRect.imgY) * raster.height / imageRect.imgH);
  if (px < 0 || px >= raster.width || py < 0 || py >= raster.height) return -1;
  return py * raster.width + px;
}

function nearestBaseMapCountryLabel(point, imageRect, raster) {
  const centerX = rasterPixelAtBoardPoint(point.x, point.y, imageRect, raster);
  if (centerX < 0) return 0;

  const x = centerX % raster.width;
  const y = Math.floor(centerX / raster.width);
  const radiusX = Math.ceil(MAP_CFG.hexR * 1.1 * raster.width / imageRect.imgW);
  const radiusY = Math.ceil(MAP_CFG.hexR * 1.1 * raster.height / imageRect.imgH);
  let nearestLabel = 0;
  let nearestDistance = Infinity;

  for (let dy = -radiusY; dy <= radiusY; dy++) {
    for (let dx = -radiusX; dx <= radiusX; dx++) {
      const sampleX = x + dx;
      const sampleY = y + dy;
      if (sampleX < 0 || sampleX >= raster.width || sampleY < 0 || sampleY >= raster.height) continue;
      const distance = dx * dx + dy * dy;
      if (distance >= nearestDistance) continue;
      const label = raster.countryLabels[sampleY * raster.width + sampleX];
      if (label > 0) {
        nearestLabel = label;
        nearestDistance = distance;
      }
    }
  }
  return nearestLabel;
}

function floodFillBaseMapCountries(raster, imageRect) {
  if (raster.countryLabels) return raster.countryLabels;

  const labels = new Uint8Array(raster.width * raster.height);
  const queue = new Int32Array(labels.length);
  let tail = 0;

  BASE_MAP_COUNTRY_SEEDS.forEach(seed => {
    const seedPoint = hexToBoard(seed.c, seed.r);
    let index = rasterPixelAtBoardPoint(seedPoint.x, seedPoint.y, imageRect, raster);
    if (index < 0) return;

    if (!raster.passable[index]) {
      const startX = index % raster.width;
      const startY = Math.floor(index / raster.width);
      let nearest = -1;
      let nearestDistance = Infinity;
      for (let radius = 1; radius <= 12 && nearest < 0; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
            const x = startX + dx;
            const y = startY + dy;
            if (x < 0 || x >= raster.width || y < 0 || y >= raster.height) continue;
            const candidate = y * raster.width + x;
            const distance = dx * dx + dy * dy;
            if (raster.passable[candidate] && distance < nearestDistance) {
              nearest = candidate;
              nearestDistance = distance;
            }
          }
        }
      }
      index = nearest;
    }

    if (index < 0) {
      console.error(`No land pixel found for ${seed.country} seed at ${seed.c},${seed.r}.`);
      return;
    }

    const countryId = BASE_MAP_COUNTRY_CODES.indexOf(seed.country) + 1;
    if (labels[index] && labels[index] !== countryId) {
      console.error(`Conflicting base-map country seeds at ${seed.c},${seed.r}.`);
      return;
    }
    if (!labels[index]) {
      labels[index] = countryId;
      queue[tail++] = index;
    }
  });

  let head = 0;
  while (head < tail) {
    const index = queue[head++];
    const x = index % raster.width;
    const y = Math.floor(index / raster.width);
    const countryId = labels[index];
    const left = index - 1;
    if (x > 0 && raster.passable[left] && !labels[left]) {
      labels[left] = countryId;
      queue[tail++] = left;
    }
    const right = index + 1;
    if (x + 1 < raster.width && raster.passable[right] && !labels[right]) {
      labels[right] = countryId;
      queue[tail++] = right;
    }
    const above = index - raster.width;
    if (y > 0 && raster.passable[above] && !labels[above]) {
      labels[above] = countryId;
      queue[tail++] = above;
    }
    const below = index + raster.width;
    if (y + 1 < raster.height && raster.passable[below] && !labels[below]) {
      labels[below] = countryId;
      queue[tail++] = below;
    }
  }

  raster.countryLabels = labels;
  return labels;
}

function applyBaseMapHexClassification() {
  if (!baseMapImage || game.hexes.length === 0) return false;

  const raster = createBaseMapRaster(baseMapImage);
  const imageRect = getBaseMapDrawRect(baseMapImage);
  const countryLabels = floodFillBaseMapCountries(raster, imageRect);
  const pixels = raster.imageData.data;
  const radius = MAP_CFG.hexR * 0.96;
  const flatHexSlope = Math.sqrt(3);
  const yLimit = flatHexSlope * radius / 2;
  const diagonalLimit = flatHexSlope * radius;
  const rasterScaleX = raster.width / imageRect.imgW;
  const rasterScaleY = raster.height / imageRect.imgH;
  let unclassifiedHexes = 0;

  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      const hex = game.hexes[c][r];
      const center = hexToBoard(c, r);
      const city = getScenarioCities().find(item => item.c === c && item.r === r);
      const isPortCity = city && BASE_MAP_PORT_CITY_NAMES.has(city.name);
      if (c === 5 && r === 8) {
        hex.country = "SEA";
        hex.terrain = "sea";
        hex.owner = "neutral";
        hex.supplySource = null;
        hex.suppliedItaly = false;
        hex.suppliedEthiopia = false;
        continue;
      }

      const countryVotes = new Uint32Array(BASE_MAP_COUNTRY_CODES.length + 1);
      let totalPixels = 0;
      let seaPixels = 0;
      const minPixelX = Math.floor((center.x - radius - imageRect.imgX) * rasterScaleX - 0.5);
      const maxPixelX = Math.ceil((center.x + radius - imageRect.imgX) * rasterScaleX - 0.5);
      const minPixelY = Math.floor((center.y - radius - imageRect.imgY) * rasterScaleY - 0.5);
      const maxPixelY = Math.ceil((center.y + radius - imageRect.imgY) * rasterScaleY - 0.5);

      for (let pixelX = minPixelX; pixelX <= maxPixelX; pixelX++) {
        const boardX = imageRect.imgX + (pixelX + 0.5) / rasterScaleX;
        const dx = Math.abs(boardX - center.x);
        if (dx > radius) continue;

        for (let pixelY = minPixelY; pixelY <= maxPixelY; pixelY++) {
          const boardY = imageRect.imgY + (pixelY + 0.5) / rasterScaleY;
          const dy = Math.abs(boardY - center.y);
          if (dy > yLimit || flatHexSlope * dx + dy > diagonalLimit) continue;

          if (pixelX < 0 || pixelX >= raster.width || pixelY < 0 || pixelY >= raster.height) continue;

          const index = pixelY * raster.width + pixelX;
          const pixel = index * 4;
          const red = pixels[pixel];
          const green = pixels[pixel + 1];
          const blue = pixels[pixel + 2];
          const isRasterEdge = pixelX < 2 || pixelX >= raster.width - 2 ||
            pixelY < 2 || pixelY >= raster.height - 2;
          // Ignore the SVG's dark perimeter stroke; it is not terrain.
          if (isRasterEdge && red < 32 && green < 32 && blue < 32) continue;

          totalPixels++;
          if (blue > red + 15 && blue > 120) {
            seaPixels++;
            continue;
          }

          const countryId = countryLabels[index];
          if (countryId > 0) countryVotes[countryId]++;
        }
      }

      if (seaPixels > 0 && !isPortCity) {
        if (hex.cityName) {
          console.warn(`Removing city ${hex.cityName}; its hex samples classify as water.`);
          hex.cityName = null;
          hex.isCapital = false;
        }
        hex.country = "SEA";
        hex.terrain = seaPixels / totalPixels >= 0.96 ? "sea" : "coast";
        hex.owner = "neutral";
        hex.supplySource = null;
        hex.suppliedItaly = false;
        hex.suppliedEthiopia = false;
        continue;
      }

      const currentCountryId = BASE_MAP_COUNTRY_CODES.indexOf(hex.country) + 1;
      let bestCountryId = 0;
      let bestVoteCount = 0;
      for (let id = 1; id < countryVotes.length; id++) {
        if (countryVotes[id] > bestVoteCount ||
            (countryVotes[id] > 0 && countryVotes[id] === bestVoteCount && id === currentCountryId)) {
          bestCountryId = id;
          bestVoteCount = countryVotes[id];
        }
      }

      if (bestCountryId === 0 && currentCountryId === 0 && (seaPixels === 0 || isPortCity)) {
        bestCountryId = nearestBaseMapCountryLabel(center, imageRect, raster);
      }

      if (bestCountryId > 0) {
        hex.country = BASE_MAP_COUNTRY_CODES[bestCountryId - 1];
      } else if (currentCountryId > 0) {
        hex.country = BASE_MAP_COUNTRY_CODES[currentCountryId - 1];
      } else {
        unclassifiedHexes++;
      }
      if ((hex.terrain === "sea" || hex.terrain === "coast") && hex.country !== "SEA") {
        hex.terrain = "plain";
      }

      if (city) {
        if (isPortCity) {
          hex.cityName = city.name;
          hex.terrain = "city";
          hex.supplySource = city.supply;
          hex.isCapital = city.isCapital;
        }
        hex.owner = city.owner;
      } else if (hex.country === "ETH") {
        hex.owner = "ethiopia";
      } else if (hex.country === "ERI" || hex.country === "SOM_IT") {
        hex.owner = "italy";
      } else {
        hex.owner = "neutral";
      }
    }
  }

  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      const hex = game.hexes[c][r];
      if (isFixedLakeHex(c, r)) applyFixedLakeClassification(hex);
      else applyArabianHexClassification(hex, c, r);
    }
  }

  applyHexOverrides(game.hexes);

  const activePack = getActiveScenarioPack();
  if (typeof activePack.applyScenarioBorders === "function") {
    activePack.applyScenarioBorders(game.hexes);
  }

  applyCoastCountryInheritance(game.hexes);

  if (unclassifiedHexes > 0) {
    console.warn(`${unclassifiedHexes} land hexes had no raster country sample; retaining their generated country.`);
  }
  return true;
}

function refreshHexesFromBaseMap() {
  if (!applyBaseMapHexClassification()) return;
  staticLayerDirty = true;
  territoryLayerDirty = true;
  recalculateSupply();
  computeValidMovesAndAttacks(game.units.find(unit => unit.id === game.selectedUnitId));
  updateSidebarUI();
  updateDetailPanel();
  renderBoard();
}

function hexCoordLabel(c, r) {
  return `${String.fromCharCode(65 + c)}${String(r + 1).padStart(2, "0")}`;
}
function hexKey(c, r) { return `${c},${r}`; }

const HEX_NEIGHBOR_OFFSETS = {
  even: [[0,-1], [1,-1], [1,0], [0,1], [-1,0], [-1,-1]],
  odd: [[0,-1], [1,0], [1,1], [0,1], [-1,1], [-1,0]]
};

function getNeighborCoordinates(c, r) {
  const offsets = (c & 1) === 1 ? HEX_NEIGHBOR_OFFSETS.odd : HEX_NEIGHBOR_OFFSETS.even;
  const neighbors = [];
  for (const [dc, dr] of offsets) {
    const nc = c + dc;
    const nr = r + dr;
    if (nc >= 0 && nc < MAP_CFG.cols && nr >= 0 && nr < MAP_CFG.rows) {
      neighbors.push({ c: nc, r: nr });
    }
  }
  return neighbors;
}

function calculateHexCenter(c, r) {
  const w = 2 * MAP_CFG.hexR;
  const rowHeight = Math.sqrt(3) * MAP_CFG.hexR;
  return {
    x: MAP_CFG.ox + c * (0.75 * w),
    y: MAP_CFG.oy + r * rowHeight + ((c & 1) ? rowHeight / 2 : 0)
  };
}

function getHexNeighbors(c, r) {
  const hex = game.hexes[c] && game.hexes[c][r];
  return hex && hex.neighbors ? hex.neighbors : getNeighborCoordinates(c, r);
}

// 嚴格檢查兩六角格是否相鄰
function areHexesAdjacent(c1, r1, c2, r2) {
  const hex = game.hexes[c1] && game.hexes[c1][r1];
  const neighbors = hex && hex.neighbors ? hex.neighbors : getNeighborCoordinates(c1, r1);
  return neighbors.some(nb => nb.c === c2 && nb.r === r2);
}

function hexToBoard(c, r) {
  const hex = game.hexes[c] && game.hexes[c][r];
  if (hex && Number.isFinite(hex.x) && Number.isFinite(hex.y)) {
    return { x: hex.x, y: hex.y };
  }
  return calculateHexCenter(c, r);
}

function screenToBoard(sx, sy) {
  return {
    x: (sx - view.tx) / view.scale,
    y: (sy - view.ty) / view.scale
  };
}

function boardToHex(bx, by) {
  let best = null;
  let bestDist = Infinity;
  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      const hex = game.hexes[c][r];
      const d = Math.hypot(bx - hex.x, by - hex.y);
      if (d < MAP_CFG.hexR * 0.96 && d < bestDist) {
        bestDist = d;
        best = { c, r };
      }
    }
  }
  return best;
}

// =========================================================================
// 全域非洲之角地圖生成
// =========================================================================
function applyCoastCountryInheritance(grid) {
  if (!grid) return;
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      const hex = grid[c][r];
      if (hex.terrain !== "coast") continue;
      if (typeof HEX_OVERRIDES !== "undefined" && HEX_OVERRIDES[hex.label]?.country) continue;
      const landHex = getNearestLandHex(c, r, grid);
      if (landHex) {
        hex.country = landHex.country;
        hex.owner = hex.country === "ETH"
          ? "ethiopia"
          : (hex.country === "ERI" || hex.country === "SOM_IT")
            ? "italy"
            : "neutral";
      }
    }
  }
}

function generateMapGrid(scenId = game.scenarioId) {
  MAP_CFG = createFullMapConfig();
  staticLayerDirty = true;
  territoryLayerDirty = true;
  const grid = generateFullHornGrid(scenId);
  const activePack = getActiveScenarioPack(scenId);
  if (typeof activePack.applyScenarioBorders === "function") {
    activePack.applyScenarioBorders(grid);
  }
  applyCoastCountryInheritance(grid);
  return grid;
}

function applyHexOverrides(grid) {
  if (!grid || typeof HEX_OVERRIDES === "undefined") return;
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      const hex = grid[c][r];
      const override = HEX_OVERRIDES[hex.label];
      if (!override) continue;
      if (override.onlyIfLand && (hex.terrain === "sea" || hex.terrain === "coast")) continue;

      if (override.country) hex.country = override.country;
      if (override.terrain) {
        hex.terrain = override.terrain;
      } else if (override.landFallbackTerrain && (hex.terrain === "sea" || hex.terrain === "coast")) {
        hex.terrain = override.landFallbackTerrain;
      }
      if (hex.cityName) {
        hex.terrain = "city";
      } else if (override.owner) {
        hex.owner = override.owner;
      }

      if (hex.terrain === "sea" || hex.terrain === "coast") {
        hex.supplySource = null;
        hex.suppliedItaly = false;
        hex.suppliedEthiopia = false;
      }
    }
  }
}

function generateFullHornGrid(scenId = game.scenarioId) {
  const grid = [];
  // 水域範圍以六角格逐列塑出紅海、亞丁灣與索馬利蘭海岸。
  const redSeaByRow = [
    [7, 10], [8, 11], [8, 12], [10, 12], [10, 13], [11, 13], [12, 13], [12, 13]
  ];
  // r9 的 c21 保留為瓜達富伊角，海岸線最終收束至 c10,r22。
  const eastCoastByRow = [
    25, 25, 25, 25, 25, 25, 25, 25, 25,
    21, 21, 20, 20, 20, 19, 19, 18, 18, 17, 17, 15, 12, 10
  ];

  for (let c = 0; c < MAP_CFG.cols; c++) {
    grid[c] = [];
    for (let r = 0; r < MAP_CFG.rows; r++) {
      let country = "ETH";
      let terrain = "plateau";

      const rs = redSeaByRow[r];
      const isRedSea = rs && c >= rs[0] && c <= rs[1];
      const isGulfAden = (r === 7 && c >= 17 && c <= 20) ||
                         (r === 8 && c >= 15 && c <= 20) ||
                         (r === 9 && c === 20);
      const eastLimit = eastCoastByRow[r];
      const isIndianOcean = r >= 9 && c > eastLimit;
      const isLakeTana = c === 5 && r === 8;
      const isLakeRudolf = (c === 5 && r >= 15 && r <= 17) || (c === 6 && r === 18);
      const isLakeVictoria = c >= 1 && c <= 3 && r === 22;

      if (isRedSea || isGulfAden || isIndianOcean || isLakeTana || isLakeRudolf || isLakeVictoria) {
        country = "SEA";
        terrain = "sea";
      } else if ((r <= 6 && rs && c > rs[1]) || (r === 7 && c >= 14 && c <= 16)) {
        // 沙烏地阿拉伯與葉門海岸。
        country = r <= 3 ? "SAU" : "YEM";
        terrain = "desert";
      } else if ((r <= 16 && c <= 3) || (c === 4 && (r <= 2 || (r >= 6 && r <= 13)))) {
        // 英埃蘇丹西界。
        country = "SUD";
        terrain = r <= 5 ? "desert" : "plain";
      } else if ((r <= 4 && c >= 5 && c <= 10) ||
                 (r === 5 && c >= 9 && c <= 10) ||
                 (r === 6 && c >= 10 && c <= 11) ||
                 (r === 7 && c === 11)) {
        // 義屬厄利垂亞北部高地與曼德海峽北岸。
        country = "ERI";
        terrain = c >= 9 ? "desert" : "plateau";
      } else if ((r === 8 && c >= 12 && c <= 14) || (r === 9 && c === 13)) {
        // 法屬索馬利蘭與塔朱拉灣沿岸。
        country = "SOM_FR";
        terrain = "desert";
      } else if ((r === 9 && c >= 14 && c <= 19) ||
                 (r === 10 && c >= 14 && c <= 19) ||
                 (r === 11 && c >= 15 && c <= 18)) {
        // 英屬索馬利蘭；保留吉吉加為衣索比亞領土。
        country = "SOM_BR";
        terrain = r === 9 ? "plain" : "plateau";
      } else if ((r === 9 && c >= 21 && c <= eastLimit) ||
                 (r === 10 && c >= 20 && c <= eastLimit) ||
                 (r === 11 && c >= 19 && c <= eastLimit) ||
                 (r === 12 && c >= 20 && c <= eastLimit) ||
                 (r >= 13 && r <= 15 && c >= 15 && c <= eastLimit) ||
                 (r === 16 && c >= 12 && c <= eastLimit) ||
                 (r >= 17 && r <= 22 && c >= 10 && c <= eastLimit)) {
        // 義屬索馬利蘭，自瓜達富伊角沿印度洋海岸向西南延伸。
        country = "SOM_IT";
        terrain = (c >= 17 || r >= 17) ? "plain" : "desert";
      } else if (r >= 17 && r <= 22 && c <= 9) {
        // 英屬肯亞西南疆界。
        country = "KEN";
        terrain = c >= 6 ? "desert" : "plain";
      } else {
        // 衣索比亞帝國
        country = "ETH";
        if ((c >= 6 && c <= 9 && r >= 5 && r <= 7) || (c >= 8 && c <= 10 && r >= 12 && r <= 13)) {
          terrain = "mountain";
        } else if ((c >= 11 && c <= 12 && r >= 6 && r <= 8) || (c >= 13 && r >= 11)) {
          terrain = "desert";
        } else if (c <= 4 && r >= 10) {
          terrain = "plain";
        } else {
          terrain = "plateau";
        }
      }

      const arabianCountry = getArabianHexCountry(c, r);
      if (arabianCountry && terrain !== "sea" && terrain !== "coast") {
        country = arabianCountry;
      }

      let owner = "neutral";
      if (country === "ERI" || country === "SOM_IT") owner = "italy";
      else if (country === "ETH") owner = "ethiopia";

      const center = calculateHexCenter(c, r);
      grid[c][r] = {
        c, r,
        x: center.x,
        y: center.y,
        neighbors: getNeighborCoordinates(c, r),
        label: hexCoordLabel(c, r),
        country,
        terrain,
        cityName: null,
        owner,
        supplySource: null,
        isCapital: false,
        gasTurns: 0,
        suppliedItaly: false,
        suppliedEthiopia: false
      };
    }
  }

  getScenarioCities(scenId).forEach(city => {
    const h = grid[city.c][city.r];
    if (!h) return;
    h.cityName = city.name;
    h.terrain = "city";
    h.owner = city.owner;
    h.supplySource = city.supply;
    h.isCapital = city.isCapital;
  });
  applyHexOverrides(grid);
  return grid;
}

// =========================================================================
// 劇本選單與初始化
// =========================================================================
function selectSetupScenario(scenId) {
  setupChoice.scenario = scenId;
  if (scenId === "tutorial") {
    setupChoice.faction = "italy";
  }
  selectSetupFaction(setupChoice.faction);

  ["tutorial", "1935"].forEach(id => {
    const card = document.getElementById(`card-scen-${id}`);
    const badge = document.getElementById(`badge-scen-${id}`);
    if (!card || !badge) return;
    const active = scenId === id;
    card.className = active
      ? "cursor-pointer border-4 border-[#8f1d1d] bg-[#e8dcc2] p-4 flex flex-col justify-between transition shadow-lg"
      : "cursor-pointer border-2 border-[#594a36] bg-[#dfd0b0] hover:bg-[#e6d9bc] p-4 flex flex-col justify-between transition";
    badge.textContent = active ? "✓ 已選取" : "點擊選擇";
    badge.className = active
      ? "px-2 py-0.5 bg-[#8f1d1d] text-[#f2e8cf]"
      : "text-[#594a36]";
  });
}

function selectSetupFaction(fac) {
  const isTutorial = setupChoice.scenario === "tutorial";
  if (isTutorial && fac !== "italy") {
    setupChoice.faction = "italy";
    return;
  }
  setupChoice.faction = fac;
  const itBtn = document.getElementById("btn-fac-italy");
  const etBtn = document.getElementById("btn-fac-ethiopia");
  const itChk = document.getElementById("chk-fac-italy");
  const etChk = document.getElementById("chk-fac-ethiopia");

  etBtn.disabled = isTutorial;

  if (fac === "italy") {
    itBtn.className = "text-left p-3.5 border-4 border-[#2d3b32] bg-[#d4dfd5] flex items-center justify-between";
    itChk.textContent = "✓ 已選";
    itChk.className = "px-3 py-1 bg-[#2d3b32] text-[#e8c670] font-typewriter font-bold text-sm border border-[#1c1814]";

    etBtn.className = isTutorial
      ? "text-left p-3.5 border-2 border-[#594a36] bg-[#dfd0b0] flex items-center justify-between opacity-50 cursor-not-allowed"
      : "text-left p-3.5 border-2 border-[#594a36] bg-[#dfd0b0] flex items-center justify-between";
    etChk.textContent = isTutorial ? "教學僅限義軍" : "選擇";
    etChk.className = "px-3 py-1 bg-[#c4b087] text-[#4a3f31] font-typewriter font-bold text-sm border border-[#594a36]";
  } else {
    etBtn.className = "text-left p-3.5 border-4 border-[#8f1d1d] bg-[#ebd5d5] flex items-center justify-between";
    etChk.textContent = "✓ 已選";
    etChk.className = "px-3 py-1 bg-[#8f1d1d] text-[#f2e8cf] font-typewriter font-bold text-sm border border-[#1c1814]";

    itBtn.className = "text-left p-3.5 border-2 border-[#594a36] bg-[#dfd0b0] flex items-center justify-between";
    itChk.textContent = "選擇";
    itChk.className = "px-3 py-1 bg-[#c4b087] text-[#4a3f31] font-typewriter font-bold text-sm border border-[#594a36]";
  }
}

function launchSelectedScenario() {
  initGame(setupChoice.scenario, setupChoice.faction);
}

function createScenarioUnit(unitData) {
  const template = UNIT_TYPES[unitData.type];
  if (!template) throw new Error(`Unknown unit type: ${unitData.type}`);

  const unit = { ...template, ...unitData };
  unit.initialR = unitData.r;
  unit.atk = unitData.atk ?? template.atk;
  unit.def = unitData.def ?? template.def;
  unit.mp = unitData.mp ?? template.mp;
  unit.maxMp = unitData.mp ?? template.mp;
  unit.hasAttacked = false;
  return unit;
}

function initGame(scenId, chosenFaction) {
  const scen = getActiveScenarioPack(scenId);
  game.actionVersion += 1;
  unitAnimationToken += 1;
  cameraAnimation = null;
  game.scenarioId = scenId;
  game.turn = 1;
  game.maxTurns = scen.maxTurns;
  game.playerFaction = scenId === "tutorial" ? "italy" : chosenFaction;
  game.activeFaction = "italy";
  game.warEscalation = 1;
  game.lp = 6;
  game.airGas = scen.hasGasWarfare === true ? 2 : 0;
  game.sabotage = 2;
  game.airGasArmed = false;
  game.tutorialStep = 1;
  game.tutorialComplete = false;
  game.gameOver = false;
  game.selectedHex = null;
  game.selectedUnitId = null;
  game.hoveredHex = null;
  game.reachableHexes.clear();
  game.reachablePaths.clear();
  game.attackableHexes.clear();
  game.movementInProgress = false;
  game.unitRenderOverride = null;
  game.pendingCombat = null;
  game.attackerOriginHex = null;
  game.logs = [];

  game.hexes = generateMapGrid(scenId);

  game.roads = getScenarioRoads(scenId)
    .filter(([c1, r1, c2, r2]) => areHexesAdjacent(c1, r1, c2, r2))
    .map(([c1, r1, c2, r2, type], idx) => ({
      id: `rd_${idx}`, c1, r1, c2, r2, type
    }));

  const roster = getScenarioRoster(scenId);
  game.units = roster.map(createScenarioUnit);

  if (baseMapImage) applyBaseMapHexClassification();
  territoryLayerDirty = true;
  recalculateSupply();
  computeValidMovesAndAttacks(null);
  closeModal("modal-scenario");
  closeModal("modal-gameover");
  closeCombatModal();

  if (scenId === "tutorial") {
    addLog("【演習電報】歡迎進入阿杜瓦前線演習！請依地圖上的「紅色蠟筆標識」完成 3 項指令。", "event");
    focusBoardRegion(8, 4, 1.38);
  } else {
    addLog(`【作戰電報】《${scen.title}》正式開戰！`, "event");
    addLog(`閣下已就任【${game.playerFaction === "italy" ? "義大利王國" : "衣索比亞帝國"}】前線總司令。`, "info");
    resetView();
  }

  updateSidebarUI();
  updateDetailPanel();
  updateHoverPanel();
  renderBoard();

  if (game.playerFaction === "ethiopia" && scenId !== "tutorial") {
    setTimeout(() => runAiTurn("italy"), 550);
  }
}

function advanceTutorialIfNeeded(eventType, details = {}) {
  if (game.scenarioId !== "tutorial") return;
  if (game.tutorialStep === 1 && eventType === "moved_inf") {
    game.tutorialStep = 2;
    addLog("【演習進度 1/3】完成沿路機動！請選取【北線工兵第1營】修築往阿杜瓦公路。", "event");
  } else if (game.tutorialStep === 2 && eventType === "built_road") {
    game.tutorialStep = 3;
    addLog("【演習進度 2/3】通往阿杜瓦的公路已修築！選取步兵或摩托化縱隊發動總攻。", "event");
  } else if (game.tutorialStep === 3 && eventType === "combat_done" &&
    details.targetC === 8 && details.targetR === 5 &&
    (details.attackerIds || []).some(id => id === "tut_inf" || id === "tut_mot")) {
    game.tutorialComplete = true;
    addLog("【演習進度 3/3】恭喜完成機動、築路與總攻演習！", "event");
  }
  updateSidebarUI();
  renderBoard();
}

// =========================================================================
// 補給線、控制區與移動力計算
// =========================================================================
function getRoadBetween(c1, r1, c2, r2) {
  if (!areHexesAdjacent(c1, r1, c2, r2)) return null;
  return game.roads.find(rd =>
    (rd.c1 === c1 && rd.r1 === r1 && rd.c2 === c2 && rd.r2 === r2) ||
    (rd.c1 === c2 && rd.r1 === r2 && rd.c2 === c1 && rd.r2 === r1)
  );
}

function getUnitsInHex(c, r) {
  return game.units.filter(u => u.c === c && u.r === r);
}

function isHexInEnemyZOC(c, r, faction) {
  return getHexNeighbors(c, r).some(nb => getUnitsInHex(nb.c, nb.r).some(u => u.faction !== faction));
}

function isPassablePlayableHex(h) {
  return h && h.terrain !== "sea" && h.terrain !== "coast" && COUNTRIES[h.country]?.playable;
}

function canUnitTraverseHexEdge(unit, fromHex, toHex, road) {
  if (unit.type !== "it_mot") return true;
  if (fromHex.terrain === "city" || toHex.terrain === "city") return true;
  return road && (road.type === "road" || road.type === "rail");
}

function recalculateSupply() {
  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      game.hexes[c][r].suppliedItaly = false;
      game.hexes[c][r].suppliedEthiopia = false;
    }
  }

  ["italy", "ethiopia"].forEach(faction => {
    const prop = faction === "italy" ? "suppliedItaly" : "suppliedEthiopia";
    const allowedRoadTypes = faction === "italy"
      ? new Set(["road", "rail"])
      : new Set(["road", "rail", "trail"]);
    const supplyRadius = faction === "ethiopia" && hasScenarioFlag("hasWarEscalation") &&
      game.warEscalation >= 6 && game.warEscalation <= 7 ? 2 : 1;
    const roadConnected = new Set();
    const queue = [];

    for (let c = 0; c < MAP_CFG.cols; c++) {
      for (let r = 0; r < MAP_CFG.rows; r++) {
        const h = game.hexes[c][r];
        if (h.terrain === "city" && h.owner === faction) {
          const k = hexKey(c, r);
          roadConnected.add(k);
          queue.push({ c, r });
        }
      }
    }

    for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
      const curr = queue[queueIndex];
      for (const nb of getHexNeighbors(curr.c, curr.r)) {
        const rd = getRoadBetween(curr.c, curr.r, nb.c, nb.r);
        const nbHex = game.hexes[nb.c][nb.r];
        const k = hexKey(nb.c, nb.r);
        if (rd && allowedRoadTypes.has(rd.type) && nbHex.owner === faction && !roadConnected.has(k)) {
          roadConnected.add(k);
          queue.push(nb);
        }
      }
    }

    for (let c = 0; c < MAP_CFG.cols; c++) {
      for (let r = 0; r < MAP_CFG.rows; r++) {
        const h = game.hexes[c][r];
        if (!isPassablePlayableHex(h) || h.owner !== faction) continue;
        const k = hexKey(c, r);
        let isSupplied = roadConnected.has(k) ||
          getHexNeighbors(c, r).some(nb => roadConnected.has(hexKey(nb.c, nb.r)));
        if (!isSupplied && supplyRadius > 1) {
          isSupplied = getHexNeighbors(c, r).some(nb =>
            getHexNeighbors(nb.c, nb.r).some(second => roadConnected.has(hexKey(second.c, second.r)))
          );
        }
        if (isSupplied) {
          h[prop] = true;
        }
      }
    }
  });
}

function isUnitSupplied(unit) {
  if (["it_alp", "it_col", "et_rec"].includes(unit.type)) return true;
  const h = game.hexes[unit.c][unit.r];
  return unit.faction === "italy" ? h.suppliedItaly : h.suppliedEthiopia;
}

function getEffectiveAttack(unit) {
  const suppliedAttack = isUnitSupplied(unit) ? unit.atk : Math.floor(unit.atk * 0.5);
  const hex = game.hexes[unit.c][unit.r];
  const gasPenalty = hasScenarioFlag("hasGasWarfare") && hex.gasTurns > 0 ? 1 : 0;
  return Math.max(1, suppliedAttack - gasPenalty);
}

function getUnitReachableHexes(unit, paths = null) {
  const reachable = new Map();
  if (paths) paths.clear();
  if (!unit || unit.mp <= 0) return reachable;

  const startKey = hexKey(unit.c, unit.r);
  const bestMp = new Map([[startKey, unit.mp]]);
  const queue = [{ c: unit.c, r: unit.r, remMp: unit.mp, path: [] }];

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.remMp < bestMp.get(hexKey(curr.c, curr.r))) continue;
    const currInZOC = (curr.c !== unit.c || curr.r !== unit.r) && isHexInEnemyZOC(curr.c, curr.r, unit.faction);
    if (currInZOC) continue;

    for (const nb of getHexNeighbors(curr.c, curr.r)) {
      const targetHex = game.hexes[nb.c][nb.r];
      if (!isPassablePlayableHex(targetHex)) continue;

      const unitsThere = getUnitsInHex(nb.c, nb.r);
      if (unitsThere.some(u => u.faction !== unit.faction)) continue;
      if (unitsThere.length >= 2) continue;

      const rd = getRoadBetween(curr.c, curr.r, nb.c, nb.r);
      if (!canUnitTraverseHexEdge(unit, game.hexes[curr.c][curr.r], targetHex, rd)) continue;

      let cost = TERRAIN_CFG[targetHex.terrain].mp;
      if (rd && (rd.type === "road" || rd.type === "rail")) cost = 1;
      else if (["it_alp", "it_col", "et_grd", "et_rec"].includes(unit.type)) cost = 1;

      const nextRem = curr.remMp - cost;
      if (nextRem >= 0) {
        const k = hexKey(nb.c, nb.r);
        if (!bestMp.has(k) || nextRem > bestMp.get(k)) {
          const path = [...curr.path, { c: nb.c, r: nb.r, remainingMp: nextRem }];
          bestMp.set(k, nextRem);
          reachable.set(k, nextRem);
          if (paths) paths.set(k, path);
          queue.push({ c: nb.c, r: nb.r, remMp: nextRem, path });
        }
      }
    }
  }
  return reachable;
}

function computeValidMovesAndAttacks(unit) {
  game.reachableHexes.clear();
  game.reachablePaths.clear();
  game.attackableHexes.clear();
  if (!unit || unit.faction !== game.playerFaction || game.activeFaction !== game.playerFaction) return;

  if (unit.mp > 0 && !unit.hasAttacked) {
    for (const nb of getHexNeighbors(unit.c, unit.r)) {
      const enemies = getUnitsInHex(nb.c, nb.r).filter(u => u.faction !== unit.faction);
      if (enemies.length === 0) continue;
      const rd = getRoadBetween(unit.c, unit.r, nb.c, nb.r);
      if (!canUnitTraverseHexEdge(unit, game.hexes[unit.c][unit.r], game.hexes[nb.c][nb.r], rd)) continue;
      game.attackableHexes.add(hexKey(nb.c, nb.r));
    }
  }

  getUnitReachableHexes(unit, game.reachablePaths).forEach((remainingMp, key) => {
    game.reachableHexes.set(key, remainingMp);
  });
}

function animateUnitVisual(unit, getPosition, duration, token, onComplete = null) {
  return new Promise(resolve => {
    let start = null;
    const drawFrame = timestamp => {
      if (token !== unitAnimationToken || !game.units.some(current => current.id === unit.id)) {
        if (game.unitRenderOverride && game.unitRenderOverride.unitId === unit.id) {
          game.unitRenderOverride = null;
          renderBoard();
        }
        resolve(false);
        return;
      }

      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      const position = getPosition(progress);
      game.unitRenderOverride = { unitId: unit.id, x: position.x, y: position.y - 2 };
      renderBoard();

      if (progress < 1) {
        requestVisualFrame(drawFrame);
        return;
      }

      if (onComplete) onComplete();
      game.unitRenderOverride = null;
      renderBoard();
      resolve(true);
    };
    requestVisualFrame(drawFrame);
  });
}

async function animateUnitAlongPath(unit, path) {
  const token = ++unitAnimationToken;
  const capturedHexes = [];
  game.movementInProgress = true;

  for (const step of path) {
    if (token !== unitAnimationToken || game.gameOver) break;
    const from = hexToBoard(unit.c, unit.r);
    const to = hexToBoard(step.c, step.r);
    smoothPanToHex(step.c, step.r, 180);

    const completed = await animateUnitVisual(unit, progress => ({
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress
    }), 160, token, () => {
      unit.c = step.c;
      unit.r = step.r;
      unit.mp = step.remainingMp;
      game.selectedHex = { c: step.c, r: step.r };

      const hex = game.hexes[step.c][step.r];
      if (hex.owner !== unit.faction) {
        hex.owner = unit.faction;
        territoryLayerDirty = true;
        capturedHexes.push({ c: step.c, r: step.r });
        recalculateSupply();
      }
      updateSidebarUI();
      updateDetailPanel();
    });

    if (!completed) break;
    if (capturedHexes.length > 0 && checkVictoryConditions()) break;
  }

  if (token === unitAnimationToken) {
    game.movementInProgress = false;
    game.unitRenderOverride = null;
  }
  return capturedHexes;
}

async function animateAttackCharge(combat) {
  const stats = evaluateCombat(
    combat.attackerFaction,
    combat.targetC,
    combat.targetR,
    combat.useGasSupport,
    combat.attackerOriginHex
  );
  const attacker = stats.primaryAttackers[0];
  if (!attacker) return;

  const token = ++unitAnimationToken;
  const origin = hexToBoard(attacker.c, attacker.r);
  const target = hexToBoard(combat.targetC, combat.targetR);
  const chargeX = (target.x - origin.x) * 0.35;
  const chargeY = (target.y - origin.y) * 0.35;
  smoothPanToHex(combat.targetC, combat.targetR);
  await animateUnitVisual(attacker, progress => {
    const phase = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    const eased = 1 - Math.pow(1 - phase, 2);
    return { x: origin.x + chargeX * eased, y: origin.y + chargeY * eased };
  }, 420, token);
}

// =========================================================================
// 縮放限制與滑鼠互動
// =========================================================================
function updateMinZoomAndClamp() {
  const frame = document.getElementById("map-viewport-frame");
  if (!frame) return;
  const rect = frame.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  view.minScale = Math.min(rect.width / MAP_CFG.boardW, rect.height / MAP_CFG.boardH);
  if (view.scale < view.minScale) view.scale = view.minScale;

  view.tx = clampViewTranslation(view.tx, rect.width, MAP_CFG.boardW);
  view.ty = clampViewTranslation(view.ty, rect.height, MAP_CFG.boardH);

  const pct = Math.round((view.scale / view.minScale) * 100);
  document.getElementById("zoom-readout").textContent = `${pct}%`;
}

function clampViewTranslation(offset, viewportSize, boardSize) {
  const scaledBoardSize = boardSize * view.scale;
  if (scaledBoardSize <= viewportSize) return (viewportSize - scaledBoardSize) / 2;
  return Math.min(0, Math.max(viewportSize - scaledBoardSize, offset));
}

function applyZoomAtPoint(factor, sx, sy) {
  cameraAnimation = null;
  const frame = document.getElementById("map-viewport-frame").getBoundingClientRect();
  view.minScale = Math.min(frame.width / MAP_CFG.boardW, frame.height / MAP_CFG.boardH);
  const maxScale = view.minScale * 2.8;

  const newScale = Math.max(view.minScale, Math.min(maxScale, view.scale * factor));
  const actualFactor = newScale / view.scale;
  view.tx = sx - (sx - view.tx) * actualFactor;
  view.ty = sy - (sy - view.ty) * actualFactor;
  view.scale = newScale;

  updateMinZoomAndClamp();
  renderBoard();
}

function zoomByFactor(factor) {
  const frame = document.getElementById("map-viewport-frame").getBoundingClientRect();
  applyZoomAtPoint(factor, frame.width / 2, frame.height / 2);
}

function resetView() {
  cameraAnimation = null;
  const frame = document.getElementById("map-viewport-frame").getBoundingClientRect();
  view.minScale = Math.min(frame.width / MAP_CFG.boardW, frame.height / MAP_CFG.boardH);
  view.scale = view.minScale;
  view.tx = (frame.width - MAP_CFG.boardW * view.scale) / 2;
  view.ty = (frame.height - MAP_CFG.boardH * view.scale) / 2;
  updateMinZoomAndClamp();
  renderBoard();
}

function focusBoardRegion(col, row, zoomMultiplier = 1.38) {
  const frame = document.getElementById("map-viewport-frame").getBoundingClientRect();
  view.minScale = Math.min(frame.width / MAP_CFG.boardW, frame.height / MAP_CFG.boardH);
  view.scale = view.minScale * zoomMultiplier;
  const pt = hexToBoard(col, row);
  view.tx = frame.width / 2 - pt.x * view.scale;
  view.ty = frame.height / 2 - pt.y * view.scale;
  updateMinZoomAndClamp();
  renderBoard();
}

function smoothPanToHex(c, r, duration = 320) {
  const frame = document.getElementById("map-viewport-frame").getBoundingClientRect();
  view.minScale = Math.min(frame.width / MAP_CFG.boardW, frame.height / MAP_CFG.boardH);
  if (view.scale <= view.minScale * 1.001) view.scale = Math.min(view.minScale * 1.28, view.minScale * 2.8);

  const pt = hexToBoard(c, r);
  cameraAnimation = {
    fromX: view.tx,
    fromY: view.ty,
    toX: clampViewTranslation(frame.width / 2 - pt.x * view.scale, frame.width, MAP_CFG.boardW),
    toY: clampViewTranslation(frame.height / 2 - pt.y * view.scale, frame.height, MAP_CFG.boardH),
    start: null,
    duration
  };
  if (cameraAnimationFrame === null) cameraAnimationFrame = requestVisualFrame(animateCameraPan);
}

function animateCameraPan(timestamp) {
  cameraAnimationFrame = null;
  if (!cameraAnimation) return;
  if (cameraAnimation.start === null) cameraAnimation.start = timestamp;

  const progress = Math.min(1, (timestamp - cameraAnimation.start) / cameraAnimation.duration);
  const eased = 1 - Math.pow(1 - progress, 3);
  view.tx = cameraAnimation.fromX + (cameraAnimation.toX - cameraAnimation.fromX) * eased;
  view.ty = cameraAnimation.fromY + (cameraAnimation.toY - cameraAnimation.fromY) * eased;
  updateMinZoomAndClamp();
  renderBoard();

  if (progress < 1) cameraAnimationFrame = requestVisualFrame(animateCameraPan);
  else cameraAnimation = null;
}

function handleHexClickAtScreen(sx, sy) {
  if (game.gameOver || game.pendingCombat || game.movementInProgress) return;
  const bp = screenToBoard(sx, sy);
  const clicked = boardToHex(bp.x, bp.y);
  if (!clicked) return;

  const h = game.hexes[clicked.c][clicked.r];
  if (!isPassablePlayableHex(h)) {
    openEncyclopediaEntry(resolveHexEncyclopediaId(h));
    return;
  }

  const k = hexKey(clicked.c, clicked.r);
  const selectedUnit = game.units.find(u => u.id === game.selectedUnitId);

  if (selectedUnit && game.reachableHexes.has(k)) {
    const path = game.reachablePaths.get(k);
    if (!path) {
      console.error(`Missing movement path for reachable hex ${k}.`);
      return;
    }

    game.reachableHexes.clear();
    game.reachablePaths.clear();
    animateUnitAlongPath(selectedUnit, path).then(capturedHexes => {
      if (game.gameOver || !game.units.includes(selectedUnit)) return;
      game.selectedHex = { c: selectedUnit.c, r: selectedUnit.r };
      if (capturedHexes.some(hex => hex.c === clicked.c && hex.r === clicked.r)) {
        addLog(`${selectedUnit.name} 推進並佔領【${h.cityName || h.label}】。`, selectedUnit.faction);
      }

      if (selectedUnit.id === "tut_inf") advanceTutorialIfNeeded("moved_inf");
      computeValidMovesAndAttacks(selectedUnit);
      updateDetailPanel();
      updateHoverPanel();
      renderBoard();
    });
    return;
  }

  if (selectedUnit && game.attackableHexes.has(k)) {
    game.attackerOriginHex = { c: selectedUnit.c, r: selectedUnit.r };
    openCombatModal(game.playerFaction, clicked.c, clicked.r, false, game.attackerOriginHex);
    return;
  }

  const unitsHere = getUnitsInHex(clicked.c, clicked.r);
  if (unitsHere.length > 0) {
    if (game.selectedHex && game.selectedHex.c === clicked.c && game.selectedHex.r === clicked.r && unitsHere.length > 1) {
      const idx = unitsHere.findIndex(u => u.id === game.selectedUnitId);
      game.selectedUnitId = unitsHere[(idx + 1) % unitsHere.length].id;
    } else {
      const friendly = unitsHere.find(u => u.faction === game.playerFaction);
      game.selectedUnitId = friendly ? friendly.id : unitsHere[0].id;
    }
  } else {
    game.selectedUnitId = null;
  }

  game.selectedHex = { c: clicked.c, r: clicked.r };
  const newSel = game.units.find(u => u.id === game.selectedUnitId);
  computeValidMovesAndAttacks(newSel);
  if (newSel && newSel.faction === game.playerFaction) smoothPanToHex(newSel.c, newSel.r);
  updateDetailPanel();
  updateHoverPanel();
  renderBoard();
}

function setupCanvasEvents() {
  const canvas = document.getElementById("wargame-canvas");

  canvas.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    cameraAnimation = null;
    view.isDragging = true;
    view.dragStartX = e.clientX;
    view.dragStartY = e.clientY;
    view.hasMoved = false;
  });
  canvas.addEventListener("contextmenu", e => {
    e.preventDefault();
    if (game.gameOver || game.pendingCombat || game.movementInProgress) return;
    cameraAnimation = null;
    game.selectedHex = null;
    game.selectedUnitId = null;
    game.reachableHexes.clear();
    game.reachablePaths.clear();
    game.attackableHexes.clear();
    updateDetailPanel();
    updateHoverPanel();
    renderBoard();
  });

  window.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (view.isDragging) {
      const dx = e.clientX - view.dragStartX;
      const dy = e.clientY - view.dragStartY;
      if (Math.hypot(dx, dy) > 4) view.hasMoved = true;
      if (view.hasMoved) {
        view.tx += dx;
        view.ty += dy;
        view.dragStartX = e.clientX;
        view.dragStartY = e.clientY;
        updateMinZoomAndClamp();
        renderBoard();
      }
      return;
    }

    if (sx >= 0 && sx <= rect.width && sy >= 0 && sy <= rect.height) {
      const bp = screenToBoard(sx, sy);
      const hov = boardToHex(bp.x, bp.y);
      if (hov && (!game.hoveredHex || game.hoveredHex.c !== hov.c || game.hoveredHex.r !== hov.r)) {
        game.hoveredHex = hov;
        updateHoverPanel();
        renderBoard();
      } else if (!hov && game.hoveredHex) {
        game.hoveredHex = null;
        updateHoverPanel();
        renderBoard();
      }
    } else if (game.hoveredHex) {
      game.hoveredHex = null;
      updateHoverPanel();
      renderBoard();
    }
  });

  window.addEventListener("mouseup", e => {
    if (!view.isDragging) return;
    view.isDragging = false;
    if (!view.hasMoved) {
      const rect = canvas.getBoundingClientRect();
      handleHexClickAtScreen(e.clientX - rect.left, e.clientY - rect.top);
    }
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    applyZoomAtPoint(factor, mx, my);
  }, { passive: false });
}

function buildRoadAction(roadId) {
  const unit = game.units.find(u => u.id === game.selectedUnitId);
  const rd = game.roads.find(r => r.id === roadId);
  if (game.movementInProgress || !unit || !rd || !areHexesAdjacent(rd.c1, rd.r1, rd.c2, rd.r2) ||
      unit.type !== "it_eng" || game.lp < 2 || unit.mp <= 0) return;

  rd.type = "road";
  staticLayerDirty = true;
  game.lp -= 2;
  unit.mp = 0;
  recalculateSupply();
  computeValidMovesAndAttacks(unit);

  const h1 = game.hexes[rd.c1][rd.r1];
  const h2 = game.hexes[rd.c2][rd.r2];
  addLog(`[工兵築路] ${unit.name} 耗費 2 LP，將【${h1.cityName || h1.label}—${h2.cityName || h2.label}】修築為公路。`, "italy");
  advanceTutorialIfNeeded("built_road");
  updateSidebarUI();
  updateDetailPanel();
  renderBoard();
}

function sabotageRoadAction(roadId) {
  const unit = game.units.find(u => u.id === game.selectedUnitId);
  const rd = game.roads.find(r => r.id === roadId);
  if (game.movementInProgress || !unit || !rd || !areHexesAdjacent(rd.c1, rd.r1, rd.c2, rd.r2) ||
      unit.type !== "et_rec" || game.sabotage < 1 || unit.mp <= 0) return;

  rd.type = "trail";
  staticLayerDirty = true;
  game.sabotage -= 1;
  unit.mp = 0;
  recalculateSupply();
  computeValidMovesAndAttacks(unit);

  const h1 = game.hexes[rd.c1][rd.r1];
  const h2 = game.hexes[rd.c2][rd.r2];
  addLog(`[游擊爆破] ${unit.name} 炸毀【${h1.cityName || h1.label}—${h2.cityName || h2.label}】公路補給線！`, "ethiopia");
  updateSidebarUI();
  updateDetailPanel();
  renderBoard();
}

function toggleGasSupport() {
  if (!hasScenarioFlag("hasGasWarfare") || game.movementInProgress || game.playerFaction !== "italy" || game.airGas <= 0) return;
  game.airGasArmed = !game.airGasArmed;
  updateDetailPanel();
  updateHoverPanel();
}

// =========================================================================
// 實體點數 1D6 擲骰與戰鬥結算
// =========================================================================
function setDieFace(value) {
  const dieImage = document.getElementById("die-face-img");
  const sprite = DIE_SPRITES[value];
  if (!dieImage || !sprite) {
    console.error(`Unable to display die face ${value}: SVG sprite is unavailable.`);
    return;
  }
  dieImage.src = sprite.src;
}

function evaluateCombat(attackerFaction, targetC, targetR, useGasSupport = false, originHex = null) {
  const targetHex = game.hexes[targetC][targetR];
  const defenders = getUnitsInHex(targetC, targetR).filter(u => u.faction !== attackerFaction);
  const adjacentHexes = getHexNeighbors(targetC, targetR);
  const getEligibleAttackers = hex => {
    const road = getRoadBetween(hex.c, hex.r, targetC, targetR);
    return getUnitsInHex(hex.c, hex.r).filter(unit =>
      unit.faction === attackerFaction &&
      unit.mp > 0 &&
      !unit.hasAttacked &&
      canUnitTraverseHexEdge(unit, game.hexes[hex.c][hex.r], targetHex, road)
    );
  };

  const isAdjacentOrigin = hex => originHex &&
    originHex.c === hex.c && originHex.r === hex.r;
  if (!adjacentHexes.some(isAdjacentOrigin)) {
    originHex = adjacentHexes.find(hex => getEligibleAttackers(hex).length > 0) || null;
  }

  const primaryAttackers = originHex ? getEligibleAttackers(originHex) : [];
  const supportingUnitCount = adjacentHexes.reduce((count, hex) => {
    if (isAdjacentOrigin(hex)) return count;
    return count + getUnitsInHex(hex.c, hex.r)
      .filter(unit => unit.faction === attackerFaction).length;
  }, 0);
  const baseAtk = primaryAttackers.reduce((sum, u) => sum + getEffectiveAttack(u), 0);
  const gasSupportBonus = (hasScenarioFlag("hasGasWarfare") && useGasSupport && attackerFaction === "italy" && game.airGas > 0) ? 2 : 0;
  const siegeBonus = primaryAttackers.length > 0 ? Math.min(supportingUnitCount, 3) : 0;
  const atkTotal = baseAtk + gasSupportBonus + siegeBonus;

  const baseDef = defenders.reduce((sum, u) => sum + u.def, 0);
  const terrainDef = hasScenarioFlag("hasGasWarfare") && targetHex.gasTurns > 0
    ? -1
    : TERRAIN_CFG[targetHex.terrain].def;
  const defTotal = Math.max(1, baseDef + terrainDef);

  const ratio = atkTotal / defTotal;
  let colIdx = 0;
  let ratioLabel = "1 : 2";
  if (ratio >= 4.0)      { colIdx = 4; ratioLabel = "4 : 1+"; }
  else if (ratio >= 3.0) { colIdx = 3; ratioLabel = "3 : 1"; }
  else if (ratio >= 2.0) { colIdx = 2; ratioLabel = "2 : 1"; }
  else if (ratio >= 1.0) { colIdx = 1; ratioLabel = "1 : 1"; }

  return {
    primaryAttackers,
    defenders,
    baseAtk,
    gasSupportBonus,
    siegeBonus,
    atkTotal,
    baseDef,
    terrainDef,
    defTotal,
    colIdx,
    ratioLabel
  };
}

function openCombatModal(attackerFaction, targetC, targetR, isAi = false, originHex = null) {
  const initialGasSupport = hasScenarioFlag("hasGasWarfare") && !isAi && attackerFaction === "italy" && game.airGasArmed && game.airGas > 0;
  game.attackerOriginHex = originHex ? { c: originHex.c, r: originHex.r } : null;
  game.pendingCombat = {
    attackerFaction,
    targetC,
    targetR,
    attackerOriginHex: game.attackerOriginHex,
    isAi,
    useGasSupport: initialGasSupport,
    dieResult: null,
    crtCode: null
  };

  const targetHex = game.hexes[targetC][targetR];
  document.getElementById("cmb-loc-badge").textContent = `${targetHex.cityName || "野外戰區"} (${targetHex.label})`;

  const atkTag = document.getElementById("cmb-atk-side-tag");
  const defTag = document.getElementById("cmb-def-side-tag");
  if (attackerFaction === "italy") {
    atkTag.textContent = "🇮🇹 義大利進攻方";
    atkTag.className = "font-typewriter text-sm font-bold px-2.5 py-0.5 bg-[#2d4a34] text-[#f2e8cf] border border-[#1c1814] mb-1.5";
    defTag.textContent = "🇪🇹 衣索比亞防禦方";
    defTag.className = "font-typewriter text-sm font-bold px-2.5 py-0.5 bg-[#8f1d1d] text-[#f2e8cf] border border-[#1c1814] mb-1.5";
  } else {
    atkTag.textContent = "🇪🇹 衣索比亞進攻方";
    atkTag.className = "font-typewriter text-sm font-bold px-2.5 py-0.5 bg-[#8f1d1d] text-[#f2e8cf] border border-[#1c1814] mb-1.5";
    defTag.textContent = "🇮🇹 義大利防禦方";
    defTag.className = "font-typewriter text-sm font-bold px-2.5 py-0.5 bg-[#2d4a34] text-[#f2e8cf] border border-[#1c1814] mb-1.5";
  }

  const chk = document.getElementById("chk-cmb-gas");
  chk.checked = initialGasSupport;
  const gasBox = document.getElementById("cmb-gas-box");
  if (hasScenarioFlag("hasGasWarfare") && !isAi && attackerFaction === "italy" && game.airGas > 0) gasBox.classList.remove("hidden");
  else gasBox.classList.add("hidden");

  document.getElementById("cmb-pre-controls").classList.toggle("hidden", isAi);
  document.getElementById("cmb-roll-stage").classList.toggle("hidden", !isAi);
  document.getElementById("cmb-confirm-bar").classList.add("hidden");

  recalcCombatPreview();
  document.getElementById("combat-modal").classList.remove("hidden");

  if (isAi) {
    if (hasScenarioFlag("hasGasWarfare") && attackerFaction === "italy" && game.airGas > 0) {
      game.pendingCombat.useGasSupport = true;
      recalcCombatPreview();
    }
    startDiceRollSequence();
  }
}

function recalcCombatPreview() {
  if (!game.pendingCombat) return;
  const pc = game.pendingCombat;
  if (!pc.isAi) {
    pc.useGasSupport = hasScenarioFlag("hasGasWarfare") && document.getElementById("chk-cmb-gas").checked && pc.attackerFaction === "italy" && game.airGas > 0;
  }

  const stats = evaluateCombat(pc.attackerFaction, pc.targetC, pc.targetR, pc.useGasSupport, pc.attackerOriginHex);
  if (stats.primaryAttackers.length === 0 || stats.defenders.length === 0) return;

  const leadAtk = stats.primaryAttackers[0];
  const leadDef = stats.defenders[0];
  const aCtx = document.getElementById("cmb-atk-canvas").getContext("2d");
  aCtx.clearRect(0, 0, 60, 60);
  drawWoodblockCounter(aCtx, 28, 28, 46, leadAtk, stats.primaryAttackers.length, false);

  const dCtx = document.getElementById("cmb-def-canvas").getContext("2d");
  dCtx.clearRect(0, 0, 60, 60);
  drawWoodblockCounter(dCtx, 28, 28, 46, leadDef, stats.defenders.length, false);

  document.getElementById("cmb-atk-name").textContent = stats.primaryAttackers.length > 1
    ? `${leadAtk.name} 與同格友軍`
    : leadAtk.name;
  document.getElementById("cmb-def-name").textContent = stats.defenders.length > 1 ? `${leadDef.name} 等${stats.defenders.length}部` : leadDef.name;
  document.getElementById("cmb-atk-val").textContent = stats.atkTotal;
  document.getElementById("cmb-def-val").textContent = stats.defTotal;
  document.getElementById("cmb-ratio-text").textContent = stats.ratioLabel;
  const targetHex = game.hexes[pc.targetC][pc.targetR];
  const attackBreakdown = [
    "進攻方修正明細",
    `部隊基礎攻擊：+${stats.baseAtk}`,
    "地形修正：+0",
    `圍攻加成：+${stats.siegeBonus}`
  ];
  if (hasScenarioFlag("hasGasWarfare")) attackBreakdown.splice(3, 0, `毒氣支援：+${stats.gasSupportBonus}`);
  document.getElementById("cmb-atk-breakdown").textContent = attackBreakdown.join("\n");
  document.getElementById("cmb-def-breakdown").textContent = [
    "防禦方修正明細",
    `部隊基礎防禦：+${stats.baseDef}`,
    `${targetHex.gasTurns > 0 ? "毒氣地形" : `${TERRAIN_CFG[targetHex.terrain].name}防禦修正`}：${stats.terrainDef >= 0 ? "+" : ""}${stats.terrainDef}`
  ].join("\n");

  renderMiniCrtTable(stats.colIdx, null, pc.useGasSupport || targetHex.gasTurns > 0);
}

function renderMiniCrtTable(activeCol, activeDie, gasAffectsTarget = false) {
  for (let c = 0; c < 5; c++) {
    const th = document.getElementById(`crt-h-${c}`);
    th.className = c === activeCol
      ? "p-1.5 border border-[#5a6e60] bg-[#b5892e] text-[#1c1814] font-bold"
      : "p-1.5 border border-[#5a6e60]";
  }

  const tbody = document.getElementById("mini-crt-body");
  tbody.innerHTML = CRT_TABLE.map((row, rIdx) => {
    const dieNum = rIdx + 1;
    const cells = row.map((code, cIdx) => {
      const isHit = (cIdx === activeCol && dieNum === activeDie);
      const isCol = (cIdx === activeCol);
      const displayedCode = hasScenarioFlag("hasGasWarfare") && gasAffectsTarget && code === "DR" ? "DE" : code;
      let cls = "p-1.5 border border-[#594a36] ";
      if (hasScenarioFlag("hasGasWarfare") && gasAffectsTarget && code === "DR") {
        cls += `bg-[#c7e3c0] text-[#1c3b1e] font-bold${isHit ? " outline outline-2 outline-[#b5892e]" : ""}`;
      } else if (isHit) cls += "bg-[#8f1d1d] text-[#f2e8cf] font-bold outline outline-2 outline-[#b5892e]";
      else if (isCol) cls += "bg-[#d4c39f] font-bold";
      return `<td class="${cls}">${CRT_SHORT[displayedCode]}</td>`;
    }).join("");
    return `<tr><td class="p-1.5 border border-[#594a36] font-bold bg-[#c4b087]">${dieNum}</td>${cells}</tr>`;
  }).join("");
}

async function startDiceRollSequence() {
  const pc = game.pendingCombat;
  if (!pc || pc.isRolling) return;
  pc.isRolling = true;
  document.getElementById("combat-modal").classList.add("hidden");
  await animateAttackCharge(pc);
  if (game.pendingCombat !== pc) return;
  document.getElementById("combat-modal").classList.remove("hidden");

  document.getElementById("cmb-pre-controls").classList.add("hidden");
  document.getElementById("cmb-roll-stage").classList.remove("hidden");
  document.getElementById("cmb-confirm-bar").classList.add("hidden");

  const dieEl = document.getElementById("animated-die");
  dieEl.style.transform = "";
  dieEl.classList.add("die-rolling");
  document.getElementById("cmb-roll-status").textContent = "🎲 戰術骰子滾動結算中...";
  document.getElementById("cmb-outcome-headline").textContent = "前線火力交鋒...";
  document.getElementById("cmb-outcome-detail").textContent = "正在比對戰力比與地形防禦修正...";

  const stats = evaluateCombat(pc.attackerFaction, pc.targetC, pc.targetR, pc.useGasSupport, pc.attackerOriginHex);
  const finalDie = game.scenarioId === "tutorial" ? 5 : (Math.floor(Math.random() * 6) + 1);
  const targetHex = game.hexes[pc.targetC][pc.targetR];
  const rolledCode = CRT_TABLE[finalDie - 1][stats.colIdx];
  const gasAffectsTarget = hasScenarioFlag("hasGasWarfare") && (pc.useGasSupport || targetHex.gasTurns > 0);
  const crtCode = gasAffectsTarget && rolledCode === "DR" ? "DE" : rolledCode;
  pc.dieResult = finalDie;
  pc.crtCode = crtCode;

  const dieImage = document.getElementById("die-face-img");
  let fastRolls = 0;
  const finishRoll = () => {
    setDieFace(finalDie);
    dieEl.classList.remove("die-rolling");
    dieEl.style.transform =
      `rotateX(${Math.round(Math.random() * 6 - 3)}deg) ` +
      `rotateY(${Math.round(Math.random() * 6 - 3)}deg) ` +
      `rotateZ(${Math.round(Math.random() * 8 - 4)}deg)`;
    renderMiniCrtTable(stats.colIdx, finalDie, gasAffectsTarget);

    document.getElementById("cmb-roll-status").textContent = `擲骰結果：${finalDie} 點（欄位 ${stats.ratioLabel}）`;
    document.getElementById("cmb-outcome-headline").textContent = `【${CRT_FULL[crtCode]}】`;
    document.getElementById("cmb-outcome-detail").textContent = describeCrtOutcome(crtCode, pc.useGasSupport);

    if (pc.isAi) {
      setTimeout(() => confirmCombatResolution(), 1500);
    } else {
      document.getElementById("cmb-confirm-bar").classList.remove("hidden");
    }
  };
  const rollSlowly = step => {
    setDieFace(Math.floor(Math.random() * 6) + 1);
    if (step === 0) setTimeout(() => rollSlowly(1), 170);
    else setTimeout(finishRoll, 250);
  };
  const rollFast = () => {
    setDieFace(Math.floor(Math.random() * 6) + 1);
    fastRolls++;
    if (fastRolls < 7) setTimeout(rollFast, 55);
    else setTimeout(() => rollSlowly(0), 110);
  };
  if (!dieImage) {
    console.error("Unable to start dice animation: #die-face-img is missing.");
    finishRoll();
    return;
  }
  setTimeout(rollFast, 55);
}

function describeCrtOutcome(code, usedGas) {
  if (code === "AE") return "攻方突擊遭到猛烈交叉火力阻擊，先鋒部隊潰滅！";
  if (code === "AR") return "攻方未能突破防線，部隊被迫退回原陣地整補。";
  if (code === "EX") return "雙方展開慘烈白刃與砲火交換，各損失一個主力單位！";
  if (code === "DR") return usedGas ? "毒氣封鎖退路！守軍在撤退途中承受雙倍傷亡全滅！" : "守軍防線被突破，被迫向後方撤退並讓出陣地。";
  return "守軍陣線徹底崩潰，全軍遭包圍殲滅，攻方成功奪取要地！";
}

function confirmCombatResolution() {
  const pc = game.pendingCombat;
  if (!pc) return;
  const { attackerFaction, targetC, targetR, useGasSupport, dieResult, crtCode, isAi, attackerOriginHex } = pc;
  closeCombatModal();

  const stats = evaluateCombat(attackerFaction, targetC, targetR, useGasSupport, attackerOriginHex);
  const targetHex = game.hexes[targetC][targetR];
  const defenderFaction = attackerFaction === "italy" ? "ethiopia" : "italy";
  const locName = targetHex.cityName || targetHex.label;

  const usedGasSupport = hasScenarioFlag("hasGasWarfare") && useGasSupport && attackerFaction === "italy" && game.airGas > 0;
  if (usedGasSupport) {
    game.airGas -= 1;
    game.airGasArmed = false;
    targetHex.gasTurns = 2;
    addLog(`[毒氣電報] 義軍對【${locName}】施放芥子毒氣，覆蓋持續 2 回合。`, "italy");
  }

  stats.primaryAttackers.forEach(u => { u.mp = 0; u.hasAttacked = true; });
  addLog(`[會戰電報] 【${locName}】戰力比 ${stats.ratioLabel}，骰點 ${dieResult} ➔ 【${CRT_FULL[crtCode]}】`, attackerFaction);

  if (crtCode === "AE" && stats.primaryAttackers[0]) {
    const lead = stats.primaryAttackers[0];
    game.units = game.units.filter(u => u.id !== lead.id);
    addLog(`[戰損電報] 攻方先鋒 ${lead.name} 遭重創殲滅。`, defenderFaction);
  } else if (crtCode === "EX" && stats.primaryAttackers[0] && stats.defenders[0]) {
    const la = stats.primaryAttackers[0], ld = stats.defenders[0];
    game.units = game.units.filter(u => u.id !== la.id && u.id !== ld.id);
    addLog(`[戰損電報] 雙方血戰交換，${la.name} 與 ${ld.name} 同歸於盡。`, "event");
  } else if (crtCode === "DR" || crtCode === "DE") {
    const forceElim = (crtCode === "DE") || (targetHex.gasTurns > 0);
    stats.defenders.forEach(defU => {
      if (forceElim) {
        game.units = game.units.filter(u => u.id !== defU.id);
        addLog(`[戰損電報] ${defU.name} ${targetHex.gasTurns > 0 ? "在毒氣覆蓋下" : ""}全軍覆沒。`, attackerFaction);
      } else {
        const retreatHex = getHexNeighbors(targetC, targetR).find(nb => {
          const nh = game.hexes[nb.c][nb.r];
          return isPassablePlayableHex(nh) && nh.owner === defenderFaction && getUnitsInHex(nb.c, nb.r).length < 2 && !isHexInEnemyZOC(nb.c, nb.r, defenderFaction);
        }) || getHexNeighbors(targetC, targetR).find(nb => {
          const nh = game.hexes[nb.c][nb.r];
          return isPassablePlayableHex(nh) && nh.owner === defenderFaction && getUnitsInHex(nb.c, nb.r).length < 2;
        });

        if (retreatHex) {
          defU.c = retreatHex.c;
          defU.r = retreatHex.r;
          addLog(`[撤退電報] ${defU.name} 退往【${game.hexes[retreatHex.c][retreatHex.r].cityName || game.hexes[retreatHex.c][retreatHex.r].label}】。`, defenderFaction);
        } else {
          game.units = game.units.filter(u => u.id !== defU.id);
          addLog(`[戰損電報] ${defU.name} 退路遭截斷，被迫殲滅。`, attackerFaction);
        }
      }
    });
  }

  if (getUnitsInHex(targetC, targetR).filter(u => u.faction === defenderFaction).length === 0) {
    targetHex.owner = attackerFaction;
    territoryLayerDirty = true;
    const survivingAtk = stats.primaryAttackers.find(u => game.units.some(x => x.id === u.id));
    if (survivingAtk) {
      survivingAtk.c = targetC;
      survivingAtk.r = targetR;
      if (!isAi) {
        game.selectedUnitId = survivingAtk.id;
        game.selectedHex = { c: targetC, r: targetR };
      }
    }
    addLog(`[佔領捷報] ${attackerFaction === "italy" ? "義大利軍" : "衣索比亞軍"} 攻克【${locName}】！`, attackerFaction);
    recalculateSupply();
  }

  advanceTutorialIfNeeded("combat_done", {
    targetC,
    targetR,
    attackerIds: stats.primaryAttackers.map(unit => unit.id)
  });
  const sel = game.units.find(u => u.id === game.selectedUnitId);
  computeValidMovesAndAttacks(sel);
  const escalationEnded = usedGasSupport && increaseWarEscalation(
    1,
    `${getEscalationSideLabel("italy")}在【${locName}】使用芥子毒氣支援`
  );
  updateSidebarUI();
  updateDetailPanel();
  updateHoverPanel();
  renderBoard();

  if (!escalationEnded && !checkVictoryConditions() && isAi && !openNextAiAttack(attackerFaction)) finishAiTurn(attackerFaction);
}

function closeCombatModal() {
  game.pendingCombat = null;
  game.attackerOriginHex = null;
  document.getElementById("combat-modal").classList.add("hidden");
}

// =========================================================================
// 回合推進、AI 行動與勝負判定
// =========================================================================
function increaseWarEscalation(delta, reason) {
  if (!hasScenarioFlag("hasWarEscalation") || !Number.isFinite(delta) || delta <= 0) return false;

  let campaignEnded = false;
  for (let step = 0; step < Math.floor(delta) && game.warEscalation < 10; step++) {
    game.warEscalation += 1;
    const level = game.warEscalation;
    const trigger = reason ? `觸發原因：${reason}。` : "";
    addLog(`[國際電報] 戰爭態勢升至 Lv.${level} / 10。${getWarEscalationEffectSummary(level)} ${trigger}`, "event");
    recalculateSupply();

    if (level === 10) {
      showGameOver(
        "ethiopia",
        "全面國際干預！衣索比亞帝國贏得戰略勝利！",
        "戰爭態勢升至 Lv.10，全面國際干預已使義大利遠征戰役終止，衣索比亞帝國取得戰略勝利。"
      );
      campaignEnded = true;
      break;
    }
  }

  updateSidebarUI();
  updateDetailPanel();
  updateHoverPanel();
  return campaignEnded;
}

function advanceCampaignTurn() {
  game.turn += 1;
  if (hasScenarioFlag("hasWarEscalation") && [4, 7, 10, 13].includes(game.turn)) {
    return increaseWarEscalation(1, `進入第 ${game.turn} 回合`);
  }
  return false;
}

function startFactionTurn(faction) {
  game.activeFaction = faction;
  game.airGasArmed = false;
  recalculateSupply();

  if (faction === "italy") {
    const escalation = hasScenarioFlag("hasWarEscalation") ? game.warEscalation : 1;
    const lpGain = escalation >= 8 ? 1 : escalation >= 4 ? 2 : 3;
    game.lp = Math.min(10, game.lp + lpGain);
    if (hasScenarioFlag("hasGasWarfare") && escalation < 8) game.airGas = Math.min(3, game.airGas + 1);
  } else {
    const escalationBonus = hasScenarioFlag("hasWarEscalation") &&
      game.warEscalation >= 6 && game.warEscalation <= 7 && game.turn % 2 === 0 ? 1 : 0;
    game.sabotage = Math.min(3, game.sabotage + 1 + escalationBonus);
  }

  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      const h = game.hexes[c][r];
      if (h.gasTurns > 0 && h.owner === faction) h.gasTurns--;
    }
  }

  game.units.forEach(u => {
    if (u.faction === faction) {
      u.mp = u.maxMp;
      u.hasAttacked = false;
    }
  });

  updateSidebarUI();
  updateDetailPanel();
  renderBoard();
}

function endPlayerTurn() {
  if (game.gameOver || game.activeFaction !== game.playerFaction || game.pendingCombat || game.movementInProgress) return;
  game.selectedHex = null;
  game.selectedUnitId = null;
  game.reachableHexes.clear();
  game.reachablePaths.clear();
  game.attackableHexes.clear();
  updateDetailPanel();
  updateHoverPanel();

  if (game.playerFaction === "italy") {
    addLog("[指揮電報] 義大利王國結束本回合調動，衣索比亞帝國軍開始反擊...", "info");
    setTimeout(() => runAiTurn("ethiopia"), 350);
  } else {
    if (checkVictoryConditions()) return;
    const campaignEnded = advanceCampaignTurn();
    addLog(`[指揮電報] 進入第 ${game.turn} 回合，義大利遠征軍正在推進...`, "info");
    if (campaignEnded) return;
    setTimeout(() => runAiTurn("italy"), 350);
  }
}

function hexGridDistance(c1, r1, c2, r2) {
  const z1 = r1 - Math.floor(c1 / 2);
  const z2 = r2 - Math.floor(c2 / 2);
  const y1 = -c1 - z1;
  const y2 = -c2 - z2;
  return Math.max(Math.abs(c1 - c2), Math.abs(y1 - y2), Math.abs(z1 - z2));
}

function shouldAiUseGas(aiFaction, c, r, baseStats) {
  if (!hasScenarioFlag("hasGasWarfare") || aiFaction !== "italy" || game.airGas <= 0) return false;
  if (!baseStats || baseStats.primaryAttackers.length === 0) return false;
  const hex = game.hexes[c][r];
  if (hex.gasTurns > 0) return false;
  const isRatioStrong = baseStats.atkTotal >= baseStats.defTotal * 2;
  const isFortifiedStrongpoint = (hex.terrain === "city" || hex.terrain === "mountain") &&
    (baseStats.defTotal >= 6 || getUnitsInHex(c, r).length >= 2);
  return isRatioStrong || isFortifiedStrongpoint;
}

function openNextAiAttack(aiFaction) {
  let bestAttack = null;
  let bestScore = -Infinity;
  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      if (!getUnitsInHex(c, r).some(u => u.faction !== aiFaction)) continue;
      const baseStats = evaluateCombat(aiFaction, c, r, false);
      if (baseStats.primaryAttackers.length === 0) continue;
      // 理性交戰評估：低於 1:1 絕不貿然單獨進攻
      if (baseStats.atkTotal < baseStats.defTotal) continue;

      const useGas = shouldAiUseGas(aiFaction, c, r, baseStats);
      const stats = useGas ? evaluateCombat(aiFaction, c, r, true) : baseStats;
      const ratio = stats.atkTotal / Math.max(1, stats.defTotal);
      const score = ratio + stats.siegeBonus * 0.25 + (game.hexes[c][r].isCapital ? 0.5 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestAttack = { c, r, useGas };
      }
    }
  }
  if (!bestAttack) return false;
  const attackStats = evaluateCombat(aiFaction, bestAttack.c, bestAttack.r, bestAttack.useGas);
  const primaryAttacker = attackStats.primaryAttackers[0];
  if (!primaryAttacker) return false;
  game.attackerOriginHex = { c: primaryAttacker.c, r: primaryAttacker.r };
  smoothPanToHex(primaryAttacker.c, primaryAttacker.r);
  openCombatModal(aiFaction, bestAttack.c, bestAttack.r, true, game.attackerOriginHex);
  return true;
}

function getAiAxisTarget(axis, aiFaction, fallbackGoal) {
  if (!Array.isArray(axis) || !axis.length) return fallbackGoal;
  for (const wp of axis) {
    const h = game.hexes[wp.c]?.[wp.r];
    if (h && h.owner !== aiFaction) return wp;
  }
  return axis[axis.length - 1];
}

function getAiUnitObjective(unit, aiFaction, strategy, fallbackGoal) {
  if (aiFaction === "italy" && strategy?.italy) {
    const startR = unit.initialR ?? unit.r;
    const axis = startR >= (strategy.italy.southStartMinRow ?? 13)
      ? strategy.italy.southAxis
      : strategy.italy.northAxis;
    return getAiAxisTarget(axis, aiFaction, fallbackGoal);
  }
  return fallbackGoal;
}

function hexHasRoadOrCity(c, r) {
  const h = game.hexes[c]?.[r];
  if (h && h.terrain === "city") return true;
  return game.roads.some(rd =>
    (rd.type === "road" || rd.type === "rail") &&
    ((rd.c1 === c && rd.r1 === r) || (rd.c2 === c && rd.r2 === r))
  );
}

function getAdjacentEnemies(c, r, faction) {
  return getHexNeighbors(c, r).filter(nb =>
    getUnitsInHex(nb.c, nb.r).some(u => u.faction !== faction)
  );
}

function tryAiEngineerBuildRoad(unit, target) {
  if (unit.type !== "it_eng" || game.lp < 2) return false;
  const trails = game.roads.filter(rd =>
    rd.type === "trail" &&
    areHexesAdjacent(rd.c1, rd.r1, rd.c2, rd.r2) &&
    ((rd.c1 === unit.c && rd.r1 === unit.r) || (rd.c2 === unit.c && rd.r2 === unit.r))
  );
  if (!trails.length) return false;
  trails.sort((a, b) => {
    const aOther = a.c1 === unit.c && a.r1 === unit.r ? { c: a.c2, r: a.r2 } : { c: a.c1, r: a.r1 };
    const bOther = b.c1 === unit.c && b.r1 === unit.r ? { c: b.c2, r: b.r2 } : { c: b.c1, r: b.r1 };
    return hexGridDistance(aOther.c, aOther.r, target.c, target.r) -
      hexGridDistance(bOther.c, bOther.r, target.c, target.r);
  });
  game.selectedUnitId = unit.id;
  buildRoadAction(trails[0].id);
  return true;
}

function tryAiGuerrillaSabotage(unit) {
  if (unit.type !== "et_rec" || game.sabotage < 1) return false;
  const adjacentRoad = game.roads.find(rd => {
    if (rd.type !== "road" || !areHexesAdjacent(rd.c1, rd.r1, rd.c2, rd.r2)) return false;
    const unitAtFirst = rd.c1 === unit.c && rd.r1 === unit.r;
    const unitAtSecond = rd.c2 === unit.c && rd.r2 === unit.r;
    if (!unitAtFirst && !unitAtSecond) return false;
    const other = unitAtFirst ? game.hexes[rd.c2][rd.r2] : game.hexes[rd.c1][rd.r1];
    return other.owner === "italy";
  });
  if (!adjacentRoad) return false;
  game.selectedUnitId = unit.id;
  sabotageRoadAction(adjacentRoad.id);
  return true;
}

async function runAiTurn(aiFaction) {
  if (game.gameOver) return;
  const actionVersion = game.actionVersion;
  startFactionTurn(aiFaction);

  const scen = getActiveScenarioPack();
  const fallbackGoal = scen.targetCoord;
  const strategy = scen.aiStrategy || null;
  const aiUnits = game.units.filter(u => u.faction === aiFaction);

  // 戰前工程築路與游擊爆破準備
  for (const unit of aiUnits) {
    if (unit.mp <= 0) continue;
    smoothPanToHex(unit.c, unit.r);
    const unitGoal = getAiUnitObjective(unit, aiFaction, strategy, fallbackGoal);
    if (aiFaction === "italy") tryAiEngineerBuildRoad(unit, unitGoal);
    else tryAiGuerrillaSabotage(unit);
  }

  const enemyUnits = game.units.filter(u => u.faction !== aiFaction);
  const unsuppliedEnemies = enemyUnits.filter(e => !isUnitSupplied(e));
  const ethStrat = strategy?.ethiopia || null;
  const counterAttackActive = aiFaction === "ethiopia" && (
    unsuppliedEnemies.length > 0 ||
    (ethStrat?.counterAttackEscalationLevel && game.warEscalation >= ethStrat.counterAttackEscalationLevel)
  );

  const nearestSupplyDistance = (c, r, faction) => {
    let best = Infinity;
    for (let sc = 0; sc < MAP_CFG.cols; sc++) {
      for (let sr = 0; sr < MAP_CFG.rows; sr++) {
        const h = game.hexes[sc][sr];
        const ok = faction === "italy" ? h.suppliedItaly : h.suppliedEthiopia;
        if (!ok) continue;
        best = Math.min(best, hexGridDistance(c, r, sc, sr));
      }
    }
    return best;
  };

  const scorePosition = (unit, c, r) => {
    const hex = game.hexes[c][r];
    const unitGoal = getAiUnitObjective(unit, aiFaction, strategy, fallbackGoal);
    const supplied = isUnitSupplied(unit);
    const adjEnemies = getAdjacentEnemies(c, r, aiFaction);
    const friendlyNeighbors = getHexNeighbors(c, r).filter(nb =>
      getUnitsInHex(nb.c, nb.r).some(u => u.faction === aiFaction && u.id !== unit.id)
    ).length;

    // 斷補的標準步兵／民兵優先朝己方補給網靠攏整補
    if (!supplied && ["it_inf", "it_ccnn", "et_lvy"].includes(unit.type)) {
      const supFlag = aiFaction === "italy" ? hex.suppliedItaly : hex.suppliedEthiopia;
      return (supFlag ? 12 : -nearestSupplyDistance(c, r, aiFaction) * 4) +
        TERRAIN_CFG[hex.terrain].def * 0.5;
    }

    if (aiFaction === "italy") {
      let score = -hexGridDistance(c, r, unitGoal.c, unitGoal.r) * 3.2 +
        (hex.owner !== aiFaction ? 0.5 : 0) +
        TERRAIN_CFG[hex.terrain].def * 0.2;

      if (unit.type === "it_mot") {
        score += hexHasRoadOrCity(c, r) ? 2.4 : -2.2;
      } else if (unit.type === "it_eng") {
        const nearTrail = game.roads.some(rd =>
          rd.type === "trail" && ((rd.c1 === c && rd.r1 === r) || (rd.c2 === c && rd.r2 === r))
        );
        score += (nearTrail ? 1.8 : 0) - adjEnemies.length * 1.2;
      } else if (unit.type === "it_alp" || unit.type === "it_col") {
        if (adjEnemies.length > 0) score += friendlyNeighbors * 0.9;
      }

      // 避免停在 1:1 以下劣勢孤立接敵格，優先集結友軍製造圍攻加成
      if (adjEnemies.length > 0) {
        let hasFavorableTarget = false;
        for (const nb of adjEnemies) {
          const simStats = evaluateCombat(aiFaction, nb.c, nb.r, false);
          if (simStats.atkTotal >= simStats.defTotal) {
            hasFavorableTarget = true;
            break;
          }
        }
        if (!hasFavorableTarget && friendlyNeighbors === 0) score -= 3.0;
      }
      return score;
    }

    // 衣索比亞帝國軍戰術評估
    if (ethStrat?.guardTypes?.includes(unit.type)) {
      const anchors = ethStrat.guardAnchors || [fallbackGoal];
      const maxR = ethStrat.guardMaxRadius ?? 2;
      const minAnchorDist = Math.min(...anchors.map(a => hexGridDistance(c, r, a.c, a.r)));
      if (minAnchorDist > maxR) return -100 - minAnchorDist * 5;
      return TERRAIN_CFG[hex.terrain].def * 2.0 +
        (hex.cityName ? 3.0 : 0) -
        minAnchorDist * 0.8 +
        (adjEnemies.length > 0 ? 1.2 : 0);
    }

    if (unit.type === "et_rec") {
      const nearItalianRoad = game.roads.some(rd => {
        if (rd.type !== "road") return false;
        const at1 = rd.c1 === c && rd.r1 === r;
        const at2 = rd.c2 === c && rd.r2 === r;
        if (!at1 && !at2) return false;
        const other = at1 ? game.hexes[rd.c2][rd.r2] : game.hexes[rd.c1][rd.r1];
        return other.owner === "italy";
      });
      const nearestItalianRoadDist = game.roads.reduce((best, rd) => {
        if (rd.type !== "road") return best;
        const h1 = game.hexes[rd.c1][rd.r1];
        const h2 = game.hexes[rd.c2][rd.r2];
        if (h1.owner !== "italy" && h2.owner !== "italy") return best;
        return Math.min(best, hexGridDistance(c, r, rd.c1, rd.r1), hexGridDistance(c, r, rd.c2, rd.r2));
      }, Infinity);
      return (nearItalianRoad ? 8.0 : -nearestItalianRoadDist * 2.2) -
        adjEnemies.length * 0.6 +
        TERRAIN_CFG[hex.terrain].def * 0.6;
    }

    // 一般衣軍／地方大軍：依託山地高原城鎮消耗，敵軍斷補或態勢高漲時發動局部反攻
    const targetPool = counterAttackActive && unsuppliedEnemies.length > 0 ? unsuppliedEnemies : enemyUnits;
    const distToEnemy = targetPool.reduce(
      (best, e) => Math.min(best, hexGridDistance(c, r, e.c, e.r)),
      Infinity
    );
    const enemyWeight = counterAttackActive ? 2.8 : 1.4;
    return -distToEnemy * enemyWeight -
      hexGridDistance(c, r, fallbackGoal.c, fallbackGoal.r) * 0.35 +
      TERRAIN_CFG[hex.terrain].def * 1.6 +
      (hex.cityName ? 1.5 : 0) +
      (hex.owner === aiFaction ? 0.3 : -0.3) +
      (counterAttackActive ? friendlyNeighbors * 0.8 : 0);
  };

  for (const unit of aiUnits) {
    if (unit.mp <= 0) continue;
    const currentScore = scorePosition(unit, unit.c, unit.r);
    let bestScore = currentScore;
    let bestMove = null;
    const paths = new Map();

    getUnitReachableHexes(unit, paths).forEach((remainingMp, key) => {
      const [c, r] = key.split(",").map(Number);
      if (c === unit.c && r === unit.r) return;
      const score = scorePosition(unit, c, r) + (unit.mp - remainingMp) * 0.01;
      if (score > bestScore) {
        bestScore = score;
        bestMove = { c, r, remainingMp, path: paths.get(key) };
      }
    });

    if (!bestMove) continue;
    game.selectedUnitId = unit.id;
    game.selectedHex = { c: unit.c, r: unit.r };
    smoothPanToHex(unit.c, unit.r);
    await animateUnitAlongPath(unit, bestMove.path);
    if (game.gameOver || actionVersion !== game.actionVersion) return;

    // 移動後若工兵抵達小徑旁或游擊隊滲透至義軍公路旁，立即執行該回合職能
    const unitGoal = getAiUnitObjective(unit, aiFaction, strategy, fallbackGoal);
    if (aiFaction === "italy") tryAiEngineerBuildRoad(unit, unitGoal);
    else tryAiGuerrillaSabotage(unit);
  }

  game.selectedHex = null;
  game.selectedUnitId = null;
  game.reachableHexes.clear();
  game.reachablePaths.clear();
  game.attackableHexes.clear();
  updateDetailPanel();
  updateHoverPanel();
  renderBoard();

  if (checkVictoryConditions()) return;
  if (!openNextAiAttack(aiFaction)) finishAiTurn(aiFaction);
}

function finishAiTurn(aiFaction) {
  if (game.gameOver) return;
  if (checkVictoryConditions()) return;
  if (game.playerFaction === "italy") {
    if (advanceCampaignTurn()) return;
    startFactionTurn("italy");
    addLog(`[作戰電報] 第 ${game.turn} 回合開始，請下達義大利軍團指令。`, "info");
  } else {
    startFactionTurn("ethiopia");
    addLog(`[作戰電報] 輪到衣索比亞帝國軍行動（第 ${game.turn} 回合）。`, "info");
  }
}

function checkVictoryConditions() {
  if (game.gameOver) return true;
  const scen = getActiveScenarioPack();
  const targetHex = game.hexes[scen.targetCoord.c][scen.targetCoord.r];

  if (targetHex.owner === "italy") {
    showGameOver("italy", `義大利王國攻克【${scen.targetCityName}】！`,
      game.scenarioId === "tutorial"
        ? "您已成功運用沿路機動、工兵築路與總攻擲骰攻克阿杜瓦，圓滿完成全部兵棋實戰教學！"
        : `義軍成功奪取戰略目標【${scen.targetCityName}】，贏得本次戰役的決定性勝利！`);
    return true;
  }

  if (game.turn >= game.maxTurns) {
    showGameOver("ethiopia", "時間耗盡！衣索比亞帝國贏得戰略勝利！", "在險峻的高原地形與頑強抵抗下，義軍未能在期限內達成戰略目標，衣索比亞成功捍衛國土！");
    return true;
  }
  return false;
}

function showGameOver(winner, title, desc) {
  game.gameOver = true;
  const win = winner === game.playerFaction;
  const badge = document.getElementById("go-badge");
  badge.textContent = win ? "★ 指揮官勝利 ★" : "✖ 戰役失利 ✖";
  badge.className = `inline-block px-4 py-1 font-typewriter text-sm font-bold border border-[#1c1814] mb-3 ${win ? "bg-[#2d3b32] text-[#e8c670]" : "bg-[#8f1d1d] text-[#f2e8cf]"}`;
  document.getElementById("go-title").textContent = title;
  document.getElementById("go-desc").textContent = desc;
  openModal("modal-gameover");
  renderBoard();
}

// =========================================================================
// 寫實曲折海岸線、地形紋理、紅色蠟筆教學標識與厚木塊算子繪製
// =========================================================================
function createPaperGrainPattern() {
  const pCanvas = document.createElement("canvas");
  pCanvas.width = 140;
  pCanvas.height = 140;
  const pCtx = pCanvas.getContext("2d");
  for (let i = 0; i < 450; i++) {
    const x = Math.random() * 140;
    const y = Math.random() * 140;
    pCtx.fillStyle = Math.random() > 0.5 ? "rgba(44, 34, 22, 0.05)" : "rgba(255, 248, 232, 0.055)";
    pCtx.fillRect(x, y, 1.5, 1.5);
  }
  paperPattern = pCtx.createPattern(pCanvas, "repeat");
  staticLayerDirty = true;
}

function resizeCanvas() {
  const frame = document.getElementById("map-viewport-frame");
  const canvas = document.getElementById("wargame-canvas");
  const dpr = window.devicePixelRatio || 1;
  const rect = frame.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  resetView();
}

function drawHexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawWoodblockCounter(ctx, cx, cy, size, unit, stackCount = 1, isSelected = false) {
  const half = size / 2;
  const x = cx - half;
  const y = cy - half;
  const thick = 3.5;
  const counterSprite = COUNTER_SPRITES[unit.faction];
  const unitTemplate = UNIT_TYPES[unit.type];
  const natoSprite = NATO_SPRITES[unit.nato] ||
    (unitTemplate && NATO_SPRITES[unitTemplate.nato]);

  ctx.save();
  if (stackCount > 1) {
    ctx.fillStyle = "#c4b087";
    ctx.strokeStyle = "#1c1814";
    ctx.lineWidth = 1.2;
    ctx.fillRect(x + 4, y - 4, size, size);
    ctx.strokeRect(x + 4, y - 4, size, size);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x + thick + 2, y + thick + 2, size, size);

  if (counterSprite) {
    ctx.drawImage(counterSprite, x, y, size, size);
  } else {
    ctx.fillStyle = "#8c7454";
    ctx.beginPath();
    ctx.moveTo(x + size, y);
    ctx.lineTo(x + size + thick, y + thick);
    ctx.lineTo(x + size + thick, y + size + thick);
    ctx.lineTo(x + thick, y + size + thick);
    ctx.lineTo(x, y + size);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1c1814";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = unit.bg || "#57534e";
    ctx.fillRect(x, y, size, size);
  }

  ctx.lineWidth = isSelected ? 2.8 : 1.6;
  ctx.strokeStyle = isSelected ? "#e8c670" : "#1c1814";
  ctx.strokeRect(x, y, size, size);

  const scale = size / 72;
  const natoX = x + 13 * scale;
  const natoY = y + 17 * scale;
  const natoW = 42 * scale;
  const natoH = 27 * scale;
  if (!counterSprite) {
    ctx.fillStyle = "#f7efe0";
    ctx.fillRect(natoX, natoY, natoW, natoH);
    ctx.strokeStyle = "#1c1814";
    ctx.lineWidth = 1.1;
    ctx.strokeRect(natoX, natoY, natoW, natoH);
  }
  if (natoSprite) ctx.drawImage(natoSprite, natoX, natoY, natoW, natoH);

  ctx.fillStyle = "#f2e8cf";
  ctx.font = `bold ${Math.max(6, Math.floor(size * 0.18))}px "Courier Prime", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(unit.echelon, cx, y + 11 * scale);

  const effAtk = getEffectiveAttack(unit);
  ctx.fillStyle = effAtk < unit.atk ? "#fca5a5" : "#f7efe0";
  ctx.font = `bold ${Math.max(6, Math.floor(size * 0.18))}px "Courier Prime", monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`${effAtk}-${unit.def}-${unit.mp}`, cx, y + 60 * scale);

  const supplied = isUnitSupplied(unit);
  ctx.beginPath();
  const lampSize = 8 * scale;
  ctx.rect(x + 58 * scale, y + 5 * scale, lampSize, lampSize);
  ctx.fillStyle = supplied ? "#65a30d" : "#eab308";
  ctx.fill();
  ctx.strokeStyle = "#1c1814";
  ctx.lineWidth = Math.max(0.6, scale);
  ctx.stroke();

  if (unit.mp <= 0 && unit.faction === game.activeFaction) {
    ctx.fillStyle = "rgba(15, 12, 8, 0.35)";
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
}

// 教學關卡四步驟專屬紅色蠟筆手繪標識
function drawRedWaxCircle(ctx, cx, cy, radius) {
  ctx.save();
  ctx.strokeStyle = "rgba(176, 22, 22, 0.58)";
  ctx.lineCap = "round";
  for (let loop = 0; loop < 3; loop++) {
    ctx.lineWidth = loop === 0 ? 3.0 : 1.8;
    ctx.beginPath();
    const steps = 32;
    for (let i = 0; i <= steps + 3; i++) {
      const ang = (i / steps) * Math.PI * 2 + loop * 0.45;
      const wobble = Math.sin(i * 2.4 + loop * 1.8) * 2.5 + Math.cos(i * 3.1) * 1.4;
      const r = radius + wobble + (loop - 1) * 1.6;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * (r * 0.93);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawRedWaxArrow(ctx, x1, y1, x2, y2, dashed = false) {
  ctx.save();
  ctx.strokeStyle = "rgba(176, 22, 22, 0.58)";
  ctx.fillStyle = "rgba(176, 22, 22, 0.58)";
  ctx.lineCap = "round";
  ctx.lineWidth = 3.0;
  if (dashed) ctx.setLineDash([7, 5]);

  const mx = (x1 + x2) / 2 + 5;
  const my = (y1 + y2) / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx, my, x2, y2);
  ctx.stroke();

  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x1 + 1.5, y1);
  ctx.quadraticCurveTo(mx + 2, my, x2 + 1.5, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  const ang = Math.atan2(y2 - my, x2 - mx);
  const headLen = 14;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(ang - 0.45), y2 - headLen * Math.sin(ang - 0.45));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(ang + 0.45), y2 - headLen * Math.sin(ang + 0.45));
  ctx.lineWidth = 3.0;
  ctx.stroke();
  ctx.restore();
}

function drawRedWaxCrayonTutorialOverlay(ctx, stepObj) {
  if (!stepObj) return;
  const r = MAP_CFG.hexR;
  const stepNum = stepObj.step;

  if (stepNum === 1) {
    const inf = game.units.find(u => u.id === "tut_inf");
    const isInfSelected = game.selectedUnitId === "tut_inf";
    if (!isInfSelected) {
      const origin = inf ? { c: inf.c, r: inf.r } : stepObj.unitHex;
      const p1 = hexToBoard(origin.c, origin.r);
      drawRedWaxCircle(ctx, p1.x, p1.y, r * 0.85);
    } else {
      const p2 = hexToBoard(stepObj.targetHex.c, stepObj.targetHex.r);
      drawRedWaxCircle(ctx, p2.x, p2.y, r * 0.85);
    }
    return;
  }

  if (stepNum === 2) {
    if (game.selectedUnitId !== "tut_eng") {
      const eng = game.units.find(u => u.id === "tut_eng");
      const origin = eng ? { c: eng.c, r: eng.r } : stepObj.unitHex;
      const p1 = hexToBoard(origin.c, origin.r);
      drawRedWaxCircle(ctx, p1.x, p1.y, r * 0.85);
    }
    return;
  }

  if (stepNum === 3) {
    const target = stepObj.targetHex;
    const isAdjacentItalian = u =>
      u.faction === "italy" && !u.attacked && areHexesAdjacent(u.c, u.r, target.c, target.r);
    const selectedUnit = game.units.find(u => u.id === game.selectedUnitId);
    if (selectedUnit && isAdjacentItalian(selectedUnit)) {
      const p2 = hexToBoard(target.c, target.r);
      drawRedWaxCircle(ctx, p2.x, p2.y, r * 0.88);
    } else {
      const attacker = game.units.find(isAdjacentItalian) || game.units.find(u => u.faction === "italy");
      const origin = attacker ? { c: attacker.c, r: attacker.r } : stepObj.unitHex;
      const p1 = hexToBoard(origin.c, origin.r);
      drawRedWaxCircle(ctx, p1.x, p1.y, r * 0.85);
    }
  }
}

function drawSmoothClosedPolygon(ctx, points) {
  if (!Array.isArray(points) || points.length < 3) return;

  const count = points.length;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < count; i++) {
    const p0 = points[(i - 1 + count) % count];
    const p1 = points[i];
    const p2 = points[(i + 1) % count];
    const p3 = points[(i + 2) % count];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1]
    );
  }
  ctx.closePath();
}

const TERRITORY_EVEN_DIRS = [[0, -1], [1, -1], [1, 0], [0, 1], [-1, 0], [-1, -1]];
const TERRITORY_ODD_DIRS = [[0, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
const TERRITORY_EDGE_VERTS = [[4, 5], [5, 0], [0, 1], [1, 2], [2, 3], [3, 4]];

function getTerritoryBorderKey(hex) {
  if (!hex || hex.terrain === "sea" || hex.country === "SEA") return "SEA";
  if (hex.owner === "italy") return "OWNER_ITALY";
  if (hex.owner === "ethiopia") return "OWNER_ETHIOPIA";
  return `COUNTRY_${hex.country}`;
}

function getTerritoryBorderColor(hex, key = getTerritoryBorderKey(hex)) {
  if (key === "OWNER_ITALY") return "#2d4a34";
  if (key === "OWNER_ETHIOPIA") return "#8f1d1d";
  if (["SOM_BR", "SUD", "KEN", "UGA", "ADE"].includes(hex.country)) return "#b5892e";
  if (hex.country === "SOM_FR") return "#3b5b82";
  if (["SAU", "YEM"].includes(hex.country)) return "#8c5a2b";
  return null;
}

function drawTerritoryBorders(ctx) {
  const insetR = MAP_CFG.hexR - 2;
  ctx.save();
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";

  for (let c = 0; c < MAP_CFG.cols; c++) {
    const dirs = c % 2 === 0 ? TERRITORY_EVEN_DIRS : TERRITORY_ODD_DIRS;
    for (let r = 0; r < MAP_CFG.rows; r++) {
      const hex = game.hexes[c][r];
      const key = getTerritoryBorderKey(hex);
      if (key === "SEA") continue;

      const color = getTerritoryBorderColor(hex, key);
      if (!color) continue;

      let verts = null;
      for (let dir = 0; dir < 6; dir++) {
        const nc = c + dirs[dir][0];
        const nr = r + dirs[dir][1];
        if (nc < 0 || nc >= MAP_CFG.cols || nr < 0 || nr >= MAP_CFG.rows) continue;
        const neighborKey = getTerritoryBorderKey(game.hexes[nc][nr]);
        if (neighborKey === key) continue;

        if (!verts) {
          verts = [];
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            verts.push({
              x: hex.x + insetR * Math.cos(angle),
              y: hex.y + insetR * Math.sin(angle)
            });
          }
        }
        const [v1, v2] = TERRITORY_EDGE_VERTS[dir];
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(verts[v1].x, verts[v1].y);
        ctx.lineTo(verts[v2].x, verts[v2].y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function renderBoard() {
  const canvas = document.getElementById("wargame-canvas");
  const displayCtx = canvas.getContext("2d");
  let ctx = displayCtx;
  const dpr = window.devicePixelRatio || 1;
  const rect = document.getElementById("map-viewport-frame").getBoundingClientRect();

  const showCoords = document.getElementById("chk-coords").checked;
  const showBaseMap = document.getElementById("chk-borders").checked;
  const showPaper = document.getElementById("chk-paper").checked;
  const layerState = { showCoords, showBaseMap, showPaper };
  if (!lastStaticLayerState ||
      lastStaticLayerState.showCoords !== showCoords ||
      lastStaticLayerState.showBaseMap !== showBaseMap ||
      lastStaticLayerState.showPaper !== showPaper) {
    staticLayerDirty = true;
  }
  if (!staticBoardCanvas) staticBoardCanvas = document.createElement("canvas");
  if (staticBoardCanvas.width !== MAP_CFG.boardW * 2 ||
      staticBoardCanvas.height !== MAP_CFG.boardH * 2) {
    staticBoardCanvas.width = MAP_CFG.boardW * 2;
    staticBoardCanvas.height = MAP_CFG.boardH * 2;
    staticLayerDirty = true;
  }

  const mapImageRect = baseMapImage && baseMapImage.naturalWidth > 0
    ? getBaseMapDrawRect(baseMapImage)
    : { imgX: 0, imgY: 0, imgW: MAP_CFG.boardW, imgH: MAP_CFG.boardH };
  const rowHeight = Math.sqrt(3) * MAP_CFG.hexR;
  const gridTop = MAP_CFG.oy;
  const gridBottom = MAP_CFG.oy + (MAP_CFG.rows - 0.5) * rowHeight;
  const frameTop = Math.max(mapImageRect.imgY, gridTop);
  const frameBottom = Math.min(mapImageRect.imgY + mapImageRect.imgH, gridBottom);
  const frameRect = {
    imgX: mapImageRect.imgX,
    imgY: frameTop,
    imgW: mapImageRect.imgW,
    imgH: Math.max(20, frameBottom - frameTop)
  };

  if (staticLayerDirty && game.hexes.length > 0) {
    ctx = staticBoardCanvas.getContext("2d");
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, MAP_CFG.boardW, MAP_CFG.boardH);

    ctx.fillStyle = "#d4c39f";
    ctx.fillRect(0, 0, MAP_CFG.boardW, MAP_CFG.boardH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameRect.imgX, frameRect.imgY, frameRect.imgW, frameRect.imgH);
    ctx.clip();
    if (showBaseMap && baseMapImage && baseMapImage.complete && baseMapImage.naturalWidth > 0) {
      ctx.drawImage(
        baseMapImage,
        mapImageRect.imgX,
        mapImageRect.imgY,
        mapImageRect.imgW,
        mapImageRect.imgH
      );
    }

    for (let c = 0; c < MAP_CFG.cols; c++) {
      for (let r = -1; r <= MAP_CFG.rows; r++) {
        const sourceRow = Math.max(0, Math.min(MAP_CFG.rows - 1, r));
        const h = game.hexes[c][sourceRow];
        const { x, y } = calculateHexCenter(c, r);
        const isBufferHex = r < 0 || r >= MAP_CFG.rows;
        const isLakeHex = !isBufferHex && isFixedLakeHex(c, r);
        const isTanaLake = !isBufferHex && c === 5 && r === 8;
        const isRudolfLake = !isBufferHex &&
          ((c === 5 && r >= 15 && r <= 17) || (c === 6 && r === 18));
        const isVictoriaBufferHex = r === MAP_CFG.rows && c <= 2;
        const isVictoriaLandBackdropHex = !isBufferHex && c === 0 && r === 22;
        let terrainForDrawing = h.terrain;
        if (isVictoriaBufferHex || isVictoriaLandBackdropHex || (isLakeHex && !isRudolfLake)) {
          terrainForDrawing = "plain";
        } else if (isRudolfLake) {
          terrainForDrawing = c === 5 ? (r <= 16 ? "plateau" : "plain") : "desert";
        }

        drawHexPath(ctx, x, y, MAP_CFG.hexR);
        if (h.terrain === "sea" && !isLakeHex && !isVictoriaBufferHex && !isVictoriaLandBackdropHex) {
          ctx.fillStyle = "rgba(104, 152, 171, 0.72)";
          ctx.fill();
        } else if (terrainForDrawing === "coast") {
          ctx.fillStyle = "rgba(164, 202, 214, 0.52)";
          ctx.fill();
        } else if (terrainForDrawing === "plateau" || terrainForDrawing === "mountain" || terrainForDrawing === "city") {
          ctx.fillStyle = terrainForDrawing === "plateau" ? "rgba(176, 134, 78, 0.35)"
            : terrainForDrawing === "mountain" ? "rgba(128, 92, 58, 0.48)"
            : "rgba(107, 114, 128, 0.45)";
          ctx.fill();
        }

        if (!isTanaLake &&
            ["sea", "plain", "desert", "mountain", "city"].includes(terrainForDrawing) &&
            MAP_SPRITES[terrainForDrawing]) {
          ctx.save();
          drawHexPath(ctx, x, y, MAP_CFG.hexR);
          ctx.clip();
          ctx.drawImage(
            MAP_SPRITES[terrainForDrawing],
            x - MAP_CFG.hexR,
            y - MAP_CFG.hexR,
            MAP_CFG.hexR * 2,
            MAP_CFG.hexR * 2
          );
          ctx.restore();
        }

        drawHexPath(ctx, x, y, MAP_CFG.hexR);
        ctx.lineWidth = 0.85;
        ctx.strokeStyle = "rgba(45, 59, 50, 0.38)";
        ctx.stroke();

        if (!isBufferHex && showCoords && h.terrain !== "sea") {
          ctx.fillStyle = "rgba(28, 24, 20, 0.62)";
          ctx.font = `bold 8.5px "Courier Prime", monospace`;
          ctx.textAlign = "center";
          ctx.fillText(h.label, x, y - MAP_CFG.hexR * 0.62);
        }
      }
    }

  const lakeScale = MAP_CFG.hexR / 31.5;
  const tanaLake = game.hexes[5][8];
  ctx.fillStyle = "#7ea6b5";
  ctx.strokeStyle = "#2d4c59";
  ctx.lineWidth = 1.5;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(tanaLake.x - 23 * lakeScale, tanaLake.y - 3 * lakeScale);
  ctx.bezierCurveTo(tanaLake.x - 21 * lakeScale, tanaLake.y - 12 * lakeScale, tanaLake.x - 10 * lakeScale, tanaLake.y - 17 * lakeScale, tanaLake.x - 3 * lakeScale, tanaLake.y - 13 * lakeScale);
  ctx.bezierCurveTo(tanaLake.x + 5 * lakeScale, tanaLake.y - 19 * lakeScale, tanaLake.x + 17 * lakeScale, tanaLake.y - 12 * lakeScale, tanaLake.x + 21 * lakeScale, tanaLake.y - 6 * lakeScale);
  ctx.quadraticCurveTo(tanaLake.x + 26 * lakeScale, tanaLake.y + 1 * lakeScale, tanaLake.x + 18 * lakeScale, tanaLake.y + 8 * lakeScale);
  ctx.bezierCurveTo(tanaLake.x + 10 * lakeScale, tanaLake.y + 16 * lakeScale, tanaLake.x + 2 * lakeScale, tanaLake.y + 12 * lakeScale, tanaLake.x - 5 * lakeScale, tanaLake.y + 17 * lakeScale);
  ctx.quadraticCurveTo(tanaLake.x - 16 * lakeScale, tanaLake.y + 16 * lakeScale, tanaLake.x - 19 * lakeScale, tanaLake.y + 7 * lakeScale);
  ctx.quadraticCurveTo(tanaLake.x - 27 * lakeScale, tanaLake.y + 2 * lakeScale, tanaLake.x - 23 * lakeScale, tanaLake.y - 3 * lakeScale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const p16 = game.hexes[5][15];
  const p17 = game.hexes[5][16];
  const p18 = game.hexes[5][17];
  const p19 = game.hexes[6][18];
  const s = MAP_CFG.hexR / 31.5;
  ctx.save();
  ctx.fillStyle = "#7ea6b5";
  ctx.strokeStyle = "#2d4c59";
  ctx.lineWidth = 1.5;
  drawSmoothClosedPolygon(ctx, [
    [p16.x - 12 * s, p16.y - 18 * s],
    [p16.x + 2 * s, p16.y - 21 * s],
    [p16.x + 13 * s, p16.y - 13 * s],
    [p16.x + 14 * s, p16.y + 5 * s],
    [p17.x + 12 * s, p17.y - 5 * s],
    [p17.x + 14 * s, p17.y + 12 * s],
    [p18.x + 14 * s, p18.y + 2 * s],
    [p19.x - 2 * s, p19.y - 13 * s],
    [p19.x + 13 * s, p19.y - 4 * s],
    [p19.x + 11 * s, p19.y + 12 * s],
    [p19.x - 3 * s, p19.y + 15 * s],
    [p19.x - 13 * s, p19.y + 2 * s],
    [p18.x - 4 * s, p18.y + 19 * s],
    [p18.x - 14 * s, p18.y + 5 * s],
    [p17.x - 15 * s, p17.y + 10 * s],
    [p17.x - 13 * s, p17.y - 10 * s],
    [p16.x - 15 * s, p16.y + 3 * s]
  ]);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const a23 = game.hexes[0][22];
  const b23 = game.hexes[1][22];
  const c23 = game.hexes[2][22];
  const d23 = game.hexes[3][22];
  const victoriaLeftX = frameRect.imgX - 10;
  const victoriaStartY = a23.y + 14 * lakeScale;
  const victoriaBottomY = frameRect.imgY + frameRect.imgH;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(victoriaLeftX, victoriaStartY);
  ctx.bezierCurveTo(victoriaLeftX + 24 * lakeScale, victoriaStartY - 25 * lakeScale, b23.x - 34 * lakeScale, b23.y - 30 * lakeScale, b23.x + 3 * lakeScale, b23.y - 18 * lakeScale);
  ctx.bezierCurveTo(b23.x + 26 * lakeScale, b23.y - 18 * lakeScale, c23.x - 24 * lakeScale, c23.y - 15 * lakeScale, c23.x + 3 * lakeScale, c23.y - 15 * lakeScale);
  ctx.bezierCurveTo(c23.x + 25 * lakeScale, c23.y - 15 * lakeScale, d23.x - 25 * lakeScale, d23.y - 16 * lakeScale, d23.x + 3 * lakeScale, d23.y - 16 * lakeScale);
  ctx.bezierCurveTo(d23.x + 19 * lakeScale, d23.y - 14 * lakeScale, d23.x + 26 * lakeScale, d23.y + 3 * lakeScale, d23.x + 22 * lakeScale, d23.y + 18 * lakeScale);
  ctx.bezierCurveTo(d23.x + 26 * lakeScale, d23.y + 26 * lakeScale, d23.x + 16 * lakeScale, victoriaBottomY - 6 * lakeScale, d23.x + 8 * lakeScale, victoriaBottomY);
  ctx.bezierCurveTo(c23.x, victoriaBottomY, frameRect.imgX + 70 * lakeScale, victoriaBottomY, victoriaLeftX, victoriaBottomY);
  ctx.lineTo(victoriaLeftX, victoriaStartY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  game.roads.forEach(rd => {
    if (!areHexesAdjacent(rd.c1, rd.r1, rd.c2, rd.r2)) return;
    const p1 = game.hexes[rd.c1][rd.r1];
    const p2 = game.hexes[rd.c2][rd.r2];
    ctx.save();
    if (rd.type === "rail") {
      ctx.strokeStyle = "#1c1814";
      ctx.lineWidth = 4.2;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

      ctx.strokeStyle = "#f7efe0";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    } else if (rd.type === "road") {
      ctx.strokeStyle = "#1c1814";
      ctx.lineWidth = 4.4;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

      ctx.strokeStyle = "#f7efe0";
      ctx.lineWidth = 2.0;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    } else {
      ctx.strokeStyle = "#6b4c2a";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    ctx.restore();
  });

const watermarks = [
  { c: 8,  r: 12, title: "衣索比亞帝國",   sub: "IMPERO D'ETIOPIA",     size: 22, rot: 0 },
  { c: 7,  r: 3,  title: "義屬厄利垂亞",   sub: "ERITREA ITALIANA",     size: 13, rot: 0.45 },
  { c: 17, r: 16, title: "義屬索馬利蘭",   sub: "SOMALIA ITALIANA",     size: 15, rot: -0.72 },
  { c: 2,  r: 8,  title: "英埃蘇丹",       sub: "SUDAN ANGLO-EGIZIANO", size: 16, rot: -1.57 },
  { c: 12, r: 8,  title: "法屬索馬利蘭",   sub: "SOMALIA FRANCESE",     size: 10, rot: 0 },
  { c: 16, r: 10, title: "英屬索馬利蘭",   sub: "SOMALIA BRITANNICA",   size: 13, rot: 0 },
  { c: 6,  r: 19, title: "英屬肯亞",       sub: "COLONIA DEL KENIA",    size: 16, rot: 0 },
  { c: 10, r: 3,  title: "紅海",           sub: "MAR ROSSO",            size: 17, rot: 0.92 },
  { c: 21, r: 18, title: "印度洋",         sub: "OCEANO INDIANO",       size: 18, rot: -0.68 }
];

  watermarks.forEach(wm => {
    ctx.save();
    const point = game.hexes[wm.c][wm.r];
    ctx.translate(point.x, point.y);
    ctx.rotate(wm.rot);
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(28, 24, 20, 0.45)";
    ctx.font = `900 ${wm.size}px "Libre Baskerville", "Noto Serif TC", serif`;
    ctx.fillText(wm.title, 0, 0);
    ctx.font = `700 ${Math.max(9, wm.size * 0.55)}px "Courier Prime", monospace`;
    ctx.fillText(wm.sub, 0, wm.size * 0.8);
    ctx.restore();
  });

  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      const h = game.hexes[c][r];
      if (!h.cityName) continue;
      const { x, y } = h;

      ctx.fillStyle = "#374151";
      ctx.beginPath();
      ctx.arc(x, y, h.isCapital ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (h.isCapital) {
        ctx.strokeStyle = "#374151";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.arc(x, y, h.isCapital ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `bold 11.5px "Libre Baskerville", "Noto Serif TC", serif`;
      ctx.textAlign = "center";
      const tw = ctx.measureText(h.cityName).width + 8;
      ctx.fillStyle = "rgba(247, 239, 224, 0.94)";
      ctx.fillRect(x - tw / 2, y + MAP_CFG.hexR * 0.30, tw, 16);
      ctx.strokeStyle = "#594a36";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x - tw / 2, y + MAP_CFG.hexR * 0.30, tw, 16);

      ctx.fillStyle = "#57534e";
      ctx.fillText(h.cityName, x, y + MAP_CFG.hexR * 0.30 + 12.5);
    }
  }

  ctx.restore();

  if (showPaper && paperPattern) {
    ctx.fillStyle = paperPattern;
    ctx.fillRect(0, 0, MAP_CFG.boardW, MAP_CFG.boardH);

    ctx.save();
    ctx.strokeStyle = "rgba(44, 34, 22, 0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MAP_CFG.boardW / 2, 10); ctx.lineTo(MAP_CFG.boardW / 2, MAP_CFG.boardH - 10);
    ctx.moveTo(10, MAP_CFG.boardH / 2); ctx.lineTo(MAP_CFG.boardW - 10, MAP_CFG.boardH / 2);
    ctx.stroke();
    ctx.restore();
  }

  let compassX = frameRect.imgX + frameRect.imgW - 72;
  let compassY = frameRect.imgY + frameRect.imgH - 72;
  const compassHex = boardToHex(compassX, compassY);
  if (!compassHex || game.hexes[compassHex.c][compassHex.r].terrain !== "sea") {
    let nearestSea = null;
    let nearestDistance = Infinity;
    for (let c = 0; c < MAP_CFG.cols; c++) {
      for (let r = 0; r < MAP_CFG.rows; r++) {
        const hex = game.hexes[c][r];
        if (hex.terrain !== "sea") continue;
        const distance = Math.hypot(hex.x - compassX, hex.y - compassY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSea = hex;
        }
      }
    }
    if (nearestSea) {
      compassX = nearestSea.x;
      compassY = nearestSea.y;
    }
  }
  compassPosition = { x: compassX, y: compassY };
  lastStaticLayerState = layerState;
  staticLayerDirty = false;
  }

  ctx = displayCtx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.translate(view.tx, view.ty);
  ctx.scale(view.scale, view.scale);
  if (staticBoardCanvas && game.hexes.length > 0) {
    ctx.drawImage(staticBoardCanvas, 0, 0, MAP_CFG.boardW, MAP_CFG.boardH);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(
    frameRect.imgX + 6,
    frameRect.imgY + 6,
    frameRect.imgW - 12,
    frameRect.imgH - 12
  );
  ctx.clip();

  const showTerritory = document.getElementById("chk-territory")?.checked;
  if (showTerritory && game.hexes.length > 0) {
    if (!territoryCanvas) territoryCanvas = document.createElement("canvas");
    if (territoryCanvas.width !== MAP_CFG.boardW * 2 ||
        territoryCanvas.height !== MAP_CFG.boardH * 2) {
      territoryCanvas.width = MAP_CFG.boardW * 2;
      territoryCanvas.height = MAP_CFG.boardH * 2;
      territoryLayerDirty = true;
    }
    if (territoryLayerDirty) {
      const tCtx = territoryCanvas.getContext("2d");
      tCtx.setTransform(2, 0, 0, 2, 0, 0);
      tCtx.clearRect(0, 0, MAP_CFG.boardW, MAP_CFG.boardH);
      drawTerritoryBorders(tCtx);
      territoryLayerDirty = false;
    }
    ctx.drawImage(territoryCanvas, 0, 0, MAP_CFG.boardW, MAP_CFG.boardH);
  }

  for (let c = 0; c < MAP_CFG.cols; c++) {
    for (let r = 0; r < MAP_CFG.rows; r++) {
      const hex = game.hexes[c][r];
      if (hex.gasTurns <= 0) continue;
      drawHexPath(ctx, hex.x, hex.y, MAP_CFG.hexR - 2);
      ctx.fillStyle = "rgba(101, 163, 13, 0.32)";
      ctx.fill();
    }
  }

  game.reachableHexes.forEach((_, k) => {
    const [c, r] = k.split(",").map(Number);
    const { x, y } = hexToBoard(c, r);
    drawHexPath(ctx, x, y, MAP_CFG.hexR - 2);
    ctx.fillStyle = "rgba(45, 74, 52, 0.28)";
    ctx.fill();
    ctx.strokeStyle = "#2d4a34";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  game.attackableHexes.forEach(k => {
    const [c, r] = k.split(",").map(Number);
    const { x, y } = hexToBoard(c, r);
    drawHexPath(ctx, x, y, MAP_CFG.hexR - 2);
    ctx.fillStyle = "rgba(143, 29, 29, 0.28)";
    ctx.fill();
    ctx.strokeStyle = "#8f1d1d";
    ctx.lineWidth = 2.8;
    ctx.stroke();
  });

  if (game.selectedHex) {
    const { x, y } = hexToBoard(game.selectedHex.c, game.selectedHex.r);
    drawHexPath(ctx, x, y, MAP_CFG.hexR - 1.5);
    ctx.strokeStyle = "#1c1814";
    ctx.lineWidth = 5.2;
    ctx.stroke();
    ctx.strokeStyle = "#fff099";
    ctx.lineWidth = 3.0;
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#2d3b32";
  ctx.lineWidth = 4;
  ctx.strokeRect(frameRect.imgX, frameRect.imgY, frameRect.imgW, frameRect.imgH);
  ctx.strokeStyle = "#1c1814";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(
    frameRect.imgX + 6,
    frameRect.imgY + 6,
    frameRect.imgW - 12,
    frameRect.imgH - 12
  );
  ctx.restore();

  const counterSize = Math.max(22, MAP_CFG.hexR * 1.03);
  const renderedUnitId = game.unitRenderOverride ? game.unitRenderOverride.unitId : null;
  const stacksByHex = new Map();
  for (const unit of game.units) {
    if (unit.id === renderedUnitId) continue;
    const key = hexKey(unit.c, unit.r);
    if (!stacksByHex.has(key)) {
      stacksByHex.set(key, { c: unit.c, r: unit.r, units: [] });
    }
    stacksByHex.get(key).units.push(unit);
  }
  const orderedStacks = Array.from(stacksByHex.values())
    .sort((a, b) => a.c - b.c || a.r - b.r);
  for (const { c, r, units: stack } of orderedStacks) {
    const topUnit = stack.find(u => u.id === game.selectedUnitId) || stack[0];
    const { x, y } = game.hexes[c][r];
    const isSel = stack.some(u => u.id === game.selectedUnitId);
    drawWoodblockCounter(ctx, x, y - 2, counterSize, topUnit, stack.length, isSel);
  }

  if (game.unitRenderOverride) {
    const movingUnit = game.units.find(unit => unit.id === renderedUnitId);
    if (movingUnit) {
      drawWoodblockCounter(
        ctx,
        game.unitRenderOverride.x,
        game.unitRenderOverride.y,
        counterSize,
        movingUnit,
        1,
        movingUnit.id === game.selectedUnitId
      );
    }
  }

  if (game.scenarioId === "tutorial" && !game.gameOver && !game.tutorialComplete) {
    drawRedWaxCrayonTutorialOverlay(ctx, getScenarioTutorialSteps()[game.tutorialStep - 1]);
  }

  if (MAP_SPRITES.compass && compassPosition) {
    ctx.drawImage(
      MAP_SPRITES.compass,
      compassPosition.x - 42,
      compassPosition.y - 42,
      84,
      84
    );
  }
}

// =========================================================================
// 介面更新與檔案夾選單切換
// =========================================================================
function toggleFixedLegend() {
  const body = document.getElementById("fixed-legend-body");
  const btn = document.getElementById("btn-toggle-legend");
  const hidden = body.classList.toggle("hidden");
  btn.textContent = hidden ? "展開 [＋]" : "收合 [－]";
}

function updateSidebarTurnTrack(scen) {
  const track = document.getElementById("sb-turn-track");
  const columns = Math.min(7, game.maxTurns);
  const finalTurnLabel = scen.dates[game.maxTurns - 1] || "";
  const lastRoundText = finalTurnLabel.includes("雨季") ? "雨季回合" : "最後回合";

  track.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  track.replaceChildren();

  for (let turn = 1; turn <= game.maxTurns; turn++) {
    const isCurrent = turn === game.turn;
    const isFinal = turn === game.maxTurns;
    const cell = document.createElement("span");
    const labels = [`T${turn}`];

    cell.className = "turn-track-cell";
    if (isCurrent) {
      cell.classList.add("is-current");
      labels.push("目前回合");
      cell.setAttribute("aria-current", "step");
    }
    if (isFinal) {
      cell.classList.add("is-final");
      labels.push(lastRoundText);
    }

    cell.textContent = `T${turn}`;
    cell.title = labels.join("，");
    cell.setAttribute("role", "listitem");
    cell.setAttribute("aria-label", labels.join("，"));
    track.appendChild(cell);
  }

  document.getElementById("sb-turn-track-final-label").textContent = lastRoundText;
}

function getWarEscalationLevelHint(level) {
  if (level <= 3) return "無額外效果";
  if (level <= 5) return "國聯制裁：義軍每回合-1LP";
  if (level <= 7) return "國際援助：衣軍補給延伸且每2回合游擊爆破 +1";
  if (level <= 9) return "石油禁運：義軍每回合降至+1LP且停止補充毒氣";
  return "全面國際干預：衣索比亞帝國贏得戰略勝利";
}

function getSidebarVictoryHint() {
  if (game.scenarioId === "tutorial") {
    return "我軍需依地圖標識完成演習步驟，攻佔北方重鎮阿杜瓦。";
  }
  return game.playerFaction === "italy"
    ? "我軍需在雨季開始前攻佔衣方首都阿迪斯阿貝巴。"
    : "我軍需堅守首都阿迪斯阿貝巴，拖延義軍攻勢直至雨季來臨。";
}

function updateSidebarUI() {
  const scen = getActiveScenarioPack();
  document.getElementById("sb-era-badge").textContent = scen.badge;
  document.getElementById("sb-campaign-title").textContent = scen.title;
  document.getElementById("sb-date-label").textContent = scen.dates[game.turn - 1] || "";
  document.getElementById("sb-turn-counter").textContent = `T${game.turn} / ${game.maxTurns}`;
  document.getElementById("sb-victory-hint").textContent = getSidebarVictoryHint();
  updateSidebarTurnTrack(scen);

  const pill = document.getElementById("sb-faction-pill");
  const factionTheme = FACTION_THEME[game.playerFaction];
  if (game.playerFaction === "italy") {
    pill.textContent = "🇮🇹 義大利王國";
  } else {
    pill.textContent = "🇪🇹 衣索比亞帝國";
  }
  pill.className = `font-typewriter font-bold ${factionTheme.accentText} text-sm`;

  const resBox = document.getElementById("sb-resources-box");
  const hasGasWarfare = hasScenarioFlag("hasGasWarfare");
  if (game.playerFaction === "italy") {
    resBox.classList.toggle("grid-cols-1", !hasGasWarfare);
    resBox.classList.toggle("grid-cols-2", hasGasWarfare);
    resBox.innerHTML = `
      <div class="bg-[#d4c39f] border border-[#594a36] p-2">
        <span class="block text-xs text-[#4a3f31]">工程補給點</span>
        <b class="font-typewriter text-lg text-[#2d4a34]">${game.lp} LP</b>
      </div>${hasGasWarfare ? `
      <div class="bg-[#d4c39f] border border-[#594a36] p-2">
        <span class="block text-xs text-[#4a3f31]">毒氣支援配額</span>
        <b class="font-typewriter text-lg text-[#8f1d1d]">${game.airGas} 枚</b>
      </div>` : ""}`;
  } else {
    resBox.classList.remove("grid-cols-1");
    resBox.classList.add("grid-cols-2");
    resBox.innerHTML = `
      <div class="bg-[#d4c39f] border border-[#594a36] p-2">
        <span class="block text-xs text-[#4a3f31]">游擊爆破配額</span>
        <b class="font-typewriter text-lg text-[#8f1d1d]">${game.sabotage} 枚</b>
      </div>
      <div class="bg-[#d4c39f] border border-[#594a36] p-2">
        <span class="block text-xs text-[#4a3f31]">距雨季勝利</span>
        <b class="font-typewriter text-lg text-[#2d4a34]">${game.maxTurns - game.turn + 1} 回合</b>
      </div>`;
  }

  const hasWarEscalation = hasScenarioFlag("hasWarEscalation");
  document.getElementById("war-escalation-box").classList.toggle("hidden", !hasWarEscalation);
  if (hasWarEscalation) {
    document.getElementById("war-escalation-level").textContent = `Lv.${game.warEscalation} / 10`;
    [...document.getElementById("war-escalation-track").children].forEach((cell, index) => {
      const level = index + 1;
      const hintText = `Lv.${level}：${getWarEscalationLevelHint(level)}`;
      cell.classList.toggle("is-reached", level < game.warEscalation);
      cell.classList.toggle("is-current", level === game.warEscalation);
      cell.classList.toggle("is-final", level === 10);
      cell.setAttribute("aria-current", level === game.warEscalation ? "step" : "false");
      cell.title = hintText;
      cell.setAttribute("aria-label", hintText);
    });
    document.getElementById("war-escalation-effect").textContent = getWarEscalationEffectSummary();
  }
  const warTab = document.getElementById("tab-man-war");
  const gasTab = document.getElementById("tab-man-gas");
  warTab.classList.toggle("hidden", !hasWarEscalation);
  gasTab.classList.toggle("hidden", !hasGasWarfare);
  document.getElementById("manual-crt-gas-rule").classList.toggle("hidden", !hasGasWarfare);
  if ((!hasWarEscalation && !document.getElementById("man-war").classList.contains("hidden")) ||
    (!hasGasWarfare && !document.getElementById("man-gas").classList.contains("hidden"))) {
    switchManualTab("rules");
  }

  const tutCard = document.getElementById("tutorial-guide-card");
  if (game.scenarioId === "tutorial") {
    tutCard.classList.remove("hidden");
    const st = getScenarioTutorialSteps()[game.tutorialStep - 1];
    document.getElementById("tut-step-badge").textContent = `${game.tutorialStep} / 3`;
    document.getElementById("tut-step-title").textContent = game.tutorialComplete ? "演習完成" : st.title;
    document.getElementById("tut-step-desc").textContent = game.tutorialComplete
      ? "已完成機動、築路與總攻擲骰，阿杜瓦前線演習結束。"
      : st.desc;
    const dots = document.getElementById("tut-progress-dots").children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].className = i < game.tutorialStep || game.tutorialComplete
        ? "h-2 bg-[#b5892e] border border-[#1c1814]"
        : "h-2 bg-[#1e2922] border border-[#5a6e60]";
    }
  } else {
    tutCard.classList.add("hidden");
  }
}

function getWaterbodyName(c, r) {
  if (c === 5 && r === 8) return "塔納湖";
  if (c === 14 && r === 6) return "曼德海峽";
  if ((c === 5 && r >= 15 && r <= 17) || (c === 6 && r === 18)) return "魯道夫湖";
  if (c >= 1 && c <= 3 && r === 22) return "維多利亞湖";
  if (r <= 6 && c <= 14) return "紅海";
  return "印度洋";
}

function getNearestLandHex(c, r, grid = game.hexes) {
  const isLandHex = hex => hex && hex.country !== "SEA" &&
    hex.terrain !== "sea" &&
    hex.terrain !== "coast" &&
    COUNTRIES[hex.country];
  const neighbors = grid === game.hexes ? getHexNeighbors(c, r) : getNeighborCoordinates(c, r);
  const adjacentLand = neighbors
    .map(nb => grid[nb.c]?.[nb.r])
    .find(isLandHex);
  if (adjacentLand) return adjacentLand;

  let landHex = null;
  let nearestDistance = Infinity;
  for (let landC = 0; landC < MAP_CFG.cols; landC++) {
    for (let landR = 0; landR < MAP_CFG.rows; landR++) {
      const candidate = grid[landC]?.[landR];
      if (!isLandHex(candidate)) continue;
      const distance = hexGridDistance(c, r, landC, landR);
      if (distance < nearestDistance) {
        landHex = candidate;
        nearestDistance = distance;
      }
    }
  }

  return landHex;
}

function getCoastTitle(c, r) {
  const hex = game.hexes[c]?.[r];
  const override = hex && typeof HEX_OVERRIDES !== "undefined" ? HEX_OVERRIDES[hex.label] : null;
  if (override && override.coastTitle) return override.coastTitle;
  const landHex = getNearestLandHex(c, r);
  if (!landHex) return getWaterbodyName(c, r);
  if (landHex.country === "SOM_FR") return "索馬利亞海岸";
  const countryName = COUNTRIES[landHex.country].name.replace(/^義屬|^英屬|^法屬/, "");
  return `${countryName}海岸`;
}

function updateHoverPanel() {
  const titleEl = document.getElementById("hover-hex-title");
  const defEl = document.getElementById("hover-hex-def");
  const oddsEl = document.getElementById("hover-odds-preview");
  const encyclopediaBtn = document.getElementById("hover-encyclopedia-btn");
  const hexRef = game.selectedHex || game.hoveredHex;

  if (!hexRef) {
    titleEl.textContent = "";
    defEl.textContent = "";
    defEl.classList.remove("gas-warning");
    oddsEl.textContent = "";
    oddsEl.classList.add("hidden");
    encyclopediaBtn.classList.add("hidden");
    return;
  }
  const h = game.hexes[hexRef.c][hexRef.r];
  const tCfg = TERRAIN_CFG[h.terrain];
  const placeName = h.country === "SEA"
    ? getWaterbodyName(h.c, h.r)
    : h.cityName || (h.terrain === "coast"
      ? getCoastTitle(h.c, h.r)
      : COUNTRIES[h.country]?.name || h.country);
  titleEl.textContent = `${placeName} (${h.label})`;
  const gasCovered = hasScenarioFlag("hasGasWarfare") && h.gasTurns > 0;
  defEl.classList.toggle("gas-warning", gasCovered);
  defEl.textContent = gasCovered
    ? `毒氣 攻防-1(剩${h.gasTurns}回合)`
    : h.terrain === "sea" || h.terrain === "coast"
      ? `${tCfg.name} 禁行`
      : `${tCfg.name} +${tCfg.def}防`;
  encyclopediaBtn.classList.toggle("hidden", !game.selectedHex);

  const k = hexKey(h.c, h.r);
  if (game.attackableHexes.has(k)) {
    const selectedUnit = game.units.find(unit => unit.id === game.selectedUnitId);
    const originHex = selectedUnit ? { c: selectedUnit.c, r: selectedUnit.r } : null;
    const stats = evaluateCombat(game.playerFaction, h.c, h.r, game.airGasArmed, originHex);
    oddsEl.textContent = `⚔ 預估戰力比：${stats.ratioLabel} (點擊發動總攻)`;
    oddsEl.classList.remove("hidden");
  } else {
    oddsEl.classList.add("hidden");
  }
}

const ENCYCLOPEDIA_CATEGORIES = ["全部", "湖泊", "海域與海峽", "國家", "城鎮", "歷史事件", "人物", "部隊單位", "交通路線"];

function getWaterbodyEncyclopediaId(name) {
  const ids = {
    "塔納湖": "lake_tana",
    "魯道夫湖": "lake_rudolf",
    "維多利亞湖": "lake_victoria",
    "曼德海峽": "bab_el_mandeb",
    "紅海": "sea_red",
    "印度洋": "sea_indian"
  };
  return ids[name] || "sea_indian";
}

const ENCYCLOPEDIA_CITY_IDS = {
  "阿迪斯阿貝巴": "city_addis_ababa",
  "阿斯馬拉": "city_asmara",
  "馬薩瓦": "city_massawa",
  "阿科達特": "city_agordat",
  "阿杜瓦": "city_adwa",
  "貢德爾": "city_gondar",
  "德西": "city_dessie",
  "哈拉爾": "city_harar",
  "戈拉海": "city_gorrahei",
  "摩加迪休": "city_mogadishu",
  "吉布地": "city_djibouti",
  "柏培拉": "city_berbera",
  "森納爾": "city_sennar",
  "卡薩拉": "city_kassala",
  "吉贊": "city_jizan",
  "沙那": "city_sanaa",
  "亞丁": "city_aden"
};
const TUTORIAL_UNIT_ENCYCLOPEDIA_IDS = {
  tut_inf: "unit_u1",
  tut_eng: "unit_u6",
  tut_mot: "unit_u5",
  tut_et1: "unit_e1"
};

function resolveHexEncyclopediaId(hex) {
  if (!hex) return null;
  if (hex.cityName) return ENCYCLOPEDIA_CITY_IDS[hex.cityName] || `country_${hex.country}`;
  const waterbodyName = getWaterbodyName(hex.c, hex.r);
  if (["塔納湖", "魯道夫湖", "維多利亞湖", "曼德海峽"].includes(waterbodyName)) {
    return getWaterbodyEncyclopediaId(waterbodyName);
  }
  if (hex.terrain === "coast") {
    const landHex = getNearestLandHex(hex.c, hex.r);
    return landHex ? `country_${landHex.country}` : getWaterbodyEncyclopediaId(getWaterbodyName(hex.c, hex.r));
  }
  if (hex.country === "SEA" || hex.terrain === "sea") {
    return getWaterbodyEncyclopediaId(waterbodyName);
  }
  return `country_${hex.country}`;
}

function getEncyclopediaEntries() {
  return Object.entries(window.ENCYCLOPEDIA_ENTRIES || {}).map(([id, entry]) => ({ ...entry, id }));
}

function getPersonEntryScopes(entry) {
  if (Array.isArray(entry.scopes)) return entry.scopes;
  if (typeof entry.scopes === "string") return [entry.scopes];
  return entry.scope ? [entry.scope] : [];
}

function isCurrentScenarioPerson(entry) {
  const scopes = getPersonEntryScopes(entry);
  return scopes.includes(game.scenarioId) || scopes.includes("shared");
}

function toggleAllEraPeople(showAll) {
  showAllEraPeople = showAll;
  renderEncyclopediaList();
}

function renderEncyclopediaCategories() {
  const container = document.getElementById("encyclopedia-categories");
  container.replaceChildren();
  ENCYCLOPEDIA_CATEGORIES.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mil-btn px-2.5 py-1 font-typewriter text-xs font-bold border ${currentEncyclopediaCategory === category
      ? "bg-[#2d3b32] text-[#e8c670] border-[#1c1814]"
      : "bg-[#d4c39f] text-[#1c1814] border-[#594a36]"}`;
    button.textContent = category;
    button.onclick = () => {
      currentEncyclopediaCategory = category;
      currentEncyclopediaEntryId = null;
      renderEncyclopediaCategories();
      renderEncyclopediaList(true);
    };
    container.appendChild(button);
  });
}

function entryMatchesSearch(entry, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const scenarioNotesText = entry.scenarioNotes
    ? (typeof entry.scenarioNotes === "string"
      ? entry.scenarioNotes
      : Object.values(entry.scenarioNotes).filter(Boolean).join("\n"))
    : "";
  return [entry.title, entry.subtitle, entry.content, scenarioNotesText]
    .some(field => (field || "").toLowerCase().includes(q));
}

function renderHighlightedText(element, text, query) {
  element.replaceChildren();
  const source = text || "";
  const trimmed = (query || "").trim();
  if (!trimmed) {
    element.textContent = source;
    return;
  }
  const lowerSource = source.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const qLen = trimmed.length;
  let cursor = 0;
  while (cursor < source.length) {
    const matchIndex = lowerSource.indexOf(lowerQuery, cursor);
    if (matchIndex === -1) {
      element.appendChild(document.createTextNode(source.slice(cursor)));
      break;
    }
    if (matchIndex > cursor) {
      element.appendChild(document.createTextNode(source.slice(cursor, matchIndex)));
    }
    const mark = document.createElement("mark");
    mark.className = "bg-[#e8c670] text-[#1c1814] px-0.5 font-bold";
    mark.textContent = source.slice(matchIndex, matchIndex + qLen);
    element.appendChild(mark);
    cursor = matchIndex + qLen;
  }
}

function onEncyclopediaSearch(value) {
  encyclopediaSearchQuery = value || "";
  renderEncyclopediaList(true);
}

const ENCYCLOPEDIA_PERSON_GROUPS = [
  { key: "italy", label: "義大利王國", color: "#2d4a34" },
  { key: "ethiopia", label: "衣索比亞帝國", color: "#8f1d1d" },
  { key: "vatican", label: "羅馬教廷", color: "#b5892e" }
];

function createEncyclopediaEntryButton(entry) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `w-full text-left px-2 py-1.5 border font-typewriter text-xs ${entry.id === currentEncyclopediaEntryId
    ? "bg-[#2d3b32] text-[#e8c670] border-[#1c1814]"
    : "bg-[#dfd0b0] text-[#1c1814] border-[#8c7853] hover:bg-[#eadfc7]"}`;
  button.textContent = entry.title;
  button.onclick = () => {
    currentEncyclopediaEntryId = entry.id;
    renderEncyclopediaList();
    renderEncyclopediaEntry(entry);
  };
  return button;
}

function renderEncyclopediaList(autoSelectFirst = false) {
  const list = document.getElementById("encyclopedia-list");
  const personScopeControl = document.getElementById("encyclopedia-person-scope-control");
  personScopeControl.classList.toggle("hidden", currentEncyclopediaCategory !== "人物");
  document.getElementById("encyclopedia-all-era-people").checked = showAllEraPeople;

  const query = encyclopediaSearchQuery.trim();
  const entries = getEncyclopediaEntries()
    .filter(entry => currentEncyclopediaCategory === "全部" || entry.category === currentEncyclopediaCategory);
  const filteredEntries = entries.filter(entry =>
    (entry.category !== "人物" || showAllEraPeople || isCurrentScenarioPerson(entry))
    && entryMatchesSearch(entry, query)
  );

  if (currentEncyclopediaCategory === "歷史事件") {
    filteredEntries.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  } else if (currentEncyclopediaCategory === "全部") {
    filteredEntries.sort((a, b) => {
      if (a.category === "歷史事件" && b.category === "歷史事件") {
        return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
      }
      return 0;
    });
  } else if (currentEncyclopediaCategory === "人物" && showAllEraPeople) {
    filteredEntries.sort((a, b) => Number(!isCurrentScenarioPerson(a)) - Number(!isCurrentScenarioPerson(b)));
  }

  let orderedEntries = filteredEntries;
  if (currentEncyclopediaCategory === "人物" && filteredEntries.length) {
    const grouped = [];
    const groupedIds = new Set();
    ENCYCLOPEDIA_PERSON_GROUPS.forEach(group => {
      filteredEntries
        .filter(entry => entry.factionGroup === group.key)
        .forEach(entry => {
          grouped.push(entry);
          groupedIds.add(entry.id);
        });
    });
    filteredEntries
      .filter(entry => !groupedIds.has(entry.id))
      .forEach(entry => grouped.push(entry));
    orderedEntries = grouped;
  }

  if (orderedEntries.length) {
    const hasSelected = orderedEntries.some(entry => entry.id === currentEncyclopediaEntryId);
    if ((autoSelectFirst && !hasSelected) || !hasSelected) {
      currentEncyclopediaEntryId = orderedEntries[0].id;
    }
    const activeEntry = orderedEntries.find(entry => entry.id === currentEncyclopediaEntryId) || orderedEntries[0];
    renderEncyclopediaEntry(activeEntry);
  } else {
    currentEncyclopediaEntryId = null;
    document.getElementById("encyclopedia-entry-title").textContent = query ? "查無符合條目" : "選擇百科條目";
    document.getElementById("encyclopedia-entry-subtitle").textContent = "";
    const content = document.getElementById("encyclopedia-entry-content");
    content.replaceChildren();
    const hint = document.createElement("p");
    hint.className = "text-[#594a36]";
    hint.textContent = query ? "請嘗試其他關鍵字或切換分類。" : "此分類目前沒有可列出的條目。";
    content.appendChild(hint);
  }

  list.replaceChildren();
  if (currentEncyclopediaCategory === "人物" && filteredEntries.length) {
    const renderedIds = new Set();
    ENCYCLOPEDIA_PERSON_GROUPS.forEach(group => {
      const groupEntries = filteredEntries.filter(entry => entry.factionGroup === group.key);
      if (!groupEntries.length) return;
      const heading = document.createElement("div");
      heading.className = "flex items-center gap-1.5 px-2 py-1 mt-1 first:mt-0 bg-[#d4c39f] border border-[#594a36] text-[#1c1814] font-typewriter text-xs font-bold";
      const swatch = document.createElement("span");
      swatch.className = "inline-block w-2.5 h-2.5 border border-[#1c1814] shrink-0";
      swatch.style.backgroundColor = group.color;
      heading.appendChild(swatch);
      heading.appendChild(document.createTextNode(group.label));
      list.appendChild(heading);
      groupEntries.forEach(entry => {
        renderedIds.add(entry.id);
        list.appendChild(createEncyclopediaEntryButton(entry));
      });
    });
    filteredEntries
      .filter(entry => !renderedIds.has(entry.id))
      .forEach(entry => list.appendChild(createEncyclopediaEntryButton(entry)));
  } else {
    filteredEntries.forEach(entry => {
      list.appendChild(createEncyclopediaEntryButton(entry));
    });
  }

  if (!filteredEntries.length) {
    const empty = document.createElement("p");
    empty.className = "p-2 font-serif-classic text-sm text-[#594a36]";
    empty.textContent = query ? "找不到符合搜尋關鍵字的條目。" : "此分類目前沒有可列出的條目。";
    list.appendChild(empty);
  }
}

function renderEncyclopediaEntry(entry) {
  renderHighlightedText(
    document.getElementById("encyclopedia-entry-title"),
    entry.title,
    encyclopediaSearchQuery
  );
  renderHighlightedText(
    document.getElementById("encyclopedia-entry-subtitle"),
    entry.subtitle || "",
    encyclopediaSearchQuery
  );
  const content = document.getElementById("encyclopedia-entry-content");
  content.replaceChildren();
  entry.content.split(/\r?\n/).filter(Boolean).forEach(line => {
    const isSectionHeading = /^【.+】$/.test(line)
      || (line.length <= 28 && !/[。！？；，、：]/.test(line));
    const element = document.createElement(isSectionHeading ? "h4" : "p");
    element.className = isSectionHeading
      ? "font-typewriter font-bold text-[#2d3b32] border-l-4 border-[#8f1d1d] pl-2 pt-1"
      : "text-[#2b241c]";
    const lineText = /^【(.+)】$/.test(line) ? line.slice(1, -1) : line;
    renderHighlightedText(element, lineText, encyclopediaSearchQuery);
    content.appendChild(element);
  });
}

function openEncyclopedia() {
  currentEncyclopediaCategory = "全部";
  currentEncyclopediaEntryId = null;
  showAllEraPeople = false;
  encyclopediaSearchQuery = "";
  const searchInput = document.getElementById("encyclopedia-search-input");
  if (searchInput) searchInput.value = "";
  renderEncyclopediaCategories();
  renderEncyclopediaList(true);
  openModal("modal-encyclopedia");
}

function openEncyclopediaEntry(entryId) {
  const entry = getEncyclopediaEntries().find(item => item.id === entryId);
  if (!entry) {
    console.error(`Encyclopedia entry not found: ${entryId}`);
    return false;
  }
  currentEncyclopediaCategory = entry.category;
  if (entry.category === "人物" && !isCurrentScenarioPerson(entry)) showAllEraPeople = true;
  currentEncyclopediaEntryId = entry.id;
  encyclopediaSearchQuery = "";
  const searchInput = document.getElementById("encyclopedia-search-input");
  if (searchInput) searchInput.value = "";
  renderEncyclopediaCategories();
  renderEncyclopediaList();
  renderEncyclopediaEntry(entry);
  openModal("modal-encyclopedia");
  return true;
}

function openSelectedHexEncyclopedia() {
  if (!game.selectedHex) return;
  const hex = game.hexes[game.selectedHex.c][game.selectedHex.r];
  openEncyclopediaEntry(resolveHexEncyclopediaId(hex));
}

function openSelectedUnitEncyclopedia() {
  const unit = game.units.find(item => item.id === game.selectedUnitId);
  if (unit) {
    const entryId = TUTORIAL_UNIT_ENCYCLOPEDIA_IDS[unit.id] || `unit_${unit.id}`;
    openEncyclopediaEntry(entryId);
  }
}

function updateDetailPanel() {
  const emptyEl = document.getElementById("unit-empty-hint");
  const contentEl = document.getElementById("unit-detail-content");

  if (!game.selectedHex) {
    emptyEl.classList.remove("hidden");
    contentEl.classList.add("hidden");
    return;
  }

  const h = game.hexes[game.selectedHex.c][game.selectedHex.r];
  const stack = getUnitsInHex(h.c, h.r);
  const unit = game.units.find(u => u.id === game.selectedUnitId) || stack[0];

  if (!unit) {
    emptyEl.classList.remove("hidden");
    contentEl.classList.add("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  contentEl.classList.remove("hidden");

  const dCanvas = document.getElementById("detail-nato-canvas");
  const dCtx = dCanvas.getContext("2d");
  dCtx.clearRect(0, 0, 60, 60);
  drawWoodblockCounter(dCtx, 28, 28, 46, unit, 1, false);

  document.getElementById("det-unit-name").textContent = unit.name;
  const supplied = isUnitSupplied(unit);
  document.getElementById("det-unit-sub").textContent = `${h.cityName || h.label} • ${supplied ? "補給線暢通" : "補給斷絕(攻減半)"}`;

  const stackPill = document.getElementById("det-stack-pill");
  if (stack.length > 1 && !game.movementInProgress) {
    const idx = stack.findIndex(u => u.id === unit.id) + 1;
    stackPill.textContent = `同格疊放 ${idx}/${stack.length}`;
    stackPill.classList.remove("hidden");
  } else {
    stackPill.classList.add("hidden");
  }

  const effAtk = getEffectiveAttack(unit);
  document.getElementById("det-atk").textContent = effAtk;
  document.getElementById("det-def").textContent = unit.def;
  document.getElementById("det-mp").textContent = `${unit.mp}/${unit.maxMp}`;
  const supEl = document.getElementById("det-sup");
  supEl.textContent = supplied ? "正常" : "斷補";
  const supplyTheme = FACTION_THEME[supplied ? "italy" : "ethiopia"];
  supEl.className = `font-serif-classic text-sm ${supplyTheme.statusText}`;

  const btnBox = document.getElementById("det-action-buttons");
  btnBox.innerHTML = "";

  if (stack.length > 1 && !game.movementInProgress) {
    const cycBtn = document.createElement("button");
    cycBtn.className = "mil-btn w-full py-1.5 px-2.5 bg-[#c4b087] text-[#1c1814] font-typewriter text-sm font-bold text-left";
    cycBtn.textContent = "↻ 切換同格疊放算子";
    cycBtn.onclick = () => {
      const idx = stack.findIndex(u => u.id === unit.id);
      game.selectedUnitId = stack[(idx + 1) % stack.length].id;
      const nextU = game.units.find(u => u.id === game.selectedUnitId);
      computeValidMovesAndAttacks(nextU);
      smoothPanToHex(nextU.c, nextU.r);
      updateDetailPanel();
      renderBoard();
    };
    btnBox.appendChild(cycBtn);
  }

  if (!game.movementInProgress && unit.faction === game.playerFaction && game.activeFaction === game.playerFaction) {
    if (hasScenarioFlag("hasGasWarfare") && game.playerFaction === "italy" && game.airGas > 0 && game.attackableHexes.size > 0) {
      const airBtn = document.createElement("button");
      airBtn.className = game.airGasArmed
        ? "mil-btn w-full py-2 px-2.5 bg-[#8f1d1d] text-[#f2e8cf] font-typewriter text-sm font-bold text-left"
        : "mil-btn w-full py-2 px-2.5 bg-[#d4dfd5] text-[#1c2b21] font-typewriter text-sm font-bold text-left";
      airBtn.textContent = game.airGasArmed
        ? "✓ 已啟動：芥子毒氣支援 (+2攻)"
        : "投入芥子毒氣支援 (耗1配額)";
      airBtn.onclick = toggleGasSupport;
      btnBox.appendChild(airBtn);
    }

    if (unit.type === "it_eng") {
      const adjTrails = game.roads.filter(rd => rd.type === "trail" && areHexesAdjacent(rd.c1, rd.r1, rd.c2, rd.r2) && ((rd.c1 === unit.c && rd.r1 === unit.r) || (rd.c2 === unit.c && rd.r2 === unit.r)));
      adjTrails.forEach(rd => {
        const oc = rd.c1 === unit.c && rd.r1 === unit.r ? rd.c2 : rd.c1;
        const or = rd.c1 === unit.c && rd.r1 === unit.r ? rd.r2 : rd.r1;
        const targetName = game.hexes[oc][or].cityName || game.hexes[oc][or].label;
        const canBuild = game.lp >= 2 && unit.mp > 0;
        const shouldPulse = game.scenarioId === "tutorial" &&
          game.tutorialStep === 2 &&
          !game.tutorialComplete &&
          unit.id === "tut_eng" &&
          oc === 8 &&
          or === 5 &&
          canBuild;
        const b = document.createElement("button");
        b.disabled = !canBuild;
        b.className = `mil-btn w-full py-2 px-2.5 font-typewriter text-sm font-bold text-left ${canBuild ? "bg-[#2d3b32] text-[#e8c670]" : "bg-[#c4b087] text-[#594a36]"} ${shouldPulse ? "tutorial-btn-pulse" : ""}`.trim();
        b.textContent = `🛠 修築往【${targetName}】公路 (2 LP)`;
        b.onclick = () => buildRoadAction(rd.id);
        btnBox.appendChild(b);
      });
    }

    if (unit.type === "et_rec") {
      const adjRoads = game.roads.filter(rd => rd.type === "road" && areHexesAdjacent(rd.c1, rd.r1, rd.c2, rd.r2) && ((rd.c1 === unit.c && rd.r1 === unit.r) || (rd.c2 === unit.c && rd.r2 === unit.r)));
      adjRoads.forEach(rd => {
        const oc = rd.c1 === unit.c && rd.r1 === unit.r ? rd.c2 : rd.c1;
        const or = rd.c1 === unit.c && rd.r1 === unit.r ? rd.r2 : rd.r1;
        const targetName = game.hexes[oc][or].cityName || game.hexes[oc][or].label;
        const canSab = game.sabotage >= 1 && unit.mp > 0;
        const b = document.createElement("button");
        b.disabled = !canSab;
        b.className = `mil-btn w-full py-2 px-2.5 font-typewriter text-sm font-bold text-left ${canSab ? "bg-[#8f1d1d] text-[#f2e8cf]" : "bg-[#c4b087] text-[#594a36]"}`;
        b.textContent = `💥 爆破往【${targetName}】公路 (1點)`;
        b.onclick = () => sabotageRoadAction(rd.id);
        btnBox.appendChild(b);
      });
    }
  }
}

function addLog(text, type = "info") {
  game.logs.unshift({ turn: game.turn, text, type });
  if (game.logs.length > 50) game.logs.pop();
  const list = document.getElementById("log-list");
  list.innerHTML = game.logs.map(item => {
    const tagCol = FACTION_THEME[item.type]
      ? FACTION_THEME[item.type].logTag
      : "bg-[#b5892e] text-[#1c1814]";
    return `<div class="p-2 bg-[#dfd0b0] border border-[#594a36] leading-snug">
      <span class="inline-block px-1.5 py-0.5 text-xs font-bold mr-1 border border-[#1c1814] ${tagCol}">T${item.turn}</span>
      <span>${item.text}</span>
    </div>`;
  }).join("");
}

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

function toggleLayerFolder() {
  const box = document.getElementById("layer-menu-box");
  const btn = document.getElementById("tab-layer-btn");
  const isHidden = box.classList.toggle("hidden");
  btn.className = isHidden
    ? "folder-tab py-2 px-1 bg-[#c4b087] hover:bg-[#d4c39f] text-[#1c1814] text-center"
    : "folder-tab py-2 px-1 bg-[#dfd0b0] text-[#8f1d1d] text-center";
}

function switchManualTab(tabKey) {
  const availability = {
    war: hasScenarioFlag("hasWarEscalation"),
    gas: hasScenarioFlag("hasGasWarfare")
  };
  if (availability[tabKey] === false) return;
  ["rules", "crt", "nato", "war", "gas"].forEach(k => {
    const unavailable = availability[k] === false;
    document.getElementById(`man-${k}`).classList.toggle("hidden", k !== tabKey || unavailable);
    const btn = document.getElementById(`tab-man-${k}`);
    btn.className = unavailable
      ? "hidden px-4 py-1.5 bg-[#dfd0b0] text-[#1c1814] border border-[#594a36]"
      : k === tabKey
      ? "px-4 py-1.5 bg-[#2d3b32] text-[#e8c670] border border-[#1c1814]"
      : "px-4 py-1.5 bg-[#dfd0b0] text-[#1c1814] border border-[#594a36]";
  });
}

function setupModalShortcuts() {
  const closableModalIds = ["modal-encyclopedia", "modal-manual", "modal-scenario"];
  closableModalIds.forEach(id => {
    const modalEl = document.getElementById(id);
    if (!modalEl) return;
    modalEl.addEventListener("click", e => {
      if (e.target === modalEl) {
        closeModal(modalEl.id);
      }
    });
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const openModalId = closableModalIds.find(id => {
      const el = document.getElementById(id);
      return el && !el.classList.contains("hidden");
    });
    if (openModalId) {
      closeModal(openModalId);
    }
    const layerMenuBox = document.getElementById("layer-menu-box");
    if (layerMenuBox && !layerMenuBox.classList.contains("hidden")) {
      toggleLayerFolder();
    }
  });
}

window.addEventListener("resize", resizeCanvas);
window.onload = () => {
  createPaperGrainPattern();
  setupCanvasEvents();
  setupModalShortcuts();
  selectSetupScenario("tutorial");
  selectSetupFaction("italy");
  game.hexes = generateMapGrid();
  game.roads = getScenarioRoads()
    .filter(([c1, r1, c2, r2]) => areHexesAdjacent(c1, r1, c2, r2))
    .map(([c1, r1, c2, r2, type], idx) => ({ id: `rd_${idx}`, c1, r1, c2, r2, type }));
  game.units = getScenarioRoster("1935").map(createScenarioUnit);
  recalculateSupply();
  updateSidebarUI();
  loadBaseMapImage();
  resizeCanvas();
  preloadMapSprites();
};
