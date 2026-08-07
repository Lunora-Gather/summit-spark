function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegativeNumber(value) {
  return Math.max(0, finiteNumber(value));
}

const ROOM_TIER_LABELS = Object.freeze({
  learn: "教学",
  combine: "组合",
  pressure: "压力",
  finale: "终盘"
});

const FEEDBACK_TYPE_LABELS = Object.freeze({
  route: "路线摩擦",
  feel: "输入手感",
  mobile: "移动端",
  audio: "音频",
  storage: "存档",
  other: "其他"
});

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

export function chapterTransitionResultTextData(input = {}) {
  const value = input && typeof input === "object" ? input : {};
  const result = value.result && typeof value.result === "object" && !Array.isArray(value.result)
    ? value.result
    : null;
  if (!result) return reportLineText(value.fallback, "章节收束");
  const roomCount = Math.floor(nonNegativeNumber(result.roomCount));
  const visited = Math.min(roomCount, Math.floor(nonNegativeNumber(result.visited)));
  const mistakes = Math.floor(nonNegativeNumber(result.mistakes));
  const assist = value.assistUsed === true ? "辅助 · " : "";
  const coverage = result.complete === true ? "" : `${visited}/${roomCount} 房 · `;
  const mistakeText = mistakes > 0 ? `失误 ${mistakes}` : result.clean === true ? "无失误" : "失误 0";
  return `${assist}${coverage}${reportLineText(value.formattedTime, "0:00.00")} · ${mistakeText}`;
}

