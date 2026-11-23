// Sides are drawn in world pixels (32 per cell). The collision plane is always y=0.
export const rockMaterials = {
  "gate-slate": { file: "moss", stone: "#526052", shade: "#2f4038", face: "#78846b", lip: "#aeb875", edge: "#657746" },
  "old-peak": { file: "sandstone", stone: "#946246", shade: "#503d35", face: "#bd916b", lip: "#e1bb85", edge: "#996942" },
  "wind-cut": { file: "basalt", stone: "#447572", shade: "#28484c", face: "#75a6a0", lip: "#afcbbc", edge: "#6b9590" },
  "star-etched": { file: "glacier", stone: "#635b79", shade: "#383950", face: "#9b8caa", lip: "#ece8f0", edge: "#b9b5d2" }
};

// Coordinates mark distinct landmarks along the route, including the second screens.
// Frame order follows the two columns and four rows of the terrain painting.
const root = 0, trestle = 1, schist = 2, arch = 3, strata = 4, corbel = 5, basalt = 6, cornice = 7;
const landmarks = [
  [[7,10,root], [17,6,root]],
  [[0,9,trestle], [8,9,trestle], [23,12,root]],
  [[0,6,schist], [13,9,schist], [23,11,root]],
  [[0,9,arch], [19,3,arch], [21,7,corbel], [3,13,arch], [30,9,arch], [39,13,corbel]],
  [[0,8,strata], [7,10,strata], [16,5,strata], [20,13,corbel], [34,11,strata], [39,7,corbel]],
  [[0,9,corbel], [10,9,corbel], [19,3,arch], [21,7,corbel], [35,6,arch], [36,11,corbel]],
  [[0,11,basalt], [9,4,basalt], [17,12,schist], [22,7,basalt], [32,5,basalt], [41,12,schist]],
  [[0,10,schist], [14,4,basalt], [14,11,basalt], [22,13,schist], [36,4,basalt], [38,13,basalt]],
  [[0,8,cornice], [9,10,schist], [20,7,cornice], [33,11,schist], [39,2,cornice]],
  [[0,9,cornice], [10,7,cornice], [18,14,cornice], [35,12,basalt], [36,3,cornice]]
];

// Each back wall starts inside a real shelf. Its painted foot recedes into the valley.
// Entries are socket column, shelf row, artwork, foot row and signed width in map cells.
const wooded = 0, masonry = 1, columns = 2, snow = 3, timber = 4, bluff = 5, crag = 6, granite = 7;
const sockets = [.67, .73, .62, .70, .74, .70, .65, .63];
const abutments = [
  [[4,14,wooded,16.2,2.7], [11,12,crag,16.7,-3.3], [8,10,wooded,16.6,5.0], [18,6,crag,13.5,4.1], [25,4,wooded,13.8,-6.4]],
  [[1,9,timber,16.3,3.0], [11,9,timber,14.8,-3.8], [24,7,wooded,16,-5.7], [16,3,wooded,10,4.7]],
  [[1,6,crag,16,7.0], [16,9,wooded,16.5,4.7], [27,6,crag,15,-5.5]],
  [[1,9,masonry,16.3,3.4], [14,4,bluff,12.8,5.7], [24,3,masonry,10.2,-3.9], [7,13,bluff,17.5,4.7], [33,9,masonry,15.5,3.7], [42,6,bluff,15,-6.0]],
  [[1,8,bluff,16.6,5.6], [10,10,bluff,16.2,4.6], [21,5,bluff,14,-6.2], [34,6,masonry,12.5,3.5], [42,9,bluff,16.4,-4.7]],
  [[2,9,masonry,16.5,3.5], [13,9,masonry,16,3.8], [23,3,masonry,8.8,-3.2], [24,7,bluff,16,-7.1], [37,6,masonry,12.7,3.4], [41,2,bluff,12.8,-6.0]],
  [[2,11,crag,17,4.6], [10,4,columns,13.8,5.5], [24,7,columns,16,-5.8], [34,5,crag,15.3,5.9], [42,12,columns,17,-3.8]],
  [[3,10,crag,16.8,5.2], [16,4,columns,11.8,4.2], [24,7,crag,15,-5.6], [34,11,columns,17,4.5], [38,4,columns,12.5,-4.8]],
  [[2,8,snow,16.2,5.4], [13,10,granite,16.7,5.1], [23,2,snow,11,-5.8], [34,11,granite,17,4.8], [41,6,snow,15.6,-7.0]],
  [[2,9,granite,16.6,5.2], [12,7,snow,15.6,6.2], [21,14,granite,17.3,-4.1], [32,9,snow,16,4.5], [38,3,granite,13.5,-7.0]]
];

