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

export function practiceRoomRecommendationsData(rows = []) {
  const seen = new Set();
  const rooms = Array.isArray(rows)
    ? rows.filter((row) => {
        if (!row || typeof row !== "object" || !Number.isInteger(row.index) || row.index < 0 || seen.has(row.index)) return false;
        seen.add(row.index);
        return true;
      })
    : [];
  if (!rooms.length) {
    return { recommended: -1, clean: -1, pace: -1, style: -1, expert: -1 };
  }

  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const count = (row, key) => Math.max(0, Math.trunc(number(row.entry?.[key])));
  const firstIndex = (predicate) => rooms.find(predicate)?.index ?? -1;

  let strongest = { index: -1, score: 0 };
  for (const row of rooms) {
    const score = Math.max(0, number(row.focusScore));
    if (score > strongest.score) strongest = { index: row.index, score };
  }

  let recommended = strongest.score >= 2 ? strongest.index : firstIndex((row) => !(number(row.best) > 0));
  if (recommended < 0) recommended = firstIndex((row) => row.grade !== "S");
  if (recommended < 0) {
    let closest = -Infinity;
    recommended = rooms[0].index;
    for (const row of rooms) {
      const target = number(row.target, 1) || 1;
      const ratio = number(row.best) / target;
      if (ratio > closest) {
        closest = ratio;
        recommended = row.index;
      }
    }
  }

  const cleanCandidate = firstIndex((row) => count(row, "clean") <= 0);
  const clean = cleanCandidate >= 0 ? cleanCandidate : recommended;

  let largestLoss = { index: -1, loss: -Infinity };
  for (const row of rooms) {
    if (row.loss === null) continue;
    const loss = number(row.loss, -Infinity);
    if (loss > largestLoss.loss) largestLoss = { index: row.index, loss };
  }
  let pace = largestLoss.index >= 0 && largestLoss.loss > 0
    ? largestLoss.index
    : firstIndex((row) => row.grade !== "S");
  if (pace < 0) pace = recommended;

  let style = firstIndex((row) => count(row, "clean") > 0 && row.grade === "S" && count(row, "styleWins") <= 0);
  if (style < 0) {
    style = firstIndex((row) => (number(row.best) > 0 || count(row, "clean") > 0) && count(row, "styleWins") <= 0);
  }
  if (style < 0) style = pace;

  let expert = firstIndex((row) => (
    row.grade === "S"
    && count(row, "clean") > 0
    && count(row, "styleWins") > 0
    && count(row, "expertWins") <= 0
  ));
  if (expert < 0) expert = firstIndex((row) => row.grade === "S");
  if (expert < 0) expert = pace;

  return { recommended, clean, pace, style, expert };
}

export function practicePlanTargetsData({
  first,
  entry,
  best,
  grade,
  recommendations,
  ledgerRows
} = {}) {
  if (!first || !Number.isInteger(first.index) || first.index < 0 || typeof first.mode !== "string" || !first.mode) {
    return { first: null, second: null, third: null };
  }
  const firstTarget = { ...first };
  const nextMode = first.mode === "clean"
    ? "pace"
    : first.mode === "pace"
      ? "style"
      : first.mode === "style"
        ? "expert"
        : "style";
  const count = (key) => Math.max(0, Math.trunc(Number(entry?.[key]) || 0));
  const validRecommendation = (key) => {
    const index = recommendations?.[key];
    return Number.isInteger(index) && index >= 0 ? index : first.index;
  };

  let secondIndex = first.index;
  if (nextMode === "style" && !(count("clean") > 0 || Number(best) > 0)) {
    secondIndex = validRecommendation("style");
  } else if (nextMode === "expert") {
    const ready = grade === "S" && count("clean") > 0 && count("styleWins") > 0;
    if (!ready) secondIndex = validRecommendation("expert");
  }
  const secondTarget = { index: secondIndex, mode: nextMode };
  const rows = Array.isArray(ledgerRows)
    ? ledgerRows.filter((row) => row && Number.isInteger(row.index) && row.index >= 0 && typeof row.mode === "string" && row.mode)
    : [];
  const sameTarget = (left, right) => left.index === right.index && left.mode === right.mode;
  const fallbackMode = ["clean", "pace", "style", "expert"].find((mode) => (
    !sameTarget({ index: first.index, mode }, firstTarget)
    && !sameTarget({ index: first.index, mode }, secondTarget)
  )) || "expert";
  const thirdTarget = rows.find((row) => row.index !== firstTarget.index && row.index !== secondTarget.index)
    || rows.find((row) => !sameTarget(row, firstTarget) && !sameTarget(row, secondTarget))
    || {
      index: first.index,
      mode: fallbackMode,
      score: first.score,
      level: first.level
    };

  return {
    first: firstTarget,
    second: secondTarget,
    third: { ...thirdTarget }
  };
}

