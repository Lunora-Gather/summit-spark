export const REPLAY_ACTION_LABELS = Object.freeze({
  dash: "冲刺",
  spark: "Spark",
  over: "过载",
  overDash: "过载冲刺",
  prismSpark: "过载 Spark",
  pace: "PB"
});

function ownValue(point, key) {
  return point && typeof point === "object" && Object.prototype.hasOwnProperty.call(point, key)
    ? point[key]
    : undefined;
}

function pointState(point) {
  return {
    dash: ownValue(point, "dash") === true,
    spark: ownValue(point, "spark") === true,
    over: ownValue(point, "over") === true
  };
}

function replayActionKind(current, previous) {
  if (current.over && !previous.over) return "over";
  if (current.spark && !previous.spark) return current.over ? "prismSpark" : "spark";
  if (current.dash && !previous.dash) return current.over ? "overDash" : "dash";
  return "";
}

export function replayActionMarkersData(path, options = {}) {
  if (!Array.isArray(path)) return [];
  const maxMarkers = Number.isFinite(options.maxMarkers)
    ? Math.max(0, Math.floor(options.maxMarkers))
    : 12;
  const minPointGap = Number.isFinite(options.minPointGap)
    ? Math.max(0, Math.floor(options.minPointGap))
    : 2;
  if (maxMarkers === 0) return [];

  const markers = [];
  let previous = pointState(null);
  let lastMarkerIndex = -Infinity;
  for (let index = 0; index < path.length && markers.length < maxMarkers; index += 1) {
    const point = path[index];
    const current = pointState(point);
    const kind = replayActionKind(current, previous);
    previous = current;
    if (!kind || index - lastMarkerIndex < minPointGap) continue;
    const x = Number(ownValue(point, "x"));
    const y = Number(ownValue(point, "y"));
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const t = Number(ownValue(point, "t"));
    markers.push({
      kind,
      label: REPLAY_ACTION_LABELS[kind],
      x,
      y,
      t: Number.isFinite(t) && t >= 0 ? t : 0,
      index
    });
    lastMarkerIndex = index;
  }
  return markers;
}

export function replayGhostStateData(point) {
  const state = pointState(point);
  const kind = state.spark
    ? state.over ? "prismSpark" : "spark"
    : state.dash
      ? state.over ? "overDash" : "dash"
      : state.over ? "over" : "pace";
  return { kind, label: REPLAY_ACTION_LABELS[kind] };
}