export function terrainAbutments(rows, index) {
  return (abutments[index] || []).flatMap(([col, row, frame, foot, span]) => {
    if (rows[row]?.[col] !== "#" || rows[row + 1]?.[col] === "#") return [];
    const width = Math.abs(span);
    const flipped = span < 0;
    const left = col + .5 - width * (flipped ? 1 - sockets[frame] : sockets[frame]);
    return [{ left, top: row + .28, width, height: foot - row - .28, frame, flipped }];
  });
}

// A room keeps just the atlas frames it uses. The painted timber and rock take
// their strongest shadow at the socket and pick up valley light toward the foot.
const supportArt = new WeakMap();

export function paintAbutments(g, supports, sheet, tile, viewLeft, viewWidth, index) {
  let frames = supportArt.get(supports);
  if (!frames) {
    frames = new Map();
    supportArt.set(supports, frames);
  }
  for (const { left, top, width, height, frame, flipped } of supports) {
    const x = left * tile, w = width * tile;
    if (x + w < viewLeft || x > viewLeft + viewWidth) continue;
    let art = frames.get(frame);
    if (!art) {
      art = document.createElement("canvas");
      art.width = sheet.naturalWidth / 4;
      art.height = sheet.naturalHeight / 2;
      const surface = art.getContext("2d");
      const h = art.height;
      surface.drawImage(sheet, (frame % 4) * art.width, Math.floor(frame / 4) * h, art.width, h, 0, 0, art.width, h);
      const [sky, rock] = terrainLight[index];
      const wash = surface.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, "#26323b65");
      wash.addColorStop(.14, rock + "25");
      wash.addColorStop(.55, rock + "40");
      wash.addColorStop(1, sky + "78");
      surface.globalCompositeOperation = "source-atop";
      surface.fillStyle = wash;
      surface.fillRect(0, 0, art.width, h);
      const fade = surface.createLinearGradient(0, h * .42, 0, h);
      fade.addColorStop(0, "#fff");
      fade.addColorStop(1, "#ffffff58");
      surface.globalCompositeOperation = "destination-in";
      surface.fillStyle = fade;
      surface.fillRect(0, 0, art.width, h);
      frames.set(frame, art);
    }
    g.save();
    g.translate(flipped ? x + w : x, top * tile);
    if (flipped) g.scale(-1, 1);
    g.drawImage(art, 0, 0, w, height * tile);
    g.restore();
  }
}

// Colors sampled from diffuse sky and distant rock in each room painting.
// Source-atop keeps gaps in bridge trusses, ice ends and spike tips transparent.
const terrainLight = [
  ["#88b7a9", "#80a8a2"], ["#c1ccbf", "#749384"], ["#bc9fb3", "#ad9ab4"],
  ["#be879a", "#ab7e95"], ["#b99297", "#ad7d65"], ["#c07c76", "#996980"],
  ["#8aadb3", "#769ca2"], ["#91aacc", "#87adba"], ["#6d7bc8", "#5f6aa2"], ["#8293c4", "#7488d3"]
];

// Local rock in the near hillside, from the pine gate through violet summit granite.
const bedrockPigments = [
  "#647364", "#736f60", "#777184", "#98766a", "#a07e68",
  "#8d6f76", "#58797a", "#637f89", "#777794", "#6e7292"
];

export function applyTerrainLight(g, width, tile, index, face) {
  const [sky, rock] = terrainLight[index];
  const light = g.createLinearGradient(0, 0, 0, tile + 5);
  // Internal row boundaries share one tint across the entire continuous rock face.
  const bed = rock + "32";
  light.addColorStop(0, face?.top === false ? bed : sky + "18");
  light.addColorStop(.42, face?.top === false ? bed : sky + "2f");
  light.addColorStop(tile / (tile + 5), face?.bottom === false ? bed : rock + "4e");
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = light;
  g.fillRect(0, -6, width, tile + 18);
  g.restore();
}

