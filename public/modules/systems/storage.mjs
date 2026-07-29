export function finiteNonNegativeNumber(value, fallback = 0, cap = 999999) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(cap, parsed));
}

export function finiteNonNegativeInt(value, fallback = 0, cap = 999999) {
  return Math.floor(finiteNonNegativeNumber(value, fallback, cap));
}

export function strictBoolean(value, fallback = false) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

export function readStoredJson(storage, key, fallback, normalize, onIssue = () => {}) {
  let parsed = fallback;
  let repaired = false;
  try {
    parsed = JSON.parse(storage.getItem(key) || JSON.stringify(fallback));
  } catch {
    onIssue("本地存档已修复");
    repaired = true;
    parsed = fallback;
    try {
      storage.removeItem(key);
    } catch {
      // Storage repair is best-effort.
    }
  }
  const normalized = normalize(parsed);
  if (repaired || JSON.stringify(normalized) !== JSON.stringify(parsed)) {
    try {
      storage.setItem(key, JSON.stringify(normalized));
    } catch {
      onIssue("本地存档不可写");
    }
  }
  return normalized;
}

export function clampGamepadDeadzoneData(value, {
  min,
  max,
  fallback
}) {
  return Math.max(min, Math.min(max, finiteNonNegativeNumber(value, fallback, max)));
}

export function clampTouchSizeData(value, {
  min,
  max,
  fallback
}) {
  return Math.max(min, Math.min(max, finiteNonNegativeInt(value, fallback, max)));
}

export function normalizeSettingsData(saved, defaults, {
  schemaVersion,
  bindingActions,
  defaultBindingsForLayout,
  validBindingCode,
  controlPresets,
  gamepadDeadzone,
  touchSize
}) {
  const source = saved && typeof saved === "object" ? saved : {};
  const keyboardLayout = source.keyboardLayout === "mac" ? "mac" : defaults.keyboardLayout;
  const bindingDefaults = defaultBindingsForLayout(keyboardLayout);
  const customBindings = {};
  for (const action of bindingActions) {
    const savedCode = source.customBindings?.[action];
    customBindings[action] = validBindingCode(savedCode) ? savedCode : bindingDefaults[action];
  }
  return {
    schemaVersion,
    shake: finiteNonNegativeNumber(source.shake, defaults.shake, 1),
    calmEffects: strictBoolean(source.calmEffects, defaults.calmEffects),
    lowPerformance: strictBoolean(source.lowPerformance, defaults.lowPerformance),
    controlsPreset: source.controlsPreset === "custom"
      || (typeof source.controlsPreset === "string" && Object.hasOwn(controlPresets, source.controlsPreset))
      ? source.controlsPreset
      : defaults.controlsPreset,
    keyboardLayout,
    customBindings,
    grabMode: source.grabMode === "toggle" ? "toggle" : defaults.grabMode,
    gamepadDeadzone: clampGamepadDeadzoneData(
      source.gamepadDeadzone ?? defaults.gamepadDeadzone,
      gamepadDeadzone
    ),
    touchSize: clampTouchSizeData(source.touchSize ?? defaults.touchSize, touchSize),
    practiceLines: strictBoolean(source.practiceLines, defaults.practiceLines),
    ghostOpacity: Math.max(0.2, Math.min(
      1,
      finiteNonNegativeNumber(source.ghostOpacity, defaults.ghostOpacity, 1)
    )),
    assistMode: source.assistMode === "gentle" ? "gentle" : defaults.assistMode,
    audioEnabled: strictBoolean(source.audioEnabled, defaults.audioEnabled),
    audioVolume: finiteNonNegativeNumber(source.audioVolume, defaults.audioVolume, 1)
  };
}

export function createProfileData(schemaVersion) {
  return {
    version: schemaVersion,
    summitClears: 0,
    bestDeathCount: null,
    bestRelayChain: 0,
    bestFlowPeak: 0,
    lastClearTime: 0,
    lastClearAt: "",
    challengeWins: {}
  };
}

export function normalizeProfileData(saved, { schemaVersion, challengeIds }) {
  const source = saved && typeof saved === "object" ? saved : {};
  const profile = createProfileData(schemaVersion);
  profile.summitClears = finiteNonNegativeInt(source.summitClears, 0, 9999);
  const savedBestDeath = source.bestDeathCount;
  const parsedBestDeath = Number(savedBestDeath);
  profile.bestDeathCount = savedBestDeath === null || savedBestDeath === undefined || profile.summitClears <= 0
    ? null
    : Number.isFinite(parsedBestDeath) ? finiteNonNegativeInt(parsedBestDeath, 0, 9999) : null;
  profile.bestRelayChain = finiteNonNegativeInt(source.bestRelayChain, 0, 9999);
  profile.bestFlowPeak = finiteNonNegativeNumber(source.bestFlowPeak, 0, 999);
  profile.lastClearTime = finiteNonNegativeNumber(source.lastClearTime, 0, 36000);
  profile.lastClearAt = typeof source.lastClearAt === "string" ? source.lastClearAt : "";
  const wins = source.challengeWins && typeof source.challengeWins === "object" ? source.challengeWins : {};
  challengeIds.forEach((id) => {
    if (strictBoolean(wins[id], false)) profile.challengeWins[id] = true;
  });
  return profile;
}

