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

export function chapterTransitionResultData(input = {}) {
  const roomIndexes = Array.isArray(input.roomIndexes) ? input.roomIndexes : [];
  const roomTimes = Array.isArray(input.roomTimes) ? input.roomTimes : [];
  const roomMistakes = Array.isArray(input.roomMistakes) ? input.roomMistakes : [];
  const seen = new Set();
  const indexes = roomIndexes.filter((index) => {
    if (!Number.isInteger(index) || index < 0 || seen.has(index)) return false;
    seen.add(index);
    return true;
  });
  if (!indexes.length) return null;
  const seconds = indexes.reduce((sum, index) => sum + nonNegativeNumber(roomTimes[index]), 0);
  const mistakes = indexes.reduce((sum, index) => sum + Math.floor(nonNegativeNumber(roomMistakes[index])), 0);
  const visited = indexes.filter((index) => nonNegativeNumber(roomTimes[index]) > 0).length;
  if (!visited) return null;
  const roomCount = indexes.length;
  const complete = visited === roomCount;
  return {
    seconds,
    mistakes,
    visited,
    roomCount,
    complete,
    clean: complete && mistakes === 0
  };
}

export function fullRunRecordEligibilityData(input = {}) {
  const roomTimes = Array.isArray(input.roomTimes) ? input.roomTimes : [];
  const roomCount = Math.max(1, Math.floor(nonNegativeNumber(input.roomCount || roomTimes.length)));
  const visited = roomTimes
    .slice(0, roomCount)
    .filter((seconds) => nonNegativeNumber(seconds) > 0)
    .length;
  const complete = input.routeOriginEligible === true
    && roomTimes.length >= roomCount
    && visited === roomCount;
  return {
    visited,
    roomCount,
    complete,
    eligible: complete && input.recordsEligible === true
  };
}

export function roomSplitFeedbackData(input = {}) {
  const elapsed = finiteNumber(input.elapsed);
  if (!(elapsed > 0)) return null;
  const previousBest = nonNegativeNumber(input.previousBest);
  const target = nonNegativeNumber(input.target);
  const eligible = input.eligible !== false;
  const reference = previousBest > 0 ? previousBest : target;
  const referenceKind = previousBest > 0 ? "pb" : target > 0 ? "target" : "none";
  const delta = reference > 0 ? elapsed - reference : 0;
  const isNewBest = eligible && (previousBest <= 0 || elapsed < previousBest);
  const kind = !eligible
    ? "assist"
    : previousBest <= 0
      ? "first"
      : isNewBest
        ? "pb"
        : "split";
  return {
    elapsed,
    previousBest,
    target,
    eligible,
    kind,
    reference,
    referenceKind,
    delta,
    ahead: reference <= 0 || delta <= 0,
    isNewBest
  };
}