// Split only where a face becomes exposed. Interior seams of stacked rock stay flush.
export function rockRuns(rows, roomIndex) {
  const runs = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      if (row[x] !== "#") { x += 1; continue; }
      const start = x;
      const top = rows[y - 1]?.[x] !== "#";
      const bottom = rows[y + 1]?.[x] !== "#";
      x += 1;
      while (row[x] === "#" && (rows[y - 1]?.[x] !== "#") === top && (rows[y + 1]?.[x] !== "#") === bottom) x += 1;
      const left = row[start - 1] !== "#", right = row[x] !== "#";
      const bankLeft = top && !left && rows[y - 1]?.[start - 1] === "#";
      const bankRight = top && !right && rows[y - 1]?.[x] === "#";
      runs.push({ x: start, y, length: x - start, floor: y === rows.length - 1, top, bottom, left, right, bankLeft, bankRight });
    }
  });
  for (const [x, y, frame] of landmarks[roomIndex] || []) {
    const run = runs.find(run => run.x === x && run.y === y && run.top && run.bottom && run.left && run.right);
    if (run) run.frame = frame;
  }
  return runs;
}

function polygon(g, color, points) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath();
  g.fill();
}

// A worn trail finger on a small cairn. The tip points past the shelf's open end.
export function paintExitSign(g, chapter) {
  const stone = ["#657367", "#957868", "#617c83", "#747b93"][chapter];
  polygon(g, stone, [-12,0, -9,-4, 0,-6, 9,-4, 12,0]);
  polygon(g, "#414c50", [-6,-4, -5,-8, 3,-9, 7,-6, 4,-4]);
  polygon(g, "#644f41", [-2,-5, -3,-29, 1,-31, 2,-5]);
  polygon(g, "#9e8263", [-2,-6, -3,-29, -1,-29, 0,-6]);
  polygon(g, "#503e35", [-11,-28, 6,-29, 15,-24, 6,-18, -11,-20]);
  polygon(g, "#bc946c", [-11,-29, 6,-30, 15,-25, 6,-20, -11,-21]);
  polygon(g, "#695844", [-10,-27, 5,-28, 11,-25, 5,-22, -10,-23]);
  g.strokeStyle = "#ffe3a3";
  g.lineWidth = 2.1;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(-5,-25); g.lineTo(6,-25);
  g.moveTo(3,-28); g.lineTo(7,-25); g.lineTo(3,-22);
  g.stroke();
}

export const mapMechanics = {
  C: ["脆冰", "#80adb9"], D: ["冲刺门", "#b99358"], E: ["相位台", "#688595"],
  T: ["弹簧", "#a8e5ae"], A: ["光继", "#9ce5db"], R: ["补给", "#a5deeb"],
  U: ["风升", "#b5ebe3"], B: ["棱镜", "#ffd98c"], M: ["回声", "#e1c7fc"], K: ["巡游晶核", "#f6adab"]
};

// The terrain map and its key use the same silhouettes, in tile coordinates.
export function paintMapMechanic(g, symbol, x, y, exposed = true) {
  g.save();
  g.translate(x, y);
  g.scale(1 / 16, 1 / 16);
  g.lineWidth = 2.3;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = mapMechanics[symbol][1];
  g.fillStyle = g.strokeStyle;
  g.beginPath();
  switch (symbol) {
    case "C":
    case "D":
    case "E":
      g.fillRect(-8,-8,16,16);
      if (exposed) {
        g.fillStyle = symbol === "D" ? "#f1d4a2" : "#c0d8d6";
        g.fillRect(-8,-8,16,2);
      }
      g.lineWidth = 1.8;
      g.strokeStyle = symbol === "D" ? "#674c38" : "#354f63";
      if (symbol === "C") {
        g.moveTo(-8,0); g.lineTo(-3,2); g.lineTo(1,-2); g.lineTo(8,0);
      } else if (symbol === "D") {
        g.moveTo(-4,-4); g.lineTo(0,0); g.lineTo(-4,4);
        g.moveTo(1,-4); g.lineTo(5,0); g.lineTo(1,4);
      } else {
        g.setLineDash([3,3]); g.moveTo(-8,4); g.lineTo(8,4);
      }
      break;
    case "T":
      g.moveTo(-7,-4); g.lineTo(7,-4);
      g.moveTo(-4,-1); g.lineTo(3,1); g.lineTo(-3,3); g.lineTo(3,5);
      g.moveTo(-6,7); g.lineTo(6,7); break;
    case "U":
      g.moveTo(-5,0); g.lineTo(0,-6); g.lineTo(5,0);
      g.moveTo(-5,6); g.lineTo(0,0); g.lineTo(5,6); break;
    case "A":
      g.arc(0,0,6,0.28,Math.PI*1.86); g.moveTo(2,0); g.arc(0,0,2,0,Math.PI*2); break;
    case "R":
      g.moveTo(-5,5); g.quadraticCurveTo(-6,-4,6,-7); g.quadraticCurveTo(5,3,-5,5);
      g.moveTo(-6,7); g.lineTo(2,-2); break;
    case "B":
      g.moveTo(0,-7); g.lineTo(7,5); g.lineTo(-7,5); g.closePath(); break;
    case "M":
      g.arc(0,0,6,0,Math.PI*2); g.moveTo(3,0); g.arc(0,0,3,0,Math.PI*2); break;
    case "K":
      g.scale(.82,.82);
      paintDriftShard(g);
      g.restore();
      return;
  }
  g.stroke();
  g.restore();
}

