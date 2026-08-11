export function aabb(a, b) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

export function distRectPoint(rect, x, y) {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.w));
  const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.h));
  return Math.hypot(dx, dy);
}

export function approach(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

export function fixedStepFrameData({
  elapsed = 0,
  accumulator = 0,
  step = 1 / 120,
  maxFrame = 0.1,
  maxSteps = 12
} = {}) {
  const safeElapsed = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0;
  const safeAccumulator = Number.isFinite(accumulator) && accumulator > 0 ? accumulator : 0;
  const safeStep = Number.isFinite(step) && step > 0 ? step : 1 / 120;
  const safeMaxFrame = Number.isFinite(maxFrame) && maxFrame > 0 ? maxFrame : 0.1;
  const safeMaxSteps = Number.isInteger(maxSteps) && maxSteps > 0 ? maxSteps : 12;
  const frameDt = Math.min(safeElapsed, safeMaxFrame);
  const total = safeAccumulator + frameDt;
  const availableSteps = Math.floor((total + safeStep * 1e-7) / safeStep);
  const steps = Math.min(availableSteps, safeMaxSteps);
  let remainder = Math.max(0, total - steps * safeStep);
  let dropped = 0;

  if (availableSteps > safeMaxSteps) {
    dropped = remainder - (remainder % safeStep);
    remainder %= safeStep;
  }

  return {
    elapsed: safeElapsed,
    frameDt,
    step: safeStep,
    steps,
    remainder,
    dropped
  };
}
