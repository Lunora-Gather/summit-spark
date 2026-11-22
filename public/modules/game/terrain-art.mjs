// Sides are drawn in world pixels (32 per cell). The collision plane is always y=0.
export const rockMaterials = {
  "gate-slate": { file: "moss", stone: "#526052", shade: "#2f4038", face: "#78846b", lip: "#aeb875", edge: "#657746" },
  "old-peak": { file: "sandstone", stone: "#946246", shade: "#503d35", face: "#bd916b", lip: "#e1bb85", edge: "#996942" },
  "wind-cut": { file: "basalt", stone: "#447572", shade: "#28484c", face: "#75a6a0", lip: "#afcbbc", edge: "#6b9590" },
  "star-etched": { file: "glacier", stone: "#635b79", shade: "#383950", face: "#9b8caa", lip: "#ece8f0", edge: "#b9b5d2" }
};

// Split only where a face becomes exposed. Interior seams of stacked rock stay flush.
export function rockRuns(rows) {
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
    // A wedged foot, uneven ledges or split columns interrupt the straight underside.
    for (let x = width-20, i=0; x > 16; x -= 17 + n(i+9)*16, i++) {
      const depth = kind === "basalt" ? 3+n(i+30)*7 : n(i+30)*6;
      g.lineTo(x+4, tile-2);
      g.lineTo(x, tile+depth);
      g.lineTo(x-7, tile+depth-1);
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
  if (isolated && (kind === "glacier" || kind === "moss")) {
    for (let x = 15+n(74)*24, i = 0; x < width-10; x += 42+n(i+79)*25, i++) {
      const h = 3+n(i+78)*(index === 9 ? 8 : 5);
      if (kind === "glacier") {
        polygon(g, "#a4adce", [x-2,tile-3, x+4,tile-3, x+1,tile+h]);
        polygon(g, "#d4d9e9", [x-2,tile-3, x,tile-2, x+1,tile+h]);
      } else {
        g.strokeStyle = "#596444";
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(x, tile-3);
        g.quadraticCurveTo(x-3, tile+3, x+1, tile+h);
        g.stroke();
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
  } else if (index >= 3 && index <= 5 && row % 3 === index % 3) {
    const radius = 10 + index;
    for (let center=18; center < width-12; center+=radius*2+7) {
      g.beginPath();
      g.arc(center, 33, radius, Math.PI, 0);
      g.fillStyle = "#5e4035";
      g.fill();
      g.strokeStyle = "#c49b75";
      g.lineWidth = 3.5;
      g.stroke();
      polygon(g, "#dfb687", [center-3,29-radius, center+3,29-radius, center+2,35-radius, center-2,35-radius]);
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
  const points = [[8,17,26],[5,19,28],[10,21,30],[5,17,26]][chapter];
  const soles = [0,10,21,32];
  for (let i = 0; i < 3; i++) {
    const a = soles[i], b = soles[i+1], foot = (a+b)*0.5;
    const tip = Math.min(31, Math.max(1, points[i]+((variant+i)%3)-1));
    const h = 1 + (i === variant%3 ? 0 : 3+(i+variant)%6);
    const bend = chapter === 0 ? a+1 : chapter === 2 ? foot-4 : foot-2;
    if (chapter === 0) {
      // Bent thorns with a hooked outer edge.
      g.fillStyle = dark;
      g.beginPath();
      g.moveTo(a, 32);
      g.quadraticCurveTo(a-1, 15, tip, h);
      g.quadraticCurveTo(foot, 15, b, 26);
      g.lineTo(b, 32);
      g.fill();
    } else if (chapter === 2) {
      polygon(g, dark, [a,32, a+1,19, tip,h, tip-2,15, b-1,24, b,32]);
    } else {
      polygon(g, dark, [a,31, a,23, bend,15, tip,h, b-2,19, b,29, b,32]);
    }
    polygon(g, middle, [a+1,27, bend+1,16, tip,h+1, foot+2,21, foot,30]);
    polygon(g, light, [bend+1,16, tip,h, foot+1,19, foot,23]);
    if (chapter === 0) polygon(g, middle, [foot-2,24, a-1,16, foot+2,21]);
    if (chapter === 3) polygon(g, "#d5bbd6", [tip,h+1, b-2,17, foot+1,20]);
    polygon(g, "#ffc5ae", [tip,h, tip+1.4,h+4, bend+1,15]);
  }
  polygon(g, dark, [0,28, 7,26, 14,29, 22,26, 32,28, 32,32, 0,32]);
}

export function paintFracturedIce(g, variant) {
  const split = [11,18,14][variant], joint = [18,12,20][variant];
  polygon(g, "#3d6476", [1,2, 29,0, 32,4, 30,23, 24,30, 16,28, 12,32, 3,28, 0,19]);
  polygon(g, "#aad5d7", [1,2, split-1,0, joint-2,12, 7,18, 1,15]);
  polygon(g, "#73abb8", [split+2,1, 29,0, 31,4, 25,15, joint+1,12]);
  polygon(g, "#77a4b2", [2,17, 7,19, joint-1,15, 13,24, 9,29, 4,26]);
  polygon(g, "#5c8499", [joint+2,15, 25,17, 30,8, 28,24, 24,28, 15,26]);
  polygon(g, "#e0faf4", [1,1, split-1,0, joint-3,8, split-2,3, 2,5]);
  polygon(g, "#d2f5f0", [split+2,0, 29,0, 26,3, split+4,4]);
}