// Phase runs can have a hole where a returning cell would overlap the player.
export function paintPhaseSpan(g, block, width) {
  const progress = block.warningProgress || 0;
  g.save();
  g.translate(block.x, block.y);
  if (block.active) {
    polygon(g, "#375a64", [0,1, width,1, width,19, width-6,26, width*.56,30, 5,25, 0,20]);
    polygon(g, "#64999d", [0,2, width,2, width-4,9, width*.66,13, width*.19,10, 2,13]);
    for (let x = 4; x < width - 9; x += 24) {
      polygon(g, "#4e7982", [x,13, x+14,10, x+7,22, x+2,24]);
    }
    g.lineWidth = 1.5;
    g.strokeStyle = "#abd0cd";
    g.setLineDash([5,4]);
    g.beginPath(); g.moveTo(5,16); g.lineTo(width-5,16); g.stroke();
    const lip = block.warning ? width * (1 - progress) : width;
    g.fillStyle = block.warning ? "#efc578" : "#c5eae1";
    g.fillRect((width - lip) / 2, 0, lip, 2.5);
  } else {
    g.lineWidth = 1.5;
    g.strokeStyle = "#b4ced0";
    g.setLineDash([4,5]);
    g.beginPath(); g.moveTo(0,1); g.lineTo(width,1); g.stroke();
    if (block.warning) {
      const edge = width * progress / 2;
      g.fillStyle = "#f6d497";
      g.fillRect(0,0,edge,2.5);
      g.fillRect(width-edge,0,edge,2.5);
    }
  }
  g.restore();
}

// The four broken points occupy the patrol's 18px collision footprint.
export function paintDriftShard(g) {
  polygon(g, "#753e50", [-9,-8, -2,-5, 4,-9, 5,-4, 9,-2, 6,3, 8,9, 1,6, -6,9, -5,3, -9,1]);
  polygon(g, "#df837f", [-8,-7, -1,-3, 4,-8, 2,0, -4,4]);
  polygon(g, "#be616d", [3,-2, 8,-2, 4,3, 7,8, -1,4]);
  polygon(g, "#f5bbb1", [-3,-2, 2,-3, 3,0, -1,2]);
}

function noise(seed, sample) {
  const value = Math.sin(seed * 41.19 + sample * 78.23) * 43758.5453;
  return value - Math.floor(value);
}

function paintBridge(g, width, seed) {
  polygon(g, "#422f28", [0,2, width,2, width-2,12, width-9,15, 8,15, 1,11]);
  g.lineWidth = 2;
  for (const depth of [0, 4]) {
    g.strokeStyle = depth ? "#594a37" : "#c4a077";
    g.beginPath();
    g.moveTo(3, 11 + depth);
    g.quadraticCurveTo(width * 0.5, 37 + depth, width - 3, 11 + depth);
    g.stroke();
  }
  let x = 0;
  for (let i = 0; x < width; i++) {
    const w = Math.min(width - x, 12 + Math.floor(noise(seed, i) * 11));
    polygon(g, i % 3 === 0 ? "#936341" : "#af7c51", [x,1, x+w-1,0, x+w,6, x+w-2,10, x+1,12]);
    polygon(g, "#d5af75", [x,1, x+w-1,0, x+w-2,3, x+2,4]);
    if (i % 2 === 1) {
      const t = (x + w/2) / width;
      const end = 12 + 50*t*(1-t);
      g.fillStyle = "#8b7153";
      g.fillRect(x+w/2, 10, 1.5, end-9);
    }
    x += w;
  }
  for (const post of [3, width-7]) {
    g.fillStyle = "#66513e";
    g.fillRect(post, 1, 4, 21);
    g.fillStyle = "#d2af79";
    g.fillRect(post-1, 7, 6, 2);
    g.fillRect(post-1, 11, 6, 2);
  }
}