export function summitChapterResultTextData(input = {}) {
  const value = input && typeof input === "object" ? input : {};
  const chapterTitle = reportLineText(value.chapterTitle, "第四幕 · 星顶");
  const result = value.result && typeof value.result === "object" && !Array.isArray(value.result)
    ? value.result
    : null;
  if (!result) return `${chapterTitle} · 收束`;
  return `${chapterTitle} · ${chapterTransitionResultTextData({
    result,
    assistUsed: value.assistUsed,
    formattedTime: value.formattedTime
  })}`;
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

export function roomTrainingRecommendationData(input = {}) {
  const entry = input.entry && typeof input.entry === "object" ? input.entry : {};
  const currentMistakes = Math.floor(nonNegativeNumber(input.currentMistakes));
  const faults = Math.floor(nonNegativeNumber(entry.faults));
  const clean = Math.floor(nonNegativeNumber(entry.clean));
  const pressure = faults - clean * 2;
  const best = nonNegativeNumber(input.best);
  const target = nonNegativeNumber(input.target);
  const loss = best > 0 && target > 0 ? best - target : null;
  const leadReason = typeof input.leadReason === "string" && input.leadReason
    ? input.leadReason
    : "fall";

  let reasonKind = "expert";
  let reasonCount = 0;
  if (currentMistakes > 0) {
    reasonKind = "current";
    reasonCount = currentMistakes;
  } else if (faults > 0 && pressure > 0) {
    reasonKind = "archive";
    reasonCount = Math.floor(nonNegativeNumber(entry[leadReason]));
  } else if (loss === null) {
    reasonKind = "unplayed";
  } else if (loss > 0) {
    reasonKind = "pace";
  }

  if (currentMistakes > 0 || (faults >= 3 && pressure > 0)) {
    return {
      reasonKind,
      reasonCount,
      loss,
      lineKind: "coach",
      routeSlot: null,
      coachReason: leadReason
    };
  }

  let routeSlot = 1;
  if (clean <= 0) routeSlot = 0;
  else if (loss !== null && loss > 1.5) routeSlot = 1;
  else if (input.grade === "S") routeSlot = 2;
  return {
    reasonKind,
    reasonCount,
    loss,
    lineKind: "route",
    routeSlot,
    coachReason: null
  };
}

export function roomProgressSummaryData(input = {}) {
  const entry = input.entry && typeof input.entry === "object" ? input.entry : {};
  const best = nonNegativeNumber(input.best);
  const target = nonNegativeNumber(input.target);
  const grade = typeof input.grade === "string" ? input.grade : "";
  const formatTime = typeof input.formatTime === "function" ? input.formatTime : (value) => String(value);
  const formatDelta = typeof input.formatDelta === "function" ? input.formatDelta : (value) => String(value);
  const count = (key) => Math.floor(nonNegativeNumber(entry[key]));
  const clears = count("clears");
  const clean = count("clean");
  const drills = count("drills");
  const drillClears = count("drillClears");
  const drillClean = count("drillClean");
  const tier = typeof input.tier === "string" && input.tier ? input.tier : "route";
  const paceDelta = best > 0 && target > 0 ? best - target : null;

  return {
    medal: best > 0 ? `${grade || "PB"} ${formatTime(best)}` : `T ${formatTime(target)}`,
    clean: clears > 0 ? `无失误 ${clean}/${clears}` : "无失误 0/0",
    drill: drills > 0 ? `Drill ${drillClean}/${drillClears}/${drills}` : "Drill 0",
    contract: `C ${count("cleanWins")}/${count("cleanDrills")} · P ${count("paceWins")}/${count("paceDrills")} · S ${count("styleWins")}/${count("styleDrills")} · X ${count("expertWins")}/${count("expertDrills")}`,
    pace: paceDelta === null ? "未游玩" : paceDelta <= 0 ? "已达标" : `慢 ${formatDelta(paceDelta)}`,
    paceDelta,
    tier: ROOM_TIER_LABELS[tier] || tier
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

export function saveBackupSummaryData(backup = {}) {
  const value = backup && typeof backup === "object" ? backup : {};
  const archive = value.archive && typeof value.archive === "object" ? value.archive : {};
  const rawSavedAt = typeof value.savedAt === "string" ? reportLineText(value.savedAt) : "";
  const savedAt = rawSavedAt ? rawSavedAt.slice(0, 19).replace("T", " ") : "未知时间";
  const build = typeof archive.build === "string"
    ? reportLineText(archive.build, "未知版本")
    : "未知版本";
  return `可恢复：${build} / ${savedAt}`;
}

export function saveArchiveSummaryData(input = {}) {
  const value = input && typeof input === "object" ? input : {};
  const archive = value.archive && typeof value.archive === "object" ? value.archive : {};
  const profile = archive.profile && typeof archive.profile === "object" ? archive.profile : {};
  const settings = archive.settings && typeof archive.settings === "object" ? archive.settings : {};
  const roomBests = Array.isArray(archive.roomBests) ? archive.roomBests : [];
  const requestedRoomTotal = Math.floor(nonNegativeNumber(value.roomTotal));
  const roomTotal = requestedRoomTotal || roomBests.length;
  const bestRooms = roomBests
    .slice(0, roomTotal)
    .filter((seconds) => finiteNumber(seconds) > 0)
    .length;
  const build = typeof archive.sourceBuild === "string"
    ? reportLineText(archive.sourceBuild, "未知版本")
    : "未知版本";
  const cleared = Math.floor(nonNegativeNumber(profile.summitClears));
  const bestFlow = Math.floor(nonNegativeNumber(archive.bestFlow));
  const touchSize = Math.floor(nonNegativeNumber(settings.touchSize)) || 48;
  return `可导入：${build} / 登顶 ${cleared} / 房间 PB ${bestRooms}/${roomTotal} / Flow ${bestFlow} / 触控 ${touchSize}px`;
}

export function feedbackDiagnosticsData(input = {}) {
  const value = input && typeof input === "object" ? input : {};
  const type = Object.hasOwn(FEEDBACK_TYPE_LABELS, value.type) ? value.type : "route";
  const rawNote = typeof value.note === "string" ? value.note : "";
  const note = rawNote
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  return { type, note, noteLength: note.length };
}

export function feedbackTemplateTextData(input = {}) {
  const value = input && typeof input === "object" ? input : {};
  const snapshot = value.snapshot && typeof value.snapshot === "object" ? value.snapshot : {};
  const run = snapshot.run && typeof snapshot.run === "object" ? snapshot.run : {};
  const viewport = snapshot.viewport && typeof snapshot.viewport === "object" ? snapshot.viewport : {};
  const gamepad = snapshot.gamepad && typeof snapshot.gamepad === "object" ? snapshot.gamepad : {};
  const progress = snapshot.progress && typeof snapshot.progress === "object" ? snapshot.progress : {};
  const activeDrill = run.activeDrill && typeof run.activeDrill === "object" ? run.activeDrill : null;
  const activeRoute = run.activeRoute && typeof run.activeRoute === "object" ? run.activeRoute : null;
  const activeFeel = run.activeFeel && typeof run.activeFeel === "object" ? run.activeFeel : null;
  const feedback = feedbackDiagnosticsData(snapshot.feedback);
  const build = reportLineText(snapshot.build, "dev");
  const room = Math.max(1, Math.floor(nonNegativeNumber(run.room)) || 1);
  const drillRoom = activeDrill ? Math.max(1, Math.floor(nonNegativeNumber(activeDrill.room)) || 1) : 1;
  const drillModeLabel = reportLineText(value.activeDrillModeLabel);
  const active = activeDrill ? `R${drillRoom} ${drillModeLabel || "Drill"}` : "自由游玩";
  const route = activeRoute
    ? `${reportLineText(activeRoute.label, "未命名航线")} ${Math.floor(nonNegativeNumber(activeRoute.step))}/${Math.floor(nonNegativeNumber(activeRoute.total))}`
    : "无";
  const feel = activeFeel
    ? `${reportLineText(activeFeel.id, "未命名 Feel")} R${Math.max(1, Math.floor(nonNegativeNumber(activeFeel.room)) || 1)}`
    : "无";
  const width = Math.floor(nonNegativeNumber(viewport.width));
  const height = Math.floor(nonNegativeNumber(viewport.height));
  const dpr = nonNegativeNumber(viewport.dpr) || 1;
  const deadzone = nonNegativeNumber(gamepad.deadzone);
  const roomTotal = Math.floor(nonNegativeNumber(value.roomTotal));
  const clearedRooms = Math.min(roomTotal || Number.MAX_SAFE_INTEGER, Math.floor(nonNegativeNumber(progress.clearedRooms)));
  const feedbackLabel = FEEDBACK_TYPE_LABELS[feedback.type];
  return [
    `Summit Spark ${build}`,
    `反馈类型：${feedbackLabel}`,
    `备注：${feedback.note || "未填写"}`,
    `当前位置：R${room} / ${active}`,
    `航线：${route}`,
    `Feel Lab：${feel}`,
    `视口：${width}x${height} dpr ${dpr} coarse ${viewport.coarsePointer === true ? "yes" : "no"}`,
    `手柄：${gamepad.connected === true ? `${Math.floor(nonNegativeNumber(gamepad.count))} 个 / standard ${gamepad.standardMapping === true}` : "未连接"} / dz ${deadzone.toFixed(2)}`,
    `进度：${clearedRooms}/${roomTotal} clear / 合同 ${Math.floor(nonNegativeNumber(progress.contractWins))}`,
    "复现步骤：",
    "实际结果：",
    "期望结果："
  ].join("\n");
}

export function lumenRunSummaryData(input = {}) {
  const total = Math.floor(nonNegativeNumber(input.total));
  const found = Math.min(total, Math.floor(nonNegativeNumber(input.found)));
  const complete = total > 0 && found === total;
  const completeWhisper = reportLineText(input.completeWhisper, "所有微光，都抵达了山顶。");
  const defaultWhisper = reportLineText(input.defaultWhisper, "山没有变轻，是你学会了继续向上。");
  return {
    found,
    total,
    complete,
    label: `${found}/${total}`,
    whisper: complete ? completeWhisper : defaultWhisper
  };
}

export function runReportTextData(input = {}) {
  const totalRooms = Math.floor(nonNegativeNumber(input.totalRooms));
  const visitedRooms = Math.min(totalRooms, Math.floor(nonNegativeNumber(input.visitedRooms)));
  const complete = input.complete === true && totalRooms > 0 && visitedRooms === totalRooms;
  const lumens = lumenRunSummaryData({
    found: input.foundLumens,
    total: input.totalLumens
  });
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
    `总时间：${reportLineText(input.totalTime, "0:00.00")} / 失误 ${Math.floor(nonNegativeNumber(input.mistakes))} / 微光 ${lumens.label} / Flow ${Math.floor(nonNegativeNumber(input.flow))}`,
    `辅助：${input.assistUsed === true ? "舒缓模式，本轮不计纪录" : "关闭"}`,
    "",
    "分幕：",
    ...chapterLines,
    "",
    "分房：",
    ...roomLines,
    "",
    "隐私：仅包含本轮时间、失误、微光、Flow、辅助状态与构建号；不含身份、设备名称、输入历史或路线坐标。"
  ].join("\n");
}