function boundedProgress(current, target) {
  if (!(target > 0)) return 0;
  return Math.round(Math.max(0, Math.min(1, current / target)) * 100);
}

export function createActiveChallengeData(challenge, bestFlow) {
  if (!challenge?.id) return null;
  return {
    id: challenge.id,
    kind: challenge.kind,
    label: challenge.label,
    goal: challenge.goal,
    startBestFlow: Math.floor(Math.max(0, Number(bestFlow) || 0))
  };
}

export function activeChallengeStateData(active, challenge, {
  won,
  roomIndex,
  roomTotal,
  deathCount,
  flowPeak,
  flowTarget,
  bestFlow,
  collectedLumens,
  totalLumens
} = {}) {
  if (!active || !challenge || active.id !== challenge.id) return null;
  const total = Math.max(1, Math.trunc(Number(roomTotal) || 0));
  const room = Math.max(0, Math.min(total - 1, Math.trunc(Number(roomIndex) || 0)));
  const reachedRooms = won ? total : room;
  let current = reachedRooms;
  let target = total;
  let detail = won ? "完整路线已结束" : `当前 R${room + 1}/${total}`;
  let failed = false;
  let done = Boolean(won);

  if (challenge.kind === "nodeath") {
    const deaths = Math.max(0, Math.trunc(Number(deathCount) || 0));
    failed = deaths > 0;
    done = Boolean(won) && deaths === 0;
    detail = failed ? `已有失误 ${deaths}，继续完成可保留复盘` : `失误 0 · 当前 R${room + 1}/${total}`;
  } else if (challenge.kind === "flow") {
    current = Math.floor(Math.max(0, Number(flowPeak) || 0));
    target = Math.max(1, Math.floor(Number(flowTarget) || 0));
    done = current >= target;
    detail = `本轮 ${current}/${target} · 历史整局 ${Math.floor(Math.max(0, Number(bestFlow) || 0))}`;
  } else if (challenge.kind === "lumens") {
    target = Math.max(1, Math.trunc(Number(totalLumens) || 0));
    current = Math.min(target, Math.max(0, Math.trunc(Number(collectedLumens) || 0)));
    done = Boolean(won) && current === target;
    detail = `${current}/${target} · ${won ? "完整路线已结束" : `当前 R${room + 1}/${total}`}`;
  }

  return {
    ...challenge,
    current,
    target,
    progress: boundedProgress(current, target),
    detail,
    failed,
    done,
    status: done ? "达成" : failed ? "已破" : won ? "未达成" : "进行中"
  };
}

export function activeChallengeReviewData(state) {
  if (!state) return null;
  const value = `${state.status} · ${state.label}`;
  const detail = state.done
    ? state.goal
    : state.kind === "flow"
      ? `还差 ${Math.max(0, state.target - state.current)} Flow；${state.detail}`
      : state.failed
        ? `${state.detail}；下一轮从 R1 重开`
        : `${state.progress}% · ${state.detail}`;
  return { value, detail };
}

export function challengeProgressData(challenge, {
  roomTotal,
  summitClears,
  bestTime,
  cleanRooms,
  sRooms,
  styleRooms,
  expertRooms,
  bestDeathCount,
  bestFlow,
  flowTarget,
  bestLumens,
  totalLumens
} = {}) {
  const total = Math.max(1, Math.trunc(Number(roomTotal) || 0));
  const summitCount = Math.max(0, Math.trunc(Number(summitClears) || 0));
  let current = 0;
  let target = 1;
  let detail = challenge?.goal || "";

  if (challenge?.kind === "run") {
    current = summitCount > 0 || Number(bestTime) > 0 ? 1 : 0;
    detail = current ? `已登顶 ${summitCount || 1} 次` : "从 R1 开始完整通关";
  } else if (challenge?.kind === "clean") {
    current = Math.max(0, Math.trunc(Number(cleanRooms) || 0));
    target = total;
    detail = `Clean ${current}/${target}`;
  } else if (challenge?.kind === "pace") {
    current = Math.max(0, Math.trunc(Number(sRooms) || 0));
    target = total;
    detail = `S ${current}/${target}`;
  } else if (challenge?.kind === "style") {
    current = Math.max(0, Math.trunc(Number(styleRooms) || 0));
    target = total;
    detail = `Style ${current}/${target}`;
  } else if (challenge?.kind === "expert") {
    current = Math.max(0, Math.trunc(Number(expertRooms) || 0));
    target = total;
    detail = `Expert ${current}/${target}`;
  } else if (challenge?.kind === "nodeath") {
    current = bestDeathCount === 0 ? 1 : 0;
    detail = bestDeathCount === null || bestDeathCount === undefined
      ? "未记录完整通关失误数"
      : `最佳失误 ${Math.max(0, Math.trunc(Number(bestDeathCount) || 0))}`;
  } else if (challenge?.kind === "flow") {
    target = Math.max(1, Math.floor(Number(flowTarget) || 0));
    current = Math.min(target, Math.max(0, Number(bestFlow) || 0));
    detail = `整局 Flow ${Math.floor(Math.max(0, Number(bestFlow) || 0))}/${target}`;
  } else if (challenge?.kind === "lumens") {
    target = Math.max(1, Math.trunc(Number(totalLumens) || 0));
    current = Math.min(target, Math.max(0, Math.trunc(Number(bestLumens) || 0)));
    detail = `最佳微光 ${current}/${target}`;
  }

  const progress = boundedProgress(current, target);
  return {
    current,
    target,
    progress,
    done: progress >= 100,
    detail
  };
}