export function paintLandmarkLedge(g, run, tile, sheet) {
  const width = run.length * tile;
  const cellW = sheet.naturalWidth / 2, cellH = sheet.naturalHeight / 4;
  // Reuse a full span, a broken end or a single shoulder. Wide decks keep their long arch.
  const section = (run.x + 2 * run.y) % 3;
  const crop = run.length >= 7 || section === 0 ? 1 : section === 1 ? .77 : .61;
  const offset = section === 1 ? 0 : 1 - crop;
  const height = Math.min(tile + 8, Math.max(tile * .86, width * .20 / crop));
  const sourceX = ((run.frame % 2) + offset) * cellW;
  g.save();
  if ((run.x + run.y) % 2) { g.translate(width, 0); g.scale(-1, 1); }
  g.drawImage(sheet, sourceX, Math.floor(run.frame / 2) * cellH, cellW * crop, cellH, 0, 0, width, height);
  g.restore();
  if (run.frame === trestle) {
    // The worn front edges of individual boards mark the actual walkable deck.
    const seed = run.x + 31 * run.y;
    for (let x = 0, i = 0; x < width; i++) {
      const next = Math.min(width, x + 12 + noise(seed, i) * 11);
      polygon(g, "#d3ad77", [x+1,0, next-1,0, next-2,2, x+3,2.8]);
      x = next;
    }
  }
}

const seamlessStone = new WeakMap();

// Overlap opposite edges of the texture, preserving the direction of the painted strata.
function wrapStoneEdge(source, horizontal) {
  const overlap = Math.round((horizontal ? source.width : source.height) / 6);
  const dx = horizontal ? overlap : 0, dy = horizontal ? 0 : overlap;
  const tile = document.createElement("canvas");
  tile.width = source.width - dx;
  tile.height = source.height - dy;
  const pen = tile.getContext("2d");
  pen.drawImage(source, -dx, -dy);
  const strip = document.createElement("canvas");
  strip.width = horizontal ? dx : tile.width;
  strip.height = horizontal ? tile.height : dy;
  const feather = strip.getContext("2d");
  feather.drawImage(source, 0, 0);
  feather.globalCompositeOperation = "destination-in";
  const fade = feather.createLinearGradient(0, 0, dx, dy);
  fade.addColorStop(0, "transparent");
  fade.addColorStop(1, "#000");
  feather.fillStyle = fade;
  feather.fillRect(0, 0, strip.width, strip.height);
  pen.drawImage(strip, tile.width - strip.width, tile.height - strip.height);
  return tile;
}

function continuousStone(image) {
  if (seamlessStone.has(image)) return seamlessStone.get(image);
  const swatch = document.createElement("canvas");
  swatch.width = Math.min(512, image.naturalWidth);
  swatch.height = Math.round(swatch.width * image.naturalHeight / image.naturalWidth);
  swatch.getContext("2d").drawImage(image, 0, 0, swatch.width, swatch.height);
  const tile = wrapStoneEdge(wrapStoneEdge(swatch, true), false);
  seamlessStone.set(image, tile);
  return tile;
}

