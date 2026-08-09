function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function roomWorldData(rows, options = {}) {
  const tile = Math.max(1, finite(options.tile, 32));
  const minColumns = Math.max(1, Math.floor(finite(options.minColumns, 30)));
  if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== "string") return null;
  const columns = rows[0].length;
  if (columns < minColumns || rows.some((row) => typeof row !== "string" || row.length !== columns)) return null;
  return { columns, width: columns * tile };
}

export function roomEntrySpawnData(rows, options = {}) {
  const tile = Math.max(1, finite(options.tile, 32));
  const playerWidth = Math.max(1, finite(options.playerWidth, 19));
  const playerHeight = Math.max(1, finite(options.playerHeight, 25));
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const anchors = [];
  rows.forEach((row, y) => {
    if (typeof row !== "string") return;
    Array.from(row).forEach((marker, x) => {
      if (marker === "S" || marker === "P") anchors.push({ x, y, marker });
    });
  });
  if (anchors.length !== 1) return null;
  const anchor = anchors[0];
  return {
    x: anchor.x * tile + (tile - playerWidth) / 2,
    y: anchor.y * tile + tile - playerHeight,
    tileX: anchor.x,
    tileY: anchor.y,
    marker: anchor.marker
  };
}

export function nearestSafePositionData(options = {}) {
  const originX = finite(options.x, 0);
  const originY = finite(options.y, 0);
  const maxRadius = Math.max(0, Math.floor(finite(options.maxRadius, 64)));
  const isBlocked = typeof options.isBlocked === "function" ? options.isBlocked : () => false;
  if (!isBlocked(originX, originY)) {
    return { x: originX, y: originY, recovered: false, distance: 0 };
  }
  const directions = [
    [0, -1],
    [-1, 0], [1, 0],
    [-1, -1], [1, -1],
    [0, 1],
    [-1, 1], [1, 1]
  ];
  for (const [directionX, directionY] of directions) {
    for (let radius = 1; radius <= maxRadius; radius += 1) {
      const x = originX + directionX * radius;
      const y = originY + directionY * radius;
      if (!isBlocked(x, y)) return { x, y, recovered: true, distance: radius };
    }
  }
  return null;
}

export function cameraFollowData(options = {}) {
  const viewportWidth = Math.max(1, finite(options.viewportWidth, 960));
  const worldWidth = Math.max(viewportWidth, finite(options.worldWidth, viewportWidth));
  const maxCamera = worldWidth - viewportWidth;
  const playerCenter = finite(options.playerCenter, 0);
  const velocityX = finite(options.velocityX, 0);
  const lookAhead = clamp(velocityX * finite(options.lookAheadTime, 0.1), -40, 40);
  const anticipatedCenter = playerCenter + lookAhead;
  const leftGuide = viewportWidth * clamp(finite(options.leftGuide, 0.36), 0.1, 0.49);
  const rightGuide = viewportWidth * clamp(finite(options.rightGuide, 0.64), 0.51, 0.9);
  let target = clamp(finite(options.targetX, 0), 0, maxCamera);
  const screenX = anticipatedCenter - target;
  if (screenX > rightGuide) target = anticipatedCenter - rightGuide;
  if (screenX < leftGuide) target = anticipatedCenter - leftGuide;
  target = clamp(target, 0, maxCamera);
  const current = clamp(finite(options.cameraX, target), 0, maxCamera);
  const follow = 1 - Math.exp(-Math.max(0, finite(options.dt, 0)) * Math.max(0.1, finite(options.followRate, 11.5)));
  let camera = current + (target - current) * follow;
  if (Math.abs(target - camera) < 0.05) camera = target;
  return { cameraX: clamp(camera, 0, maxCamera), targetX: target, maxCamera, lookAhead };
}

export function phaseBlockActiveData(options = {}) {
  const period = Math.max(0.1, finite(options.period, 2.4));
  const activeTime = clamp(finite(options.activeTime, 1.42), 0.05, period - 0.01);
  const clock = ((finite(options.elapsed, 0) % period) + period) % period;
  const wantsActive = clock < activeTime;
  const trapped = options.wasActive === false && options.overlapping === true;
  const warningTime = clamp(finite(options.warningTime, 0.32), 0.02, period / 2);
  const warning = wantsActive
    ? clock >= Math.max(0, activeTime - warningTime)
    : clock >= period - warningTime;
  return { active: wantsActive && !trapped, clock, wantsActive, warning };
}

export function driftShardPositionData(options = {}) {
  const axis = options.axis === "x" ? "x" : "y";
  const baseX = finite(options.baseX, 0);
  const baseY = finite(options.baseY, 0);
  const amplitude = Math.max(0, finite(options.amplitude, 44));
  const travel = Math.sin(finite(options.elapsed, 0) * finite(options.speed, 1.55) + finite(options.phase, 0)) * amplitude;
  return {
    x: baseX + (axis === "x" ? travel : 0),
    y: baseY + (axis === "y" ? travel : 0),
    travel
  };
}