export function normalizeRoomBestsData(saved, roomCount) {
  const source = Array.isArray(saved) ? saved : [];
  return Array.from({ length: roomCount }, (_, index) => {
    const value = Number(source[index]);
    return Number.isFinite(value) && value > 0 ? Math.min(3600, value) : 0;
  });
}

export function normalizeRoomPathPointData(point, { tile, width, height }) {
  if (!point || typeof point !== "object") return null;
  const x = Number(point.x);
  const y = Number(point.y);
  const t = Number(point.t);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(-tile, Math.min(width + tile, Math.round(x * 10) / 10)),
    y: Math.max(-tile, Math.min(height + tile, Math.round(y * 10) / 10)),
    dash: strictBoolean(point.dash, false),
    spark: strictBoolean(point.spark, false),
    over: strictBoolean(point.over, false),
    t: Number.isFinite(t) && t > 0 ? Math.round(t * 1000) / 1000 : 0
  };
}

export function normalizeRoomPathsData(saved, {
  roomCount,
  maxPoints,
  tile,
  width,
  height
}) {
  const source = Array.isArray(saved) ? saved : [];
  return Array.from({ length: roomCount }, (_, index) => {
    const path = Array.isArray(source[index]) ? source[index] : [];
    return path
      .slice(0, maxPoints)
      .map((point) => normalizeRoomPathPointData(point, { tile, width, height }))
      .filter(Boolean);
  });
}

export function createRoomFocusEntryData(schemaVersion, deathReasonKeys) {
  const entry = {
    schemaVersion,
    faults: 0,
    clears: 0,
    clean: 0,
    drills: 0,
    drillClears: 0,
    drillClean: 0,
    cleanDrills: 0,
    cleanWins: 0,
    paceDrills: 0,
    paceWins: 0,
    styleDrills: 0,
    styleWins: 0,
    expertDrills: 0,
    expertWins: 0,
    last: "none"
  };
  deathReasonKeys.forEach((key) => {
    entry[key] = 0;
  });
  return entry;
}

const ROOM_FOCUS_COUNTERS = [
  "faults",
  "clears",
  "clean",
  "drills",
  "drillClears",
  "drillClean",
  "cleanDrills",
  "cleanWins",
  "paceDrills",
  "paceWins",
  "styleDrills",
  "styleWins",
  "expertDrills",
  "expertWins"
];

export function normalizeRoomFocusData(raw, {
  roomCount,
  schemaVersion,
  deathReasonKeys,
  deathReasonLabels
}) {
  const source = Array.isArray(raw) ? raw : Array.isArray(raw?.rooms) ? raw.rooms : [];
  return Array.from({ length: roomCount }, (_, index) => {
    const saved = source[index] && typeof source[index] === "object" ? source[index] : {};
    const entry = createRoomFocusEntryData(schemaVersion, deathReasonKeys);
    ROOM_FOCUS_COUNTERS.forEach((key) => {
      entry[key] = finiteNonNegativeInt(saved[key], 0, 9999);
    });
    entry.last = deathReasonLabels[saved.last] ? saved.last : "none";
    deathReasonKeys.forEach((key) => {
      entry[key] = finiteNonNegativeInt(saved[key], 0, 9999);
    });
    return entry;
  });
}

export function hasMeaningfulSaveData(input = {}) {
  const baselineSettings = input.baselineSettings && typeof input.baselineSettings === "object"
    ? input.baselineSettings
    : {};
  const savedSettings = input.settings && typeof input.settings === "object"
    ? input.settings
    : baselineSettings;
  if (JSON.stringify(savedSettings) !== JSON.stringify(baselineSettings)) return true;

  const profile = input.profile && typeof input.profile === "object" ? input.profile : {};
  const challengeWins = profile.challengeWins && typeof profile.challengeWins === "object"
    ? profile.challengeWins
    : {};
  if (finiteNonNegativeInt(profile.summitClears) > 0
    || profile.bestDeathCount !== null && profile.bestDeathCount !== undefined
    || finiteNonNegativeInt(profile.bestRelayChain) > 0
    || finiteNonNegativeNumber(profile.bestFlowPeak) > 0
    || finiteNonNegativeNumber(profile.lastClearTime) > 0
    || Boolean(profile.lastClearAt)
    || Object.values(challengeWins).some((value) => value === true)) return true;

  const roomBests = Array.isArray(input.roomBests) ? input.roomBests : [];
  if (roomBests.some((value) => finiteNonNegativeNumber(value) > 0)) return true;
  const roomPaths = Array.isArray(input.roomPaths) ? input.roomPaths : [];
  if (roomPaths.some((path) => Array.isArray(path) && path.length > 0)) return true;
  const roomFocus = Array.isArray(input.roomFocus) ? input.roomFocus : [];
  if (roomFocus.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (entry.last && entry.last !== "none") return true;
    return Object.entries(entry).some(([key, value]) => (
      key !== "schemaVersion"
      && key !== "last"
      && finiteNonNegativeNumber(value) > 0
    ));
  })) return true;
  return finiteNonNegativeNumber(input.bestTime) > 0
    || finiteNonNegativeNumber(input.bestFlow) > 0;
}

