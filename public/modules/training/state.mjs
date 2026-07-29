export const TRAINING_TRANSITIONS = Object.freeze({
  hardReset: Object.freeze({
    keepDrill: false,
    keepChallenge: false,
    keepRoute: false,
    keepFeel: false,
    routeReason: "重开路线",
    feelReason: "重开中断"
  }),
  jumpRoom: Object.freeze({
    keepDrill: false,
    keepChallenge: false,
    keepRoute: false,
    keepFeel: false,
    routeReason: "跳房中断",
    feelReason: "跳房中断"
  })
});

export function trainingTransitionOptionsData(name, overrides = {}) {
  const base = typeof name === "string" && Object.hasOwn(TRAINING_TRANSITIONS, name)
    ? TRAINING_TRANSITIONS[name]
    : {};
  return { ...base, ...overrides };
}

export function createDrillData(room, mode, objective, target) {
  return {
    room,
    mode,
    objective,
    target: Number.isFinite(target) ? Math.max(0, target) : 0
  };
}

export function drillSucceededData(drill, {
  clean,
  elapsed,
  styleSucceeded = false,
  expertRequirementsMet = false
} = {}) {
  if (!drill) return false;
  if (drill.mode === "clean") return Boolean(clean);
  if (drill.mode === "pace") return drill.target > 0 && elapsed <= drill.target;
  if (drill.mode === "style") return Boolean(styleSucceeded);
  if (drill.mode === "expert") {
    return Boolean(clean)
      && drill.target > 0
      && elapsed <= drill.target
      && Boolean(expertRequirementsMet);
  }
  return true;
}

function routeContractById(contracts, id) {
  return Array.from(contracts || []).find((contract) => contract?.id === id) || null;
}

export function routeStepIndexData(contract, step) {
  if (!Array.isArray(contract?.steps) || contract.steps.length === 0) return -1;
  const numeric = Number(step);
  const index = Number.isFinite(numeric) ? Math.trunc(numeric) : 0;
  return Math.max(0, Math.min(contract.steps.length - 1, index));
}

export function createRouteContractStateData(contract, step, generation) {
  const stepIndex = routeStepIndexData(contract, step);
  if (!contract?.id || stepIndex < 0) return null;
  return {
    id: contract.id,
    step: stepIndex,
    generation
  };
}

export function activeRouteContractDataFor(active, contracts) {
  if (!active) return null;
  const contract = routeContractById(contracts, active.id);
  if (!contract) return null;
  const stepIndex = routeStepIndexData(contract, active.step);
  if (stepIndex < 0) return null;
  const step = contract.steps[stepIndex];
  if (!step) return null;
  return {
    contract,
    step,
    stepIndex,
    total: contract.steps.length
  };
}

export function routeContractMatchesDrillData(active, contracts, drill) {
  const data = activeRouteContractDataFor(active, contracts);
  return Boolean(
    data
    && drill
    && data.step.index === drill.room
    && data.step.mode === drill.mode
  );
}

export function routeContractResumeStepData(lastResult, contract) {
  if (!lastResult || lastResult.done || lastResult.id !== contract?.id) return -1;
  const step = Number(lastResult.step);
  return Number.isInteger(step) ? routeStepIndexData(contract, step) : 0;
}

export function advanceRouteContractData(active, contract, room, mode) {
  if (!active || !contract || active.id !== contract.id) {
    return { matched: false, done: false, state: active || null, next: null };
  }
  const stepIndex = routeStepIndexData(contract, active.step);
  const step = stepIndex >= 0 ? contract.steps[stepIndex] : null;
  if (!step || step.index !== room || step.mode !== mode) {
    return { matched: false, done: false, state: active, next: null };
  }
  const nextIndex = stepIndex + 1;
  const next = contract.steps[nextIndex] || null;
  return {
    matched: true,
    done: !next,
    state: next ? { ...active, step: nextIndex } : null,
    next
  };
}

export function feelFixtureModeData(fixture) {
  const expected = Array.isArray(fixture?.expected) ? fixture.expected : [];
  if (expected.includes("prismSpark") || expected.includes("wallSpark") || expected.includes("spark")) return "style";
  if (expected.includes("dash")) return "pace";
  return "clean";
}

export function feelFixtureMatchesDrillData(activeFeel, drill) {
  return Boolean(
    activeFeel
    && drill
    && activeFeel.room === drill.room
    && activeFeel.mode === drill.mode
  );
}

