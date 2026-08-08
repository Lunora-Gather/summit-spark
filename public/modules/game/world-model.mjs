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

export function cameraFollowData(options = {}) {
  const viewportWidth = Math.max(1, finite(options.viewportWidth, 960));
  const worldWidth = Math.max(viewportWidth, finite(options.worldWidth, viewportWidth));
  const maxCamera = worldWidth - viewportWidth;
  const playerCenter = finite(options.playerCenter, 0);
  const leftGuide = viewportWidth * clamp(finite(options.leftGuide, 0.36), 0.1, 0.49);
  const rightGuide = viewportWidth * clamp(finite(options.rightGuide, 0.64), 0.51, 0.9);
  let target = clamp(finite(options.targetX, 0), 0, maxCamera);
  const screenX = playerCenter - target;
  if (screenX > rightGuide) target = playerCenter - rightGuide;
  if (screenX < leftGuide) target = playerCenter - leftGuide;
  target = clamp(target, 0, maxCamera);
  const current = clamp(finite(options.cameraX, target), 0, maxCamera);
  const follow = 1 - Math.exp(-Math.max(0, finite(options.dt, 0)) * Math.max(0.1, finite(options.followRate, 9.5)));
  let camera = current + (target - current) * follow;
  if (Math.abs(target - camera) < 0.05) camera = target;
  return { cameraX: clamp(camera, 0, maxCamera), targetX: target, maxCamera };
}

export function phaseBlockActiveData(options = {}) {
  const period = Math.max(0.1, finite(options.period, 2.4));
  const activeTime = clamp(finite(options.activeTime, 1.42), 0.05, period - 0.01);
  const clock = ((finite(options.elapsed, 0) % period) + period) % period;
  const wantsActive = clock < activeTime;
  const trapped = options.wasActive === false && options.overlapping === true;
  return { active: wantsActive && !trapped, clock, wantsActive };
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
