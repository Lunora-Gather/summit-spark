function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegativeNumber(value) {
  return Math.max(0, finiteNumber(value));
}

export function chapterCompletionData(input = {}) {
  const roomTotal = Math.max(1, Math.floor(nonNegativeNumber(input.roomTotal)));
  const clear = nonNegativeNumber(input.clear);
  const clean = nonNegativeNumber(input.clean);
  const pace = nonNegativeNumber(input.pace);
  const style = nonNegativeNumber(input.style);
  const expert = nonNegativeNumber(input.expert);
  const mastery = Math.max(0, Math.min(100, nonNegativeNumber(input.mastery)));
  const weighted = (
    (clear / roomTotal) * 18
    + (clean / roomTotal) * 18
    + (pace / roomTotal) * 20
    + (style / roomTotal) * 20
    + (expert / roomTotal) * 18
    + (mastery / 100) * 6
  );
  return {
    clear,
    clean,
    pace,
    style,
    expert,
    mastery: Math.round(mastery),
    percent: Math.max(0, Math.min(100, Math.round(weighted)))
  };
}

export function chapterGrade(percent) {
  const score = finiteNumber(percent);
  if (score >= 92) return "SS";
  if (score >= 78) return "S";
  if (score >= 62) return "A";
  if (score >= 42) return "B";
  if (score >= 20) return "C";
  return "D";
}

export function roomReviewPriorityData(input = {}) {
  const entry = input.entry && typeof input.entry === "object" ? input.entry : {};
  const roomCount = Math.max(0, Math.floor(nonNegativeNumber(input.roomCount)));
  const index = Math.max(0, Math.floor(nonNegativeNumber(input.index)));
  const pressure = nonNegativeNumber(input.pressure);
  const loss = input.loss === null ? null : finiteNumber(input.loss, null);
  let score = pressure * 8;
  if (!(finiteNumber(input.best) > 0)) score += 80;
  if (finiteNumber(entry.clean) <= 0) score += 46;
  if (loss === null) score += 26;
  else if (loss > 0) score += 24 + Math.min(42, loss * 5);
  if (finiteNumber(entry.paceWins) <= 0) score += 12;
  if (finiteNumber(entry.styleWins) <= 0) score += 10;
  if (finiteNumber(entry.expertWins) <= 0) score += 8;
  return score + Math.max(0, roomCount - index) * 0.01;
}

export function rankPracticeLedgerRowsData(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row === "object")
    .map((row) => ({ ...row }))
    .sort((a, b) => finiteNumber(b.priority) - finiteNumber(a.priority));
}
