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
      runs.push({ x: start, y, length: x - start, top, bottom, left: row[start - 1] !== "#", right: row[x] !== "#" });
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
  const isolated = run.bottom;
  const bevel = kind === "sandstone" ? 4 : 7;
  const left = run.left ? 1 : 0, right = run.right ? 1 : 0;
  const lowerCut = isolated ? Math.min(width / 5, bevel + n(1)*10) : 2;
  g.save();
  g.beginPath();
  g.moveTo(left * 2, 0);
  g.lineTo(width - right * 2, 0);
  g.lineTo(width, right * 3);
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
  g.lineTo(0, left*4);
  g.closePath();
  g.clip();
  g.fillStyle = material.stone;
  g.fillRect(0, 0, width, tile + 12);
  if (image) {
    // Anchor the painting in world space so vertically stacked rows and split runs share one face.
    const periodX = 294, periodY = periodX * image.naturalHeight / image.naturalWidth;
    const worldX = run.x * tile + index * 71, worldY = run.y * tile + index * 39;
    for (let cy = Math.floor(worldY / periodY); cy * periodY < worldY + tile + 12; cy++) {
      for (let cx = Math.floor(worldX / periodX); cx * periodX < worldX + width; cx++) {
        const flipX = cx % 2, flipY = cy % 2;
        g.save();
        g.translate((cx + flipX) * periodX - worldX, (cy + flipY) * periodY - worldY);
        g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        g.drawImage(image, 0, 0, periodX, periodY);
        g.restore();
      }
    }
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
    // Each material breaks the lower edge of its walkable lip differently.
    let x = 0;
    for (let i=0; x < width; i++) {
      const span = Math.min(width-x, 13 + n(i+61)*27);
      const depth = kind === "glacier" ? 3 + n(i+12)*6 : 2 + n(i+12)*4;
      const end = x+span;
      polygon(g, material.edge, [x,0, end,0, end,depth*.6+1, x+span*.64,depth+2, x,depth+1]);
      polygon(g, material.lip, [x,0, end,0, end,depth*.5, x+span*.64,depth, x,depth*.75]);
      if (kind === "sandstone") {
        polygon(g, "#967255", [end-2,0, end,0, end-1,depth, end-4,depth+2]);
      } else if (kind === "moss") {
        polygon(g, "#899857", [x,2, x+span*.3,1, x+span*.57,3, x+span*.38,depth+2, x+2,depth+1]);
      }
      x = end;
    }
  }
  if (run.top && run.bottom && run.length >= 4) {
    paintLedgeFeature(g, index, run.y, width, seed);
  }
  g.restore();

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
export function paintSpikes(g, chapter, variant) {
  const [dark, middle, light] = spikeColors[chapter];
  // A dominant point and a shorter companion give each hazardous cell a clear direction.
  const split = [17, 13, 20][variant];
  const lean = [4, -2, 6, 1][chapter];
  for (let i = 0; i < 2; i++) {
    const a = i === 0 ? 0 : split - 2, b = i === 0 ? split + 3 : 32;
    const foot = (a + b) / 2;
    const tip = Math.max(2, Math.min(30, foot + lean + (i === 0 ? 2 : -2)));
    const h = i === variant % 2 ? 1 : 6 + variant;
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