export function paintLedge(g, run, tile, material, index, image) {
  const width = run.length * tile;
  const seed = index * 439 + run.x * 31 + run.y * 17;
  const n = sample => noise(seed, sample);
  const kind = material.file;
  if (index === 1 && run.top && run.bottom && run.left && run.right && run.length >= 4 && (run.y === 5 || run.y === 9)) {
    paintBridge(g, width, seed);
    return;
  }
  const isolated = run.bottom && !run.floor;
  const bevel = kind === "sandstone" ? 4 : 7;
  const left = run.left ? 1 : 0, right = run.right ? 1 : 0;
  const lowerCut = isolated ? Math.min(width / 5, bevel + n(1)*10) : 0;
  g.save();
  g.beginPath();
  const topLeft = run.top ? left : 0, topRight = run.top ? right : 0;
  g.moveTo(topLeft * 2, 0);
  g.lineTo(width - topRight * 2, 0);
  g.lineTo(width, topRight * 3);
  if (right && isolated) {
    g.lineTo(width-1, 11+n(2)*5);
    g.lineTo(width-5, 19);
    g.lineTo(width-4, 23);
  }
  g.lineTo(width-right*lowerCut, tile);
  if (isolated) {
    // Bedrock stays flush at a shared face. Erosion cuts back into the exposed shelf.
    for (let x = width - 16, i = 0; x > 14; i++) {
      const t = x / width;
      const taper = Math.sin(Math.PI * t) * (0.45 + n(12) * 0.55);
      const depth = tile - (1 - taper) * 10;
      const layer = 17 + n(i + 31) * 17;
      if (kind === "basalt") {
        g.lineTo(x, depth - 3);
        g.lineTo(x - 1, depth + n(i + 15) * 9);
        g.lineTo(Math.max(6, x - layer * .54), depth + 4);
      } else if (kind === "sandstone") {
        const bed = depth - 5 * Math.sin(t * 6 + n(11) * 4);
        g.lineTo(x, bed);
        g.lineTo(Math.max(5, x - layer * .62), bed);
        g.lineTo(Math.max(4, x - layer * .72), bed - 4);
      } else {
        g.lineTo(x + 3, depth - 5);
        g.lineTo(x - 3, depth + n(i + 19) * 6);
        g.lineTo(Math.max(5, x - layer * .58), depth + 1);
      }
      x -= layer;
    }
  }
  g.lineTo(left*lowerCut, tile);
  if (left && isolated) {
    g.lineTo(4, 23);
    g.lineTo(5, 18);
    g.lineTo(0, 13);
  }
  g.lineTo(0, topLeft*4);
  g.closePath();
  g.clip();
  g.fillStyle = material.stone;
  g.fillRect(0, 0, width, tile + 12);
  if (image) {
    g.save();
    g.globalAlpha *= .84;
    if (isolated && run.top && run.left && run.right) {
      // Sample one piece of strata: the grain keeps its natural direction through the entire ledge.
      const sw = Math.min(image.naturalWidth, width * 3.3);
      const sh = Math.min(image.naturalHeight, (tile + 12) * 3.3);
      const sx = n(91) * (image.naturalWidth - sw), sy = n(92) * (image.naturalHeight - sh);
      g.drawImage(image, sx, sy, sw, sh, 0, 0, width, tile + 12);
    } else {
      // One continuous exposure for the foundation and stacked rock, including split runs.
      const swatch = continuousStone(image);
      const periodX = 224, periodY = periodX * swatch.height / swatch.width;
      const xOffset = (run.x * tile + 71 * index) % periodX;
      const yOffset = (run.y * tile + 39 * index) % periodY;
      for (let y = -yOffset; y < tile + 12; y += periodY) {
        for (let x = -xOffset; x < width; x += periodX) g.drawImage(swatch, x, y, periodX, periodY);
      }
    }
    g.restore();
  } else {
    for (let x = -12, i = 0; x < width; i++) {
      const span = 16 + n(i)*26;
      polygon(g, i % 2 ? material.face : material.shade, [x,2+n(i+3)*8, x+span,1, x+span*.7,13+n(i+9)*19, x+2,29]);
      x += span;
    }
  }
  if (run.bottom) {
    const shade = g.createLinearGradient(0, 0, 0, tile+5);
    shade.addColorStop(0, "rgba(21,27,35,0.03)");
    shade.addColorStop(0.55, "rgba(21,27,35,0.04)");
    shade.addColorStop(1, "rgba(17,22,34,0.55)");
    g.fillStyle = shade;
    g.fillRect(0, 0, width, tile+12);
  }
  if (run.top) {
    // A thin irregular weathered rim catches light along the actual landing plane.
    let x = 0;
    for (let i = 0; x < width; i++) {
      const span = Math.min(width - x, 16 + n(i + 61) * 33);
      const end = x + span;
      const frost = kind === "glacier";
      const depth = (frost ? 2.6 : 1.2) + n(i + 12) * (frost ? 3.8 : 2.5);
      g.fillStyle = material.edge;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(end, 0);
      g.lineTo(end, 2);
      g.quadraticCurveTo(x + span * .57, depth + 2, x, 2);
      g.fill();
      g.fillStyle = material.lip;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(end, 0);
      g.lineTo(end, .9);
      g.quadraticCurveTo(x + span * .60, depth + 1.1, x, .9);
      g.fill();
      x = end;
    }
  }
  if (run.top && run.bottom && run.length >= 4) {
    paintLedgeFeature(g, index, run.y, width, seed);
  }
  // Preserve the light and dark painted strata while picking up the local rock hue.
  g.globalCompositeOperation = "color";
  g.globalAlpha = .64;
  g.fillStyle = bedrockPigments[index];
  g.fillRect(0, 0, width, tile + 12);
  g.restore();

  // Scree collects where a real vertical wall meets a walkable lower shelf.
  for (const side of [-1, 1]) {
    if (side === -1 ? !run.bankLeft : !run.bankRight) continue;
    g.save();
    g.translate(side === -1 ? 0 : width, 0);
    g.scale(-side, 1);
    polygon(g, material.shade, [0,-5, 4,-4, 7,-2, 13,-1, 16,1, 0,2]);
    polygon(g, material.face, [1,-5, 4,-5, 6,-2, 3,-1, 0,-2]);
    polygon(g, material.edge, [7,-1, 9,-3, 12,-2, 14,0, 8,1]);
    g.restore();
  }

  if (run.top && (kind === "moss" || kind === "basalt")) {
    for (let x = 10+n(57)*24, i = 0; x < width-5; x += 38+n(i+63)*34, i++) {
      const h = 2+n(i+65)*3;
      if (kind === "moss") {
        polygon(g, "#708149", [x-4,1, x-5,-h*.75, x-1,-1, x,-h, x+2,-1, x+5,-3, x+4,1]);
      } else {
        polygon(g, "#87a99a", [x-4,1, x+2,-h, x+1,0, x+7,-h*.7, x+3,1]);
      }
    }
  }

}