export function reconcileChallengeWinsData(currentWins, challengeItems, allowedIds) {
  const allowed = new Set(Array.from(allowedIds || []).filter((id) => typeof id === "string"));
  const next = {};
  allowed.forEach((id) => {
    if (currentWins?.[id] === true) next[id] = true;
  });
  Array.from(challengeItems || []).forEach((item) => {
    if (item?.done && allowed.has(item.id)) next[item.id] = true;
  });
  const before = currentWins && typeof currentWins === "object"
    ? Object.keys(currentWins).filter((id) => currentWins[id] === true).sort()
    : [];
  const after = Object.keys(next).sort();
  return {
    challengeWins: next,
    changed: before.length !== after.length || before.some((id, index) => id !== after[index])
  };
}

export function createRouteInterruptionResultData(active, contracts, reason, stepLabel) {
  const data = activeRouteContractDataFor(active, contracts);
  if (!data) return null;
  const label = typeof stepLabel === "function" ? stepLabel(data.step) : "";
  return {
    id: data.contract.id,
    label: data.contract.label,
    done: false,
    step: data.stepIndex,
    detail: `${reason}：停在 ${data.stepIndex + 1}/${data.total}${label ? ` ${label}` : ""}`
  };
}

export function createRouteCompletionResultData(contract) {
  if (!contract?.id) return null;
  return {
    id: contract.id,
    label: contract.label,
    done: true,
    detail: contract.goal || ""
  };
}

export function routeContractSummaryTextData({
  active,
  lastResult,
  nextContract,
  nextProgress,
  stepLabel
} = {}) {
  if (active) {
    const label = typeof stepLabel === "function" ? stepLabel(active.step) : "";
    return `航线 ${active.contract.label} ${active.stepIndex + 1}/${active.total}${label ? `：${label}` : ""}`;
  }
  if (lastResult) {
    return lastResult.done
      ? `航线 ${lastResult.label} 已完成`
      : `航线 ${lastResult.label} 可继续`;
  }
  return nextContract
    ? `航线建议 ${nextContract.label} ${Math.max(0, Math.min(100, Math.round(Number(nextProgress) || 0)))}%`
    : "航线建议 暂无";
}

function fixtureById(fixtures, id) {
  return Array.from(fixtures || []).find((fixture) => fixture?.id === id) || null;
}

export function createFeelInterruptionResultData(active, fixtures, reason) {
  if (!active) return null;
  const fixture = fixtureById(fixtures, active.id);
  if (!fixture) return null;
  return {
    id: fixture.id,
    done: false,
    detail: `${reason}：${fixture.note}`
  };
}

export function createFeelCompletionResultData(active, fixtures, {
  room,
  mode,
  clean,
  elapsed,
  formatTime
} = {}) {
  if (!active || active.room !== room || active.mode !== mode) return null;
  const fixture = fixtureById(fixtures, active.id);
  if (!fixture) return null;
  const time = typeof formatTime === "function" ? formatTime(elapsed) : String(elapsed);
  return {
    id: fixture.id,
    done: true,
    detail: `${fixture.note} / ${time}${clean ? " / 无失误" : ""}`
  };
}

export function feelFixturePresentationData(fixture, active, lastResult, fallback) {
  if (active?.id === fixture?.id) {
    return {
      status: "进行中",
      detail: `当前校准：${fixture.note}`,
      className: "active"
    };
  }
  if (lastResult?.id === fixture?.id) {
    return {
      status: lastResult.done ? "刚完成" : "已中断",
      detail: lastResult.detail,
      className: lastResult.done ? "recent" : "interrupted"
    };
  }
  return {
    status: fallback,
    detail: fixture?.note || "",
    className: ""
  };
}