const FOCUS_COUNTER_MAX = 9999;
const DRILL_MODE_COUNTERS = Object.freeze({
  clean: Object.freeze({ starts: "cleanDrills", wins: "cleanWins" }),
  pace: Object.freeze({ starts: "paceDrills", wins: "paceWins" }),
  style: Object.freeze({ starts: "styleDrills", wins: "styleWins" }),
  expert: Object.freeze({ starts: "expertDrills", wins: "expertWins" })
});

function focusCount(value) {
  return Number.isInteger(value) && value >= 0
    ? Math.min(FOCUS_COUNTER_MAX, value)
    : 0;
}

function incrementFocusCount(value) {
  return Math.min(FOCUS_COUNTER_MAX, focusCount(value) + 1);
}

export function leadingRoomReasonData(entry, deathReasonKeys, normalizeReason) {
  let lead = "fall";
  let count = -1;
  Array.from(deathReasonKeys || []).forEach((key) => {
    const value = focusCount(entry?.[key]);
    if (value > count) {
      lead = key;
      count = value;
    }
  });
  return count > 0 ? lead : normalizeReason(entry?.last);
}

export function recordRoomFaultData(entry, reason) {
  return {
    ...entry,
    faults: incrementFocusCount(entry?.faults),
    [reason]: incrementFocusCount(entry?.[reason]),
    last: reason
  };
}

export function recordRoomClearData(entry, clean) {
  return {
    ...entry,
    clears: incrementFocusCount(entry?.clears),
    clean: Boolean(clean) ? incrementFocusCount(entry?.clean) : focusCount(entry?.clean)
  };
}

export function recordDrillStartData(entry, mode = "auto") {
  const next = {
    ...entry,
    drills: incrementFocusCount(entry?.drills)
  };
  const field = Object.hasOwn(DRILL_MODE_COUNTERS, mode)
    ? DRILL_MODE_COUNTERS[mode].starts
    : "";
  if (field) next[field] = incrementFocusCount(entry?.[field]);
  return next;
}

export function recordDrillClearData(entry, clean, mode = "auto") {
  const next = {
    ...entry,
    drillClears: incrementFocusCount(entry?.drillClears),
    drillClean: Boolean(clean)
      ? incrementFocusCount(entry?.drillClean)
      : focusCount(entry?.drillClean)
  };
  const field = Object.hasOwn(DRILL_MODE_COUNTERS, mode)
    ? DRILL_MODE_COUNTERS[mode].wins
    : "";
  if (field) next[field] = incrementFocusCount(entry?.[field]);
  return next;
}

export function drillContractStatsData(entry, mode) {
  const fields = Object.hasOwn(DRILL_MODE_COUNTERS, mode)
    ? DRILL_MODE_COUNTERS[mode]
    : null;
  return fields
    ? { starts: focusCount(entry?.[fields.starts]), wins: focusCount(entry?.[fields.wins]) }
    : { starts: focusCount(entry?.drills), wins: focusCount(entry?.drillClears) };
}

export function drillContractProgressData(stats) {
  const starts = focusCount(stats?.starts);
  const wins = focusCount(stats?.wins);
  if (starts <= 0) return 0;
  return Math.round(Math.max(0, Math.min(1, wins / starts)) * 100);
}

export function roomFocusScoreData(entry, currentMistakes) {
  const current = focusCount(currentMistakes);
  const faults = focusCount(entry?.faults);
  const clean = focusCount(entry?.clean);
  return current * 4 + Math.max(0, faults - clean * 2);
}

export function roomMasteryScoreData({
  entry,
  best,
  grade,
  focusScore
}) {
  let score = 0;
  if (Number.isFinite(best) && best > 0) score += 18;
  if (focusCount(entry?.clean) > 0) score += 24;
  if (grade === "S") score += 26;
  else if (grade === "A") score += 20;
  else if (grade === "B") score += 13;
  else if (grade === "C") score += 7;
  if (focusCount(entry?.expertWins) > 0) score += 22;
  else if (focusCount(entry?.styleWins) > 0) score += 18;
  else if (focusCount(entry?.paceWins) > 0) score += 15;
  else if (focusCount(entry?.cleanWins) > 0) score += 9;
  score -= Math.min(18, Math.max(0, Number(focusScore) || 0) * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function roomMasteryLevelData(score) {
  if (score >= 86) return "掌握";
  if (score >= 66) return "稳定";
  if (score >= 42) return "成形";
  if (score >= 18) return "可通";
  return "待练";
}

export function roomReviewModeData({
  entry,
  loss,
  pressure,
  grade
}) {
  if (focusCount(entry?.clean) <= 0 || pressure >= 8) return "clean";
  if (loss === null || loss > 0 || grade !== "S") return "pace";
  if (focusCount(entry?.styleWins) <= 0) return "style";
  return "expert";
}