// Room-specific construction interrupts the rhythm of the natural shelves on the ascent.
function paintLedgeFeature(g, index, row, width, seed) {
  if (index === 0 && (row === 6 || row === 10)) {
    // Two worn lintels from the entrance gate. Keep the lichen in the joints.
    polygon(g, "#78826c", [0,2, width,2, width-4,10, width-15,12, 8,11, 1,8]);
    polygon(g, "#b6b497", [1,1, width-1,1, width-5,4, width*.6,6, 4,5]);
    g.fillStyle = "#59635a";
    for (let x=8; x<width-6; x+=29) g.fillRect(x,7,13,1.5);
  } else if (index === 2 && (row === 6 || row === 11)) {
    // Water-polished stone under the spring terraces.
    for (let i=0; i<3; i++) {
      const x = 7 + (width-15)*noise(seed, i+31);
      polygon(g, "#9ab3a2", [x-5,3, x+5,3, x+2,6, x+1,15+i*2, x-1,8]);
    }
  } else if (index >= 6 && (row + index) % 3 === 0) {
    // Mineral lenses lie inside the rock face. Their broad facets read at phone scale.
    const ice = index >= 8;
    const start = width * (0.25 + noise(seed, 19)*0.25);
    const length = width * 0.31;
    polygon(g, ice ? "#8a8bab" : "#6d9b9e", [start-12,22, start+9,11, start+length,5, start+length-4,11, start+10,19]);
    polygon(g, ice ? "#b9c4d6" : "#a4c6bc", [start+5,14, start+16,10, start+length,5, start+21,12]);
  }
}

const spikeColors = [
  ["#563a3f","#a44c51","#ea8880"], ["#432935","#b54652","#ff9c90"],
  ["#3c414e","#985967","#dc9093"], ["#51364f","#a55b81","#efa2b9"]
];
const spikeProfiles = [4, -2, 6, 1].map(lean =>
  [17, 13, 20].map((split, variant) => [[0, split + 3], [split - 2, 32]].map(([a, b], i) => {
    const foot = (a + b) / 2;
    const tip = Math.max(2, Math.min(30, foot + lean + (i === 0 ? 2 : -2)));
    const h = i === variant % 2 ? 1 : 6 + variant;
    return { a, b, foot, tip, h };
  }))
);

export function spikeIntersectsBox(direction, chapter, variant, x0, y0, x1, y1) {
  // Undo the same quarter-turn as the sprite, then clip to this cell.
  let left = x0, right = x1, base = y1;
  if (direction === ">") { left = y0; right = y1; base = 32 - x0; }
  if (direction === "<") { left = 32 - y1; right = 32 - y0; base = x1; }
  if (direction === "v") { left = 32 - x1; right = 32 - x0; base = 32 - y0; }
  if (x1 <= 0 || y1 <= 0 || x0 >= 32 || y0 >= 32) return false;
  if (base > 29) return true;
  for (const { a, b, tip, h } of spikeProfiles[chapter][variant]) {
    if (base <= h) continue;
    // A forgiving triangle inside the painted tooth, widest at the bottom of the box.
    const t = (base - h) / (29 - h);
    if (right > tip + (a + 2 - tip) * t && left < tip + (b - 2 - tip) * t) return true;
  }
  return false;
}

