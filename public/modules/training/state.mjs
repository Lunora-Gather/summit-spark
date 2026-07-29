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