export function postRunReviewData(input = {}) {
  const roomTimes = Array.isArray(input.roomTimes) ? input.roomTimes : [];
  const roomMistakes = Array.isArray(input.roomMistakes) ? input.roomMistakes : [];
  const targets = Array.isArray(input.targets) ? input.targets : [];
  const roomCount = Math.max(roomTimes.length, roomMistakes.length, targets.length);
  const visited = [];
  for (let index = 0; index < roomCount; index += 1) {
    const seconds = nonNegativeNumber(roomTimes[index]);
    if (!(seconds > 0)) continue;
    const target = nonNegativeNumber(targets[index]);
    const mistakes = Math.floor(nonNegativeNumber(roomMistakes[index]));
    visited.push({
      index,
      seconds,
      target,
      mistakes,
      loss: target > 0 ? seconds - target : null
    });
  }
  if (!visited.length) return null;
  const byLoss = (a, b) => {
    const aLoss = a.loss === null ? -Infinity : a.loss;
    const bLoss = b.loss === null ? -Infinity : b.loss;
    return bLoss - aLoss || a.index - b.index;
  };
  const largestLoss = visited
    .filter((room) => room.loss !== null)
    .sort(byLoss)[0] || null;
  const mistakeRooms = visited
    .filter((room) => room.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes || byLoss(a, b));
  const paceRooms = visited
    .filter((room) => room.loss !== null && room.loss > 0)
    .sort(byLoss);
  const source = mistakeRooms[0] || paceRooms[0] || null;
  const recommendation = source
    ? {
        ...source,
        reason: source.mistakes > 0 ? "mistakes" : "pace",
        mode: source.mistakes > 0 ? "clean" : "pace"
      }
    : null;
  return {
    visited: visited.length,
    roomCount,
    recommendation,
    largestLoss,
    allTargetsMet: visited.every((room) => room.loss !== null && room.loss <= 0)
  };
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

export function runChapterSplitsData(input = {}) {
  const chapterTitles = Array.isArray(input.chapterTitles) ? input.chapterTitles : [];
  const chapterIndexes = Array.isArray(input.chapterIndexes) ? input.chapterIndexes : [];
  const roomLabels = Array.isArray(input.roomLabels) ? input.roomLabels : [];
  const roomTimes = Array.isArray(input.roomTimes) ? input.roomTimes : [];
  const roomMistakes = Array.isArray(input.roomMistakes) ? input.roomMistakes : [];
  const chapterCount = chapterTitles.length;
  const roomCount = Math.max(chapterIndexes.length, roomLabels.length, roomTimes.length, roomMistakes.length);

  return Array.from({ length: chapterCount }, (_, chapterIndex) => {
    const rooms = [];
    for (let roomIndex = 0; roomIndex < roomCount; roomIndex += 1) {
      const mappedChapter = Number(chapterIndexes[roomIndex]);
      if (Number.isInteger(mappedChapter) && mappedChapter >= 0 && mappedChapter === chapterIndex) rooms.push(roomIndex);
    }
    const firstRoom = rooms[0];
    return {
      index: chapterIndex,
      label: firstRoom === undefined
        ? String(chapterTitles[chapterIndex] || "")
        : String(roomLabels[firstRoom] || chapterTitles[chapterIndex] || ""),
      seconds: rooms.reduce((sum, roomIndex) => sum + nonNegativeNumber(roomTimes[roomIndex]), 0),
      mistakes: rooms.reduce((sum, roomIndex) => sum + Math.floor(nonNegativeNumber(roomMistakes[roomIndex])), 0),
      visited: rooms.filter((roomIndex) => nonNegativeNumber(roomTimes[roomIndex]) > 0).length,
      rooms: rooms.length
    };
  });
}

export function runChapterReviewData(input = {}) {
  const chapters = Array.isArray(input.chapters)
    ? input.chapters.filter((chapter) => chapter && typeof chapter === "object" && nonNegativeNumber(chapter.visited) > 0)
    : [];
  const totalRooms = Math.floor(nonNegativeNumber(input.totalRooms));
  const visitedRooms = chapters.reduce((sum, chapter) => sum + Math.floor(nonNegativeNumber(chapter.visited)), 0);
  if (!chapters.length) {
    return {
      chapters: [],
      visitedRooms: 0,
      totalRooms,
      complete: false,
      slowest: null
    };
  }
  const slowest = chapters.reduce((candidate, chapter) => (
    nonNegativeNumber(chapter.seconds) > nonNegativeNumber(candidate.seconds) ? chapter : candidate
  ), chapters[0]);
  return {
    chapters: chapters.map((chapter) => ({ ...chapter })),
    visitedRooms,
    totalRooms,
    complete: totalRooms > 0 && visitedRooms === totalRooms,
    slowest: { ...slowest }
  };
}

function reportLineText(value, fallback = "") {
  const text = String(value ?? fallback).replace(/[\r\n]+/g, " ").trim();
  return (text || fallback).slice(0, 120);
}

export function runReportTextData(input = {}) {
  const totalRooms = Math.floor(nonNegativeNumber(input.totalRooms));
  const visitedRooms = Math.min(totalRooms, Math.floor(nonNegativeNumber(input.visitedRooms)));
  const complete = input.complete === true && totalRooms > 0 && visitedRooms === totalRooms;
  const chapters = Array.isArray(input.chapters) ? input.chapters.filter((chapter) => chapter && typeof chapter === "object") : [];
  const rooms = Array.isArray(input.rooms) ? input.rooms.filter((room) => room && typeof room === "object") : [];
  const chapterLines = chapters.map((chapter) => (
    `${reportLineText(chapter.label, "未命名幕")}：${chapter.visited ? reportLineText(chapter.time, "—") : "—"}`
    + ` / 失误 ${Math.floor(nonNegativeNumber(chapter.mistakes))}`
    + ` / 房间 ${Math.floor(nonNegativeNumber(chapter.visited))}/${Math.floor(nonNegativeNumber(chapter.rooms))}`
  ));
  const roomLines = rooms.map((room) => (
    `R${Math.floor(nonNegativeNumber(room.index)) + 1} ${reportLineText(room.label)}：${room.visited ? reportLineText(room.time, "—") : "—"}`
    + ` / 失误 ${Math.floor(nonNegativeNumber(room.mistakes))}`
  ));
  return [
    "山巅微光 · 本轮报告",
    `构建：${reportLineText(input.build, "dev")}`,
    `结果：${complete ? "完整登顶" : `部分路线 ${visitedRooms}/${totalRooms} 房`}`,
    `总时间：${reportLineText(input.totalTime, "0:00.00")} / 失误 ${Math.floor(nonNegativeNumber(input.mistakes))} / Flow ${Math.floor(nonNegativeNumber(input.flow))}`,
    `辅助：${input.assistUsed === true ? "舒缓模式，本轮不计纪录" : "关闭"}`,
    "",
    "分幕：",
    ...chapterLines,
    "",
    "分房：",
    ...roomLines,
    "",
    "隐私：仅包含本轮时间、失误、Flow、辅助状态与构建号；不含身份、设备名称、输入历史或路线坐标。"
  ].join("\n");
}