function canonicalJsonText(value, stack = new Set()) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (typeof value === "bigint") throw new TypeError("archive values must be JSON-compatible");
  if (!value || typeof value !== "object") return undefined;
  if (stack.has(value)) throw new TypeError("archive values must be acyclic");
  stack.add(value);
  let text;
  if (Array.isArray(value)) {
    text = `[${value.map((item) => canonicalJsonText(item, stack) ?? "null").join(",")}]`;
  } else {
    const fields = [];
    for (const key of Object.keys(value).sort()) {
      const item = canonicalJsonText(value[key], stack);
      if (item !== undefined) fields.push(`${JSON.stringify(key)}:${item}`);
    }
    text = `{${fields.join(",")}}`;
  }
  stack.delete(value);
  return text;
}

export function saveArchiveSyncKeyData(archive) {
  return canonicalJsonText({
    kind: archive?.kind || "",
    schemaVersion: archive?.schemaVersion || 0,
    storage: archive?.storage || {}
  });
}

export function normalizedSaveArchiveSyncKeyData(input = {}, {
  kind,
  schemaVersion,
  roomFocusSchemaVersion
}) {
  return saveArchiveSyncKeyData(createSaveArchiveData({
    kind,
    schemaVersion,
    build: "",
    exportedAt: "",
    settings: input.settings,
    profile: input.profile,
    roomBests: input.roomBests,
    roomPaths: input.roomPaths,
    roomFocusSchemaVersion,
    roomFocus: input.roomFocus,
    bestTime: input.bestTime,
    bestFlow: input.bestFlow
  }));
}

export function parseSaveArchiveText(text, { maxChars, kind }) {
  if (text.length > maxChars) throw new Error("导入内容过大");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("不是有效 JSON");
  }
  if (!parsed
    || typeof parsed !== "object"
    || Array.isArray(parsed)
    || parsed.kind !== kind
    || !parsed.storage
    || typeof parsed.storage !== "object"
    || Array.isArray(parsed.storage)) {
    throw new Error(`不是 ${kind} 存档`);
  }
  return {
    sourceBuild: typeof parsed.build === "string" && parsed.build ? parsed.build.slice(0, 40) : "",
    storage: parsed.storage
  };
}

export function createSaveArchiveData({
  kind,
  schemaVersion,
  build,
  exportedAt,
  settings,
  profile,
  roomBests,
  roomPaths,
  roomFocusSchemaVersion,
  roomFocus,
  bestTime,
  bestFlow
}) {
  return {
    kind,
    schemaVersion,
    build,
    exportedAt,
    storage: {
      settings,
      profile,
      roomBests,
      roomPaths,
      roomFocus: {
        schemaVersion: roomFocusSchemaVersion,
        rooms: roomFocus
      },
      bestTime,
      bestFlow
    }
  };
}

export function createSaveBackupData({
  sourceBuild = "",
  archive,
  savedAt
}) {
  return {
    kind: "summit-spark-save-backup",
    schemaVersion: 1,
    savedAt,
    reason: "before-import",
    sourceBuild: sourceBuild || "",
    archive
  };
}

export function parseSaveBackupValue(value, validateArchive) {
  if (!value
    || typeof value !== "object"
    || Array.isArray(value)
    || value.kind !== "summit-spark-save-backup"
    || value.schemaVersion !== 1
    || value.reason !== "before-import"
    || !value.archive) return null;
  try {
    validateArchive(value.archive);
    return value;
  } catch {
    return null;
  }
}

export function writeStorageTransaction(storage, entries) {
  const previous = new Map();
  for (const [key] of entries) previous.set(key, storage.getItem(key));
  try {
    for (const [key, value] of entries) storage.setItem(key, value);
  } catch (error) {
    for (const [key] of entries) {
      try {
        storage.removeItem(key);
      } catch {
        // Continue attempting to restore the remaining keys.
      }
    }
    for (const [key, value] of previous) {
      if (value === null) continue;
      try {
        storage.setItem(key, value);
      } catch {
        // The original error remains the actionable transaction failure.
      }
    }
    throw error;
  }
}