export function paintSpikes(g, chapter, variant) {
  const [dark, middle, light] = spikeColors[chapter];
  for (const { a, b, foot, tip, h } of spikeProfiles[chapter][variant]) {
    if (chapter === 0) {
      g.fillStyle = dark;
      g.beginPath();
      g.moveTo(a, 31);
      g.quadraticCurveTo(a + 1, 13, tip, h);
      g.quadraticCurveTo(foot, 14, b, 26);
      g.lineTo(b, 32);
      g.fill();
      polygon(g, middle, [a+1,29, a+4,17, tip,h, foot,18, foot+2,25]);
      polygon(g, light, [a+4,18, tip,h, foot+1,11, a+5,20]);
      polygon(g, middle, [foot-2,26, a,16, foot+2,22]);
    } else {
      const knee = chapter === 2 ? foot - 6 : foot - 3;
      polygon(g, dark, [a,30, a+1,21, knee,15, tip,h, b-2,21, b,31]);
      polygon(g, middle, [a+1,27, knee+1,16, tip,h+1, foot+2,21, foot,30]);
      polygon(g, light, [knee+1,16, tip,h, foot+1,18, foot,22]);
      if (chapter === 1) polygon(g, "#754646", [a+2,23, foot+1,20, b-1,24, b-2,27, foot,24, a,26]);
      if (chapter === 3) polygon(g, "#d8bfd6", [tip,h+2, b-2,18, foot+2,21]);
    }
  }
  polygon(g, dark, [0,28, 6,25, 14,29, 22,25, 32,28, 32,32, 0,32]);
}

// Neighboring 32px slices share the same depth and bedding at their common boundary.
const iceBedding = [12, 15, 11, 14, 10];
const iceKeel = [25, 27, 24, 29, 26];
export const iceVariants = iceKeel.length;

export function paintFracturedIce(g, variant, joinedLeft, joinedRight) {
  const next = (variant + 1) % iceVariants;
  const a = iceBedding[variant], b = iceBedding[next];
  const left = joinedLeft ? 0 : 3, right = joinedRight ? 32 : 29;
  const keelA = joinedLeft ? iceKeel[variant] : 20, keelB = joinedRight ? iceKeel[next] : 19;
  const elbow = 10 + variant * 2;
  polygon(g, "#476e81", [0,1, 32,1, 32,keelB-5, right,keelB, elbow+2,30-variant, left,keelA, 0,keelA-5]);
  polygon(g, "#80b3bf", [0,2, 32,2, 32,b, elbow+5,a+4, elbow-2,a, 0,a]);
  polygon(g, "#accfd5", [0,2, 32,2, 32,5, elbow+5,7, elbow-3,6, 0,5]);
  polygon(g, "#cfe6e7", [0,0, 32,0, 32,2, elbow+8,3, elbow+2,2, 0,2]);
  polygon(g, "#6595a7", [left,a+3, elbow-2,a+2, elbow+5,a+6, right,b+2, right,keelB-3, elbow,keelA-2, left,keelA-4]);
  polygon(g, "#d4e9e7", [0,a-1, elbow-2,a-1, elbow+5,a+3, 32,b-1, 32,b+.5, elbow+4,a+5, elbow-3,a+1, 0,a+.5]);
  if (!joinedLeft) polygon(g, "#c2e0e0", [0,1, 2,2, 4,9, 2,13, 4,20, 0,15]);
  if (!joinedRight) polygon(g, "#365e72", [31,2, 32,2, 32,16, 29,20, 30,14, 28,10]);
}

export function paintIceStress(g, variant, queued, fracture, direction) {
  if (queued <= 0 && fracture <= 0) return;
  const elbow = 10 + variant * 2;
  g.save();
  if (direction < 0) { g.translate(32, 0); g.scale(-1, 1); }
  const joint = 11 + variant % 3;
  const progress = fracture > 0 ? 1 : queued;
  g.beginPath();
  g.rect(0, 0, 32 * progress, 32);
  g.clip();
  g.lineJoin = "bevel";
  g.strokeStyle = fracture > 0 ? "#663e4f" : "#e0f9f4";
  g.lineWidth = fracture > 0 ? 1.5 + 3 * fracture : 1.7;
  g.beginPath();
  g.moveTo(0, 12);
  g.lineTo(elbow - 4, joint + 2);
  g.lineTo(elbow + 2, joint - 2);
  g.lineTo(24, joint + 3);
  g.lineTo(32, 12);
  g.stroke();
  if (fracture > 0) {
    g.strokeStyle = "#ffe1b1";
    g.lineWidth = 1;
    g.stroke();
    g.strokeStyle = "#593848";
    g.lineWidth = 1.4 + fracture * 1.8;
    g.beginPath();
    g.moveTo(elbow + 2, joint - 2);
    g.lineTo(elbow + 5, joint - 4 - fracture * 3);
    g.lineTo(elbow + 3 + fracture * 4, (joint - 5) * (1 - fracture));
    g.moveTo(24, joint + 3);
    g.lineTo(21, joint + 5 + fracture * 3);
    g.lineTo(24 + fracture * 2, joint + 6 + fracture * 8);
    g.stroke();
  }
  g.restore();
}
