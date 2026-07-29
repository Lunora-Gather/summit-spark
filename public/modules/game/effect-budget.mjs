const EFFECT_LIMITS = Object.freeze({
  particles: Object.freeze({ normal: 240, calm: 170, reduced: 120, low: 96 }),
  ghosts: Object.freeze({ normal: 12, calm: 9, reduced: 7, low: 6 }),
  shards: Object.freeze({ normal: 18, calm: 14, reduced: 10, low: 8 }),
  lightTrails: Object.freeze({ normal: 18, calm: 14, reduced: 10, low: 8 })
});

export const EFFECT_BUDGETS = EFFECT_LIMITS;

export function effectQueueLimit(kind, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(EFFECT_LIMITS, kind)) return 0;
  const limits = EFFECT_LIMITS[kind];
  if (options && options.lowPerformance === true) return limits.low;
  if (options && options.reducedMotion === true) return limits.reduced;
  if (options && options.calmEffects === true) return limits.calm;
  return limits.normal;
}

export function enforceEffectQueueBudget(queue, limit) {
  if (!Array.isArray(queue)) return 0;
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const excess = Math.max(0, queue.length - safeLimit);
  if (excess > 0) queue.splice(0, excess);
  return excess;
}
